# SPLIT project status

Last reviewed: October 10, 2026 (America/New_York). **Overall: At Risk.** The web app has substantial working code and fresh passing local checks; the native app has a tested integration foundation but essential creation/signing/export work remains. Closed beta is not yet verified. No target launch date is asserted.

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

1. Restore the dependency gate and align percentage/action/document behavior with the shared contract. [GM-02–GM-05](AGENT_TASKS.md).
2. Establish an approved isolated integration target and validate the real A/B/C account lifecycle, invitation receipts, auth callbacks, and monitoring. [GM-01, GM-07, GM-08](AGENT_TASKS.md).
3. Complete native creation/signing/retrieval if iOS is included in the first beta; keep it on the same guarded backend. [GM-06](AGENT_TASKS.md).

Recovery for the current Vault-backed scheduler and legal/support/closure readiness also block a release recommendation. [Risks](RISKS.md), [roadmap](ROADMAP.md), [release gates](LAUNCH_CHECKLIST.md).

## Management established this session

- Dedicated current GM checkout placed on `management/split-gm`; web and iOS ownership preserved.
- Bounded independent source audits delivered through supported subagents; fresh local web/database checks run by GM.
- Existing chats and worktrees inspected; no additional permanent chats created.
- Nine core management documents, a dated audit/evidence record, and an isolated environment proposal committed and independently reviewed in [draft PR #2](https://github.com/christianandrecc/split-interface/pull/2); integration pending.
- Existing web and iOS chats received bounded read-only review/planning handoffs through supported tools; both are active. This is delivered coordination, not implementation completion.
- No production deployment, data/schema/settings mutation, outbound invitation, public launch, app submission, or new automation performed.

## Founder decisions open

- First beta: web first with iOS following (recommended for shorter path), or complete native lifecycle before a combined beta. Recommendation is not a scope change approval.
- Select/approve hosted staging and provider isolation only after the environment proposal and cost are prepared (GM-01).
- Resolve review of legal documents, operating support/closure ownership, recovery budget, and paused SMS/password protection before applicable release gates. No purchase or publication is authorized by these records.

No continuing GM schedule has been created. One existing weekly SMS reminder is active in the web chat; an account-closure reminder is paused. They are reminders, not continuous project supervision.
