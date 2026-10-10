# Backend beta preparation: GM-01 and GM-09

Prepared October 10, 2026 against `4bf5a2ae5e3d37f51750990506533733d686f8b6`.
This is a reviewable preparation package. No hosted target has been selected,
quoted, provisioned, configured, backed up or restored by this work.

[The sanitized manifest](backend-beta-manifest.json) contains the exact 32
migration filenames and SHA-256 digests, intended access boundaries, disabled
activation switches, and remaining approval fields. The validator deliberately
rejects turning this preparation manifest into an approval or live connection
record. A later approved target requires a separately reviewed completion record.
No service key, worker bearer, webhook secret, database credentials, real accounts,
agreement content or backup belongs in this public repository.

## Decisions before hosted work

The founder must select the organization, then approve the exact quoted resource
and ongoing cost before creation. Choose a fresh integration project or a
supported data-free development branch only after confirming availability,
extension behavior and price. Do not clone production Auth users, rows, provider
configuration, API/JWT keys or Vault data. No cost approval exists in this package.

Backup decisions are separate: name the operator, destination, independent key
custody, retention, cadence, acceptable data loss, recovery time and any spending.
Neither this document nor the synthetic drill chooses those policies.

## Target and reproduction contract

| Area | Required readback before synthetic hosted writes |
| --- | --- |
| Identity | Approved organization/resource ID and target URL/key/ref agree; target differs from production `hpwquupkqssqqgqtwdyu`; record owner and disposal date |
| Starting data | Fresh target has no production users, agreements, Storage files, Vault rows or queues imported |
| Schema | Reviewed 32 migration hashes match manifest; record managed extension versions, PostgreSQL version, Data API exposure and effective grants |
| Data API | Expose only `public`; keep `split_private`, `auth`, `vault`, `cron` and `net` unexposed; check permissions through effective role privileges, not only a successful REVOKE |
| Application access | Nine public/four private application tables retain RLS; raw document/contact columns and direct split writes remain denied; public wrappers project participant-scoped documents |
| RPC access | Manifest lists authenticated application RPCs, service-only worker/receipt RPCs, and the exact anonymous boolean username lookup; internal writers and notification helpers remain inaccessible |
| Jobs | Invitations disabled, worker URL unset, cron absent/inactive, no active processing leases or queued transport; inspect non-invitation cron/triggers/subscriptions as well |
| Web | Dedicated ignored configuration and selected Preview environment use separate public URL/key/ref and explicit dedicated HTTPS callback origin; no production redirect fallback |
| Native | Separate ignored Debug configuration; existing HTTPS endpoint validator must accept the dedicated target without weakening Release validation; web-first scope does not activate native callbacks |
| Auth | Keep public signup disabled until controlled Auth QA is approved. Seed only approved synthetic identities via the authorized method; do not assume email signup/admin invitation is mail-free |
| Phone | Backend `required=false`, frontend rollout false; no SMS provider, paid send or phone-only signup |
| Providers | No deployed sending worker, provider keys or webhook subscription until its bounded test is approved. When deployed, each function's gateway setting and custom bearer/Svix check must be read back |
| Telemetry | Separate integration route/label, sanitized operation/failure-kind fields, named alert recipient, no production test events |

The scheduler migration creates a Vault secret and a minutely cron job even
though email delivery defaults to disabled. Apply it only to the verified fresh
target, then explicitly deactivate the job before accounts or test work exist.
Do not rely on worktrees, Git branches, Vercel Preview, or a false frontend phone
switch for backend isolation. The checked-in Supabase config contains only the
production project reference; it is not an integration configuration or a complete
Edge Function deployment manifest.

On an approved isolated target, establish and verify these postconditions before
exposing API/Auth/worker services or importing synthetic recovery fixtures:

- `invitation_email_config.enabled=false`, `activated_at=null`, `worker_url=null`;
- `split-invitation-emails` cron inactive/absent and all other outbound schedules reviewed;
- no queued pg_net requests; network extensions/workers cannot drain restored requests;
- restored `waiting_address`, `queued`, and `processing` invitation jobs quarantined,
  with leases cleared; never replay historical or ambiguous sends automatically;
