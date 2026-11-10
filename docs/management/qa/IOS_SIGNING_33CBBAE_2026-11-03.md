Archived by GM November 3, 2026 from independent exact-candidate QA. Local artifact links are retained as filenames; runtime logs, images, credentials and browser traces are not committed. This is local technical acceptance, not provider/hosted/legal/release approval.

# Independent native signing count-correction retest

November 3, 2026. Exact SHA **33cbbaeb19ef5bf6e02f9da00dfd3435c0f717e0**, parent docs-only `1a7deec7e88eac5d0d9fb526a99ec1d4cf92de63`; original db6 candidate and its failing evidence remain unchanged. Detached QA checkout: `/tmp/split-ios-beta-qa/33cbbae-checkout`.

**Decision: PASS_LOCAL_GM06C_CORRECTIONS.** The native local technical signing-correction gate passes. **QA-GM06C-4 closes locally**, and reconstructed response-integrity, aggregate-ambiguity and actual-SDK final-await account-switch checks remain passing. No new P0/P1/P2 defect was found within this scope. This is not DocuSign, hosted/device/legal, full beta or release approval; the reviewer has neither authorized nor started a prototype.

## Independent execution

| Check | Observed result | Scope/provenance |
| --- | --- | --- |
| Candidate host suite | **130/130 XCTest, zero failures**, exit0 | Fresh exact-candidate SwiftPM build/tests with separate scratch/cache, completed November3 at 13:14:18 New York time. Includes the 120 prior candidate tests and ten new count tests. No separate unrelated auth-harness rerun. |
| Unsigned native build | **BUILD SUCCEEDED**, exit0 | Fresh Debug generic iOS Simulator arm64 build, `CODE_SIGNING_ALLOWED=NO`, separate DerivedData/SourcePackages. No Simulator boot/launch/control or global defaults change. Only warning is skipped AppIntents extraction without that framework. |
| November reconstructed integrity harness | **177/177 assertions pass** | Actual rebuilt SplitDomain and pinned SDK objects; exact same desired assertion bodies as the prior 171/177 db6 independent run. Only the result-file path changed in copied source; module/object/output locations adapted in compiler argv. |
| Original focused count controls | **11/11 assertions pass** | Same desired bodies as prior 7/11 db6 focused evidence; result path relocation only. These overlap the 177 scenario and are reported separately. |
| Additional independent boundary controls | **115/115 assertions pass** | Actual candidate model/action/confirmation code: Pending duplicates through canonical aliases in both orders; shared-ID affected/unaffected parties; history, invalid proposal/account and provenance controls; original JSON and global action/response/aggregate guards. |

The exact commands, exit codes and durations are preserved in host execution (`33cbbae-host-execution.json`; local session artifact), build execution (`33cbbae-build-execution.json`; local session artifact), and each compiler argv/execution JSON listed in verification (`verification_33cbbae.json`; local session artifact). Logs: 130 host tests (`33cbbae-host-tests.log`; local session artifact), native build (`33cbbae-build.log`; local session artifact), 177 results (`33cbbae-independent-results.json`; local session artifact), 11 focused results (`33cbbae-focused-count-results.json`; local session artifact), 115 boundary results (`33cbbae-boundary-results.json`; local session artifact).

## Diff and original assertions

Inspected the six-file correction against its docs-only parent. The only changed product file is SigningReview.swift (`SigningReview.swift`; local session artifact). It separates per-party matching from global record validity and counts **all** records bound to the selected canonical party/proposal, including Pending rows, before accepting a unique Signed row. Global ID uniqueness, actor/name/time/method, mapping, revision and selected-proposal checks remain.

Exact source comparison proves the `fullySigned` aggregate predicate, `SigningReview` action-denial guards and complete `SigningConfirmation` response validator are byte-identical to db6. Comparison ledger (`33cbbae-global-guard-comparison.json`; local session artifact), product diff (`33cbbae-source.diff`; local session artifact). SDK locks, project configuration, assets, shared schema/RPC and other platform source are unchanged. The old candidate's zero-count expectation changed to two while aggregate/action denial assertions remain; new tests add affected-party boundaries.

Original independent source SHA256 values remain:

- `IndependentSigning_db6c64a.swift`: `e0960e9d0f37172848eea3e7796f992354429a6cd206d83b778fb130d656d265`.
- `FocusedSigningCounts_db6c64a.swift`: `56f962708b4d45d7312485347ae4543d3df240c8497a86d3ba46c4a97c71c07d`.

