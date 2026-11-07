# AF1 correction 4e2deed — GM owner-evidence intake

GM read the full corrected owner report and verified all 38 indexed artifacts, all 12 committed source snapshots and 650 unchanged parent tree entries; only 5 authorized existing paths changed. Exact candidate 4e2deed6132dbdffe691de1e03e08b20d96905ba, parent failed ebb3041. Report SHA-256 184ada34f8c8a71d58832f48789c00209a52faad637043bb6a9378d0edb72f83; index fe619d660a9e427d3028f53c69e1a0db473a2fc81f7c93b4137b94753df122b6. Packet /Users/christiancarrera/.codex/artifacts/split-native-af1-authorization-correction-20261106-b80ebac7bc/.

Owner 36-method and unchanged 3-method finding-probe rerun/builds are not independent acceptance. Original 27-method snapshot is 26 pass/one superseded expectation fail; remaining old preflight-denied hold is bounded 10s/unreachable, explicitly preserved. At intake, independent exact 4e2deed retest was active; the [subsequent final QA](AF1_CORE_4E2DEED_INDEPENDENT_2026-11-06.md) now records selected local acceptance; original failed ebb/all evidence remain unchanged. Full original owner report follows byte-for-byte.

---

# GM13H-FIX — independent authority and denial precedence

November 6, 2026, America/New_York.

**Owner correction checks pass; independent exact-SHA retest remains required.** Corrected candidate 4e2deed6132dbdffe691de1e03e08b20d96905ba, branch codex/ios-af1-authorization-correction, parent failed candidate ebb3041ac7b00155f5a0e328715ac17de36d0c36. Five existing authorized files changed: two core sources and three tests, 285 insertions /22 deletions. No new source path, package/dependency change, app integration or protocol amendment.

Original ebb3041 is not accepted. This delivery addresses the two confirmed findings F1/P1 and F2/P2; it does not claim completion of the broader original review or GM13H acceptance.

## Findings and correction

| Finding | Correction and discriminating evidence |
| --- | --- |
| F1/P1: exact positive literals from a replaceable transport could publish while trusted authority denied access | FixtureRepository now exposes internal synchronous trusted scope/package checks independent of AF1ReadRepository. MemoryReadStore calls them before transport use, after awaited replies/validation holds, on error handling and at the final synchronous publication barrier. Current world/principal/context/execution/history, both read permits and every required entry grant are checked; pinned projection/manifest remain exact. Literal-only transport tests cover revoked reader, every P1/P2 document and certificate, both permits, explicit history, C/D/foreign world/unknown execution, held final changes and callback revocation. |
| F2/P2: local quarantine could replace an authoritative denial before a read | The store no longer checks isQuarantined before authorization. Shared authorization precedes context/readiness/quarantine diagnostics. Even malformed or thrown transport errors are subordinate to a fresh current denial. Tests trigger real integrity quarantine, revoke each permission class, verify denied and metadata/byte clearing, then regrant and verify authorized quarantine still restricts the package. |

AF1ReadAuthoritySnapshot is an internal registry value, not a wire field, receipt or transferable capability. A response cannot mint it. The injected transport remains public and replaceable; new positive controls obtain the complete literal P1/P2/A/B/history packages with zero delegated authority read-method calls while the store independently checks trusted permissions. Denied preflight controls make zero transport callbacks. No transport was reclassified as trusted or removed.

All stale-owner checks still precede state/error handling and reauthorization. The final trusted scope/package check and result publication share one main-actor isolation domain without suspension. Only the epoch of that actual trusted observation is recorded. A current owned denial also records its synchronous observation so the same-epoch notice is not counted twice. Strict grammar, independent oracle, byte ownership/correspondence, revision/history, observer generation and recovery semantics remain in place.

## Checks actually executed

| Execution | Result / provenance |
| --- | --- |
| Corrected owner suite | **36 XCTest methods, 0 failures**, owner-correction-initial.log. This retains the prior behaviors with the two necessary approved schedule/expectation adaptations below, plus8 added regression methods. Counts include enumerated subcases but do not count those as additional methods. |
| Original independently authored finding probes | **3 methods, 0 failures**, owner rerun of unchanged QAProbeTests.swift in a NEW external corrected-source package. Log: unchanged-independent-probes-initial-correction.log. This is owner execution, not independent retest acceptance. |
| macOS Release package build | Passed, owner-release-build.log. |
| iOS17 arm64 Debug and Release library-module compilation | Both passed, owner-ios-debug-module.log /owner-ios-release-module.log; exact argv and destinations in ios-module-compiles.json. |
| Frozen original owner snapshot |27 methods ran unchanged:26 passed and one old positive assertion failed as expected under the stronger final barrier. The remaining old setup was separately bounded at10 seconds because its transport hold is now unreachable. Neither is represented as an unchanged28-method pass. |

The original independent probe SHA256 is 65cc7c179ef8b579cd566bdd8a976c134034d0e975e65ac27704ae01cab251d8. Its bytes and the original9-failed-assertion log were copied and preserved unchanged; no source fault edits were used in the rerun. frozen-test-copy-manifest.json records the original test/Package blobs and corrected-source hashes. Those core source hashes match this final candidate.

