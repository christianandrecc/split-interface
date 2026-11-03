# Archived web S1+S2 compatibility review — November 3, 2026

GM read this exact docs-only review from evidence commit 40b4a5fa4ace3b8bc69d62faa85c73e9fc70e17e and verified its SHA-256 `e05cc02de33c643a997d340a89af46f298a944a838f3b7b24e7f93edf7d86d2e`. Companion 14-source evidence JSON SHA-256 `fff7ed8ec4a58070ea4267712416efc3e835fa484fd5fe01466a465b05683f07` matches the owner packet; GM also verified all 14 source blobs, hashes and lengths against immutable Git. Shared S1+S2 is compatible for separately assigned fixture-only design; no implemented server guard or production policy is accepted.

---

# S1 + S2 Web Compatibility Review

Date: November 3, 2026. Scope: exact-source, documentation-only review. No implementation or runtime certification.

## Verdict

S1 has no additional web compatibility blocker beyond the already identified N1 duplicate-session contradiction. S2 closes N1 at the document level. Read together, these exact revisions are ready for GM to record the shared review and consider a separately assigned, fixture-only adapter/permission-test design. This is not approval to implement a production contract, modify SQL/RPC, activate a provider, or deploy.

Reviewed identities:

- S1: `536dfe65ad44a096c6939a2c5c150ab9ec21a508`, `build-it-app-main/docs/beta-docusign-server-boundary-cutover-proposal-v0.1-2026-11-03.md`.
- S2: `0a5b9808667913033de8bc9efd77a7717dccbf50`, `build-it-app-main/docs/beta-docusign-server-boundary-s2-session-duplicate-2026-11-03.md`.
- Web behavior reference: `c2105759bdeb8a288644f5a4bc0f43f97555e638`. Focus `325f64d9e2f0475cfafecd4725a338bd390c07c0` and tooling `7ea23599d2b69adb33f2bc7a3299342f95386a51` are separate local candidates, not service implementations.
- Database source reference: `dd74071395dd74d7470a12a6ba09754cb304776e`. No assertion about hosted grants or deployed database state.
- Native `4f01499b0a926d141497d82bbd4c195d7b2922f5` remains the accepted transport-free local simulation reference named by S1; this web review does not independently recertify native behavior.

## Web Source Trace

Paths below are relative to `build-it-app-main/` at the exact web or database reference above. The companion `s1-s2-source-evidence.json` retains exact source blobs, hashes, and numbered anchor locations.

| Surface and source anchors | Review result against S1 |
| --- | --- |
| `src/components/contract-builder/document.ts:107`, structural legacy parser; `src/lib/splitSheetStorage.ts:431`, collection load; `:475`, export refresh | S1 S06 and section 6 correctly require exclusion before normalization/projection, not a legacy-shaped provider stub. Separate typed/discriminated provider reads are required. The current structural parser cannot establish provider provenance. Mixed collections must retain genuine authorized legacy rows and unknown historical fields. |
| `src/lib/splitSheetStorage.ts:147`, local-draft eligibility; `:431`, read failure/cache ordering; `:487`, save; `:562`, participant actions | S1 section 6 accurately distinguishes installed-client failure/cached drafts from server authority. Existing local-only mode and offline exports cannot be retroactively revoked. Updated clients must not turn provider denial into cached signing/export eligibility. These are future requirements, not implemented protections inferred from the proposal. |
| `src/lib/splitSheetDownload.ts:22`, refreshed download and source selection; `src/lib/splitSheetPdf.ts`, local/unconfirmed footer and final-record eligibility | S1 sections 3-5 correctly separate generated legacy/local PDFs from exact provider-executed originals and a separate certificate. An authorization failure must not create a certified fallback. Prepared and executed digests are distinct; current rendering cannot substitute for retained provider bytes. |
| `supabase/migrations/20260911163414_enforce_split_profile_privacy.sql:123`, projection; `:207`, wrappers/load/grants | S1 S01/S02 and section 6 put guards before `normalize_pending_split_signatures` and `visible_document`. Output filtering alone cannot undo side effects. Direct column access and account-specific legacy membership need row-level filtering, not a blanket revoke that breaks legacy readers. |
| `supabase/migrations/20260911164913_capture_collaborator_registration.sql:45`, private participant actions; `:181`, signing/registration; `:238`, state/effects | S1 S03 and sections 4/6 cover every old invite/approval/counter/sign/chat route, including private/helper reachability, before registration, state/revision, response, sync, audit, notification, or outbox effects. Even chat cannot be assumed safe through the old recalculating route. |
| `supabase/migrations/20260911195254_separate_in_app_split_delivery.sql:28`, private upsert; `:106`, replacement/effects | S1 S04 and sections 2/6 do not trust replacement JSON to select or preserve execution policy. Existing-row and absent-row creation are distinct; authoritative classification and sheet-identity/advisory locking must precede any insert or effect. Missing/unknown policy fails closed. |
| `supabase/migrations/20260911132604_allow_owned_draft_deletion.sql:2`; `20260910220712_enforce_split_signature_ownership.sql:48` | S1 S05/section 6 preserves true legacy draft deletion while prohibiting evidence-destroying cascades. Missing policy is not proof that deletion is safe. Original signed legacy records remain immutable. |
| `supabase/migrations/20260929163912_split_invitation_email_outbox.sql:49` and `:133`; `20260911163414_enforce_split_profile_privacy.sql:102`; `20260814183000_split_notifications.sql:64`; `20260910213449_restrict_client_function_execution.sql:5` | S1 S08/S09 and sections 6/7 cover producer plus worker checks, pending queues, verified-contact/profile relinking, notifications, function reachability, views, Realtime, helpers and permissive-RLS OR bypasses. No email/replay or frozen recipient rebinding follows from this documentation. |

