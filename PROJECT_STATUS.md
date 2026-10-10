# SPLIT project status

Last reviewed: October 10, 2026, 3:34 PM (America/New_York). **Overall: At Risk.** Founder selected a combined web + iOS beta. Web corrections and native negotiation/creation/protected recovery pass bounded independent local acceptance. Auth core is locally accepted with corrections committed for retest; signing failed independent acceptance and is being corrected before PDF. Founder approved the independently reviewed local web migration; implementation handoff delivered. Closed beta is not yet verified. No target launch date is asserted.

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

1. Deliver the founder-approved local Tailwind 4 migration following reviewed options `355203b` and required QA additions. Actual browser reload verification is now active. Existing web correction acceptance remains valid. [GM-02/03/05](AGENT_TASKS.md).
2. Correct native signing response-integrity/account-publication defects reproduced at `e1ec61d`, alongside separate auth P2 corrections. PDF work is paused pending signing hardening/retest. Earlier local passes do not close integration/device/hosted/consent gates. [GM-04/06/11](AGENT_TASKS.md), [native beta checklist](docs/management/IOS_BETA_CHECKLIST.md).
3. Continue local lifecycle/permissions/UX review and resolve the dependency gate; review delivered recovery and legal/support preparation. Hosted account/inbox tests remain deferred under the founder's local-only decision. [GM-02/08/09/10](AGENT_TASKS.md).

## Unmerged web-beta progress

- GM-02 partial remediation `c8a06ed` reduced the dependency report from eight entries to five high entries; the configured gate still fails. No threshold was lowered.
- The 2:20 PM heartbeat found the prior GM-02 turn ended without its dependency deliverable. A corrective bounded handoff was delivered; compact status confirms active disposable compatibility/options probes, with no approved major upgrade or fork.
- Subsequent docs-only options `355203b71b70542ec99e81333a521be5112743fe` are delivered: compatible Tailwind 3 probe passes developer 844 tests/identical CSS but still five high audit entries; complete Tailwind 4 manifest resolves with zero production/full audit findings. This is dependency resolution, not an implemented migration. Options independently passed review with two QA additions. Founder explicitly approved local migration/browser floor/tagger removal; handoff acknowledged, after active reload verification. No release approval.
- GM-03 original `a5add19` failed for lost editing text/focus. Corrections pass independent local acceptance at descendant `c57f8b2`; actual native browser reload-warning cancel/confirm remains inconclusive/open.
- GM-05 original `06317a5` failed for conflicting-approval labels and control-only name certification. Corrections independently pass at `c57f8b2`: combined 68 new/original independent cases,151 focused candidate checks and typecheck. Developer 844 full web/166 DB evidence remains separately attributed; integration/hosted signing/consent remain open.
- Backend `dd74071` delivers a synthetic-only environment/recovery harness; GM independently reran ten focused tests successfully. Operations delivered a sanitized review packet with nine open gates. Neither establishes hosted recovery or legal/operating approval.

[Candidate review record](docs/management/WEB_BETA_PROGRESS_2026-10-10.md). These results do not replace the verified `main` baseline above or authorize release.

## Unmerged native-beta progress

- GM-04 `c8839cd` **passes independent local acceptance**: 41 candidate XCTest, 75 additional adversarial checks and unsigned build. Supplied developer UI artifact confirms 4/4, without independent UI rerun. P2 invalid-frame warning needs polish triage; real device/Keychain/session/VoiceOver/hosted and integration remain open.
- GM-06A creation and GM-06B protected recovery **pass independent local acceptance at `084220d`**: 65 candidate XCTest,119 additional adversarial checks and unsigned build. Origin `5e81d6d` diff reviewed, with execution at its descendant; developer UI/relaunch/maximum-text evidence inspected separately. Physical protection/backup/Keychain/minimum OS/VoiceOver/hosted and integration remain open.
- GM-11A `b80a751` **passes local core acceptance with P2 corrections**: independent 86 XCTest/build pass; additional actual-SDK/source checks **92/101 pass, nine fail**. Extra path separators, restored recovery purpose/email/confirmation omissions and late old-account recovery-ID publication need correction. No cross-account write/data exposure or remote exploit demonstrated. Corrections committed as `f7fc8e6`, immutable independent retest assigned; no stricter all-boundaries-pass claim. Registration/profile/consent remains web; actual inbox/OS/device/hosted proof open.
- GM-06C `e1ec61d360012b1efae2e3377988ff4acf641f0c` delivers full native review/explicit own-party signing. Developer reports 106 code/HTTP tests, five final signing UI journeys plus ten earlier regressions and unsigned build; independent exact-SHA QA completed: original signing acceptance failed; signing corrections precede PDF, currently blocked. [Native progress](docs/management/IOS_BETA_PROGRESS_2026-10-10.md), [ordered checklist](docs/management/IOS_BETA_CHECKLIST.md).

