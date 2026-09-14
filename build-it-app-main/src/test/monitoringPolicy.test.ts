import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/browser";
import { failureKind, monitoringConfig, sanitizeMonitoringEvent } from "@/lib/monitoringPolicy";
import { validateDeploymentEnv } from "../../scripts/deployment-env.mjs";

const dsn = "https://0123456789abcdef0123456789abcdef@o123.ingest.us.sentry.io/456";
const env = { VITE_SENTRY_ENABLED: "true", VITE_SENTRY_DSN: dsn, VITE_SENTRY_ENVIRONMENT: "preview" };
const config = monitoringConfig(env, "split@1234567")!;
const supabase = { VITE_SUPABASE_URL: "https://testproject.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };

describe("monitoring privacy policy", () => {
  it("requires an explicit switch, valid project DSN, environment and build identifier", () => {
    expect(config).toEqual({ dsn, environment: "preview", release: "split@1234567" });
    expect(monitoringConfig({}, "split@1234567")).toBeNull();
    expect(monitoringConfig({ ...env, VITE_SENTRY_ENABLED: "false" }, "split@1234567")).toBeNull();
    expect(monitoringConfig({ ...env, VITE_SENTRY_ENVIRONMENT: "private@example.com" }, "split@1234567")).toBeNull();
    expect(monitoringConfig(env, "private@example.com")).toBeNull();
    expect(monitoringConfig(env, "split@1234567-local")).not.toBeNull();
  });

  it.each([
    "https://sentry.io/projects/split", "sntrys_private-token", dsn + "?access_token=secret",
    dsn.replace("https:", "http:"), dsn.replace("sentry.io", "sentry.io.attacker.test"),
    dsn.replace("@", ":password@"), dsn + "#private", "",
  ])("rejects an unsafe DSN in runtime and deployment checks: %s", value => {
    expect(monitoringConfig({ ...env, VITE_SENTRY_DSN: value }, "split@1234567")).toBeNull();
    expect(validateDeploymentEnv({ ...supabase, ...env, VITE_SENTRY_DSN: value }).length).toBeGreaterThan(0);
  });

  it("accepts inactive monitoring but rejects exposed Sentry API tokens", () => {
    expect(validateDeploymentEnv({ ...supabase, VITE_SENTRY_ENABLED: "false" })).toEqual([]);
    expect(validateDeploymentEnv({ ...supabase, ...env })).toEqual([]);
    expect(validateDeploymentEnv({ ...supabase, VITE_SENTRY_ENABLED: "yes" }).length).toBeGreaterThan(0);
    expect(validateDeploymentEnv({ ...supabase, ...env, VITE_SENTRY_ENVIRONMENT: "" }).length).toBeGreaterThan(0);
    const issues = validateDeploymentEnv({ ...supabase, VITE_SENTRY_AUTH_TOKEN: "sntrys_do-not-print" });
    expect(issues.length).toBeGreaterThan(0);
    expect(JSON.stringify(issues)).not.toContain("sntrys_do-not-print");
  });

  it("rebuilds a report without arbitrary SDK context or private data", () => {
    const secret = "private@example.com access_token=secret PRIVATE_SPLIT";
    const unsafe = {
      type: undefined, message: "split_sign_failure", tags: { failure_kind: "server", email: secret },
      event_id: "a".repeat(32), timestamp: 100,
      request: { url: secret, headers: { Authorization: secret } }, user: { email: secret, ip_address: "127.0.0.1" },
      exception: { values: [{ value: secret }] }, breadcrumbs: [{ message: secret }],
      extra: { payload: secret }, contexts: { trace: { data: secret } },
      sdkProcessingMetadata: { dynamicSamplingContext: { secret } },
      sdk: { name: secret, version: "10.74.0", settings: { infer_ip: "auto" } },
      release: secret, environment: secret, fingerprint: [secret],
    } as unknown as ErrorEvent;
    const clean = sanitizeMonitoringEvent(unsafe, config)!;
    expect(clean.message).toBe("split_sign_failure");
    expect(clean.level).toBe("error");
    expect(clean.release).toBe("split@1234567");
    expect(clean.tags).toEqual({ operation: "split_sign_failure", failure_kind: "server" });
    expect(clean.sdk?.settings?.infer_ip).toBe("never");
    expect(JSON.stringify(clean)).not.toContain(secret);
    for (const key of ["request", "user", "exception", "breadcrumbs", "extra", "contexts", "sdkProcessingMetadata"]) expect(clean).not.toHaveProperty(key);
    expect(unsafe.request?.url).toBe(secret);
  });

  it("allows an explicit connection test without sending arbitrary test contents", () => {
    const clean = sanitizeMonitoringEvent({
      type: undefined, message: "monitoring_test", tags: { failure_kind: "unknown" },
      extra: { email: "private@example.test", note: "private test contents" },
    }, config)!;
    expect(clean.message).toBe("monitoring_test");
    expect(clean.level).toBe("error");
    expect(clean.fingerprint).toEqual(["monitoring_test", "unknown"]);
    expect(clean).not.toHaveProperty("extra");
  });

  it("drops unrecognized events and keeps expected rejections out of error alerts", () => {
    expect(sanitizeMonitoringEvent({ type: undefined, message: "private@example.com" }, config)).toBeNull();
    expect(sanitizeMonitoringEvent({ type: undefined, message: "auth_signin_failure", tags: { failure_kind: "private" } }, config)).toBeNull();
    expect(sanitizeMonitoringEvent({ type: undefined, message: "auth_signin_failure", tags: { failure_kind: "validation" } }, config)?.level).toBe("warning");
  });

  it("classifies only fixed codes/statuses without reading messages or hostile getters", () => {
    expect(failureKind({ status: 503, message: "secret" })).toBe("server");
    expect(failureKind({ code: "40001" })).toBe("conflict");
    expect(failureKind({ code: "42501" })).toBe("access");
    expect(failureKind({ code: "over_email_send_rate_limit" })).toBe("rate_limit");
    expect(failureKind({ code: "email_address_not_authorized", status: 400 })).toBe("delivery");
    expect(failureKind({ get message() { throw new Error("must not inspect"); } })).toBe("unknown");
    expect(failureKind({ get code() { throw new Error("bad getter"); } })).toBe("unknown");
    expect(failureKind("private raw error")).toBe("unknown");
  });
});
