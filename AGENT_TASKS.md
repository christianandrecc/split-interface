# SPLIT agent tasks and coordination

Updated October 10, 2026. Lifecycle: `BACKLOG → READY → IN PROGRESS → REVIEW → TESTING → COMPLETE`, or `BLOCKED`. Ownership below is a workstream assignment; delivery is tracked separately. Effort is an initial engineering estimate, excluding external approval/provider/counsel delays. P0 means a demonstrated critical defect; release gates are mandatory even when classified P1. No newly proven P0 exploit/data-loss defect was established by this audit.

## Workstream ownership

| Workstream | Existing chat | Checkout / branch | Coordination |
| --- | --- | --- | --- |
| GM | General Manager Agent (SPLIT) (`01a125fd-72cf-7c71-9c0b-f08068b3bf6f`) | Current `3303` worktree / `management/split-gm` | Current roadmap, specification, review and independent QA |
| Web | Web Development Agent (SPLIT) (`019f0b98-14e3-7d90-a54e-d00371aed1c9`) | Managed `web-beta-fixes` worktree / `codex/web-beta-signing-evidence`; candidate `06317a5`, based on `4bf5a2a` | Correct GM-03 QA findings while independent QA reviews GM-05; GM-02 gate remains open; no production integration |
| iOS | iOS Development Agent (SPLIT) (`01a125ed-8d05-7b73-9d57-accc0338dfa5`) | `22b2` worktree / `codex/ios-development`; audited baseline `bf9723e`, latest observed HEAD `c8839cd` | Separate native track; post-audit changes need independent review and do not block web-beta preparation |
| Backend specialist | Bounded `/root/backend_audit` assignment | Managed `backend-beta-readiness` worktree / `codex/backend-beta-readiness`, based on `4bf5a2a` | GM-01 manifest and GM-09 synthetic recovery harness/runbook; no hosted provisioning or schema changes |
| Independent QA | Bounded `/root/web_audit` assignment | Read-only candidate review; reports under `/tmp/split-web-beta-qa/` | GM-02/03/05 acceptance review and GM-08 matrix; no overlapping developer edits |
| Operations specialist | Bounded `/root/beta_operations` assignment | Read-only source/private draft assessment; sanitized reports under `/tmp/split-web-beta-operations/` | GM-10 counsel decision packet, support/closure/incident and onboarding gates; no publication/outreach |

Older chats “SPLIT UI (Mobile Version)” and “Build native SPLIT iPhone app” are historical context, not additional active owners. Web and native chats were idle/not loaded at initial inspection; both are now active on the bounded review handoffs below. They are not continuously working. GM audit specialists were temporary and read-only.

## Current queue

| ID | Priority | Owner | State | Effort | Dependencies |
| --- | --- | --- | --- | --- | --- |
| GM-00 Initial audit/management records | P1 | GM | REVIEW | Completed assessment; integration pending | Founder operating directive |
| GM-01 Isolated integration environment | P1 | Backend/GM | REVIEW | Local preparation delivered; hosted setup deferred | SPLIT selected and quoted $0/month; founder chooses local testing; no target created |
| GM-02 Restore dependency release gate | P1 | Web + independent QA | REVIEW | Partial remediation committed; remaining options under review | `c8a06ed`; unresolved braces chain still fails gate |
| GM-03 Exact shares and dirty-builder protection | P1 | Web + QA | IN PROGRESS | Independent review failed; two bounded corrections assigned | `a5add19` loses invalid editing text on stage navigation and focus after discard cancellation; exact correction commit/retest required |
| GM-04 Native negotiation parity/reconciliation | P1 | iOS + QA | READY | 1.5–3 days | Preserve `bf9723e`; shared action contract |
| GM-05 Truthful signer evidence and export metadata | P1 | Web/backend + QA | TESTING | Candidate committed; independent review started | `06317a5`; detached exact-SHA QA; local acceptance and consent review pending |
| GM-06 Complete native lifecycle | P1 if native beta | iOS | BACKLOG | 13–23 days for core work | GM-01/04/05; platform-scope selection; auth/distribution added separately |
| GM-07 Auth/delivery receipts and alert proof | P1 | Backend/QA/operations | BACKLOG | 1–3 days | GM-01; approved controlled inboxes/provider setup |
| GM-08 Independent hosted lifecycle/device QA | P1 | QA + platform owners | IN PROGRESS | Matrix/local review now; 3–5 days hosted verification later | GM-01–07 applicable scope and exact candidate required for hosted writes |
| GM-09 Current recovery including Vault | P1 | Backend/infrastructure | REVIEW | Local synthetic harness committed; hosted recovery remains open | `dd74071`; live capture/custody requires founder decision |
| GM-10 Legal, support and closure operations | P1 | GM/founder + qualified counsel | REVIEW | Sanitized packet prepared; external review unestimated | Founder policy/operator decisions and qualified review remain pending |
| GM-11 Native callback/distribution/device gate | P1 if native beta | iOS/QA/founder | BACKLOG | 5–8 days plus access/review | GM-01/06; Apple account/release identity |
| GM-12 Draft retention and performance refinements | P2 | Platform owners | BACKLOG | Size after design | Core P1 gates; no new service without decision |

