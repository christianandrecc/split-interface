# Native beta progress and independent acceptance

October 10, 2026. Combined web + iOS beta; local testing only. All native candidates remain unmerged and no hosted/device/distribution approval is implied. Current developer work continues under the founder's direct instructions; GM reviews immutable milestones rather than changing an active checkout.

## GM-04: passed bounded local acceptance

Exact candidate `c8839cdf8f918a741022e38024982b6601fdf8db`. Independent native QA ran 41/41 candidate XCTest tests (including seven intercepted HTTP), 75/75 new adversarial checks and an unsigned generic Simulator build successfully in a clean detached checkout with separate caches.

Validated separate Accept/Counter eligibility, approved/rejected/partial-signing and other pending-invite cases, author/pending/declined/outsider/final denials, current proposal/revision guards and history preservation. Interrupted trimmed-message refresh retains newly edited text, rejects old-message/other-author matches and never blindly replays a write. Cross-device identical-text ambiguity remains a separate limit; this is not idempotency certification.

Developer UI xcresult readback confirms 4/4 passing on iPhone 17 Pro/iOS 26.5; accepted-proposal screenshot inspected. QA did not independently rerun the UI or change a Simulator session. The supplied Counter journey contains a non-failing SwiftUI invalid-frame warning, recorded as QA-GM04-POLISH-1 for reproduction/triage. No new P0/P1 was established.

Evidence: `/tmp/split-ios-beta-qa/QA_REPORT_c8839cd.md`, `verification_c8839cd.json`, logs and independent source harness. This durable summary preserves the decision; session artifacts remain temporary. PR/integration, real Keychain/session/device/minimum-OS/VoiceOver/hosted gates remain open.

## GM-06A/06B: passed bounded local acceptance

| Candidate | Delivered behavior | Developer evidence | Independent state |
| --- | --- | --- | --- |
| GM-06A `5e81d6dde99a12c3ef5e5de4a4cfac82583d68b9` | Four-step native creation, exact/raw shares, creator/contributors, full-field/stable-ID save/resume/delete/send, guarded exits and uncertain/account-bound writes | 54 host/intercepted tests; fixture UI, small-phone dark/maximum-text checks; unsigned build/launch | PASS_LOCAL executed at descendant `084220d`; origin diff reviewed, no direct-origin test claim |
| GM-06B `084220d737614f3cf5087f7fe7dd4cc7a5f6e390` | Protected versioned account-scoped incomplete editing, bounded size, ordered checkpoints/leases, process-relaunch recovery, refresh gate and explicit clearing | 65 combined host tests (not 54 + 65); 12 fixture UI tests and final recovery/exit reruns; unsigned build/launch | PASS_LOCAL; integration and actual physical/device/hosted proof remain open |

The narrow storage design preceded persistence. Filename account hashing is not encryption; physical-device complete protection/backup exclusion still need proof. Local editing is distinct from server-confirmed complete drafts. No signing/send command is persisted or automatically replayed.

Independent QA at detached `084220d` completed **65/65 XCTest,119/119 new adversarial checks and an unsigned arm64 generic Simulator build**, with separate caches. Actual fixture WorkspaceSession lifecycle, old-account transport binding, storage failure/cleanup/lease/checkpoint/account cases pass. Real Keychain/authenticated activation was not executed. Supplied final UI/relaunch/maximum-text bundles were inspected; an earlier 6/7 selector failure is explicitly superseded by final passing reruns. P2 invalid-frame warning persists in supplied creation/Counter tests and needs triage. No new P0/P1 reproduced. Report: `/tmp/split-ios-beta-qa/QA_REPORT_084220d.md`, `verification_084220d.json`. Developer's active auth work and Simulator were preserved.

## Current native task and next gates

GM-11A signup/recovery/auth callback/invitation continuation is actively implemented and tested with intercepted HTTP. It remains uncommitted and unaccepted at this review. Recovery/callback uncertainty and SDK retry behavior are being checked; source activity is not genuine inbox/session proof.

Next: commit/review the auth candidate, then complete full agreement review/own-party signing and fresh finalized PDF viewing/sharing aligned with independently accepted shared evidence rules. Carry small-phone/keyboard/large-text/VoiceOver/device polish through those milestones. Shared dependency, consent/legal/support, hosted isolation/delivery/alerts and current recovery gates remain open.

Founder selected hourly GM monitoring with meaningful change notifications. ACTIVE heartbeat `monitor-split-web-and-ios-development` is saved in the GM chat and its interval/target/quiet-when-unchanged behavior verified. Existing direct agent instructions are valid and take precedence over stale queue notes; the monitor reads accessible new directions. Hourly checks do not imply automatic shared memory or continuous supervision.

The separate daily briefing `split-morning-development-and-launch-briefing` is ACTIVE at 9 AM New York time every day, reporting both platforms' checklists and overall launch operations even when unchanged.
