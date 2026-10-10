# SPLIT roadmap

Baseline: October 10, 2026. Milestones are evidence gates, not calendar promises. Effort ranges in [AGENT_TASKS.md](AGENT_TASKS.md) are preliminary work estimates; sequencing, provider/counsel review, and founder decisions determine elapsed time.

## Phase 1 — Project audit and management

Current: repository/platform/cloud metadata audit and local checks complete; shared records prepared for review. Exit: management PR reviewed, workstream handoffs delivered, first-beta platform scope decided, and owners accept the initial tasks. Source audit does not close hosted QA gates.

## Phase 2 — Core functionality

Order: GM-02 dependency gate; GM-03 percentage validation; GM-04 native counter parity; GM-05 truthful agreement metadata; GM-06 native create/sign/export if included in first beta. In parallel, prepare GM-01 environment isolation, GM-09 recovery design, GM-10 legal/support/closure review.

Exit: applicable platform can create an account, create/send a valid split, route contributors, revise/approve, sign the current proposal, preserve the final record, and retrieve/export it. All changed behavior has independent regression and permission evidence; no unresolved P0 and no core P1 defects. Preserve current architecture and deferred publishing/AI/SMS decisions.

## Phase 3 — Internal testing

GM-01 must precede live integration writes. GM-07 validates receipts/auth emails in controlled inboxes; GM-08 validates the A/B/C journey and failure/concurrency cases on the exact candidate build. Include web→iOS→web transitions if iOS is in scope; repeated sign-in/refresh/recovery, stale revisions, outsider denial, current-party identity, completed-record immutability, and PDF agreement details.

Exit: [internal gates](LAUNCH_CHECKLIST.md) have linked evidence, operator monitoring/feedback works, approved test target has no contact with real users, recovery design is validated in isolation. A successful local build is insufficient.

## Phase 4 — Closed beta

Founder approves candidate, audience, platform scope, access controls, support contact, reviewed agreement/consent handling, and recovery arrangements. Release web only after approved deployment; native only after TestFlight team/signing/device/distribution gates. Recruit a small defined cohort and collect feedback without adding optional features.

Exit: all beta checklist gates pass or have explicit time-bound founder acceptance of a documented residual risk; no P0 accepted. Record candidate versions, cohort, known limitations, rollback/recovery operator, and incident contact. No real-user recruitment/contact happens automatically.

## Phase 5 — Public launch

Require current security review, accurate terms/privacy/electronic consent, verified privacy/retention execution, off-device recovery, capacity/failure evidence, support coverage, provider budgets, App Store requirements if applicable, and explicit founder launch approval. Custom-domain reachability is not approval to launch.

## Phase 6 — Post-launch growth

Instrument privacy-reviewed activation, split creation success/time, invitation acceptance, agreement completion, critical defects, weekly active users, and retention. Establish measured baselines before choosing targets. Prioritize reliability and completion; evaluate real Elephant AI, publishing/submission, reminders, and broader growth later.

## Scope alternatives awaiting founder selection

- **Web first:** close web/backend/operations gates; native runs its own development track and is not advertised as beta-complete. Fastest route based on inspected missing native functions.
- **Combined:** same gates plus GM-06 and full native auth callbacks, real-device validation, distribution and cross-platform lifecycle evidence. Higher scope and dependency burden; no date estimate yet.

No environment purchase, platform restructuring, provider activation, production rollout, or public announcement is implied by this roadmap.
