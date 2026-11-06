# AF1 core ebb3041 — GM owner-evidence intake

GM read the full owner report and verified all 59 indexed artifacts/lengths, all 12 committed source snapshots and all 643 unchanged parent tree entries. Exact handoff hash matched. Candidate ebb3041ac7b00155f5a0e328715ac17de36d0c36 adds only the twelve authorized paths; parent is accepted native 4f01499. Report SHA-256 ee9e51856813237acba4eeae173c0f3ca4198c4b58141f27dab463637929895b; index 78393d44c87db4a198c071eb334c4c627555a64f4bb6bb72745b1b3a796038be.

Owner 28 XCTest/macOS Release/iOS17 arm64 Debug+Release module checks are developer evidence only. Bounded independent exact-candidate QA is assigned to /root/af1_core_independent_qa with fresh scratch/caches and reviewer-owned assertions/fault controls. No GM13H runtime acceptance yet. Preserve earlier working/failed owner test logs and the owner-found observation-epoch correction as disclosed. Full original report follows byte-for-byte.

---

# GM13H native AF1 memory core — owner delivery

November 6, 2026, America/New_York.

**Owner result: local checks passed; independent exact-candidate QA is pending.** Candidate ebb3041ac7b00155f5a0e328715ac17de36d0c36, branch codex/ios-af1-memory-core, parent accepted native 4f01499b0a926d141497d82bbd4c195d7b2922f5. Exactly the twelve authorized standalone-package files were added (1,669 lines); no existing tracked path changed.

This is an integrity-validation library over synthetic ASCII NON-PDF bytes. Its only successful package status is integrityValidated. It implements no app screen, PDF parser/viewer, materializer/share host, real signing, provider integration or service endpoint, and has no display/share eligibility API.

## Inputs, source and custody

The concrete GM handoff is preserved as handoff.md; its hash is in candidate-metadata.json. Controlling G2: 485c7b11db9e981d0d9588bb191b9e6bb2eca3e6, path build-it-app-main/docs/beta-docusign-af1-g2-protocol-vectors-2026-11-06.md, SHA256 e6b66bb5d97ba2168083f6fb9faf9a1d9f5f5885aadb78efe384f54ff5184a36, preserved as G2-specification.md. Native/web G2 review hashes were rechecked and recorded.

The sole package is ios/ExecutionArtifactCoreFixture/Package.swift, library AF1FixtureCore and tests AF1FixtureCoreTests, fixture floors iOS17/macOS14, no dependencies. Seven sources import only Foundation/CryptoKit; four tests additionally use XCTest/the tested module. Root ios/Package.swift, accepted ExecutionSimulation, app/project/navigation/session, SDK pins, web/configuration/schema, G1/S1/S2 and model1f82 are unchanged.

candidate-metadata.json records all source paths/hashes/sizes/lines; sources/ holds byte-identical committed snapshots. input-vector-manifest.json records all25 serialized input hashes/source and spec lines; Swift literals are byte-identical to G2. vectors/ preserves them. The44 negative instructions expand to47 mutations because their alternate state/documentId variants are also executed. No fixture resource or generated PDF was added.

## Behavior delivered

- Raw UTF-8/size/depth/member/array gating before typed construction; duplicate decoded keys including escaped aliases; surrogate validation; canonical unsigned number lexemes and field bounds. Exact recursive keys/literals/digest objects, omission, boolean/date/UUID/ID rules and permit-set normalization. Other arrays retain order. Request and response roots are distinct; Failure code/recovery pairs remain exact.
- Immutable independent SeedOracle with privately minted principal/world identity, GM13E A/B/C/D, retained prepared/executed/completion preimages, frozen terms/signer/document-set bindings, known attempts and all G2 drivers. Responses cannot add oracle entries or claim a higher manifest. A/B have personalized views over identical retained bytes; coincident sheet IDs do not link fixture worlds.
- Whole P1/P2 correspondence and exact bytes against the retained oracle, not response-local hash agreement. Independent copies at intake/exposure, including mutable/bridged Data and selected backing-buffer subviews. Only bounded owned bytes are hashed/staged; application/pdf remains nominal metadata.
- Main-actor ownership of store/account/selection/load generations, separate observer generations and denial epoch. Each explicit load replaces older owners even for identical server tuples. Both successes and typed/thrown failures check ownership before state, watermark or epoch mutation. Retirement/ABA prevent revival; exhausted counters retire/restrict rather than wrap.
- Separate registry authority. Initial/final manifest reads reauthorize both permits and every entry before/after holds, including earlier documents during certificate retrieval. Each byte read checks its artifact. Final pinned-set equality and a synchronous owner/epoch check precede whole-package publication. Failed binary calls throw sanitized errors without returning a successful metadata/body pair.
- Current generation/context/registry-correlated notices invalidate completed results; obsolete historically true revocation held through regrant/new positive does not. Denial clears selected metadata/bytes. A success cannot falsely mark an unobserved later registry epoch as authorized.
- r1/r2 high-water marks across reselects, equal-conflict quarantine, explicit current/history modes, superseding/pending/error precedence and explicit fresh-read recovery. No command, legacy/generated-cache, session or automatic retry/share surface exists.