The adapted sources normalize exactly to those originals after replacing only result-file names. All artifact hashes recorded in the prior db6 verification still match, and its **171/177** and **7/11** failing ledgers remain intact. These November checks were independently reconstructed because the October 186 source/results were missing; this retest does **not** claim the historical186 harness was recovered. Adapted177 source (`IndependentSigning_33cbbae.swift`; local session artifact), path-only diff (`IndependentSigning_33cbbae.swift.diff`; local session artifact), adapted 11 source (`FocusedSigningCounts_33cbbae.swift`; local session artifact), path-only diff (`FocusedSigningCounts_33cbbae.swift.diff`; local session artifact).

## Closure and retained safety

**QA-GM06C-4 per-party count suppression — closed locally.** Full/minimal/missing-party-ID unknown current Signed rows in either order now preserve both otherwise-matching required-party confirmations and count 2/2, while aggregate completion remains false and the full source record remains unchanged. A duplicated known creator signature unconfirms creator alone and retains the valid guest's 1 confirmation. The previously failing desired assertions now all pass.

The additional independent boundary source (`SigningBoundaryControls_33cbbae.swift`; local session artifact) verifies:

- Creator/creator-party and guest-invite/guest-party **Pending duplicate** bindings, placed first or last, unconfirm only the affected party. They cannot masquerade as a unique acknowledgement.
- An outsider row sharing creator's or guest's record ID, in either order, invalidates the affected matching signature and retains only the independent other party.
- Every ambiguous case denies aggregate certification, explicit review/command and response publication, while preserving complete source JSON. Counts alone never authorize signing.
- An unknown historical Signed row retains current 2/2 and the otherwise-matching historical guest acknowledgement. Native's pre-existing conservative global policy still blocks aggregate/action for malformed global evidence; this retest does not relax it or assert identical web/global policy.
- Unknown/duplicate selected proposal and duplicate global account mapping remain fail-closed. Local source reports no confirmed signatures; fixtures retain test-only acknowledgement IDs but neither confirm nor certify real completion.

**Original QA-GM06C-1/2/3 safety remains passing** in the 177 actual-source/SDK/store assertions: malformed successful RPC responses cannot alter reviewed shares, work/sample/profile, unknown fields, history or prior audit/signature snapshots and publish success. The store/cache retains the reviewed original, requires reconciliation and blocks automatic replay. Legitimate saved registration/profileSnapshot capture and concurrent valid final signing controls pass. Unknown current signing evidence never falsely certifies the final record. Actual SDK sign-in B during A's suspended final fresh-user response does not publish/cache A's result; the initiating RPC retains tokenA and transport rejects foreign hosts.

## Acceptance limits and next gate

Xcode26.5/17F42, Swift6.3.2 and Supabase Swift2.55.3 at `9c8c9d283b13a369f52cc78d8639648d8a17f5d3` remain pinned. Public dependency caches were locally cloned into separate QA caches; candidate code was rebuilt, not linked to old db6 domain objects. All runtime SDK probes use memory Auth storage and injected `fixture.invalid` transport; no real Keychain or hosted application fallback. The host package excludes SwiftUI/WorkspaceSession/real Keychain.

NativeAgreementReview is unchanged and reads the corrected count/matches; this presentation connection was source-inspected. No fresh independent UI execution was needed for the narrow model change. The October10 supplied five signing UI journeys previously read back 5/5 remain historical developer execution, not exact 33 SHA or current device evidence. No claim is made to close the historical frame-warning polish issue, VoiceOver/minimum OS/physical device, OS callback/inbox, protected storage, hosted permissions/transactions/concurrency, web↔native integration, consent/provenance/counsel, recovery or release gates.

No developer checkout/untracked files, active Simulator, global Xcode settings, credentials/live configuration, hosted Supabase or DocuSign/demo APIs/envelopes/email, schema/spend, merge/push/deploy/TestFlight/legal publication or external chat was changed. Detached candidate remains clean.

GM may record the count correction and local technical signing gate as accepted. **The separate DocuSign shared-contract alignment remains a GM/founder coordination gate before a local prototype.** No provider implementation or prototype authorization is conferred by this report, and no further broad retest is required absent new changes/findings.


## Archive integrity