## Typed Service and Ordering Review

S1 sections 2-5 distinguish source-sheet revision, projection revision, access revision, immutable operation input/outcome revision, and full account/environment/attempt/frozen bindings. Display names, email, client metadata, operation IDs and digests are not authorization. A/B concurrent different keys still require one active-or-uncertain attempt and one persisted dispatch owner; reads do not repeat provider effects. Unknown create/void and response loss do not imply permission to retry.

Both clients must suppress stale success and error publication after account/access/selection changes. Callback, return URL, lease delivery and individual signature facts cannot establish canonical completion. Server reconciliation plus complete retained artifact correspondence is required for finalization. Every artifact and certificate read requires fresh authorization. Supersession/history and later operational findings cannot rewrite originals. These are coherent proposed boundaries, not claims of proven implementation.

## N1 Closure in S2

S2 lines 5-37 replace only the conflicting S1 session custody, confirmed response, recovery and replay clauses. An authorized exact confirmed duplicate O1 returns HTTP 409 with exactly six nonnull string fields: `contractVersion`, `code`, `messageKey`, `recovery`, `requestId`, `operationId`. The code is `sessionOutcomeAvailable`; recovery is `readOperationOutcome`. It is a standalone Failure, not a denied stored outcome or a second CommandOutcome representation. No receipt, inputBinding, session, lease, ceremony, URL or token is included.

Only the original dispatch-owner continuation can deliver its live URL once. Pending/unresolved duplicates are bearer-free; a confirmed duplicate cannot subscribe to later bearer delivery. O1's confirmed result, immutable input, receipt and outcome revision remain unchanged after response loss, process loss, use or expiry. Authorized outcome read returns only the original receipt with delivery `notIncluded`. Changed input conflicts, and current denial/other-account access reveals no stored outcome. A new O2 requires separate explicit intent and all fresh policy, binding and replacement checks; no automatic reissue is permitted.

S2 proposed vectors SRV-08.N1a-N1g cover delivered/lost/process-loss duplicates, dispatch concurrency, unresolved issuance, changed input/denial and explicit replacement. They were inspected as future fixture requirements, not executed. The local fake's in-memory lease replay remains unchanged and is not evidence of this proposed service behavior. No additional web blocker found in this bounded correction.

## Open Gates and Limits

- D01: legacy classification/unfinished agreements, creation cutover, supported installed clients and mixed-list/export UX.
- D02: signer identity, authority, consent, reauthentication and account/contact correction.
- D03: ceremony/browser/SDK transport, origins/return correlation, session lifetime, replacement and revocation limits.
- D04: production terms/signer/document encoding, cardinality, renderer/signature placement, original PDF/certificate validation and byte-delivery policy.
- D05: retention/deletion/closure/access after exit, certificate privacy, recovery custody, restore and alerts.
- D06: provider account/entitlements, OAuth/operating model, environment separation, delivery costs and supersession authority.
- D07: authenticated events/config/key scope, replay retention, budgets, uncertain-outcome recovery and operator authority.

All seven remain open. This report adds no production policy, schema, endpoint, SDK, adapter, provider capability or legal assurance. The subsequent web dependency/focus/CSP owner checks are a separate workstream and do not execute S1/S2 or clear these gates. No hosted settings, credentials, account actions, external messages, provider calls, migration, push, merge or deployment were performed for this review.