- receipt endpoint, SMTP/OAuth/SMS, Auth webhooks, trigger-based network calls,
  realtime publications/subscriptions and provider bindings inventoried separately.

These are target requirements, not SQL to run on the production source. A capture
must remain read-only. Apply recovery transformations to an offline/quarantined
restored target before any scheduler, transport or provider service starts.

## Synthetic local recovery proof

From `build-it-app-main`, using Node 24 and installed locked dependencies:

```bash
node --test scripts/recovery/safety.test.mjs scripts/recovery/synthetic-current.test.mjs
node scripts/recovery/synthetic-current.mjs
npm run verify:database
```

The new command accepts no arguments, database URLs, external archive paths,
environment credentials or supplied secrets. It creates three in-memory PGlite
databases; it opens no listener, provider client or hosted connection and writes
no fixture archive/key to disk. Only aggregate proof fields are printed. Errors
withhold database parameters and credential details.

The drill:

1. Checks the prepared manifest against all 32 source migration hashes. Executes
   30 application migrations unchanged; the two platform migrations execute with
   extension installation replaced by explicit inert cron/net/Vault substitutes.
   Their application dispatch function and permission SQL execute locally. This
   does not prove real Supabase extension or grant-owner behavior.
2. Creates synthetic A/B/C Auth rows and uses the current guarded public RPCs to
   obtain a canonical two-party signed agreement plus an unsigned invitation.
   Five visibility contexts cover anonymous, creator, invitee, outsider and an
   unknown identity. This is an Auth claim shim, not GoTrue authentication.
3. Seeds a synthetic active schedule/processing lease, valid worker token and
   queued network request, then quarantines the
   local source fixture's outbound state. The network substitute independently
   rejects direct transport. The synthetic Vault rows are removed before archive.
   No corresponding mutation is performed or proposed on production.
4. Builds a fresh application/Auth fixture copy excluding Vault and transport
   rows, preserving migration/privilege state. It checks the previous synthetic
   worker token is absent from the uncompressed image before encryption. Deleting
   secret rows alone can leave dead bytes in physical database pages; this copy
   does not archive the source's physical pages. It then creates an authenticated
   AES-256-GCM encrypted in-memory PGlite archive bound
   to the exact synthetic target and migration digest. Rejects another target,
   wrong migration digest, wrong key and a modified ciphertext. Existing live
   `age` backup encryption remains unchanged; this is not its replacement.
5. Restores locally and verifies no secret row was copied. Supplies a fresh,
   independently generated in-memory test worker secret, stores only its hash in
   application configuration and verifies the real worker-authentication RPC.
   The previous token is rejected; delivery remains disabled and claiming returns
   an empty queue. No key/token/provider credential is printed or returned.
6. Compares whole-row digests for sheets, collaborators, proposal versions,
   responses and audit history; checks all 13 application tables have RLS,
   effective RPC/column/schema privileges and five visibility contexts match.
   Deliberately grants raw document access and alters synthetic audit evidence to
   prove drift detection, then restores the fixture and repeats final checks.

The aggregate proof identifies 32 migration files, 30 unchanged application SQL
migrations, two inert platform migrations, five permission contexts, zero source
Vault rows archived, matching signed-evidence digests and disabled outbound state.
It proves the fixture's one source secret row and one network request were removed
before archive, while signed evidence was preserved.
PGlite's physical in-memory archive is not a supported hosted Supabase restore
format or a current production backup. The script does not test real Vault
encryption/root-key recovery, cron execution, pg_net background workers, GoTrue,
PostgREST, Edge Functions, Storage, SMTP, callbacks, provider receipt signatures,
inbox placement, on-call alerts, off-device key recovery or paid resource creation.

Local validation on October 10, 2026 with Node 24.15.0 passed all 10 focused tests
(including 21 unsafe-manifest mutations and the full recovery drill), the
aggregate CLI drill, three Node syntax checks and `git diff --check`. Existing
`npm run verify:database` also passed its application checks across 30 migrations;
it lists the two hosted extension migrations separately. No frontend, dependency,
shared migration or live recovery tool was changed.

## Current recovery design and bounded options

