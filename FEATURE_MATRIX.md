# SPLIT cross-platform feature matrix

Baseline: October 10, 2026; web `4bf5a2a`, iOS `bf9723e`. Status vocabulary: **Not started, Planned, In progress, Implemented, Tested, Blocked, Deferred**. Implemented means inspected code exists. Tested denotes the stated local scope only; no row certifies a hosted multi-account journey or release. Backend status includes local RPC verification plus migration presence, not hosted behavioral certification.

Current native candidate `c8839cd` includes developer-tested GM-04 corrections, with independent acceptance pending. Native creation is now active for the founder-selected combined beta; [ordered native checklist](docs/management/IOS_BETA_CHECKLIST.md) records candidate delivery separately from the baseline.

| Feature | Web | iOS | Backend | Priority / dependency and validation |
| --- | --- | --- | --- | --- |
| Email/password sign-in/session isolation | Tested | Tested | Implemented | P1; local UI and native intercepted-HTTP/domain tests; Keychain/session/device and hosted refresh/recovery open |
| Signup/email confirmation/recovery | Tested | Not started | Implemented | P1; iOS opens web; actual controlled-inbox callbacks open |
| Profiles and account settings | Tested | In progress | Tested | P1; native reads exist, edits/settings use web; local privacy tests |
| Split creation and owned drafts | Tested | In progress | Tested | P1 GM-03/06A; native four-step creation assigned/active, not delivered; web corrections under review |
| Contributors/email/@username/100% shares | Tested | In progress | Tested | P1 GM-03; iOS reads/counters but no native creation; phone invitations disabled |
| Invitation accept/decline | Tested | Tested | Tested | P1; local mocks/RPC tests; real cross-platform identity routing open |
| External invitation sending | Tested | In progress | Implemented | P1 GM-07; server sends for shared records; iOS creation absent; current inbox proof historical |
| Signed delivered/bounced receipt visibility/retry | Tested | Not started | Implemented | P1 GM-07; webhook deployment exists, provider secret/subscription/live events unverified |
| Chat and proposal/history reads | Tested | Tested | Tested | P1; native append text/counter history exists; live sync/reload open |
| Approval and counteroffers | Tested | Tested | Tested | P1 GM-04; `c8839cd` separates Accept/Counter; developer reports local code/HTTP/Simulator tests, independent acceptance pending |
| Authenticated current-proposal signing | Tested | Not started | Tested | P1 GM-05/06; native handoff; exported signing-order claim differs from enforcement |
| Finalization/immutable agreement/history | Tested | In progress | Tested | P1; native reads/status exist, signing absent; hosted persistence/retrieval gate open |
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