## Assignment briefs

### GM-00 — Management establishment

Problem/objective: project progress and old release notes are fragmented. Scope: read-only architecture/product/cloud audit, fresh safe tests, nine core documents, evidence, roadmap and handoffs. Deliverable: reviewed docs-only PR and executive report. Acceptance/evidence: source citations, exact baseline/test results, verified owner isolation, task delivery recorded and integration pending distinguished from completed audit. Testing: document links/whitespace and no product diff. No main merge or production change.

### GM-01 — Safe integration target

Problem/objective: Preview/Production do not isolate the shared backend; invitation sending is active. Prepare/review [environment plan](docs/management/INTEGRATION_ENVIRONMENT_PLAN.md), then provision only after founder approval of exact target/cost. Scope: fresh synthetic-data-only project/branch, separate app configuration, disabled outbound workers, redirect configuration, strict account allowlist, reproducible RPC/migration setup. Deliverable: sanitized environment manifest and test accounts handled outside Git. Acceptance: no production users/secrets/data, zero uncontrolled delivery, matching public contracts, verified target ID and rollback/disposal plan. Tests: migration replay, A/B/C isolation, dummy worker/network denial and native endpoint validation. Hosted changes require explicit approval.

### GM-02 — Dependency gate

Problem: current `npm audit --omit=dev` exits 1 with 8 reported package entries (6 high, 2 moderate); `verify:deploy` therefore cannot currently pass its dependency step. Objective: conservative remediation with exploit-path/build-vs-runtime analysis. Scope: lockfile-compatible patch/override options first; do not force a Tailwind major upgrade. Deliverable: isolated implementation PR or exact reviewable options if a major change is unavoidable. Acceptance: fresh audit at the configured threshold, no new advisory/range regression, unchanged styling/API/PDF behavior. Tests: `verify:beta`, disposable database gate if shared code touched, dependency tree review and representative responsive visual checks. Evidence: commit, fresh audit, checks and screenshots. Production rollout excluded.

### GM-03 — Creation precision and unsaved edits

Problem: creation accepts >2 decimal shares then fails at the server; exiting the in-memory builder discards edits without warning. Objective: predictable creation without ownership rounding or silent loss. Scope: reuse integer-hundredth validation, reject invalid precision before Review; guard Back/Home/reload and preserve retry identity. Partial-draft persistence/schema changes excluded. Deliverable: web PR. Acceptance: `33.333/33.333/33.334` rejected clearly, `33.33/33.33/33.34` accepted, exact total maintained; cancel exit retains work. Tests: blank/negative/overflow/precision/100% cases, cancel/confirm exit and failed-save retry; browser 320px/desktop; full web gate. Evidence: tests/visual results and commit.

### GM-04 — Native response parity and uncertain message outcomes

Problem: `canRespond` blocks counters the server/web allow; trimmed confirmed messages can leave the untrimmed draft after interrupted sends. Objective: shared permissions and no blind duplicate resend. Scope: separate accept/counter eligibility, normalize submitted/confirmed text consistently, preserve new typing; no backend or auth changes. Deliverable: native PR. Acceptance: eligible non-authors whose own invitation is accepted can counter unfinished approved/rejected/partially signed proposals as the server permits; current proposal author, pending invitee, final/declined/outsider actions denied; confirmed spaced text clears only the matching old draft. Tests: domain parity cases including self-counter/pending-invite denial, intercepted HTTP with server trimming/interruption/refresh and edited draft, fixture UI, 31-test suite and isolated Simulator build. Evidence: commit/test log/UI proof; QA independently checks results.

### GM-05 — Signing identity and truthful evidence

Problem: PDF badge predicate does not demand signer account/name provenance; legacy detail may infer all signatures from status, and order metadata promises unenforced behavior. Missing-profile sign-in can store an email-derived legal name. Objective: distinguish canonical acknowledgement from incomplete/local/legacy evidence. Scope: stricter export/detail labeling and identity-completion gating; preserve finalized historical data; fresh defaults/descriptions reflect actual any-order signing. Orphan StepSignatures is not a reachable feature. Deliverable: web/backend-compatible PR and signing behavior note for legal review. Acceptance: no fabricated count, legal identity or verification badge; existing legitimate current records export faithfully; legacy/local records retain original evidence with accurate labels. Tests: missing/wrong signer IDs, missing names, unknown method, local mode, legacy final status, absent profile and current bound signatures; model/UI/PDF parity and full gate. Evidence: fixtures/results/commit; legal conclusions require counsel. No production repair or silent historical rewrite.

