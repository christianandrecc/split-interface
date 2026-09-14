import { BrowserClient, Scope, defaultStackParser, makeFetchTransport } from "@sentry/browser";
import { sanitizeMonitoringEvent, type FailureReport, type MonitoringConfig } from "./monitoringPolicy";

export function createSentryReporter(config: MonitoringConfig) {
  const client = new BrowserClient({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    transport: options => makeFetchTransport({
      ...options, fetchOptions: { credentials: "omit", referrerPolicy: "no-referrer" },
    }),
    stackParser: defaultStackParser,
    integrations: [],
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false, cookies: false, httpHeaders: { request: false, response: false },
      httpBodies: [], urlQueryParams: false, graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false }, databaseQueryData: false,
      stackFrameVariables: false, frameContextLines: 0,
    },
    maxBreadcrumbs: 0,
    attachStacktrace: false,
    sendClientReports: false,
    enableLogs: false,
    enableMetrics: false,
    tracesSampleRate: 0,
    tracePropagationTargets: [],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    profileSessionSampleRate: 0,
    beforeSend: event => sanitizeMonitoringEvent(event, config),
    beforeSendTransaction: () => null,
    beforeSendLog: () => null,
    beforeSendMetric: () => null,
  });
  // No global client or default integrations: no console, DOM, Auth, or network capture.
  const scope = new Scope();
  scope.setClient(client);
  client.init();
  return {
    report: ({ code, kind }: FailureReport) => {
      scope.captureEvent({ message: code, tags: { failure_kind: kind } });
    },
    close: () => client.close(1000),
  };
}
