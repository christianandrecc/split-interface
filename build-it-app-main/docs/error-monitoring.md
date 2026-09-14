# Beta Error Reporting

## Status

September 14 release update: the approved DSN and `VITE_SENTRY_ENABLED=true` are
now configured on the existing Vercel Production environment, with environment
label `production`. The new deployment must be verified to contain them before
calling production reporting active. The earlier successful test below was local;
alert-email receipt remains a separate verification step. No paid add-ons enabled.

Sentry was approved on September 11, 2026. The owner supplied the DSN for project
`4512070892716032`; the browser integration is enabled locally via the ignored
`.env.development.local` file. Production builds do not load this configuration.
One explicit `monitoring_test` event was acknowledged by Sentry with HTTP 200 and
the matching event ID, and the owner confirmed it is visible in Issues. Alert-email
receipt still needs verification. No payment, Vercel deployment/environment update, or Supabase
migration was made for this integration; the deployed site is not enabled yet.

The [Developer plan](https://sentry.io/pricing/) currently includes 5,000 errors
per month, email alerts, one dashboard user and 30-day lookback for $0. The seat
limit is for Sentry access, not SPLIT testers. Confirm the plan in Sentry; do not
activate paid add-ons, pay-as-you-go, or an upgrade without the owner's approval.
Client throttling reduces noise; it is not an organization-wide billing limit.

## Connect The Project

1. Create/sign into the owner's Sentry account and create a React project named
   `split-interface`. Use the free Developer plan. The app already has a manually
   configured browser SDK; do not run the wizard over this privacy configuration.
2. Get the public DSN under Project Settings > Client Keys (DSN). A DSN has the
   shape `https://<public-key>@o<org>.ingest.<region>.sentry.io/<project>`.
   No API/auth token is required or allowed in browser environment variables.
3. In the intended Vercel environment, set `VITE_SENTRY_DSN` to that DSN,
   `VITE_SENTRY_ENABLED=true`, and `VITE_SENTRY_ENVIRONMENT=preview` or `production`
   as appropriate. Keep local development off unless deliberately testing. Do not
   set production labels globally across preview deployments.
4. Run the normal deployment gate and make an authorized deployment. These are
   build-time settings; changing an environment variable alone does not update
   an already deployed Vite bundle. Vite stamps reports with the Vercel Git SHA;
   local builds use the local commit followed by `-local`.
5. In Sentry, confirm IP-address storage is disabled in the project's data-security
   settings and configure the allowed origins for the intended SPLIT deployments.
   The SDK sets `infer_ip=never`; Sentry still necessarily receives the connecting
   network address at its ingestion service. This is not a claim of anonymous
   network traffic. Review the privacy notice before public beta.
6. Create an [email alert](https://docs.sentry.io/product/monitors-and-alerts/alerts/)
   for new/regressed issues from this project, filtered to `error` level and the
   intended environment. Choose the owner's confirmed inbox, not a tester's.
   Keep development alerts separate and leave paid integrations off.
7. In an isolated preview test account, deliberately fail a request without
   changing a partner's records. Verify the issue contains only the approved
   fields below, the right release/environment, and that the alert email arrives.
   An SDK request returning success is not proof of email delivery. Leave the beta
   monitoring gate open until that end-to-end check passes.

To disable reporting, set `VITE_SENTRY_ENABLED=false` and rebuild/redeploy. Existing
open tabs still run their loaded bundle until refreshed. No database migration is
required. Never put `SENTRY_AUTH_TOKEN` or any other privileged key in a `VITE_`
variable; the deployment checker rejects recognized Sentry token settings.

## Codex Plugin Access

The installed Sentry plugin 0.1.2 supplies a read-only API script; installation
alone does not authorize Sentry reads. This session has no `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG`, or `SENTRY_PROJECT` configured. The public ingest DSN cannot be used
as a read credential. The owner's confirmed dashboard check remains valid.

Create a personal token under
[Sentry account tokens](https://sentry.io/settings/account/api/auth-tokens/)
with only `project:read`, `event:read`, and `org:read`. Set it locally as
`SENTRY_AUTH_TOKEN` for the script, with the project/organization slugs from the
actual project URL. Never paste the token in chat, put it in a `VITE_` variable,
commit it, or add it to the browser SDK. See [Sentry authentication](https://docs.sentry.io/api/auth/).
Confirm direct issue reads only after an authenticated API request succeeds.
The installed script covers issues/events; it does not configure alert rules or
prove email receipt. No additional test event was sent during plugin setup.

## What Leaves The Browser

- Fixed operation labels for render/unhandled failures, account creation/sign-in/
  sign-out, confirmation/reset requests, profile reads/saves, split reads/saves/
  invitations/signing, draft deletion/cache failures, notifications and search.
- A manually triggered `monitoring_test` label for connection/alert verification.
  This is never emitted automatically on startup or through a visible UI control.
- A fixed failure category (`server`, `delivery`, `network`, `rate_limit`,
  `access`, `conflict`, `validation`, or `unknown`), release/environment, a random
  event ID, timestamp and SDK metadata. Expected access/validation/conflict
  rejections are warnings, not error-level alert triggers.
- Reports are rebuilt from an allowlist immediately before sending. No raw error
  message or stack, current URL, callback tokens, account/split IDs, names,
  addresses, email, form values, document payloads, or chat content is included.
  No user scope, DOM/console/network breadcrumbs, tracing, session replay,
  profiling, logs, metrics, attachments, or source-map upload is enabled.
- The official SDK runs on an isolated client/scope without default integrations.
  The transport omits cookies and the page referrer. Source:
  [Sentry client isolation](https://docs.sentry.io/platforms/javascript/best-practices/shared-environments/)
  and [SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/).

This deliberately favors privacy over rich debugging context: reports identify an
operation and release, but do not identify a tester or exact source line. Reproduce
with a controlled test account when deeper investigation is needed.

## Reliability And Limits

- The SDK loads separately without delaying React mounting, only when explicitly
  enabled with valid configuration. Startup queues retain labels, not raw errors.
- Repeated operation/category pairs are limited to one report per minute and
  at most 20 reports per page lifetime. Counts are sampled diagnostics, not exact
  failure or user totals. Reloads start a new budget; this does not cap all testers
  at the organization's monthly quota.
- Transport failure does not change application save/auth results, automatically
  retry business actions, or create an offline queue. Ad blockers, offline clients,
  exhausted quota, and failed SDK loading can prevent delivery. Errors before the
  main module loads are not covered by its listeners.
- These reports cover instrumented browser operations, not Supabase service-wide
  failures, background jobs, or actual Auth inbox receipt. Continue checking native
  Supabase logs and the email provider's delivery/bounce events.

## Local Verification

`npm run verify:deploy` passed: 517 tests in 56 files, 143 database checks across
24 migrations, deployment configuration, typecheck, lint, build and dependency
audit. Seven pre-existing Fast Refresh warnings and large-bundle warnings remain.
The Sentry client is a separate approximately 19.5 KB gzip chunk, fetched only
when monitoring starts; no tracing or replay payload is loaded.

The automated gate covers policy allowlists, invalid configuration, token exposure,
startup buffering, duplicate/budget limits, cleanup, error categories, and keeping
request results intact when monitoring fails. A real SDK transport test injects
private global scope data and confirms it cannot reach the serialized envelope.

An isolated Playwright/Chrome test used the actual Auth and Sentry SDKs with all
external HTTP and Supabase WebSockets intercepted. It verified failed sign-in ->
one sanitized report -> successful sign-in while Sentry returned HTTP 429, with
no automatic session events, cookies/referrer, private fields, or unexpected page
errors. Desktop 1440px and mobile 390px remained nonblank with no overflow or
framework overlay; screenshots were inspected. Browser plugin was unavailable.
That intercepted run did not create real accounts, emails, or Sentry events.

## Project Connection Check

On September 11, 2026 at 10:06 PM America/New_York
(`2026-09-12T02:06:12Z`), an isolated Playwright browser loaded the local app and
manually invoked `reportFailure("monitoring_test")` through the application module.
Before forwarding, the test asserted the event allowlist, development environment,
release, IP inference setting and absence of cookies, authorization and referrer.
Only one request to the designated Sentry envelope endpoint was permitted; other
external HTTP and Supabase WebSockets were blocked before navigation.

- Sentry acknowledged HTTP 200 with event ID `96661bb3eea0440eb66e67898f769d17`.
- The actual SDK/application path sent exactly one event and no startup events.
- The local app still switched from account creation to sign-in; desktop 1440px
  and mobile 390px were nonblank, had no overflow, overlay or console/page errors.
  Screenshots were inspected. Browser plugin was unavailable; Playwright used.
- No Supabase requests, partner-account changes, or account emails were sent.
- The 23 focused monitoring tests passed after adding the explicit test label.
- Vite environment loading confirms the DSN and enablement apply to development,
  not production. Local development remains enabled for deliberate testing.

The owner confirmed that `monitoring_test` is visible in Issues. Ingestion and
dashboard visibility are verified, but this is not proof that an alert email
arrived. Confirm an appropriately configured alert reaches the owner's inbox.
Production configuration and an authorized deployment remain pending.