### GM-06 — Native core agreement lifecycle

Problem: create/sign/export currently open web. Objective: native core value on the same backend. Scope staged PRs: four-step creation + save/resume + contributors (5–8 days); full review/explicit current-party signing (4–7); PDF view/share fidelity (2–4); secure draft persistence/verification (2–4). Do not add an independent projects service or PDF endpoint without review. Deliverables: bounded native PRs and fixture/live demonstrations. Acceptance: native create→invite→review/counter→sign→retrieve/export with server IDs/revisions and existing document fidelity. Tests: native fixtures/HTTP/domain, shared RPC/security, isolated A/B/C, offline retries, real device/accessibility. Completion depends on selected beta scope and GM-08/11.

### GM-07 — Real email/receipts/operator alerts

Problem: deployed receipt function is not evidence that provider signing secret/subscription or alerts work. Objective: prove delivery and recipient identity/error handling. Scope: approved controlled inboxes on isolated target; auth confirmation/resend/recovery/email-change plus invitation route/accept/decline, signed receipts and creator retry. Configure provider only after required authorization; never send deliberate complaints/spam. Deliverable: receipt/callback/event/alert evidence without credentials. Acceptance: actual inbox receipt, authenticated intended account, signed webhook rejection of modified/stale/unsigned events, no outsider diagnostics, failure visible to operator and creator. Tests: controlled provider sandbox/fixtures, real authorized inboxes, cooldown/idempotency and account switching. Evidence: sanitized IDs/screenshots and exact candidate.

### GM-08 — Independent release QA

Problem: local/mock checks do not prove hosted identity, concurrency, synchronization or recovery. Objective: verify [checklist](LAUNCH_CHECKLIST.md) on candidate versions. Scope: A/B/C accounts; work creation, invitations, counters, current approval/signatures, final retrieval/PDF; stale/concurrent writes, failures, reload/session/account switching; native transitions/device if applicable. Deliverable: signed-off evidence ledger with defects filed. Acceptance: all P0/P1 relevant to cohort closed, zero unauthorized exposure/partial writes, adequate errors/accessibility, working monitoring/feedback and recovery. Tests: genuine multi-connection races plus browser/device journeys. Do not mutate production partner records.

### GM-09 — Current recovery coverage

Problem: dated 23-migration backup misses current changes and capture refuses the live Vault secret; backup/key recovery are not independent. Objective: a recoverable current environment. Scope now: design/harness for secrets supplied through an approved recovery channel, disable scheduler/network on restore, schema/permissions/signed-digest checks; prepare exact storage/key/cost proposal. Capture/off-device storage only within founder approval. Deliverable: reviewed recovery runbook and isolated drill evidence. Acceptance: current encrypted snapshot, independently recoverable key/copy, correct migration/RLS/signature history, no outbound jobs, demonstrated restore. Tests: wrong key/tamper, cron disabled, canonical digests and five permission contexts. Never print Vault contents or put backups in Git.

### GM-10 — Legal/support/closure operations

Problem: shipped legal pages identify themselves as placeholders; draft review package and manual closure are not approved operating policy. Objective: truthful reviewed consent/privacy and reachable support/closure. Scope: refresh existing September legal draft against current product, resolve entity/audience/markets/retention/signing acknowledgement, establish approved support inbox/operator and session-revocation procedure. Deliverable: concrete review packet and operating procedure. Acceptance: counsel/founder approval, consent version capture, owner verification, tested support/replies and actual revoked access without erasing protected signed evidence. Tests: isolated old-token/account closure and support checks only when authorized. No legal publication, external contact or deletion during planning.

### GM-11 — Native auth and TestFlight

Problem: fixture release identity/no team/icon/callback continuation/device evidence. Objective: installable approved native beta. Scope: signup/recovery/invite callbacks (2–4 days), release identity/project generator/signing/privacy/icon/archive/distribution (2–3), physical device/minimum OS/VoiceOver verification. Deliverable: reviewed archive and metadata plus device evidence. Acceptance: approved bundle/team, correct non-production backend packaged safely, working deep links, privacy declarations/support, device lifecycle passes. Submission/distribution requires founder authorization and Apple account access. No signing credential retrieval or provider purchase.

### GM-12 — Important improvements

Problem/objective: mobile memory-only drafts and large web bundles increase friction; onboarding/feedback metrics need measured baselines. Scope after P1: deliberate draft persistence, appropriate lazy loading/performance budgets, actual accessibility tests and privacy-reviewed funnel instrumentation. Deliverable: separately sized proposals/PRs. Acceptance/testing: measured before/after behavior and no core regressions; no invented analytics target or optional feature expansion.