These are local fixture behaviors. Notices are a trusted injected seam, not production push authorization. No continuously atomic remote-revocation guarantee is claimed.

## Verification actually run

| Check | Result and evidence |
| --- | --- |
| Standalone Debug XCTest | **28 methods, 0 failures**, owner-tests-acceptance.log. Many methods enumerate multiple stage/order/account/vector cases; these are not extra XCTest methods. |
| macOS Release package build | Passed, owner-release-build.log. |
| iOS17 arm64 Debug library-module compile | Passed, owner-ios-debug-module.log and exact argv in ios-module-compiles.json. |
| iOS17 arm64 Release library-module compile | Passed, owner-ios-release-module.log and exact argv in ios-module-compiles.json. |
| Scope/custody/vector checks | Twelve additions only; committed blobs and snapshots match; original4f branch/old paths/pause note preserved; all25 literal bytes match G2. |

Final test command from the native worktree:

~~~sh
swift test --package-path ios/ExecutionArtifactCoreFixture \
  --scratch-path /tmp/split-native-af1-core-0f570ed3b6/core-build \
  --cache-path /tmp/split-native-af1-core-0f570ed3b6/cache \
  --config-path /tmp/split-native-af1-core-0f570ed3b6/config \
  --security-path /tmp/split-native-af1-core-0f570ed3b6/security
~~~

Release used the same destinations with swift build -c release. All compiler/cache output is in new external locations. Versions: Apple Swift6.3.2, Xcode26.5 (17F42), macOS26.5.2 (25F84); full output is preserved. iOS checks use iPhoneOS26.5 SDK and arm64-apple-ios17.0, and compile library modules only: no app link/signing, Simulator execution, iOS17 runtime or device result.

Final tests ran against final source before the local commit, then committed-source hashes were verified unchanged. Earlier22/25/26-method working runs are preserved separately, not added to the final count. One later test addition initially failed to compile because await was inside an XCTest assertion autoclosure (owner-tests-final-complete.log). The awaited call was separated before the assertion; final28-method execution passed. The failed log remains.

Owner audit also found and corrected an observation-tracking issue before delivery: a success had read the registry's latest counter as if the later event had been authorized. Now only the captured observation epoch is recorded. A regression changes permission after the real safe final repository check, then delivers its current notice after publication; that notice must still clear the result. This is an owner-found/corrected issue in new work, not a regression attributed to accepted4f.

## Coverage and independent review

The suite executes all25 records, including injected dispatch of all four requests; all44 negative instructions/47 variants; raw lexical/encoding/duplicate/null controls; required/unknown keys at every recursive object; scalar/date/ID boundaries; P1/P2/A/B originals; self-consistent forged manifest/body and P2 swaps; mutable bridge/subview/intake/exposure; every readiness driver; current/history and sanitized denial; r1/r2 rollback/equal conflict; current read failures and explicit recovery; foreign-world/C/D denial.

Deterministic manual continuations, not sleeps, cover both L1/L2 finish orders for same-context success and typed/thrown errors across projection/manifest/first document/certificate; validation holds; actual denied response through regrant/new positive; obsolete/current observers; newer denial versus old work; account/execution ABA; pending retirement/reconstruction; first-document revocation during certificate and held final-manifest reads; and the post-final-check notice case. Old work cannot erase newer results, advance epochs or quarantine a newer context.

Independent QA must exercise this exact SHA with its own expected values, assertions and reviewer-local omitted-owner/permission/oracle/copy fault controls. These independent fault executions have not been performed by the owner. Safe candidate code has injected reads/holds, no exported bypass mode. Owner passes and a commit do not establish GM13H acceptance.

## Limits and preserved state

P1-Assembling is completion-pending with pending parties/two unresolved recipients. This is not full G1 AF-07 completion-known/files-assembling, real preparation/reconciliation, same-sheet supersession, finalization/durability, SQL/RLS/auth-token enforcement or actual HTTP/storage proof. Absence of command/provider/legacy/transport APIs and modeled zero effects do not prove real database/provider enforcement.

Unchanged app/root-package historical suites and Xcode app builds were not rerun: those targets do not consume the new standalone library. The bounded handoff's package tests and Debug/Release library compile checks are the relevant checks here. No UI/navigation/device proof is claimed.

Original codex/ios-execution-denial-correction still points to4f. Only the new branch advances. Git status contains solely the pre-existing untracked ios/docs/PAUSED_CHECKPOINT_2026-10-10.md; SHA256 remains 40e54470d387eb3104556a739b356f9c0209d6dd4ed92420e9c5de11ec2668fc. Partner Simulator B0FE7622-16A8-4170-93F3-BE3B053F45E1, installed apps, sessions/defaults and data received no operations.

No actual PDF/parser/materializer/viewer/share, host integration, provider/demo/OAuth/account/API/email/upload/tunnel, credentials, hosted schema/config, cost, legal/outreach, push/merge/deploy/TestFlight or new chat occurred. H1, D01–D07, actual GM06D, device/accessibility, hosted integration and release remain open. Stop after delivering this immutable candidate/evidence to GM for independent QA.
