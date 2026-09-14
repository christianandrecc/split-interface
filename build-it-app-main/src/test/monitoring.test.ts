import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { failureCodes } from "@/lib/monitoringPolicy";

const mocks = vi.hoisted(() => ({ report: vi.fn(), close: vi.fn().mockResolvedValue(true), create: vi.fn() }));
vi.mock("@/lib/sentryClient", () => ({ createSentryReporter: mocks.create }));
let stop = () => {};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("VITE_SENTRY_ENABLED", "true");
  vi.stubEnv("VITE_SENTRY_DSN", "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/456");
  vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "preview");
  vi.stubGlobal("__SPLIT_RELEASE__", "split@1234567");
  mocks.create.mockImplementation(() => ({ report: mocks.report, close: mocks.close }));
});
afterEach(() => { stop(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("optional error reporting", () => {
  it("does not start the SDK or capture errors when disabled", async () => {
    vi.stubEnv("VITE_SENTRY_ENABLED", "false");
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    monitoring.reportFailure("render_failure");
    await Promise.resolve();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("queues only labels during startup and suppresses repeated failures", async () => {
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    monitoring.reportFailure("split_sign_failure", { status: 500, message: "PRIVATE_SPLIT", user: "secret" });
    monitoring.reportFailure("split_sign_failure", { status: 500 });
    await vi.waitFor(() => expect(mocks.report).toHaveBeenCalledOnce());
    expect(mocks.report).toHaveBeenCalledWith({ code: "split_sign_failure", kind: "server" });
    expect(JSON.stringify(mocks.report.mock.calls)).not.toContain("PRIVATE_SPLIT");
  });

  it("caps reports per page and never queues unbounded raw errors", async () => {
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    failureCodes.forEach(code => monitoring.reportFailure(code));
    await vi.waitFor(() => expect(mocks.report).toHaveBeenCalledTimes(20));
    monitoring.reportFailure("auth_password_failure");
    expect(mocks.report).toHaveBeenCalledTimes(20);
  });

  it("does not let an expected rejection suppress a later server outage", async () => {
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    monitoring.reportFailure("auth_signin_failure", { status: 400 });
    monitoring.reportFailure("auth_signin_failure", { status: 500 });
    await vi.waitFor(() => expect(mocks.report).toHaveBeenCalledTimes(2));
    expect(mocks.report).toHaveBeenLastCalledWith({ code: "auth_signin_failure", kind: "server" });
  });

  it("contains SDK initialization errors without throwing into the app", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.create.mockImplementation(() => { throw new Error("private setup details"); });
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith("SPLIT_MONITORING_UNAVAILABLE"));
    expect(JSON.stringify(warn.mock.calls)).not.toContain("private setup details");
    expect(() => monitoring.reportFailure("split_send_failure")).not.toThrow();
  });

  it("records global failures without collecting the event contents and cleans up listeners", async () => {
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    const spy = vi.spyOn(window, "removeEventListener");
    window.dispatchEvent(new Event("unhandledrejection"));
    const script = document.createElement("script");
    document.body.append(script);
    script.dispatchEvent(new Event("error"));
    script.remove();
    await vi.waitFor(() => expect(mocks.report).toHaveBeenCalledTimes(2));
    expect(mocks.report).toHaveBeenCalledWith({ code: "asset_load_failure", kind: "unknown" });
    stop();
    expect(spy).toHaveBeenCalledWith("error", expect.any(Function), true);
    expect(spy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    window.dispatchEvent(new Event("unhandledrejection"));
    expect(mocks.report).toHaveBeenCalledTimes(2);
  });

  it("does not start a client after stopping during initialization", async () => {
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    stop();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("preserves request results and thrown errors even when the reporter throws", async () => {
    const monitoring = await import("@/lib/monitoring");
    stop = monitoring.startMonitoring();
    await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    mocks.report.mockImplementation(() => { throw new Error("monitor offline"); });
    const result = { error: { status: 500 }, data: null };
    expect(await monitoring.monitorRequest("auth_signup_failure", async () => result)).toBe(result);
    const cause = new Error("original failure");
    await expect(monitoring.monitorRequest("split_send_failure", async () => { throw cause; })).rejects.toBe(cause);
    const success = { error: null, data: "confirmed" };
    expect(await monitoring.monitorRequest("split_save_failure", async () => success)).toBe(success);
  });
});
