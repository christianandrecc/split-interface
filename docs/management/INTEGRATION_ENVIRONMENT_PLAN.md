# Isolated SPLIT integration environment proposal

Prepared October 10, 2026. State: **REVIEW; no provisioning authorized or performed**. Current hosted project `hpwquupkqssqqgqtwdyu` serves the existing product and sends new invitations. Vercel Preview, Git branches and worktrees do not provide database isolation.

## Recommended implementation

Use one dedicated hosted Supabase integration project or supported data-free development branch in the founder-selected organization, with the same reviewed migrations/RPCs and synthetic accounts only. Keep the current production backend authoritative for production; no replacement or data migration is proposed. A branch can be used only if its current availability/cost and scheduler behavior are confirmed. Prefer the lowest-cost supported isolated option after a quote, not a guessed plan price.

The organization linked to the current project is `zhrbacrrzvmeazbyuwkb`; this is observed metadata, not authorization to bill that organization. The cost tool requires the founder to select the organization and confirm the quoted cost before resource creation. Obtain that selection/quote before a provisioning request. Apple/provider costs are separate and unverified.

## Provisioning manifest to complete before approval

| Setting | Proposed value / constraint |
| --- | --- |
| Purpose/name | `split-integration` (isolated internal tests; no real users) |
| Organization/billing | Founder-selected organization; exact creation and ongoing quote pending |
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

1. Confirm target organization/option and quote; present the exact create/configuration request for founder approval.
2. Create the approved isolated target. Record project/branch ID; verify it differs from production and contains no real accounts or records.
3. Apply reviewed migrations with outbound jobs disabled. Do not run production-copy or secret-clone scripts. Check all exposed tables/RPC grants/advisors.
4. Supply separate client configuration through ignored files and dedicated Preview settings; verify target readback before any account or agreement write. Never run `configure-backend-from-web.sh` against production env as a shortcut.
5. Run local test gates and A/B/C permissions/auth/persistence checks, then actual multi-connection stale/current-proposal tests. Verify web/native synchronization for selected beta scope.
6. For delivery testing, approve exact controlled inboxes/provider limit; install independent test worker/webhook keys, prove unsigned/stale rejection, then bounded actual sends and alert receipt.
7. Restore synthetic current-state backup to an isolated target with cron/network blocked; compare permissions, revisions and signature evidence. Never test live account deletion.
8. Archive sanitized results, clear synthetic access, stop costs on the approved date, and submit the candidate release for separate approval.

## Acceptance and rollback

Acceptance: complete manifest/quote, distinct target, no production data/secrets, no uncontrolled outbound jobs, reproducible matching RPCs, A/B/C isolation and appropriate platform evidence. QA independently checks each item. Rollback: remove isolated client binding and disable test jobs/access; delete the test resource only under its approved cleanup plan. Production remains untouched.

This proposal is concrete enough for environment selection; provisioning still depends on the founder's organization choice, current cost quote, and final approval. GM-01 does not block local fixture tests or source fixes.
