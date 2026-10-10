# SPLIT agent tasks and coordination

Updated October 10, 2026. Lifecycle: `BACKLOG → READY → IN PROGRESS → REVIEW → TESTING → COMPLETE`, or `BLOCKED`. Ownership below is a workstream assignment; delivery is tracked separately. Effort is an initial engineering estimate, excluding external approval/provider/counsel delays. P0 means a demonstrated critical defect; release gates are mandatory even when classified P1. No newly proven P0 exploit/data-loss defect was established by this audit.

## Workstream ownership

| Workstream | Existing chat | Checkout / branch | Coordination |
| --- | --- | --- | --- |
| GM | Inspect SPLIT project architecture (`01a125fd-72cf-7c71-9c0b-f08068b3bf6f`) | Current `3303` worktree / `management/split-gm` | Current roadmap, specification, review and independent QA |
| Web | SPLIT UI (Front End) (`019f0b98-14e3-7d90-a54e-d00371aed1c9`) | Latest command evidence uses `/Users/christiancarrera/Documents/SPLIT INTERFACE (CODEX)` / `main`; app listing still reports older `New project 2` cwd | Must verify checkout before edits and create an implementation branch; main triggers production deployment |
| iOS | Continue SPLIT iOS development (`01a125ed-8d05-7b73-9d57-accc0338dfa5`) | `22b2` worktree / `codex/ios-development` at `bf9723e` | Preserve committed native milestone, shared RPC compatibility and design blueprint |

Older chats “SPLIT UI (Mobile Version)” and “Build native SPLIT iPhone app” are historical context, not additional active owners. Web and native chats were idle/not loaded at inspection; they are not continuously working. GM audit specialists were temporary and read-only.

## Current queue

| ID | Priority | Owner | State | Effort | Dependencies |
| --- | --- | --- | --- | --- | --- |
| GM-00 Initial audit/management records | P1 | GM | REVIEW | Completed assessment; integration pending | Founder operating directive |
| GM-01 Isolated integration environment | P1 | Backend/GM | REVIEW | 1–2 days setup/validation after approval | Exact provider plan/cost approval; no production clone |
| GM-02 Restore dependency release gate | P1 | Web + independent QA | READY | 1–2 days | Current audit; isolated implementation branch |
| GM-03 Exact shares and dirty-builder protection | P1 | Web + QA | READY | 1–2 days | Existing counter validation; no schema expansion |
| GM-04 Native negotiation parity/reconciliation | P1 | iOS + QA | READY | 1.5–3 days | Preserve `bf9723e`; shared action contract |
| GM-05 Truthful signer evidence and export metadata | P1 | Web/backend + QA | READY | 2–3 days | Legacy fixtures; review actual signing/consent semantics |
| GM-06 Complete native lifecycle | P1 if native beta | iOS | BACKLOG | 13–23 days for core work | GM-01/04/05; platform-scope selection; auth/distribution added separately |
| GM-07 Auth/delivery receipts and alert proof | P1 | Backend/QA/operations | BACKLOG | 1–3 days | GM-01; approved controlled inboxes/provider setup |
| GM-08 Independent hosted lifecycle/device QA | P1 | QA + platform owners | BACKLOG | 3–5 days | GM-01–07 applicable scope; exact candidate build |
| GM-09 Current recovery including Vault | P1 | Backend/infrastructure | READY | 2–4 days design/drill | Founder backup decision; current secret/scheduler dependency |
| GM-10 Legal, support and closure operations | P1 | GM/founder + qualified counsel | BACKLOG | Engineering 1–3 days; external review unestimated | Founder policy/operator decisions; current product spec |
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

- Initial web/backend/native audit assignments: delivered through supported subagents; complete source reports received; root ran web/database gates and read back native logs. No claim of hosted workflow completion.
- Persistent web/iOS implementation handoffs: pending delivery when the management commit is reviewable. Update this entry with tool receipt, exact task/scope and branch/PR reference.
- GitHub search found no open issues/PRs on October 10. This document is the initial actionable queue; convert accepted tasks into issues as needed, referencing this single source rather than duplicating status across chats.
- PR review → independent tests → founder-approved integration/release. `main` merge can cause production deployment. No merge authorized this session.
