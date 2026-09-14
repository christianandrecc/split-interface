import { failureCodes, failureKind, monitoringConfig, type FailureCode, type FailureReport } from "./monitoringPolicy";

type Reporter = ReturnType<typeof import("./sentryClient").createSentryReporter>;
let active = false;
let reporter: Reporter | undefined;
let queued: FailureReport[] = [];
let count = 0;
const lastReported = new Map<string, number>();

export function reportFailure(code: FailureCode, cause?: unknown) {
  if (!active || !failureCodes.includes(code)) return;
  const now = Date.now();
  const report = { code, kind: failureKind(cause) };
  const key = `${code}:${report.kind}`;
  if (count >= 20 || now - (lastReported.get(key) ?? -Infinity) < 60_000) return;
  count += 1;
  lastReported.set(key, now);
  try {
    if (reporter) reporter.report(report);
    else queued.push(report);
  } catch { /* Reporting must never change the result of an account or split action. */ }
}

export async function monitorRequest<T extends { error: unknown }>(code: FailureCode, request: () => PromiseLike<T>): Promise<T> {
  try {
    const result = await request();
    if (result.error) reportFailure(code, result.error);
    return result;
  } catch (cause) {
    reportFailure(code, cause);
    throw cause;
  }
}

export function startMonitoring() {
  const config = monitoringConfig(import.meta.env, typeof __SPLIT_RELEASE__ === "string" ? __SPLIT_RELEASE__ : "");
  if (active || !config) return () => undefined;
  active = true;
  let stopped = false;
  const onError = (event: Event) => {
    if (event instanceof ErrorEvent) reportFailure("unhandled_error");
    else if (event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement) reportFailure("asset_load_failure");
  };
  const onRejection = () => reportFailure("unhandled_rejection");
  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onRejection);
  // Do not delay mounting the application or retain raw errors while loading the SDK.
  void import("./sentryClient").then(({ createSentryReporter }) => {
    if (stopped) return;
    reporter = createSentryReporter(config);
    for (const report of queued) reporter.report(report);
    queued = [];
  }).catch(() => {
    if (stopped) return;
    queued = [];
    console.warn("SPLIT_MONITORING_UNAVAILABLE");
  });
  return () => {
    if (stopped) return;
    stopped = true;
    active = false;
    queued = [];
    count = 0;
    lastReported.clear();
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onRejection);
    void Promise.resolve(reporter?.close()).catch(() => undefined);
    reporter = undefined;
  };
}
