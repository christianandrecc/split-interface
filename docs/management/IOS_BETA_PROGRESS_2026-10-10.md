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

## GM-11A: local core accepted with three P2 corrections

At the 2:20 PM heartbeat, the native owner was idle with clean candidate `b80a7514361526330f0b7353b6b0b32da63517b2`. The latest direct founder instruction is "Lets continue". Candidate `ios/docs/GM11A_VERIFICATION.md` reports **86 code/HTTP tests, 13 Simulator journeys and an unsigned build**; these were developer results at delivery; subsequent independent decision below is conditional core acceptance with P2. Five final auth journeys and build follow the final invitation polish; eight regression journeys precede that polish. QA must keep those scopes distinct.

The candidate adds native recovery/resend, strict allowlisted callback routing, device PKCE/state/purpose/requested-email binding and bounded expiry, guarded session restoration, recovery gating after uncertain password updates, and invitation continuation through sign-in with explicit Join/Decline. Candidate source/report describes a bounded transport against SDK automatic auth retries; exact behavior is assigned for independent intercepted-HTTP review. Opening an invitation review must not write. Signup/profile/consent still uses the existing web flow.

Custom callback schemes and ignored configuration opt-in are provisional; native requests remain disabled without that opt-in. Manual `simctl openurl` reached the OS opening prompt, which could not be dismissed while the Mac was locked. This is **not proof of warm/cold OS delivery**. Actual inbox/server PKCE settings, universal links, Keychain/locked physical device, minimum OS and hosted account/invitation integration remain open. No hosted activation or new legal/profile provenance was authorized.

Independent exact-candidate QA received: **PASS_LOCAL_CORE_WITH_P2**, 86/86 candidate XCTest and unsigned build pass; direct candidate source/actual SDK hostile harness **92/101 assertions pass, nine fail**. Five final auth and eight earlier regression UI results were independently read back, without an independent Simulator run. Report: `/tmp/split-ios-beta-qa/QA_REPORT_b80a751.md`, `verification_b80a751.json`. The developer checkout/Simulator remained untouched.

| Confirmed P2 | Reproduction / consequence | Required correction |
| --- | --- | --- |
| GM11-P2-PATH (two failures) | Foundation URL.path accepts extra root separators and trailing recovery slash despite documented exact paths; state/PKCE checks still apply. | Check non-normalized allowlisted paths. |
| GM11-P2-GRANT (six failures) | Synthetic protected metadata changed to confirmation purpose/wrong email, or fresh user lacking confirmed-email evidence, restores the same account and permits an explicit same-account password PUT. No remote storage alteration or cross-account write demonstrated. | Revalidate purpose/requested email/fresh confirmation at restored grant and password boundaries; fail closed. |
| GM11-P2-LATE-RESTORE (one failure) | Suspended fresh-user GET returns old recovery UUID after actual SDK account switch; subsequent wrong-account password write is denied, with no old workspace exposure. | Recheck current SDK/session account after await before publishing. |

No P0/P1 remote exploit, cross-account write, automatic consent or workspace data exposure was reproduced. Core acceptance does **not** mean all boundary assertions passed. Bounded corrections were delivered to the idle native owner at the 3:20 PM heartbeat; startup confirms active fixes before PDF work. Exact-candidate retest is required. Existing invalid-frame warning remains in supplied Counter/two creation regression result trees; absence in a build log does not close it.

## GM-06C: failed independent acceptance, hardening active

Exact candidate `e1ec61d360012b1efae2e3377988ff4acf641f0c` delivers full current/historical review, fresh saved-profile signing identity, explicit own-party confirmation, minimal existing sign RPC, account/revision/proposal guards and read-only refresh after uncertainty. Candidate verification describes original signed snapshot preservation and GM-05 neutral/incomplete evidence rules; independent acceptance subsequently failed as detailed below.

Developer reports **106 code/HTTP tests (prior 86 +20 new), five final signing Simulator journeys and ten earlier regressions, and unsigned build**. Earlier regressions precede final sheet Dynamic Type forwarding/missing-profile/signature-ID guards; final five plus host/build cover those changes. A failed maximum-text diagnostic is retained and superseded by final passing size assertion, not counted as a pass. Source/report: candidate `ios/docs/GM06C_VERIFICATION.md`, `SIGNING_GALLERY.md`.

Independent exact-SHA GM-06C assignment delivered to `/root/ios_audit`, separate detached checkout/caches and supplied UI readback only. Final reports received and inspected: `/tmp/split-ios-beta-qa/QA_REPORT_e1ec61d.md`, `verification_e1ec61d.json`. No consent/legal, hosted signing/permissions/races, physical device or release acceptance is implied.

## Current native task and next gates

Independent actual-source/SDK/store signing execution reproduced blocking response-integrity/final orphan-evidence/account-publication gaps. Candidate 106 XCTest/build pass, hostile run 156/186 with 30 failures; final report received: one P1/two new P2. Repository accepts same-ID altered current shares, rewritten historical proposals, dropped unknown JSON/audit and new ambiguous evidence, then publishes success. A suspended final fresh-user GET can publish A's signing result after actual SDK switch to B; initiating request remains safely bound to A token. No hosted wrong-account write performed.

Stop-PDF/correct-signing steering was successfully delivered. Finish auth fixes separately, then harden/retest signing. Preserve reviewed proposal/work/sample/party/unknown data and original history/audit/signatures while allowing legitimate own-party registration/profileSnapshot changes, new signature/audit/status/revision and valid concurrent final signature mutations documented by existing SQL; reject orphan/ambiguous evidence, recheck actual SDK/session account after final awaits and before store publication. No automatic replay, schema or legal changes.

GM-06D PDF work is blocked pending signing correction/retest. Subsequent PDF remains separate, without new service/backend/legal content or stale certified export after failed access/fetch. Carry small-phone/keyboard/large-text/VoiceOver/device polish through those milestones. Shared dependency, consent/legal/support, hosted isolation/delivery/alerts and current recovery gates remain open.

Founder selected hourly GM monitoring with meaningful change notifications. ACTIVE heartbeat `monitor-split-web-and-ios-development` is saved in the GM chat and its interval/target/quiet-when-unchanged behavior verified. Existing direct agent instructions are valid and take precedence over stale queue notes; the monitor reads accessible new directions. Hourly checks do not imply automatic shared memory or continuous supervision.

The separate daily briefing `split-morning-development-and-launch-briefing` is ACTIVE at 9 AM New York time every day, reporting both platforms' checklists and overall launch operations even when unchanged.

## Auth correction candidate received

`f7fc8e651f90a4b352f095f6659e277cbffc31d3` is a separate seven-file auth correction, based on signing candidate e1ec61d. Its immutable `ios/docs/GM11_HARDENING_VERIFICATION.md` reports developer 111 host tests, five auth UI journeys/build and101/101 supplied hostile checks; old 92/101 failure was reproduced first. Desired nine boundary assertions retained; cumulative PUT expectation tightened 4→1 because three corrupt grant writes are now denied. These are developer results, not independent closure. Exact-SHA independent retest assigned to `/root/ios_audit`, expected `/tmp/split-ios-beta-qa/QA_REPORT_f7fc8e6.md` and `verification_f7fc8e6.json`. Signing P1/P2 remain inherited/unresolved at this auth candidate; full beta acceptance not claimed.
