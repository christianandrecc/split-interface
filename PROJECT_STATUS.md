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

1. Independently accept web corrections `2fd0c24` / `c57f8b2`, and complete the resumed compatible dependency-remediation/options review. [GM-02/03/05](AGENT_TASKS.md).
2. Independently review native creation/recovery `5e81d6d` / `084220d` while the native agent completes current auth/invitation continuation. GM-04 now passes bounded local acceptance; integration remains open. [GM-04/06/11](AGENT_TASKS.md), [native beta checklist](docs/management/IOS_BETA_CHECKLIST.md).
3. Continue local lifecycle/permissions/UX review and resolve the dependency gate; review delivered recovery and legal/support preparation. Hosted account/inbox tests remain deferred under the founder's local-only decision. [GM-02/08/09/10](AGENT_TASKS.md).

## Unmerged web-beta progress

- GM-02 partial remediation `c8a06ed` reduced the dependency report from eight entries to five high entries; the configured gate still fails. No threshold was lowered.
- GM-03 original `a5add19` failed independent acceptance for lost editing text/focus. Correction `2fd0c24` is committed/pushed, with independent retest active on descendant `c57f8b2`. Actual native browser reload-warning proof remains open.
- GM-05 original `06317a5` failed independent acceptance for arbitrary conflicting-approval labels and control-only signing-name certification. Correction `c57f8b2` is committed/pushed and under independent retest. Developer reports 844 web tests/typecheck/lint/build and 166 disposable DB checks passing; independent acceptance remains pending.
- Backend `dd74071` delivers a synthetic-only environment/recovery harness; GM independently reran ten focused tests successfully. Operations delivered a sanitized review packet with nine open gates. Neither establishes hosted recovery or legal/operating approval.

[Candidate review record](docs/management/WEB_BETA_PROGRESS_2026-10-10.md). These results do not replace the verified `main` baseline above or authorize release.

## Unmerged native-beta progress

- GM-04 `c8839cd` **passes independent local acceptance**: 41 candidate XCTest, 75 additional adversarial checks and unsigned build. Supplied developer UI artifact confirms 4/4, without independent UI rerun. P2 invalid-frame warning needs polish triage; real device/Keychain/session/VoiceOver/hosted and integration remain open.
- GM-06A creation `5e81d6d` and GM-06B protected recovery `084220d` are committed. Developer reports 54 creation host tests and 65 combined host tests after persistence, plus fixture UI/small-phone/app-relaunch evidence. Independent review is active at pinned `084220d`; acceptance is pending.
- GM-11A auth/invitation continuation is actively implemented/tested under the founder's direct continuation. Full review/signing, PDF sharing and native accessibility/release gates follow. [Native progress](docs/management/IOS_BETA_PROGRESS_2026-10-10.md), [ordered checklist](docs/management/IOS_BETA_CHECKLIST.md).

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

Founder selected hourly GM monitoring. ACTIVE heartbeat `monitor-split-web-and-ios-development` checks both development chats in this GM thread, reconciles current directions and sends notifications only for meaningful progress/failure/blockers/required decisions. Saved schedule/target verified; unchanged checks stay quiet. Existing SMS/account-closure reminders remain separate and unchanged. This is scheduled hourly review, not continuous supervision.
