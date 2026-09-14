# SPLIT Beta QA Checklist

Use this before sharing a new beta build. The command covers automated checks; the manual flow catches real Supabase, auth, and Vercel behavior.

## Current Progress: September 14, 2026

Latest authorized rollout: both pending Supabase migrations are now applied
(25 total), with no differences in existing agreement/signature/audit checksums.
Hosted rollback-only RPC signing, invite deduplication, outsider isolation and
partial/final signer-deletion protection passed. No partner records were changed.
The complete local gate now passes 548 application tests and 152 database checks.
The Vercel frontend release is being verified; historical preflight notes below
describe the previous deployment.

Owner decisions: backups deferred until pre-launch; account closure uses manual
review through Settings and the approved support email, with no automatic
deletion. Formal retention and session-revocation procedures remain a pre-launch
review, with a September 21 follow-up. Sentry's approved production environment
variables are configured for this release; previous confirmation was local.

Email blocker confirmed through the Management API: no custom SMTP configured,
default email limit two per hour. Verification and secure email changes are on;
the production callback is allowlisted. Controlled-inbox receipt/reset/change
tests await a verified sending service. Do not mark these gates complete from
unit tests or an Auth API success response.

The [September 11 partner release](partner-release-2026-09-11.md), commit
`126f77b`, is the deployed baseline. Private partner testing is not public beta
approval. The local changes below have not been deployed or applied to hosted
Supabase.

| Original audit item | Status |
| --- | --- |
| Profile/search privacy and shared profile payloads | Deployed. Phone/address stay private; server checks, not just UI hiding. |
| Collaborator PRO/IPI | Deployed. Capture each account's registration when accepting/signing; preserve signed records. |
| Full artist name | Deployed. Signup, profile, split creation and exports retain the full name. |
| Settings | Deployed for split defaults and PDF history. Unavailable email/reminder controls are disabled. |
| Publishing/admin allocation inputs | Deferred by product decision; removed from current setup without deleting legacy data. |
| Profile email versus sign-in email | Deployed. Confirmed Auth email is canonical; real confirmation/recovery/change inbox tests remain open. |
| External split delivery placeholder | Local fix, pending deployment. In-app invites remain supported; unsupported external delivery is rejected instead of queued. |

## September 14 Release Preflight

- [x] Re-ran `npm run verify:deploy`: deployment environment validation,
  typecheck, lint, 542 application tests, production build, production dependency
  audit and 152 disposable database checks across 25 migrations passed. No known
  production dependency vulnerabilities were reported. Seven existing Fast Refresh
  lint warnings and large-bundle warnings remain.
- [x] Re-ran the five local backup/restore safety tests. This did not capture a new
  backup or repeat the full restore drill; the verified September 11 snapshot and
  its limitations remain documented in [database-recovery.md](database-recovery.md).
- [x] Read back the actual Vercel production alias: deployment
  `dpl_35Wocb71AxV2WW6oKGcYfbSkeApL` is READY for commit `126f77b`.
  Hosted Supabase still has 23 migrations, through `20260911183758`.
  The two migrations in Migration Rollout and the newer frontend remain local.
- [x] Rechecked hosted security advisors. The same nine authenticated definer-RPC
  notices and disabled leaked-password protection remain; no Auth setting,
  permission or billing change was made.
- [ ] Deploy the checked changes and verify hosted behavior. Passing this local
  preflight does not complete real inbox, hosted multi-account, alert receipt,
  load/concurrency, retention or off-device recovery gates.

Latest local UI fixes remove Dispute from proposal controls and make chat-list
badges represent the signed-in user's current action, not unread notifications or
future signature rows. Accept/Counter, invitation decline, existing history,
counter-author ownership and account-specific badges have regression coverage.
Desktop/mobile fixture checks passed on September 11; no new live browser/account
flow was performed during this preflight. These changes do not add a migration.

Production-mode local configuration still has Sentry disabled and no DSN; the
development connection and owner-confirmed test issue remain verified. No Sentry
read token or organization/project slugs are configured in this shell. Live
production monitoring and owner alert receipt are not verified. This check did
not modify Vercel environment variables or send another monitoring event.

Continue in order: authorized release, controlled-inbox Auth checks, hosted A/B/C
workflow and expected-load checks, production monitoring/alert verification, then
account closure/retention and off-device recovery arrangements. Revisit the
owner-deferred password-protection decision before public beta. Publishing,
external split delivery and scheduled reminders remain intentionally out of scope.

## Next Beta Gates

