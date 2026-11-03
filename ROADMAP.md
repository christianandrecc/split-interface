# SPLIT roadmap

Updated November 3, 2026; historical baseline October 10. Founder resumed local web+iOS and selected DocuSign for new real-agreement execution. Milestones remain evidence gates, not calendar promises. [Current local plan](docs/management/DOCUSIGN_LOCAL_PLAN_2026-11-03.md).

## Phase 1 — Project audit and management

Current: repository/platform/cloud metadata audit and local checks complete; shared records prepared for review. Exit: management PR reviewed, workstream handoffs delivered, first-beta platform scope decided, and owners accept the initial tasks. Source audit does not close hosted QA gates.

## Phase 2 — Core functionality

Founder authorized web-beta execution on October 10. Order: GM-02 dependency gate; GM-03 percentage validation/dirty-work protection; GM-05 truthful signer/export evidence; real auth/invitation verification; independent full web lifecycle and browser/accessibility checks. In parallel, prepare GM-01 environment isolation, GM-09 recovery design, GM-10 legal/support/closure review. [Execution tracker #3](https://github.com/christianandrecc/split-interface/issues/3), [active ownership](AGENT_TASKS.md).

Combined web+iOS scope remains selected. Earlier native negotiation, creation/recovery and auth hardening pass bounded independent local acceptance. Current work: fresh web/native signing correction reviews; separate approved Tailwind migration preflight; shared DocuSign contract and native readiness design. Provider execution replaces the intended new-real-agreement final-signing direction, while historical in-house evidence remains intact. Shared contract/schema changes require both-platform review; no hosted testing is approved.

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

## Platform scope

- **Current milestone — combined web + iOS beta:** close shared web/backend/operations gates plus native creation, signing/export, auth/invitation continuation, cross-platform and real-device/accessibility gates. Both development tracks are authorized; neither is advertised as beta-complete. [Native checklist](docs/management/IOS_BETA_CHECKLIST.md).
- **Release:** exact platform candidates require independent acceptance and explicit deployment/TestFlight/cohort approval. Local-only testing remains the current environment decision; hosted proof and distribution remain open. No date estimate yet.

No environment purchase, platform restructuring, provider activation, production rollout, or public announcement is implied by this roadmap.
