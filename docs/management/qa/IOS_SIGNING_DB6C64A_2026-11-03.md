Archived by GM on November 3, 2026 from the independent reviewer report. Artifact links below are retained as local-session filenames; logs, images, test bundles and browser traces are not committed. This is dated local evidence, not hosted/provider/release approval.

# Independent native signing correction review — db6c64a

November 3, 2026. Exact immutable candidate **db6c64ae8c544119340a029b3546c1c37f1a860b**, detached `/tmp/split-ios-beta-qa/db6c64a-checkout`.

**Decision: PASS_LOCAL_SIGNING_INTEGRITY_WITH_P2_COUNT_CORRECTION.** The original response-integrity and account-publication findings close within independently reconstructed local coverage, and current orphan Signed evidence no longer falsely certifies aggregate completion. One separate **P2 presentation/count correction remains required**. This is not full GM-06C, DocuSign, beta or release acceptance.

## Result and evidence

- Independent baseline in the earlier segment of this same November 3 review: **120/120 XCTest**, zero failures, and unsigned generic arm64 Simulator **BUILD SUCCEEDED**. Retained logs were inspected after the interruption; no baseline repeat was necessary. Source remains clean at the exact SHA. The full host-test argv was not retained separately, so the host log establishes the observed result without inventing missing flags. Build command is recorded at the start of its log.
- Reconstructed independent actual-source/SDK/store harness: **171/177 assertions pass; six fail**, all six representing the same per-party confirmation suppression across three orphan forms and two orders. Compiler output is empty and a run ledger is retained. This is a new independent harness; the original October 186-assertion source/results/report were cleared from `/tmp` and were not recovered.
- Additional focused source controls compiled/executed on resume: **7/11 assertions pass; four fail**, confirming both unrelated-orphan suppression and an unaffected guest being suppressed when the creator's own evidence is duplicated. These overlap the reconstructed scenario and are reported separately rather than advertised as new independent coverage breadth. The focused executable records desired failed assertions but exits0; exit0 is not counted as an overall pass.
- Supplied developer October 10 signing UI bundle was read back as **5 passed/0 failed** on iPhone17Pro/iOS26.5. No independent Simulator launch. Its xcresult does not independently establish a Git SHA; current committed developer verification identifies the bundle and its limits.

Logs and source: host tests (`db6c64a-host-tests.log`; local session artifact), unsigned build (`db6c64a-build.log`; local session artifact), reconstructed harness (`IndependentSigning_db6c64a.swift`; local session artifact), full compiler argv (`db6c64a-independent-argv.json`; local session artifact), 177 results (`db6c64a-independent-results.json`; local session artifact), focused source (`FocusedSigningCounts_db6c64a.swift`; local session artifact), focused compiler argv (`db6c64a-focused-count-argv.json`; local session artifact), 11 focused results (`db6c64a-focused-count-results.json`; local session artifact), developer UI readback (`db6c64a-developer-ui-summary.json`; local session artifact). SHA256 values and exact source/SDK provenance are in verification JSON (`verification_db6c64a.json`; local session artifact).

## Original finding closure — reconstructed local scope

**QA-GM06C-1, original P1 response integrity:** corrected `SigningConfirmation` rejects a same-ID changed current allocation, rewritten historical allocation/notes, changed work/sample/profile, unknown-field mutation, altered/dropped/reordered audit, changed prior signature snapshot, conflicting approvals, pending invitation, malformed/current outsider signature, false finality, bad revision/proposal, forged signer, unsupported method and invalid update times. Actual repository/store successful-response probes retain the reviewed record/cache, require refresh, and suppress replay. Normal actual SDK/store signing succeeds with the minimal authoritative command; no client-supplied signature snapshot is sent.

The control cases retain the documented SQL exceptions: creator PRO/custom-PRO/IPI capture, guest registration and authorized profileSnapshot projection, appended signature/audit/revision/time, and valid concurrent guest final signing. A mismatched registration snapshot and unreviewed private profile addition are denied. This review does not demand a privacy-protected profile projection acquire fields the viewer cannot read. The finding-oriented predicates are independently reconstructed; no claim is made that every body of the historical186 assertions was reused unchanged.

**QA-GM06C-2, original P2 aggregate false certification:** full/minimal/missing-party-ID current Signed extras in either array order correctly make aggregate `fullySigned` false; original JSON remains intact. That closes the original false-final-certification shape within these local inputs. Suppression of legitimate per-party confirmation is a separate finding below.

**QA-GM06C-3, original P2 final-await account publication:** injected actual pinned SDK transport suspends a fresh `/auth/v1/user` response after signature RPC A; SDK really signs in accountB before oldA response is released. The corrected repository/store does not publish/cache the result for A, sets refresh/uncertainty, retains the reviewed original, and keeps the actual signature RPC bound to tokenA. No foreign host request occurs. Source also retains store generation/account checks and `clearAccount` invalidation.

## QA-GM06C-4 — P2: unrelated invalid evidence suppresses matching parties

Start with two required accepted parties, current approvals and two otherwise-matching server-recorded acknowledgements. Their valid final control reports2 confirmations and fullySigned=true. Append one unique **unknown current-proposal Signed** row. The candidate correctly blocks aggregate completion and retains both required rows, but reports **0/2 confirmed** and marks both known parties unconfirmed. Full, minimal and missing-ID extras reproduce in both input orders.

