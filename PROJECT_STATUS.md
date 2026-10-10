# SPLIT project status

Last reviewed: October 10, 2026 (America/New_York). **Overall: At Risk.** Founder selected a combined web + iOS beta. The web app has substantial working code and fresh passing local checks; the native app has an integration foundation and delivered negotiation fixes, with creation/signing/export still in development. Closed beta is not yet verified. No target launch date is asserted.

## Verified baseline

| Area | Current evidence | Readiness |
| --- | --- | --- |
| Web | `main` / `4bf5a2a`; Vercel production `dpl_9MWMTQuvygtSKaPnkQT5yioUkorP` READY with matching commit and custom aliases | Suitable for continued internal testing; hosted end-to-end beta gate open |
| iOS | Clean dedicated `codex/ios-development` worktree at `bf9723e`; SwiftUI app, shared RPC reads/invitation responses/chat/counters/approval | Development milestone; native creation/signature/PDF and release setup incomplete |
| Backend | SPLIT `hpwquupkqssqqgqtwdyu` ACTIVE_HEALTHY; all 32 migration versions match local; nine public and four private application tables have RLS | Shared hosted backend; no separate staging found |
| Invitations | Sending enabled; active minutely scheduler and two deployed Edge Functions | Sending exists; signed delivery receipt integration remains unverified |
| Phone | Hosted enforcement `required=false`; web rollout defaults off | Collection exists; verification deliberately paused |
| QA | 764 web tests / 75 files; typecheck/lint/build pass; 166 disposable database checks / 30 replayed migrations | Local evidence, not proof of live account/email/device behavior |
| Native QA | 31 XCTest tests and unsigned generic Simulator build pass; whitespace reconciliation reproduced in isolated synthetic harness | Host/domain/HTTP evidence; no simulator launch, Keychain/session UI or physical-device certification |
| Release gate | Fresh production dependency audit: 8 package entries, 6 high / 2 moderate | Dependency step in `verify:deploy` fails until remediation/review |

See [initial audit](docs/management/INITIAL_AUDIT.md) for source evidence, iOS check results, cloud metadata, and limitations. [Feature matrix](FEATURE_MATRIX.md) tracks platform differences.

## Immediate priorities

1. Correct the two independently reproduced creation regressions, retest that commit, and independently review the signing/PDF candidate `06317a5`. [GM-03/05](AGENT_TASKS.md).
2. Build native creation/owned drafts, then secure incomplete-draft recovery; independently review GM-04 negotiation/message candidate `c8839cd`. [GM-04/06](AGENT_TASKS.md), [native beta checklist](docs/management/IOS_BETA_CHECKLIST.md).
3. Continue local lifecycle/permissions/UX review and resolve the dependency gate; review delivered recovery and legal/support preparation. Hosted account/inbox tests remain deferred under the founder's local-only decision. [GM-02/08/09/10](AGENT_TASKS.md).

## Unmerged web-beta progress

- GM-02 partial remediation `c8a06ed` reduced the dependency report from eight entries to five high entries; the configured gate still fails. No threshold was lowered.
- GM-03 `a5add19` **failed independent acceptance**: invalid share text disappears after internal Back/return, and cancelling discard loses keyboard focus. Candidate 81/81 relevant tests pass; independent cases 21/23 pass with both failures reproduced in the browser. Corrections have been assigned. Actual native reload-warning behavior remains inconclusive.
- GM-05 signing identity/detail/PDF candidate `06317a5` is committed and pushed. Developer reports 812 web tests and 166 disposable database checks passing; independent review is active in a separate exact-SHA checkout. Acceptance is pending.
- Backend `dd74071` delivers a synthetic-only environment/recovery harness; GM independently reran ten focused tests successfully. Operations delivered a sanitized review packet with nine open gates. Neither establishes hosted recovery or legal/operating approval.

[Candidate review record](docs/management/WEB_BETA_PROGRESS_2026-10-10.md). These results do not replace the verified `main` baseline above or authorize release.

## Unmerged native-beta progress

- GM-04 `c8839cd` separates Accept/Counter eligibility and reconciles uncertain trimmed messages without erasing new typing. Developer reports 41 code/intercepted-HTTP tests, four Simulator UI tests and a fixture build/launch passing. Independent acceptance is active; real device/Keychain/session/VoiceOver/hosted evidence remains open.
- GM-06A native creation and owned drafts is active in `22b2` / `codex/ios-development`: four-step editor, exact shares, canonical document/RPC fidelity, stable retries and protected exits. GM-06B account-scoped protected recovery follows as a separate candidate. No creation/persistence completion is claimed.
- Auth/invitation continuation, complete agreement review/signing, finalized PDF viewing/sharing and native accessibility/release gates are explicitly queued. [Ordered checklist](docs/management/IOS_BETA_CHECKLIST.md).

Recovery for the current Vault-backed scheduler and legal/support/closure readiness also block a release recommendation. [Risks](RISKS.md), [roadmap](ROADMAP.md), [release gates](LAUNCH_CHECKLIST.md).

## Management established this session

- Dedicated current GM checkout placed on `management/split-gm`; web and iOS ownership preserved.
- Bounded independent source audits delivered through supported subagents; fresh local web/database checks run by GM.
- Existing chats and worktrees inspected; no additional permanent chats created.
- Nine core management documents, a dated audit/evidence record, and an isolated environment proposal committed and independently reviewed in [draft PR #2](https://github.com/christianandrecc/split-interface/pull/2); integration pending.
- Initial read-only handoffs were delivered; founder subsequently authorized web-beta implementation. Web now owns an isolated `web-beta-fixes` checkout; backend owns `backend-beta-readiness`. Independent QA and operations assignments are active. [Task ownership and delivery](AGENT_TASKS.md), [execution tracker #3](https://github.com/christianandrecc/split-interface/issues/3).
- No production deployment, data/schema/settings mutation, outbound invitation, public launch, app submission, or new automation performed.

## Founder decisions open

- Founder selected combined web + iOS beta in the mobile chat and explicitly asked GM to coordinate continued native work. Web and native progress have separate candidates; the combined cohort must meet both platforms' applicable gates. No native/public release or TestFlight distribution is approved.
- SPLIT organization selected; proposed separate `split-integration` in `us-east-1` quoted $0/month on Free. Founder chose local testing for now; hosted setup is deferred and no target created. [Environment record](docs/management/INTEGRATION_ENVIRONMENT_PLAN.md). Hosted/inbox/recovery evidence remains required before beta approval.
- Resolve review of legal documents, operating support/closure ownership, recovery budget, and paused SMS/password protection before applicable release gates. No purchase or publication is authorized by these records.

No continuing GM schedule has been created. One existing weekly SMS reminder is active in the web chat; an account-closure reminder is paused. They are reminders, not continuous project supervision.