The existing live [backup tool](../scripts/recovery/backup-local.mjs) still refuses
nonempty Storage or Vault. Keep that guard. The September snapshot proves only
23 migrations and cannot establish current recovery. The current scheduler adds
a Vault dependency, so simply rerunning the old tool is not a remedy.

**Recommended for review: restore application state, independently reissue worker
secrets.** A future authorized capture creates a consistent encrypted application/
Auth/schema/role archive plus a protected inventory of platform dependencies. It
does not copy decrypted Vault values or assume source Vault ciphertext/root keys
can move between projects. Restore only to the specifically approved quarantined
target, with cron/transport/provider processes blocked before import. Preserve
signed history and hashes; quarantine pending email work separately. Provision
the target's supported Vault extension and supply a new worker bearer through
the approved secret channel, write its hash to private configuration and verify
old-token rejection. Resend API/webhook/SMTP/OAuth/API/JWT settings have separate
approved custody or reissuance procedures. Leave URL/enabled/jobs off until a
separate bounded activation test. Independent secret rotation at recovery does
not modify or rotate the production source during preparation.

**Alternative needing provider confirmation: supported same-environment secret
recovery.** Determine whether the provider's managed backup, Vault encryption
root-key and project configuration recovery guarantees cover the desired target.
Obtain precise support/documentation and test it on approved synthetic data first;
do not infer that a SQL dump or encrypted Vault row is independently recoverable.
This may carry different paid-plan and custody requirements. No option is approved.

Before extending capture, review: schema/role/extension selection; offline restore
transformations; current job/provider records; read-only consistent capture;
authenticated encryption and wrong-key/tamper failures; no secret parameters in
logs; independent backup/key access; storage-file coverage; target rejection;
compatibility with the selected PostgreSQL version; and a founder-approved
restoration/activation process. No new shared schema/RPC architecture is required
by this package.

The synthetic archive-builder copy is not a production export recipe. Its direct
row copies disable triggers in a disposable fixture, and do not establish
consistent live capture, managed Auth completeness or extension portability.
Future capture must use reviewed read-only snapshot/export semantics and omit
secret-bearing schemas; never treat DELETE/VACUUM or a byte search as a guarantee
that a source physical backup excludes secrets.

## Hosted QA and activation remain separate

Once organization/cost/target approval and the reproduction readbacks pass, QA
must prove real A/B/C auth and callbacks, agreement persistence/counters/current
proposal acknowledgements, stale/concurrent writes, finalized reads/PDFs and
outsider denial on exact candidate versions. Local signing checks do not prove
hosted sessions or legal identity.

Delivery activation needs separate approval naming the provider budget, exact
controlled inboxes, maximum sends, operator and stop conditions. Use independent
test sender/webhook secrets; deploy both functions with reviewed custom
authentication and explicit gateway settings. Verify unsigned/modified/stale
Svix requests reject, service-only receipts cannot be invoked by clients, and
creator diagnostics/retries remain isolated. Prove provider acceptance, signed
receipt and actual inbox receipt separately. No deliberate spam complaint.
Prove operator and creator failure alerts; a healthy endpoint or bell notification
does not establish an on-call alert. Disable jobs before changing templates with
outstanding idempotent sends. Historical/ambiguous delivery remains quarantined.

Completion requires a fresh authorized current snapshot, approved off-device
copy/key custody, and an isolated hosted recovery drill with no outbound jobs.
Source preparation and local proof advance GM-01/GM-09 but do not complete those
hosted acceptance gates or approve release/provisioning/spending.

## Sources reviewed October 10, 2026

- [Supabase changelog](https://supabase.com/changelog): relevant PostgreSQL
  [15.19/17.11 compatibility changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
  require target-version/extension review; no provider upgrade performed.
- [Vault](https://supabase.com/docs/guides/database/vault): encrypted secret rows
  and privileged decrypted view are separate from root-key recovery guarantees.
- [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
  and [backups](https://supabase.com/docs/guides/platform/backups): logical database
  recovery does not independently prove all hosted services/configuration/files.
- Existing [recovery notes](database-recovery.md), [invitation operations](split-invitation-emails.md),
  [phone rollout](beta-phone-verification.md), [privacy boundary](privacy-controls.md)
  and [account closure](account-retention.md) remain dated evidence and operating constraints.
