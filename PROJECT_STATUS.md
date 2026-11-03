# SPLIT project status

**Execution RESUMED — November 3, 2026, America/New_York.** Founder selected DocuSign and explicitly resumed local web/iOS development, delegated signing review and the approved Tailwind migration. Historical pause is superseded; exact candidates/checkpoints are preserved. Provider direction is approved, hosted DocuSign/demo tests and purchases are not. Overall readiness remains At Risk. [Current local plan](docs/management/DOCUSIGN_LOCAL_PLAN_2026-11-03.md), [historical pause checkpoint](docs/management/PAUSE_CHECKPOINT_2026-10-10.md).

Last reviewed: November 3, 2026 (America/New_York). **Overall: At Risk.** Local web/iOS work resumed with DocuSign selected for new real-agreement execution. Exact web c210575 and native db6c64a signing corrections are in independent local review. Web migration preflight and native provider-readiness mapping are delegated; backend provider contract is in design. The selected provider is not activated or tested. Closed beta, hosted integration and release remain unverified.

## Verified baseline — historical October 10 evidence

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

## Current priorities

1. Independently review delivered web orphan-signature correction `c210575`, then deliver the founder-approved local Tailwind 4 migration following reviewed options `355203b` and required QA additions. Chrome reload note `3d39da7` passes supplied-evidence review, without a fresh browser execution. Existing web correction acceptance remains valid. [GM-02/03/05A](AGENT_TASKS.md).
2. Independently review delivered native signing correction `db6c64a` against the findings at `e1ec61d`. Auth hardening is independently accepted locally at `f7fc8e6`; PDF remains blocked pending signing acceptance. Local passes do not close integration/device/hosted/consent gates. [GM-04/06/11](AGENT_TASKS.md), [native beta checklist](docs/management/IOS_BETA_CHECKLIST.md).
3. Design a shared DocuSign provider boundary and native readiness/fixture mapping while preserving legacy signing evidence. Continue local lifecycle/permissions/UX and recovery/legal preparation; hosted provider/account/inbox tests remain deferred. [GM-13 local plan](docs/management/DOCUSIGN_LOCAL_PLAN_2026-11-03.md).

## Unmerged web-beta progress

- GM-02 partial remediation `c8a06ed` reduced the dependency report from eight entries to five high entries; the configured gate still fails. No threshold was lowered.
- The 2:20 PM heartbeat found the prior GM-02 turn ended without its dependency deliverable. A corrective bounded handoff was delivered; compact status confirms active disposable compatibility/options probes, with no approved major upgrade or fork.
- Subsequent docs-only options `355203b71b70542ec99e81333a521be5112743fe` are delivered: compatible Tailwind 3 probe passes developer 844 tests/identical CSS but still five high audit entries; complete Tailwind 4 manifest resolves with zero production/full audit findings. This is dependency resolution, not an implemented migration. Options independently passed review with two QA additions. Founder explicitly approved local migration/browser floor/tagger removal; handoff acknowledged, after active reload verification. No release approval.
- GM-03 original `a5add19` failed for lost editing text/focus. Corrections pass independent local acceptance at descendant `c57f8b2`. Developer Chrome native reload matrix passes with immutable note `3d39da7`; independent readback accepts supplied evidence only (29 consistency checks, matching ledger hash/screenshots), without a fresh browser execution. Other browser engines/mobile and integration remain open.
- GM-05 original `06317a5` failed for conflicting-approval labels and control-only name certification. Corrections independently pass at `c57f8b2`: combined 68 new/original independent cases,151 focused candidate checks and typecheck. Developer 844 full web/166 DB evidence remains separately attributed; integration/hosted signing/consent remain open.
- GM-05A correction c2105759bdeb8a288644f5a4bc0f43f97555e638 is in independent local review. Developer 864 tests/typecheck/lint/build and prior local artifacts remain attributed separately. The preserved archive recovers some fixtures; missing temporary QA reports require transparently reconstructed checks. Tailwind preflight is delegated separately; no correction/provider acceptance is implied.
- Backend `dd74071` delivers a synthetic-only environment/recovery harness; GM independently reran ten focused tests successfully. Operations delivered a sanitized review packet with nine open gates. Neither establishes hosted recovery or legal/operating approval.

[Candidate review record](docs/management/WEB_BETA_PROGRESS_2026-10-10.md). These results do not replace the verified `main` baseline above or authorize release.

## Unmerged native-beta progress

- GM-04 `c8839cd` **passes independent local acceptance**: 41 candidate XCTest, 75 additional adversarial checks and unsigned build. Supplied developer UI artifact confirms 4/4, without independent UI rerun. P2 invalid-frame warning needs polish triage; real device/Keychain/session/VoiceOver/hosted and integration remain open.
- GM-06A creation and GM-06B protected recovery **pass independent local acceptance at `084220d`**: 65 candidate XCTest,119 additional adversarial checks and unsigned build. Origin `5e81d6d` diff reviewed, with execution at its descendant; developer UI/relaunch/maximum-text evidence inspected separately. Physical protection/backup/Keychain/minimum OS/VoiceOver/hosted and integration remain open.
- GM-11A correction `f7fc8e651f90a4b352f095f6659e277cbffc31d3` **passes independent local auth-hardening acceptance**: 111 XCTest, all 101 original hostile assertions, 46 focused assertions and unsigned build pass. All three PATH/GRANT/LATE-RESTORE findings close locally; original b80 failure evidence retained. Supplied five UI journeys read back separately, no independent Simulator launch. This auth-only commit inherits open signing findings. Registration/profile/consent remains web; actual inbox/OS/device/hosted proof open.
- GM-06C `e1ec61d360012b1efae2e3377988ff4acf641f0c` delivers full native review/explicit own-party signing. Developer reports 106 code/HTTP tests, five final signing UI journeys plus ten earlier regressions and unsigned build; independent exact-SHA QA completed: original signing acceptance failed; signing corrections precede PDF, currently blocked. [Native progress](docs/management/IOS_BETA_PROGRESS_2026-10-10.md), [ordered checklist](docs/management/IOS_BETA_CHECKLIST.md).

Independent signing QA at e1 historically failed one P1/two P2. Correction db6c64ae8c544119340a029b3546c1c37f1a860b is now in fresh independent local review; baseline 120 XCTest/unsigned build passed, adversarial review is pending. Original failure descriptions remain intact. Provider-era completion and executed-artifact handling are separate GM13 contract requirements, not existing in-house acknowledgements.

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

Founder-selected hourly monitor monitor-split-web-and-ios-development is ACTIVE again under the explicit project resume. Its target/cadence are preserved and prompt now includes DocuSign/local-only boundaries. The weekly SMS reminder is restored; the already-paused closure reminder remains paused. This is scheduled review, not continuous supervision.

Daily briefing split-morning-development-and-launch-briefing is ACTIVE again at 9 AM America/New_York, with the original GM target and updated provider/local-only scope. Meaningful hourly changes and the requested daily report remain distinct. Local schedules require the computer/app to be available; saved configuration is verified after update.