## Handoff and review ledger

- Web-beta execution authorized by founder on October 10: "delegate the tasks to the corresponding agents ... for web beta launch." This replaces the earlier web read-only planning scope. [Execution tracker #3](https://github.com/christianandrecc/split-interface/issues/3) carries the release gates; individual task state remains here.
- Web implementation assignment delivered through `send_message_to_thread`; supported status confirms active work. Git worktree inventory independently confirms the isolated path/branch above. Developer reports dependency remediation and creation safeguards in progress; these are not accepted fixes or passing release evidence yet. GM-05 is assigned next in the same workstream, READY until implementation starts.
- Backend assignment delivered through `followup_task`; startup confirms clean dedicated branch and scope. Current work is a sanitized isolation manifest/runbook and synthetic-only recovery harness with inert cron/net/Vault substitutes. Current production capture refusal remains; all hosted provisioning/cost confirmation, real secrets and live backup/restore excluded.
- QA assignment delivered through `followup_task`; startup confirms independent matrix/baseline review. GM-08 IN PROGRESS denotes preparation/local coverage, not live account/inbox/concurrency certification. Candidate testing begins after a concrete committed implementation is available.
- Operations assignment delivered through `spawn_agent`; startup confirms GM-10 private read-only assessment and sanitized packet. No legal wording is approved/published, and no support contact/provider/session policy is changed.
- Subsequent preparation received: independent QA matrix/baseline (66 targeted tests/9 files) and `c8a06ed` advisory review; operations packet (63 local tests/6 files, nine OPEN operating gates); backend `dd74071` (10 focused synthetic tests reported, live backup guard preserved). These are preparation/local results, not hosted or legal sign-off.
- GM-03 independent candidate assignment delivered through `followup_task` for exact SHA `a5add19dccb5b78ae3cdcc9ec10634da2b352624`; QA confirms detached `/tmp/split-web-beta-qa/gm03-candidate`, leaving uncommitted GM-05 work untouched. Browser/network/inbox limitations must remain explicit.
- GM-03 review received: **FAIL pending QA-GM03-1/2**. Candidate 81/81 relevant tests pass; independent cases 21/23 pass, with two reproduced editing/focus failures. Strict shares, valid wizard navigation and fixture retry identity pass; native reload-warning proof remains inconclusive. Corrections delivered to Web Development Agent (SPLIT) through `send_message_to_thread`, scoped to a distinct commit after `06317a5`. [Current review record](docs/management/WEB_BETA_PROGRESS_2026-10-10.md).
- GM-05 candidate `06317a59ac8a600268db3da0fb7676484397f081` received on `codex/web-beta-signing-evidence`. Developer reports 812 web tests/typecheck/lint/build and 166 disposable database checks passing. Independent GM-05 assignment delivered through `followup_task`; QA confirms a detached exact-SHA checkout with synthetic fixtures/empty environment/network denial. This is TESTING, not accepted or released.
- Founder selected SPLIT organization. Verified quote: separate project $0/month; branch $0.01344/hour and not included on current Free plan. Founder answered the concrete resource proposal "Keep local testing for now." [Environment record](docs/management/INTEGRATION_ENVIRONMENT_PLAN.md) preserves quotes; no cost confirmation/target creation or hosted QA authorized. Web/QA owners received this constraint through supported tools.
- GM independently inspected the backend isolation/harness boundaries and reran all 10 focused tests at `dd74071` (exit 0; `/tmp/split-gm-backend-preparation-tests.log`). Synthetic preparation is reviewable; current production backup/off-device custody/hosted restore remain open.
- Initial web/backend/native audit assignments: delivered through supported subagents; complete source reports received; root ran web/database gates and read back native logs. No claim of hosted workflow completion.
- Management records: committed on `management/split-gm` and published as [draft PR #2](https://github.com/christianandrecc/split-interface/pull/2). Independent source/specification review completed; integration remains pending. The GitHub connector could not create the PR (integration permission denied); the existing authenticated browser created it successfully and the PR is attached to the GM chat.
- Historical web read-only review handoff was delivered October 10 before implementation authorization; its restricted scope is superseded by the web-beta assignment above.
- Historical iOS read-only review handoff was delivered October 10. The native chat now has separate subsequent development activity; its reported progress is not independent QA acceptance by GM.
- GitHub search found no open issues/PRs at initial inspection. This document is the initial actionable queue; convert accepted tasks into issues as needed, referencing this single source rather than duplicating status across chats.
- PR review → independent tests → founder-approved integration/release. `main` merge can cause production deployment. No merge authorized this session.