- [ ] Deploy the local delivery cleanup, signed-account deletion guard and UI/recovery changes after their automated gate, then verify the
  hosted migration and Vercel bundle agree. See Migration Rollout below.
- [ ] Inspect Auth SMTP/sender configuration and test confirmation, resend,
  recovery and a two-inbox email change with controlled test users. Record actual
  receipt and successful hosted callbacks, not just a successful API response.
- [ ] Leaked-password protection: deferred by owner on September 11. It remains
  disabled on the current Free plan, not a completed security check. Revisit the
  decision before public beta; no upgrade or Auth settings change is authorized.
  See Password Protection Gate below.
- [ ] Complete the hosted multi-account flow below using dedicated accounts, not
  partners' existing agreements or credentials.
- [x] Verify local failed-save recovery, overlapping Messages actions, stale
  refreshes and device-storage failures. See Save Recovery below.
- [ ] Set up actionable error/auth-delivery monitoring, assess expected beta load,
  and repeat failure/concurrency checks against the hosted release with test accounts.
- [x] Review account-deletion cascades and implement the local signed-record guard.
- [x] Capture an encrypted local database backup and prove isolated restoration.
  See [database-recovery.md](database-recovery.md): 41 tables / 994 rows, migration
  history, schema/permission parity, five access contexts and encryption checks.
- [ ] Deploy/verify that guard and finish account closure, retention policy, and
  backup/restore handling. See [account-retention.md](account-retention.md).

Auth emails are separate from split invitations. A working signup confirmation
does not mean split invitations are emailed. The beta currently supports in-app
split invitations and manual PDF downloads, not external contract delivery,
signature/proposal emails or scheduled reminders.

## Retention: Local Guard, Closure And Backups Pending

- Reproduced a signed collaborator's Auth deletion removing their membership and
  relational signature response while leaving the signed parent JSON unchanged.
  Tests used synthetic users in disposable PostgreSQL; no hosted data was deleted.
- Added the private Auth-deletion guard, including partial and historical
  signatures. Rejected deletions preserve all rows; unsigned draft-only cleanup
  and normal signing still work. Migration is local and pending deployment.
- Full `npm run verify:deploy` passed, including 152 database checks across
  25 migrations and nine new retention checks. Application tests, typecheck,
  lint, build and dependency audit passed; existing warnings remain.
- Read-only hosted checks confirm Free plan and the existing security-advisor
  notices. A later local-only backup/restore pass is now verified; off-device
  recovery, scheduling and hosted service recovery remain open. Account closure
  and retention policy are not implemented by blocking destructive Auth deletion.
  See [account-retention.md](account-retention.md) for evidence and next steps.

## Save Recovery: Local, Pending Deployment

- Messages keeps text after a failed send and clears it only after confirmation.
  Newer typing is not cleared by an earlier save. In-memory drafts are separate
  for each conversation while Messages is mounted; this is not an offline queue
  or durable chat-draft storage across reloads, sign-out or leaving Messages.
- One Messages write can run at a time. Send, invitation, proposal and both
  signature controls are guarded, including rapid Enter presses.
- Failed chat/proposal/signature writes show a persistent error with a read-only
  `Reload latest` action. Invite and counter dialogs retain their existing errors.
- Retrying the same chat on unchanged state reuses its original payload/revision.
  After a newer server revision arrives, the user must review a confirmation before
  sending again: a lost acknowledgement is not proof that the server failed.
  Cancelling keeps the text and makes no write. Explicit resending is a new intent,
  not an exactly-once guarantee; do not automatically replay ambiguous writes.
- An older background read cannot replace a newly confirmed save or deletion.
  Failed reads do not clear the draft cache. Local draft changes are published to
  the UI only after a confirmed server save or successful local fallback.
- A full/blocked device cache cannot turn a confirmed server save/read into a
  reported failure. If both the draft RPC and local persistence fail, saving fails
  visibly instead of claiming `Saved locally`. Cache-write failure never retries by
  replacing all other accounts' cached drafts with the current account's map.
- Render exceptions display a reload screen with an unsaved-edits warning instead
  of a blank app. Reload is user-triggered; the boundary does not clear Auth or
  saved records. It does not catch initial asset-loading or all async failures.
- Validation: 480 application tests in 52 files, 143 database checks across 24
  migrations, typecheck, lint, production build and dependency audit. Seven existing
  Fast Refresh lint warnings and the existing build warnings remain.