Root cause: SigningReview.swift:123 (`SigningReview.swift:123`; local session artifact) puts global `validRecords` inside every person's `matchingSignature` predicate. A single unrelated invalid row clears all per-party matches. NativeAgreementReview.swift:58 (`NativeAgreementReview.swift:58`; local session artifact) displays the resulting count; line71 (`NativeAgreementReview.swift:71`; local session artifact) selects Signature unconfirmed. This presentation consequence is source-inspected, not an independent UI execution.

Known-party control distinguishes legitimate uncertainty: adding a second creator current signature correctly makes creator unconfirmed; it also incorrectly suppresses the unrelated guest, yielding0 instead of retaining guest's1 confirmation. The focused probe confirms the unaffected guest failure while aggregate remains false and original JSON remains unchanged.

This is conservative mislabeling, **not** fabricated signatures, record deletion or an authorization bypass. Candidate tests intentionally assert count0 for malformed global evidence (SigningTests.swift:210 (`SigningTests.swift:210`; local session artifact)); they encode the current behavior and do not satisfy the GM shared requirement to preserve legitimate per-party evidence while aggregate certification fails closed. The finding should be scoped to presentation/count consistency, separate from original integrity closure.

Correction acceptance:

- Keep global ambiguity blocking a signing action and full aggregate certification.
- Compute each party's presentation evidence independently of unrelated invalid rows, retaining exact canonical party/account/proposal binding, unique record/ID, valid name/time/method and duplicate checks.
- Unknown current Signed extras with distinct IDs preserve the two otherwise-matching confirmations, show incomplete/uncertain aggregate evidence, and cannot certify completion.
- A duplicate/conflicting creator signature leaves creator unconfirmed while a separately valid guest remains confirmed; shared-ID or known-party ambiguity must still fail that affected party closed.
- Preserve all original records/history/status/snapshots and clearly separate local simulation from real provider evidence. No new legal claim, consent text, RPC or schema change is needed for this bounded count correction.

## Scope and open gates

Read GM instructions/current local plan, candidate ios/AGENTS and immutable GM06C_HARDENING_VERIFICATION. Xcode26.5/17F42, Swift6.3.2, Supabase Swift2.55.3 at `9c8c9d283b13a369f52cc78d8639648d8a17f5d3` are unchanged. The actual SDK AuthClient, account transport, LiveSplitRepository and ConversationStore execute against injected `fixture.invalid` routes and memory Auth storage; foreign requests throw rather than falling back to real HTTP. No Keychain access occurs. Public package/doc downloads are distinct from application/provider traffic.

No product source, developer checkout/untracked work, Simulator state, global Xcode defaults, live configuration/credentials, hosted Supabase/Auth/RPC/data, DocuSign demo/production/API/envelope/email, schema/spend, merge/push/deploy/TestFlight, legal publication or external chat was changed. Historical invalid-frame polish warning remains separately open; this review does not diagnose or clear it. Real hosted permissions/transactions/concurrency, web↔native synchronization, inbox/OS callbacks, Keychain/protected storage, minimum OS/physical devices/VoiceOver, consent/provenance/counsel, recovery and release evidence remain open.

Next: owner corrects the narrow per-party count issue in a separate candidate, then independent exact-SHA retest; align the DocuSign server/client contract before provider-dependent PDF execution work. No founder decision is required for this already-authorized local correction.


## Archive integrity

Original reviewer report SHA-256: `1aee9313ab61903a40800fe9f2a50914b41bbf1b26510d27b9f5a07ff13428a9`. Verification JSON SHA-256: `f208a30c99240d13a113cf0b8a9252f702609991a230965705a852574d36b55b`. GM verified all 13 referenced source/artifact digests before archiving.

| Source/session artifact | SHA-256 |
| --- | --- |
| `IndependentSigning_db6c64a.swift` | `e0960e9d0f37172848eea3e7796f992354429a6cd206d83b778fb130d656d265` |
| `db6c64a-independent-argv.json` | `e06a44d05e8952680e1c84a53e836841cbe9d433534817633ed6fd80546c07aa` |
| `db6c64a-independent-compile.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `db6c64a-independent-run.log` | `88b61eba038ddc6574318516b5351a4c33543b11f9c878a0e2b3a621e19c350f` |
| `db6c64a-independent-results.json` | `c7389b2db5801dacee37c28b2edd8becbe5858b5d5348b92b938e8423813a1b8` |
| `FocusedSigningCounts_db6c64a.swift` | `56f962708b4d45d7312485347ae4543d3df240c8497a86d3ba46c4a97c71c07d` |
| `db6c64a-focused-count-argv.json` | `677160497f2bc4ddae19d2eda04165c9a5c3e34f656c2cae29db0be873b6018c` |
| `db6c64a-focused-count-compile.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `db6c64a-focused-count-run.log` | `58118ffa137fc9443553adf71733848686d3f0c2858ddfe3ac8f61c81f28cf8d` |
| `db6c64a-focused-count-results.json` | `ee77b140d0038fe7a41bf24c44de553a6b738ead2f60a8f5c42b4ca032d3867f` |
| `db6c64a-host-tests.log` | `bf7d1bbffe6ef1d1a4cd04718155c4e4603939e4c06e11311ff5818333b32023` |
| `db6c64a-build.log` | `da8cdde48b0f3d2e4ab04d0417521f71ec40972a519a0f23edff50bca497b601` |
| `db6c64a-developer-ui-summary.json` | `cba55dad246e0c974b4a641cd63c9a99f6d3baca3de0a34743793aa9bb746379` |
