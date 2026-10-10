# SPLIT cross-platform feature matrix

Baseline: October 10, 2026; web `4bf5a2a`, iOS `bf9723e`. Status vocabulary: **Not started, Planned, In progress, Implemented, Tested, Blocked, Deferred**. Implemented means inspected code exists. Tested denotes the stated local scope only; no row certifies a hosted multi-account journey or release. Backend status includes local RPC verification plus migration presence, not hosted behavioral certification.

Current unmerged candidates: web correction `c57f8b2`, native negotiation `c8839cd`, creation/protected recovery `084220d` and auth hardening `f7fc8e6` pass bounded independent local acceptance. Separate web orphan-evidence correction is active. Signing `e1ec61d` failed independent acceptance, hardening active and PDF blocked. Rows include candidate states without replacing baseline or certifying hosted behavior. [Ordered native checklist](docs/management/IOS_BETA_CHECKLIST.md), [web evidence](docs/management/WEB_BETA_PROGRESS_2026-10-10.md).

| Feature | Web | iOS | Backend | Priority / dependency and validation |
| --- | --- | --- | --- | --- |
| Email/password sign-in/session isolation | Tested | Tested | Implemented | P1; local UI and native intercepted-HTTP/domain tests; Keychain/session/device and hosted refresh/recovery open |
| Signup/email confirmation/recovery | Tested | Tested | Implemented | P1 GM-11A; f7fc8e6 auth hardening independently passes 111 XCTest + 147 additional assertions/build; three prior P2 findings closed locally; registration remains web; inbox/OS/device/hosted open |
| Profiles and account settings | Tested | In progress | Tested | P1; native reads exist, edits/settings use web; local privacy tests |
| Split creation and owned drafts | Tested | Tested | Tested | P1 GM-03/06A; native local acceptance at `084220d`; web corrections accepted at `c57f8b2`, actual browser reload protection open; integration/hosted proof open |
| Protected incomplete editing recovery | Not started | Tested | Deferred | P1 GM-06B; native local acceptance at `084220d`; actual locked-device protection/backup/Keychain proof open; server persistence/queued actions excluded |
| Contributors/email/@username/100% shares | Tested | Tested | Tested | P1 GM-03/06A; native creation/exact hundredths locally accepted at `084220d`; phone invitations disabled; hosted identity binding remains open |
| Invitation accept/decline | Tested | Tested | Tested | P1; local mocks/RPC tests; real cross-platform identity routing open |
| External invitation sending | Tested | Implemented | Implemented | P1 GM-07; native creation submits existing shared records locally; sender/provider/current inbox proof not certified |
| Signed delivered/bounced receipt visibility/retry | Tested | Not started | Implemented | P1 GM-07; webhook deployment exists, provider secret/subscription/live events unverified |
| Chat and proposal/history reads | Tested | Tested | Tested | P1; native append text/counter history exists; live sync/reload open |
| Approval and counteroffers | Tested | Tested | Tested | P1 GM-04; `c8839cd` independent local acceptance passed; supplied developer UI readback separate; hosted/device parity open |
| Authenticated current-proposal signing | Tested | Implemented | Tested | P1 GM-05/06C; native `e1ec61d` delivered with developer 106 local tests, independent QA failed with one P1/two P2, hardening active; web corrections accepted; consent/provenance/hosted open |
| Finalization/immutable agreement/history | Tested | Implemented | Tested | P1; native reads/history and signing candidate exist; independent signing/hosted persistence/retrieval gates open |
| PDF generation/download | Tested | Not started | Tested | P1 GM-05/06; browser fetches authorized fresh record and renders PDF; no stored PDF bucket |
| CSV/JSON export, PRO/MLC submission | Deferred | Deferred | Deferred | P3; leftover builder controls are not implementation proof |
| Elephant guidance | Implemented | Implemented | Deferred | P2/P3; deterministic help/shortcuts; no AI inference or autonomous negotiation |
| Real AI-assisted negotiation | Deferred | Deferred | Not started | P3; scope/cost/privacy decision required |
| Cross-platform synchronization | In progress | In progress | Implemented | P1 GM-08; same RPC/payload contract, separate native/web models, live parity unverified |
| In-app activity/notifications | Tested | Not started | Tested | P1/P2; shared feed exists; native push absent |
| SMS phone verification | Deferred | Deferred | Implemented | Founder-paused; hosted requirement false; no verified provider/device evidence |
| Account closure/retention | Implemented | Not started | Tested | P1 GM-10; manual request exists, signed-record deletion guard tested; full operation/legal policy open |
| Monitoring/crash alerts | Implemented | Not started | In progress | P1 GM-08; Sentry web config historical; live alert receipt/device telemetry open |
| Recovery of current hosted system | Blocked | Blocked | Blocked | P1 GM-09; existing capture aborts for the live Vault secret; prior snapshot is dated |
| TestFlight/App Store distribution | Deferred | Not started | Planned | P1 combined beta; TestFlight team/bundle/icon/callbacks/privacy/device evidence and distribution approval open; App Store publication later |

Detailed user behavior: [PRODUCT_SPEC.md](PRODUCT_SPEC.md). Ownership/evidence needed for completion: [AGENT_TASKS.md](AGENT_TASKS.md).