- Isolated Chrome exercised dashboard -> Messages -> failed send -> reload ->
  retry, delayed reads, lost acknowledgements, retry cancellation and the render
  fallback. Checked 1440/768/390/320px, inspected screenshots, and found no overflow
  or unexpected page errors. Render-failure errors were deliberately injected.
  All Supabase HTTP/WebSockets were blocked before navigation and replaced with
  synthetic Auth/RPC responses. No partner accounts, records or emails were used.
- No new database migration, hosted configuration or deployment in this pass.

## Monitoring: Local Connection Verified, Alert Receipt Pending

- Sentry plugin 0.1.2 is installed. It uses a read-only API script, not an OAuth
  connector; `SENTRY_AUTH_TOKEN`, organization slug and project slug are not yet
  configured locally. The DSN cannot authorize reading events or alert settings.
  No direct Sentry API read or alert-rule verification was possible in this pass.
- The owner supplied the Sentry DSN on September 11. Development-only configuration
  is enabled locally; production builds do not load it. Sentry acknowledged one
  explicit `monitoring_test` event with HTTP 200 and matching event ID
  `96661bb3eea0440eb66e67898f769d17`; the owner confirmed visibility in Issues.
  Alert receipt is still unverified. No paid plan, deployment or migration was applied. See
  [error-monitoring.md](error-monitoring.md) for setup, privacy scope and limits.
- Reports contain fixed operation/category codes and release metadata only; no
  replay, raw errors/stacks, private fields or document/chat payloads. Repeated
  reports are limited. SDK/transport failures cannot fail a business operation.
  Real-SDK and isolated desktop/mobile checks passed with all external traffic
  intercepted. This is not evidence of a live alert reaching the owner's inbox.
- The subsequent real connection check permitted exactly one sanitized event to
  the designated Sentry endpoint, blocked Supabase traffic and confirmed the app
  remained usable at 1440px/390px. All 23 focused monitoring tests passed.
- Initial monitoring gate: 517 application tests in 56 files and 143 disposable
  database checks across 24 migrations pass, along with typecheck, lint, build
  and dependency audit. Seven existing Fast Refresh warnings and existing large
  bundle warnings remain. This includes the recent profile editor and sign-out
  changes, which also remain local pending release.
