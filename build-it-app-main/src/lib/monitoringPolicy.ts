import type { ErrorEvent } from "@sentry/browser";

export const failureCodes = [
  "monitoring_test",
  "render_failure", "unhandled_error", "unhandled_rejection", "asset_load_failure",
  "split_load_failure", "split_save_failure", "split_send_failure", "split_action_failure",
  "split_sign_failure", "draft_delete_failure", "draft_cache_failure",
  "profile_load_failure", "profile_save_failure", "profile_search_failure",
  "auth_signup_failure", "auth_signin_failure", "auth_signout_failure",
  "auth_confirmation_failure", "auth_recovery_failure", "auth_password_failure",
  "notifications_load_failure", "notifications_read_failure",
] as const;
export type FailureCode = typeof failureCodes[number];
const failureKinds = ["unknown", "network", "server", "delivery", "rate_limit", "access", "conflict", "validation"] as const;
export type FailureKind = typeof failureKinds[number];
export type FailureReport = { code: FailureCode; kind: FailureKind };
export type MonitoringConfig = { dsn: string; release: string; environment: "production" | "preview" | "development" };

export function monitoringConfig(env: Record<string, unknown>, release: string): MonitoringConfig | null {
  if (env.VITE_SENTRY_ENABLED !== "true") return null;
  const environment = env.VITE_SENTRY_ENVIRONMENT;
  if (environment !== "production" && environment !== "preview" && environment !== "development") return null;
  if (!/^split@[a-f0-9]{7,40}(?:-local)?$/.test(release)) return null;
  try {
    const dsn = new URL(String(env.VITE_SENTRY_DSN ?? ""));
    if (dsn.protocol !== "https:" || !/^o\d+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(dsn.hostname)
      || !/^[a-f0-9]{32}$/.test(dsn.username) || !/^\/\d+$/.test(dsn.pathname)
      || dsn.password || dsn.port || dsn.search || dsn.hash) return null;
    return { dsn: dsn.href, environment, release };
  } catch {
    return null;
  }
}

export function failureKind(cause: unknown): FailureKind {
  // Never inspect/serialize messages, stacks, URLs, or arbitrary error properties.
  try {
    if (!cause || typeof cause !== "object") return "unknown";
    const code = "code" in cause ? cause.code : undefined;
    const status = "status" in cause ? cause.status : undefined;
    if (code === "email_address_not_authorized") return "delivery";
    if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429) return "rate_limit";
    if (code === "40001" || status === 409) return "conflict";
    if (code === "42501" || status === 401 || status === 403) return "access";
    if (code === "22023" || code === "55000" || status === 400 || status === 422) return "validation";
    if (typeof status === "number" && status >= 500 && status <= 599) return "server";
    if (cause instanceof TypeError || status === 0) return "network";
  } catch { /* An unexpected error getter must not break the original operation. */ }
  return "unknown";
}

export function sanitizeMonitoringEvent(event: ErrorEvent, config: MonitoringConfig): ErrorEvent | null {
  const code = event.message as FailureCode;
  const kind = event.tags?.failure_kind as FailureKind;
  if (!failureCodes.includes(code) || !failureKinds.includes(kind) || event.type) return null;
  // Rebuild rather than redact: new SDK fields cannot silently send private data.
  return {
    type: undefined,
    ...(event.event_id && /^[a-f0-9]{32}$/.test(event.event_id) ? { event_id: event.event_id } : {}),
    ...(typeof event.timestamp === "number" && Number.isFinite(event.timestamp) ? { timestamp: event.timestamp } : {}),
    message: code,
    level: kind === "access" || kind === "conflict" || kind === "validation" ? "warning" : "error",
    platform: "javascript",
    release: config.release,
    environment: config.environment,
    fingerprint: [code, kind],
    tags: { operation: code, failure_kind: kind },
    sdk: {
      name: "sentry.javascript.browser",
      version: typeof event.sdk?.version === "string" && /^\d+\.\d+\.\d+$/.test(event.sdk.version) ? event.sdk.version : "unknown",
      settings: { infer_ip: "never" },
    },
  };
}
