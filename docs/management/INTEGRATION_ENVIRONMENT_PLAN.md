# Isolated SPLIT integration environment proposal

Prepared October 10, 2026; quote updated after founder organization selection. State: **LOCAL TESTING ONLY; hosted provisioning deferred by founder, no resource created**. Current hosted project `hpwquupkqssqqgqtwdyu` serves the existing product and sends new invitations. Vercel Preview, Git branches and worktrees do not provide database isolation.

## Recommended implementation

Recommend a dedicated hosted Supabase integration project named `split-integration` in SPLIT, with the same reviewed migrations/RPCs and synthetic accounts only. Keep the current production backend authoritative for production; no replacement or data migration is proposed. The fresh project quote is $0/month on the current Free plan. The branch quote is $0.01344/hour, but branching is not included on Free and would require a separately approved plan change; it is not the current recommendation.

Founder explicitly selected SPLIT, confirmed by organization metadata as `zhrbacrrzvmeazbyuwkb`, Free plan. Read-only `get_cost` returned project `{amount: 0, recurrence: monthly}` and branch `{amount: 0.01344, recurrence: hourly}` on October 10. Founder answered the concrete creation/configuration proposal: **"Keep local testing for now."** Organization selection and quotes are recorded for later review; neither resource creation nor cost confirmation is approved. Do not call `confirm_cost`/`create_project`, provision hosted staging or initiate real account/inbox tests under the current scope. No upgrade, paid add-on, provider activation or production changes are included.

Only the current SPLIT project was returned by the connected project inventory. [Supabase pricing](https://supabase.com/pricing) and [billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase) specify two active free projects and possible inactivity pausing after seven days; creation eligibility still must be checked by the service. Stop rather than upgrade if Free eligibility is unavailable. This is an internal test environment, not a paid production-availability promise.

Backend preparation is available at commit `dd74071` on `codex/backend-beta-readiness`: sanitized 32-migration inventory, inert local platform substitutes and synthetic recovery harness. GM independently reran all 10 focused safety/recovery tests successfully; no live data/services were involved. Its immutable preparation manifest intentionally retains null approval/live-target fields; this current proposal records organization/quote separately. Synthetic proof is not hosted setup or current production recovery evidence.

## Provisioning manifest to complete before approval

| Setting | Proposed value / constraint |
| --- | --- |
| Purpose/name | `split-integration` (isolated internal tests; no real users) |
| Organization/billing | SPLIT / `zhrbacrrzvmeazbyuwkb`, Free; fresh-project quote $0/month; creation explicitly deferred |
| Region | Prefer same region as current backend (`us-east-1`), subject to supported option |
| Data | Fresh synthetic creator A, invitee B, outsider C and separate multi-party fixtures; no production copy |
| Schema | Reviewed 32 migration set; record which platform-managed cron/net/Vault pieces are applied or safely substituted |
| Client configuration | Separate public URL/key/project ID for dedicated web fixture/Preview and ignored native test configuration |
| Secrets | Never clone production keys/Vault values; independent scoped test secrets only through approved custody |
| Outbound invitations | `split_private.invitation_email_config.enabled=false`; scheduler disabled/absent; verify no active queue/send job before account creation |
| Phone | `required=false`; frontend switch false; no paid SMS/provider activation |
| Auth callbacks | Dedicated HTTPS web origin and approved native callback; no production redirect fallback for integration |
| Emails/receipts | First use local/intercepted responses. Activate sandbox/controlled-inbox delivery only for an explicitly approved test with exact recipients and limit |
| Telemetry | Separate environment label/project route, sanitized errors only; no production test events without authorization |
| Access | Founder/test operators only, synthetic accounts allowlisted, documented cleanup and credential storage outside Git |
| Native endpoint | Current validator excludes localhost; hosted HTTPS avoids bypassing safety. Any local-only config exception must be Debug-only and reviewed |
| Recovery | Isolated restore/harness has cron/network disabled; no copied active sending configuration; compare contracts/permissions/digests |
| Disposal/cost control | Named owner, stop/dispose date after tests, retention limited to sanitized evidence; founder approves paid extension |

## Verification and activation order

1. Founder currently chooses local testing. Keep hosted work deferred. If the founder later authorizes reconsideration, recheck quote/eligibility and obtain explicit approval for the exact resource before the required cost-confirmation and creation tools.
2. Create the approved isolated target. Record project/branch ID; verify it differs from production and contains no real accounts or records.
3. Apply reviewed migrations with outbound jobs disabled. Do not run production-copy or secret-clone scripts. Check all exposed tables/RPC grants/advisors.
4. Supply separate client configuration through ignored files and dedicated Preview settings; verify target readback before any account or agreement write. Never run `configure-backend-from-web.sh` against production env as a shortcut.
5. Run local test gates and A/B/C permissions/auth/persistence checks, then actual multi-connection stale/current-proposal tests. Verify web/native synchronization for selected beta scope.
6. For delivery testing, approve exact controlled inboxes/provider limit; install independent test worker/webhook keys, prove unsigned/stale rejection, then bounded actual sends and alert receipt.
7. Restore synthetic current-state backup to an isolated target with cron/network blocked; compare permissions, revisions and signature evidence. Never test live account deletion.
8. Archive sanitized results, clear synthetic access, stop costs on the approved date, and submit the candidate release for separate approval.

## Acceptance and rollback

Acceptance: complete manifest/quote, distinct target, no production data/secrets, no uncontrolled outbound jobs, reproducible matching RPCs, A/B/C isolation and appropriate platform evidence. QA independently checks each item. Rollback: remove isolated client binding and disable test jobs/access; delete the test resource only under its approved cleanup plan. Production remains untouched.

Organization selection and quote are complete. The founder deferred hosted provisioning; continue source fixes, fixture/browser checks and disposable local database tests. Hosted Auth/inbox/provider/concurrency/restore release gates remain open and must not be relabeled as verified by local preparation. GM-01 does not block this authorized local work.