- Native [Supabase logs](https://supabase.com/docs/guides/observability/logs)
  help investigate Auth/API/Postgres failures. Inspect the relevant time window
  and status/request identifiers. For email, also verify provider delivery/bounce
  events and actual test-inbox receipt; an Auth success is not inbox proof.
- [Vercel runtime logs](https://vercel.com/docs/logs/runtime) cover function and
  middleware execution, not this Vite app's browser console. Check deployment/build
  health there, but do not mark frontend monitoring complete from empty runtime logs.
- Before beta sign-off, assign an alert recipient and test one deliberate failure
  end to end in staging. Collect only necessary operation/error codes and release
  identifiers. Exclude chat bodies, split payloads, names, emails, Auth tokens and
  callback URLs. Do not enable session replay or form capture by default.
- Agree the expected concurrent beta users, then exercise reads/writes with
  dedicated accounts and confirm latency/error behavior. The local regression
  suite is not a hosted load test or evidence of production capacity.

## Invitation Declines: Local, Pending Deployment

- Pending invitees can accept or decline from Messages. Declining requires
  confirmation; cancel does not write. Both response buttons are disabled while
  saving, failures stay visible for retry, and success waits for Supabase.
- The existing participant RPC receives `invite_decline` / `invite_reject` and
  selects the invite from the authenticated account. No new migration is needed
  for this option. The earlier delivery-cleanup migration remains pending.
- Declining preserves the agreement and shares, records the user's response and
  audit event, and notifies the other collaborators in-app. It is not a signature
  or a dispute of the proposed percentages. The backend's existing `Disputed`
  state is presented as `Invite declined` in the library, dashboard and preview.
- The declining user retains read-only history, without accept/counter/sign/chat
  controls or a dashboard attention item. They cannot reverse the response through
  a stale tab. Other pending invitees can still answer their own invitations.
- Pending/declined participants stay in the required count and cannot be skipped
  to finalize a split. A decline cannot be fixed merely by countering percentages.
- Automated regression checks cover three-account routing, forged payloads,
  stale/duplicate responses, read-only history, cancellation and retry. Isolated
  Chrome exercised dashboard -> Messages -> decline -> library -> preview at
  1440, 1024, 768, 390 and 320px. No hosted accounts or splits were modified.
- Full local release gate passed after this change: 414 application tests in
  50 files, 143 database checks, typecheck, lint, build and production dependency
  audit. Existing lint/bundle warnings remain; this is not a hosted beta sign-off.

## Auth Email Gate: In Progress

- Local recovery fixes are pending deployment. Failed reset-email requests now
  show errors, not a success-style notice; duplicate requests and retries have a
  60-second client cooldown in addition to Supabase's server rate limits. Success
  acknowledges only the request, not inbox delivery or the existence of an account.
- Recovery routing waits for a valid callback session and a matching `getUser`
  result. Expired/incomplete links cannot fall through to an existing session's
  password form. Both implicit and PKCE recovery are covered; callback credentials
  are cleared even when the SDK throws. No new database migration is required.
- September 11 read-only hosted check: email signup enabled, email confirmation
  required, phone signup disabled. The security advisor still reports disabled
  leaked-password protection and the nine existing guarded RPC notices.
- SMTP credentials, sender identity, template contents, redirect allowlist and
  Secure email change configuration are not exposed by the current connector.
  Do not infer custom SMTP is enabled or disabled from public Auth settings.
- Provider/sender-domain details and two authorized test inboxes have been
  requested. No real signup/reset/resend/email-change requests were sent, and no
  partner account was changed. The real-inbox gate remains unchecked.
- Latest local automated gate: 445 application tests across 50 files and 143
  database checks pass, along with typecheck, build and production dependency
  audit. Seven existing lint warnings and bundle-size warnings remain.
- Isolated Chrome at 1440, 768, 390 and 320px passed request failure/cooldown/retry,
  valid implicit and PKCE recovery, invalid links and password submission. Page
  identity/content, console and framework-overlay checks passed; screenshots were
  inspected. Supabase HTTP/WebSockets were blocked and Auth responses mocked.

See [account-email.md](account-email.md#hosted-email-gate) for the hosted setup
and receipt checks that must be completed before calling Auth delivery ready.

## Password Protection Gate: Deferred by Owner

- The owner chose to skip this item for now on September 11 and continue with
  multi-account verification. No upgrade or activation work will proceed in this
  pass. Deferral does not mean compromised passwords are detected or blocked.

- September 11 read-only project/organization checks confirm SPLIT is on the
  Free plan. The hosted security advisor still reports
  `auth_leaked_password_protection` disabled.
- Supabase's built-in leaked-password protection requires Pro or above:
  [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  Do not attempt activation on an ineligible plan or change billing without the
  owner's approval. No billing, Auth configuration or account changes were made.
- Existing frontend signup/reset checks require at least eight characters. These
  are not proof of the hosted password policy and do not detect compromised
  passwords. Do not label the gate complete based on these checks, a browser-only
  blocklist or passing database tests; disposable PostgreSQL does not run GoTrue.
- After the owner chooses an eligible plan, enable leaked-password protection in
  [Email Auth settings](https://supabase.com/dashboard/project/hpwquupkqssqqgqtwdyu/auth/providers?provider=Email).
  Read back the hosted configuration and re-run the security advisor to verify
  the warning is gone. The current connector does not expose Auth configuration
  writes, so an eligible plan alone does not complete activation.
- Verify signup and password reset reject a known compromised test password
  through Auth using dedicated test accounts, without saving it to profiles or
  logging it. Verify a generated strong password works and email verification
  remains required. Do not test by changing a partner's password.
- Existing users should retain sign-in access under strengthened requirements.
  The installed SDK can return a `weakPassword` warning on a successful sign-in;
  verify it is communicated without treating a valid session as a failed login
  when this gate is activated. Current sign-in code does not surface that warning.
- Keep this gate deferred while staying on Free. Revisit the risk before public
  beta or approve a server-side alternative; do not silently mark it passed.

## Multi-Account Checks: Local Pass, Hosted Pending

- Fixed a cross-tab session gap: sign-out or a changed Auth user now clears the
  displayed profile, dashboard/form state and shared profile/query caches before
  loading the new account. Focus verification also removes stale account UI.
  Same-account token refreshes preserve the active form and unsaved input.
- Late profile loads and saves cannot restore the previous account after a
  switch/sign-out. Verified password recovery remains supported across Auth
  events; URL markers alone still cannot activate recovery.
- Split reads and writes compare the displayed profile's Auth user ID with the
  verified session. Mismatches stop before an RPC; completed reads recheck the
  session before returning data or rewriting draft caches. Missing sessions do
  not return cached drafts or report a draft save as successful for a stale
  authenticated profile. These client guards supplement, not replace, server
  authorization and revision checks. They cannot cancel a write already accepted
  by the server; reopen the record after reconnecting to confirm its result.
- `npm run verify:deploy` passed: 465 application tests in 50 files, including
  20 new session-isolation cases, and 143 disposable database checks across all
  24 local migrations. Typecheck, build and production dependency audit passed.
  Seven existing lint warnings and existing bundle-size warnings remain.
- Two isolated Chrome tabs exercised A -> B account switching, immediate removal
  of A's unsaved form while B's profile loads, sign-out in both tabs and C's empty
  workspace. A same-account refresh retained unsaved form input. At 1440, 768,
  390 and 320px, page identity/content, no overflow, no framework overlay and clean
  console checks passed; desktop/mobile screenshots were inspected. The recovery
  browser suite was rerun successfully. Browser plugin was unavailable, so these
  checks used Playwright with synthetic Auth broadcasts and intercepted RPCs.
- Supabase HTTP/WebSockets were blocked for browser QA. The database checks use
  a disposable Auth shim, not hosted GoTrue. No partner accounts, agreements or
  emails were changed. This pass adds no migration and was not deployed; the
  previously pending delivery-cleanup migration is still pending.
- The hosted A/B/C invite -> counter -> approve -> sign -> export flow remains
  unchecked until run with dedicated authorized test accounts against the
  deployed build. Local passing checks are not a public-beta sign-off.

## Automated Gate

Run from the app root:

```bash
npm run verify:deploy
```

This checks environment variables, types, lint, all UI/unit tests, the build,
dependencies, and disposable PostgreSQL checks. The database suite never connects
to live Supabase or sends real emails. Its Auth shim verifies database behavior,
not GoTrue or inbox delivery. Real browser sessions and Auth links still need
the manual checks below.

The delivery regression suite verifies no external queue on send, one in-app
notification per recipient, later account/verified-email binding, rejected legacy
external-send calls with no writes, and preservation of signed agreement evidence
when retiring old placeholder jobs. Browser checks must cover confirmation,
cancel, failed send/retry and responsive layout with Supabase traffic intercepted.

Local delivery pass: `npm run verify:deploy` passed with 399 application tests
in 49 files and 129 database checks across all 24 migrations. Types, deployment
configuration, build and production dependency audit passed. Seven existing
fast-refresh lint warnings and existing large-bundle warnings remain. Isolated
Chrome checks passed at 1440, 768, 390 and 320px, including cancel without writes
and failed-send retry; desktop/mobile screenshots were inspected. No real invites
or emails were sent.

The read-only hosted security advisor check still reports nine intentionally
authenticated, guarded [SECURITY DEFINER RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
and disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
This describes the deployed baseline, not approval of the pending migration;
re-run advisors after rollout. Do not revoke RPC access needed by the application
without replacing its authenticated workflow.

## Manual Two-Account Flow

1. Create or sign in to Account A.
2. Create or sign in to Account B in a separate browser/profile.
3. From Account A, create a split sheet with Account B invited by exact `@username` or its verified Auth email. Email/phone fields match accounts; they do not send email/SMS. Prefer exact usernames for this beta.
4. Confirm the split appears in Account A Messages and Split Sheets.
5. Confirm the split appears in Account B Messages after refresh.
6. From Account B, accept the invite, send a chat message, and accept or counter the proposal.
7. From Account A, confirm the chat message and proposal state update.
8. When all parties accept, sign from Account A and Account B.
9. Confirm Signed appears only after both authenticated users sign the same approved proposal.
10. Confirm the dashboard table, four status filters, notifications, and global search point to the same split.
11. Confirm Download SPLIT exports the new PDF with correct legal names, shares, signatures, details, and history.
12. Verify an unrelated Account C cannot load or modify the split, including through direct API requests.
13. Open the same proposal in both accounts, sign in one, then sign from the stale tab. Confirm a refresh is required, and the first signature is preserved after refreshing and signing. Verify finalized records reject every edit, including message writes.
14. Confirm the send dialog states that invitations appear inside SPLIT, no external email is promised, and Account B receives one in-app invite notification. Save To Drafts must not notify anyone.
15. Confirm draft editing, deletion with confirmation, PDF download and send all preserve the intended work, collaborators and shares. Canceling delete/send must not write anything.
16. Verify full artist name, account PRO/IPI and saved defaults at their corresponding creation, acceptance, preview and PDF destinations. Check settings persist after sign-out/sign-in; existing signed records must not change when profiles/settings change.
17. Test confirmation/reset links on the hosted domain. An email change must remain pending until Auth confirms it. Test invitation emails only after a real delivery service is intentionally introduced in a later release.
18. In two tabs of the same browser profile, start editing as A, then sign out or switch to B in the other tab. Both tabs must discard A's displayed data and unsaved form; only B's workspace can load. Delayed A responses must not restore A's profile. A same-account token refresh should retain the current form. Separate A/B browser profiles must remain independent.
19. Confirm proposals expose only Accept/Counter to eligible recipients, never their own author. Sending a counter clears the sender's action badge and shows it to the recipient, including the original creator. A signing badge appears only after everyone's approval; declined/completed records and historical disputes do not leave stale badges. These badges are pending actions, separate from the notification bell's unread events.

## Supabase Spot Checks

- `profiles`: one row per signed-up auth user, with public fields and private account fields saved.
- `split_sheets`: one row per created split sheet, with `creator_user_id` matching the creator's auth user.
- `split_sheet_collaborators`: invited parties link to `collaborator_user_id` after the invited account exists.
- `split_sheet_responses`: accept, reject, counter, and sign actions are recorded.
- `server_revision`: increases once per successful write; clients return the unchanged value on their next action.
- Signed entries contain the authenticated `signerUserId`, server timestamp, and the legal name captured from that account's profile. Finalization requires every party's approval and signature on the current proposal.
- `split_sheet_audit_records`: messages are readable event summaries, not raw JSON payloads.
- `split_notifications`: new split invites, messages, proposal updates, and signatures create notifications for the right user. One send creates one invite notification per resolved recipient, not two.
- `account_settings`: owner-only preferences persist with revision checks; unavailable service switches are not presented as working preferences.
- `split_sheet_contract_deliveries`: after the local delivery migration is deployed, in-app sends create no rows here. Historical queued placeholder jobs become `unavailable`; completed jobs and other providers remain untouched.

## Release Rule

Do not call a build beta-ready if any of these fail:

- A sent split disappears after opening Messages.
- A recreated account sees old split sheets from a deleted auth user.
- A collaborator can see or sign a split they were not invited to.
- A participant can alter another person's signature or finalize without every required signature.
- A finalized split can be changed through an API request, even with a read-only UI.
- A send/sign/counter action only saves locally.
- The app promises external delivery or enables email/reminder controls without a working delivery service.
- Real Auth confirmation/recovery cannot complete on the hosted domain.
- Private profile fields leak through API responses or the wrong account can overwrite settings.
- The production Vercel URL serves an older bundle than the latest pushed commit.

## Migration Rollout

The deployed baseline has 23 migrations, including September 10 signing guards
and September 11 privacy, registration, settings and account-email fixes. The
last authorized release verified hosted migration history, rollback-only smoke
checks and unchanged existing split content/revisions.

Pending local migrations, in order:

1. `20260911195254_separate_in_app_split_delivery.sql`
2. `20260912021844_protect_signed_account_deletion.sql`

The second blocks Auth hard deletes that would destroy signed collaborator or
response evidence, including partial/prior signatures. It does not implement
account closure or decide retention periods. See [account-retention.md](account-retention.md).

Delivery migration behavior:
Apply it through the normal authorized Supabase rollout before releasing this
frontend. It preserves the public privacy wrapper and private writer permissions,
removes placeholder queue creation from `send`, rejects `contract_delivery`, and
uses the collaborator-link trigger's notification deduplication key. Existing
clients using normal `send` remain supported.

The migration retires only queued rows whose provider is
`supabase_edge_function_placeholder`, and corresponding parent delivery metadata.
It does not rewrite signed document JSON, signatures, approvals, agreement status,
audit evidence or server revisions. Delivery bookkeeping timestamps can change.
Completed requests and other-provider jobs are untouched. Do not automatically
send old placeholder jobs when adding a real provider later.

After rollout, verify remote history, signed-document checksums, one in-app invite
per recipient, no new external jobs, and the Vercel production bundle. Database
changes are not undone by a frontend rollback. Require testers to refresh old
tabs; clients without `serverRevision` are intentionally rejected.

Unfinished legacy records with client-authored signatures lacking `signerUserId` request fresh acknowledgements. Existing finalized records are preserved without claiming retroactive identity verification. Signed records cannot be edited or deleted through the app; the database guard also prevents cascading deletion of the signed parent record. Review account-deletion/retention handling separately before public beta.
