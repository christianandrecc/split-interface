import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("real Sentry SDK transport", () => {
  it("sends only a sanitized error envelope with no referrer, credentials, or unrelated SDK data", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const { createSentryReporter } = await import("@/lib/sentryClient");
    const sdk = await import("@sentry/browser");
    sdk.setUser({ email: "private@example.com" });
    sdk.setTag("private", "PRIVATE_SPLIT");
    sdk.addBreadcrumb({ message: "access_token=secret" });
    const reporter = createSentryReporter({
      dsn: "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/456",
      environment: "preview", release: "split@1234567",
    });
    reporter.report({ code: "split_send_failure", kind: "server" });
    await reporter.close();
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/^https:\/\/o123\.ingest\.sentry\.io\/api\/456\/envelope\//);
    expect(options.credentials).toBe("omit");
    expect(options.referrerPolicy).toBe("no-referrer");
    const text = typeof options.body === "string" ? options.body : new TextDecoder().decode(options.body);
    const [header, item, event] = text.trim().split("\n").map((line: string) => JSON.parse(line));
    expect(item.type).toBe("event");
    expect(header).not.toHaveProperty("trace");
    expect(event.message).toBe("split_send_failure");
    expect(event.sdk.settings.infer_ip).toBe("never");
    expect(event.release).toBe("split@1234567");
    expect(text).not.toMatch(/private@example|PRIVATE_SPLIT|access_token|breadcrumbs|request|exception|contexts/);
    sdk.getGlobalScope().clear();
    sdk.getIsolationScope().clear();
    sdk.getCurrentScope().clear();
  });
});