Original report SHA-256: `ed82e3199a881b2dd3c7f79e95a8c021b0c5e4fbdabd12e1a27a23e62629e6fc`. Verification JSON SHA-256: `baa40e103e9f8e0aded06e601d783901c2e5cd4c76e61932736869563f46587e`. All 28 source/artifact hashes verified by GM.

| Session artifact | SHA-256 |
| --- | --- |
| `33cbbae-host-argv.json` | `8b2fffde6dfd1ff3d75148fb4fa90969c8a5ded1f73e80b92cdf62505c78a647` |
| `33cbbae-host-execution.json` | `fdc188bea087c9e0da8ae1d65bc83ef1b4e8f00f1b6728387e4218844fd3952c` |
| `33cbbae-host-tests.log` | `d39b554f245c61bca7019a1cf64250b8dc74c4e5edfc0716c5170ac621b8bd18` |
| `33cbbae-build-argv.json` | `bff3289b1d2d5185ec085c83990203f7bce155e98e2c96b82f97fd2532defb66` |
| `33cbbae-build-execution.json` | `8c788e95192b6e58755f1128f2f62d16f19a808ab7b37d83fa6f249871863474` |
| `33cbbae-build.log` | `fff37aade88bb38db4e05da35412f00be4a2925fd3f347449910ea9146cae8bf` |
| `IndependentSigning_33cbbae.swift` | `aecc7f9383c58076d1805673226b85e169a199efb36e032e1d46baf9bec47651` |
| `IndependentSigning_33cbbae.swift.diff` | `dedcf680fab23eff5d51a05c8864290a7f3633cb25ba68afd5cf693957b9e774` |
| `33cbbae-independent-argv.json` | `e96da6d7f48c93d08afa120a55e6ed0b339f90e464c042367a2c49e9d6ff5f2f` |
| `33cbbae-independent-compile.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `33cbbae-independent-run.log` | `aa7a2ccd638607805738bb5133c9a2a6be2c91ca4ebcc0b6fa21e9ee84ef1bb6` |
| `33cbbae-independent-results.json` | `d35ece9bd4f8ad88fc2722f44ccffa811fecc8505e85c8716586980665b5f542` |
| `33cbbae-independent-execution.json` | `f77af58977988afe8cad4546365405b5e6e911ed0dafdc0d0a5d7ec0fa068bb1` |
| `FocusedSigningCounts_33cbbae.swift` | `f0006648f05e24a27550b57315294bfa40e3688b71b962c8cfa48a8f793c39d2` |
| `FocusedSigningCounts_33cbbae.swift.diff` | `aa5d3718009c6a2c6e570e0030f3936e5004816a44ea71b2d8df0b532eb3c629` |
| `33cbbae-focused-count-argv.json` | `e39a282f6489f7e558d7d449fab7fcc75de0cf077651b1342e3ee61bf843e6e1` |
| `33cbbae-focused-count-compile.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `33cbbae-focused-count-run.log` | `1878f6a6f4ccd90b1c98941bdd96d187eb297cf8743ff771ec1c1d13ca40e880` |
| `33cbbae-focused-count-results.json` | `3c4931c0ddb4319b3335d14fb7001b9cb7dd9e1e97e33ee6bbcf791aaea3ad98` |
| `33cbbae-focused-count-execution.json` | `43897437200f92c82f2da72b9a4e818f22750ae576803acb7659483cbdf946fb` |
| `SigningBoundaryControls_33cbbae.swift` | `e9e96e6ed4d90df01630aa73ce4de9ca69ab34e037dd7a4711e64c9cb8cb36a7` |
| `33cbbae-boundary-argv.json` | `a93361387aa793c3b64899e338025f4478b7f9380aad9d73baf9d901a85e131c` |
| `33cbbae-boundary-compile.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `33cbbae-boundary-run.log` | `517c2690742996d665b1de0b68e38b49332c9ae959ccdb3f3be1a5b23d5103f6` |
| `33cbbae-boundary-results.json` | `aa57c7ef0a320d3e6e7ca6657bc59438cd36acc7c214622844718746c12cbe35` |
| `33cbbae-boundary-execution.json` | `7912d96fb0dce2fcf40d5abc44dca36314ca80708da3576aeab0e49e2942e106` |
| `33cbbae-global-guard-comparison.json` | `3ec32711705dc6b7e8689e6f5f600b6097ea3d712446d4b46e551ab68c49b024` |
| `33cbbae-source.diff` | `135ff1fcb28d6fa5aa17d725af597f3156165f60116e9a812619569c1082e077` |