The broader independent review/fault controls are not owner executions and are not claimed passed here. New literal-replay controls include authorized positives, post-certificate and held-final revocation, denied-after-quarantine versus authorized-quarantine, malformed/throwing delivery with current revocation, and fresh explicit recovery. Existing grammar/oracle/copy/r1-r2/ABA/old-error/obsolete-observer tests also ran in the36-method suite.

## Two necessary old-test distinctions, explicitly preserved

1. **Final replaceable-transport callback.** The frozen test testCurrentRevocationAfterFinalCheckIsNotFalselyMarkedObserved revokes inside that callback and expects a temporary positive. The new independent trusted final barrier observes the change; denied is correct. Its unchanged external snapshot produced exactly one failed XCTAssertNotNil assertion in frozen-original-27-methods.log. The owner scenario remains in the corrected suite with denied expected. A separate added test changes authority genuinely after successful safe publication: without a new observation the prior result remains, then a current notice clears it. No continuous real-world revocation guarantee was introduced.
2. **Actual denied reply held through regrant.** The frozen test testActualDeniedResponseHeldThroughRegrantIsObsoleteButCurrentDenialWins starts with a revoked reader. Trusted preflight now denies before any transport callback, so its old hold cannot arrive. The unchanged isolated run was terminated after10 seconds; frozen-original-unreachable-hold.log/json classify it as an obsolete schedule setup, not a pass or corrected-source regression. The corrected setup first passes preflight, revokes immediately before the real safe repository read, captures that actual denied response, holds it through regrant/L2 success, and proves the old owner cannot invalidate L2. Separate pre-revoked replay cases require denial before transport.

GM explicitly reconciled both changes as necessary consequences of F1's trusted barriers. Original sources, setup, logs and bounded outcome remain in the external packet. No repeated frozen-suite attempts were made solely to produce a passing count.

## Reproduction and artifact custody

Owner command:

~~~sh
swift test --package-path ios/ExecutionArtifactCoreFixture \
  --scratch-path /tmp/split-native-af1-authorization-correction-b80ebac7bc/owner-build \
  --cache-path /tmp/split-native-af1-authorization-correction-b80ebac7bc/cache \
  --config-path /tmp/split-native-af1-authorization-correction-b80ebac7bc/config \
  --security-path /tmp/split-native-af1-authorization-correction-b80ebac7bc/security
~~~

Release used the same destinations with swift build -c release. The independent-authored probe rerun used the new frozen-owner-tests-corrected-sources package, its own frozen-tests-build scratch, and --filter QAProbeTests. All exact commands, return codes and frozen-run classifications are in verification-commands.json. Tool output is preserved separately: Apple Swift6.3.2, Xcode26.5 (17F42), macOS26.5.2. iOS checks use iPhoneOS26.5 SDK and arm64-apple-ios17.0. These are library-module compilation, not app linking, iOS17 runtime, Simulator, device, signing or release evidence.

Tests/builds ran before the local commit against the unchanged final source; source hashes were subsequently checked against committed blobs. candidate-metadata.json records all12 package-file hashes/snapshots and the five-file correction scope. sources/ contains the final committed files; correction.patch preserves the exact diff. input-vector-manifest.json verifies unchanged25 G2 literal records and44 negative instructions/47 variants. custody-before.json and custody-after-and-verification.json record branch/HEAD/pause and preservation checks. evidence-index.json hashes this complete new packet.

Original codex/ios-af1-memory-core still points to ebb3041; codex/ios-execution-denial-correction remains4f01499. Original model1f82/G2 history, all59 prior owner artifacts and original independent inputs were preserved and hashes rechecked. Only the five permitted package paths changed. Root/app/project/SDK pins, accepted ExecutionSimulation, web/shared schemas and configuration remain untouched. Git status contains only the original untracked pause note, SHA256 40e54470d387eb3104556a739b356f9c0209d6dd4ed92420e9c5de11ec2668fc.

## Remaining gates and stop boundary

Only integrityValidated memory bytes may succeed. The registry is a trusted local fixture seam, not production authentication or per-read server enforcement. P1-Assembling remains completion-pending, not full G1 AF-07 completion-known/files-assembling. No actual provider execution, lifecycle reconciliation, same-sheet supersession, SQL/storage durability, HTTP/auth, PDF parsing, native custody/viewer/share, device/accessibility or release proof follows.

No app build/install, Simulator/session/defaults/data operation, actual PDF/file/materializer/viewer/share, SDK/provider/demo/OAuth/account/API/email/upload/tunnel, credentials/hosted schema/config, cost, legal/outreach, push/merge/deploy/TestFlight occurred. Partner Simulator B0FE7622-16A8-4170-93F3-BE3B053F45E1 received no operations. H1, D01–D07 and real GM06D remain open. Stop after delivery for independent exact-SHA retest; no all-GM13H-issues-closed claim.