Independent signing QA subsequently reproduced accepted changed proposal/history/unknown/audit/ambiguous evidence, final orphan-evidence and final-await SDK account-switch publication gaps. Candidate 106 tests/build pass, hostile run 156/186 with 30 failures; final report received: one P1/two new P2. Stop-PDF/correct-signing steering delivered. Initiating token remains correctly bound; no hosted wrong-account write claimed.

Recovery for the current Vault-backed scheduler and legal/support/closure readiness also block a release recommendation. [Risks](RISKS.md), [roadmap](ROADMAP.md), [release gates](LAUNCH_CHECKLIST.md).

## Management established this session

- Dedicated current GM checkout placed on `management/split-gm`; web and iOS ownership preserved.
- Bounded independent source audits delivered through supported subagents; fresh local web/database checks run by GM.
- Existing chats and worktrees inspected; no additional permanent chats created.
- Nine core management documents, a dated audit/evidence record, and an isolated environment proposal committed and independently reviewed in [draft PR #2](https://github.com/christianandrecc/split-interface/pull/2); integration pending.
- Initial read-only handoffs were delivered; founder subsequently authorized web-beta implementation. Web now owns an isolated `web-beta-fixes` checkout; backend owns `backend-beta-readiness`. Independent QA and operations assignments are active. [Task ownership and delivery](AGENT_TASKS.md), [execution tracker #3](https://github.com/christianandrecc/split-interface/issues/3).
- No production deployment, data/schema/settings mutation, outbound invitation, public launch or app submission performed. Founder-authorized hourly monitoring and daily briefing are saved in this GM chat.

## Founder decisions open

- Founder selected combined web + iOS beta in the mobile chat and explicitly asked GM to coordinate continued native work. Web and native progress have separate candidates; the combined cohort must meet both platforms' applicable gates. No native/public release or TestFlight distribution is approved.
- SPLIT organization selected; proposed separate `split-integration` in `us-east-1` quoted $0/month on Free. Founder chose local testing for now; hosted setup is deferred and no target created. [Environment record](docs/management/INTEGRATION_ENVIRONMENT_PLAN.md). Hosted/inbox/recovery evidence remains required before beta approval.
- Founder approved the independently reviewed local Tailwind 4 migration, browser floor and development component-tagger removal (4–7 engineering/QA days estimated). [Concrete decision packet](docs/management/WEB_DEPENDENCY_DECISION_2026-10-10.md); implementation handoff delivered after active reload task. Clean manifest audits do not constitute a working migrated app or release approval.
- Resolve review of legal documents, operating support/closure ownership, recovery budget, and paused SMS/password protection before applicable release gates. No purchase or publication is authorized by these records.

Founder selected hourly GM monitoring. ACTIVE heartbeat `monitor-split-web-and-ios-development` checks both development chats in this GM thread, reconciles current directions and sends notifications only for meaningful progress/failure/blockers/required decisions. Saved schedule/target verified; unchanged checks stay quiet. Existing SMS/account-closure reminders remain separate and unchanged. This is scheduled hourly review, not continuous supervision.

Founder also requested a daily morning status report. ACTIVE heartbeat `split-morning-development-and-launch-briefing` delivers **every day at 9 AM America/New_York**, covering web/iOS checklists, QA, shared backend and overall launch operations, blockers, priorities and founder decisions. Saved daily schedule/current GM target verified. The daily report is delivered even when progress is unchanged.
