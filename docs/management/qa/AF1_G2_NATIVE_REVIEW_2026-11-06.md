# Native G2 review — GM evidence readback

GM read the full exact G2 native report and verified all 40 indexed artifact hashes/lengths, report SHA-256 f224565105006f80f064e93481a0cb5140c279f125d168fc519229b9e6547c0f and index 2d43233c8d007f4ca52ec7a703d8acf35458bbf8347b95053a2b70071b5fb28c. Native verdict closes N1–N3 only at design/specification level; H1 remains a later host gate. Native reported 84 document calculations/23 provenance checks, not AF1 runtime tests. No executable acceptance follows. Both platform reviews must be reconciled before a separately bounded core handoff.

Original packet: /Users/christiancarrera/.codex/artifacts/split-native-af1-g2-review-20261106-5206ca3c86/. Exact candidate 485c7b11db9e981d0d9588bb191b9e6bb2eca3e6 and proposed integrity-only package remain separate from accepted native 4f/model 1f82 and actual PDF/service/release work. The complete original report body follows byte-for-byte.

---

# Native AF1 G2 closure review

November 6, 2026, America/New_York. Document review and local document calculations only.

**Verdict: PASS_DOCS_ONLY_FOR_SEPARATELY_AUTHORIZED_MEMORY_CORE_HANDOFF.** Exact G2 closes native N1–N3 at the design/specification level and appropriately keeps H1 as a later host gate. I found no remaining native document blocker to a separately named, memory-only Foundation/CryptoKit core. This is not AF1 implementation acceptance, mutual platform approval or permission to start code. No executable work follows this review automatically.

## Exact scope and custody

- Candidate: `485c7b11db9e981d0d9588bb191b9e6bb2eca3e6`; parent G1: `1d1c087a83ae47fcb7905c98bdfcb0ecff23e051`.
- Sole new path: `build-it-app-main/docs/beta-docusign-af1-g2-protocol-vectors-2026-11-06.md`; 435 lines / 100158 bytes; SHA256 `e6b66bb5d97ba2168083f6fb9faf9a1d9f5f5885aadb78efe384f54ff5184a36`.
- The GM archive at `/Users/christiancarrera/.codex/worktrees/3303/SPLIT INTERFACE (CODEX)/docs/management/contracts/2026-11-06/beta-docusign-af1-g2-protocol-vectors-2026-11-06.md` is byte-identical. G1 and all 407 parent paths are unchanged.
- Original native report: SHA256 `4f69570de0bc1d4cc7afa22ac92b81e33963ef99ee2470f025e3b03f95190b9e`; web report: `1154f8970868d1aa62719327aecec99ade8c11c86bc68289c33798e58caff8df`. Both exact reports are preserved in this packet.
- Accepted native `4f01499b0a926d141497d82bbd4c195d7b2922f5` and accepted model `1f82c270710079687e1cd45e04ee97afbfb26486` are references, not changed candidates. S1 remains `536dfe65ad44a096c6939a2c5c150ab9ec21a508`; S2 remains `0a5b9808667913033de8bc9efd77a7717dccbf50`.

`source-reference-hashes.json` records exact source identities, snapshots/hashes, the 13 G2 input-blob checks, 14 immutable anchors and both report hashes. `sources/`, `vectors/` and `serialized-document-records.json` preserve the complete G2 and all 25 serialized records. `document-calculations.json` contains the independently calculated document relationships. `review-verification.json` and `evidence-index.json` record final custody checks and artifact hashes. All output is in a new durable external directory, outside the native worktree.

## Closure table

| Finding | Native verdict | Exact G2 anchors and reason |
| --- | --- | --- |
| N1: identical-context old failure versus newer positive | Closed for design; runtime proof required | Lines 362–368, 398, 406–415: every explicit load gets a new private owner even when server fields repeat; stale success/error cannot publish, clear state or advance denial/high-water epochs. Current observers have separate generation/context correlation. Final publication is serialized without suspension after its last owner/epoch check. |
| N2: recursive strict grammar, nested state shape, manifest revisions | Closed for design and supplied document values | Lines 36–87, 91–128, 130–358: exact recursive keys and literals; four party-state literals plus ambiguous Bool; known nonnull attempt/envelope; raw lexical/duplicate-key gate; explicit scalar/equality/omission rules; independent byte oracle; pinned manifest revisions and full vectors. |
| N3: core integrity versus actual PDF parsing | Closed by reduced first milestone | Lines 26–38, 95–120, 421: memory core returns only integrityValidated. It has no display/share eligibility, parser, file URL or host API. The selected ASCII preimages are explicitly NON-PDF and cannot be positive PDF assets. Actual PDFKit/asset/host proof is separately gated. |
| H1: native temporary files, viewer/share and OS lifecycle | Appropriately deferred; remains open | Lines 417–421: separate materialization/presentation owners, private-root/exclusive/no-follow/atomic/attribute and cleanup gates, orphan handling, observable dismissal, explicit share intent and OS handoff limits must be reviewed before host code. No FileManager/storage is in the core. |
| G1 source-reference nit | Closed without editing G1 | Lines 18 and 433 correct the relevant native fixture construction range to47–60 and acknowledge the exact file has62 lines. |

## Ordering, denial correlation and final grants

G2 now supplies the mechanism missing from G1: private store nonce, account/selection generations and loadSequence. `beginExplicitLoad()` replaces the owner and clears the preceding result/staging. Lines 364 and 398 check ownership before handling even a denied Failure that intentionally carries no readRef. An older callback cannot turn its late error into a newly owned denial. A current accepted denial or current scoped observer notice instead increments accessObservationEpoch and invalidates current work/results. ABA identity/selection changes and store retirement cannot revive old owners. Diagnostic requestId and viewTag remain unrelated to local ownership.

The final manifest reread in line 368 checks both logical permits and every required artifact grant under a consistent registry/view snapshot, before and after its reply hold. This includes a first document already staged while certificate bytes were read. Equality against the pinned manifest/readRef, followed by synchronous owner/context/epoch publication, prevents partial or mixed-version integrity results. This is sufficient as a proposed local fixture seam; it proves no real-server transaction, push authorization or continuously atomic revocation after an unobserved change.

The future implementation must explicitly mint/retire observer generations under the same store isolation rules; no response may label itself a current observer. Its QA must distinguish a truly current revocation after a positive result from an obsolete same-context observer notice after a newer positive. G2 lines 366, 410 and 413 require this distinction. This is a required implementation/test detail within the selected private seam, not a request to invent a production notification policy or another wire field.

## Grammar, oracle and revision consistency

The supplied values are consistent with the selected separate fixture contract. Common literals occur only at serialized roots; the new fixtureSetId is `af1-integrity-preimages-v1`. UUIDs use GM13E A/B/C/D, not native4f aliases. Prepared/manifest/entry order is consecutive with complete correspondence; P2 correctly repeats the executedSample role for two different document/artifact IDs. Certificate documentId is absent. OwnParty/view/access metadata may differ between A/B while retained manifest and original bytes remain identical. Unique permit sets normalize to the documented order; document/party/entry arrays do not.

The grammar requires raw UTF-8/number/member validation before a decoder can erase duplicate members or numeric spelling. Canonical unsigned integer lexemes, escaped duplicate keys, null-versus-omission, exact digest objects, known attempt/envelope, Gregorian timestamps, IDs and error/recovery pairs are sufficiently concrete for Swift/TypeScript implementation and comparison. A nominal application/pdf field is deliberately only a metadata grammar value in this core. The byte pair is owned raw data, not a serialized base64 response or an HTTP adapter.

G2's trusted oracle closes the self-consistency hole: the reply cannot introduce another prepared digest, document correspondence, manifest or matching replacement body. The documented forged-body and P2-swap controls must fail against independently retained expected records even when adjacent response hashes agree. Intake/exposure copying is explicit, including a selected buffer subview and externally mutable/bridged Swift data. A Swift Data value or Uint8Array wrapper alone must not be assumed to establish independent ownership.

P1/r2 is a distinct approved manifest version: only retrievedAt/reconciliationId metadata changes; all artifact IDs, bytes, digests, lengths, roles/order and frozen/attempt binding remain unchanged. Its projection advances10→11 and gets the corresponding new viewTag. High-water marks, equal-version conflict quarantine and fresh whole-set reads forbid rollback, self-declared upgrades or mixing. Timestamp order does not override revisions. History intent is separate from projection.selection: superseded history requires explicit selection/grants, superseding stays pending, and current/history modes do not silently coerce each other.

The P1-Q/F/P/Assembling rows are trusted readiness test drivers installed separately from attacker replies. They are not evidence of real execution transitions or authority to regress a genuinely completed provider lifecycle. The core must retain that fixture/model limit; real reconciliation and terminal-fact policy remain outside this milestone.

## How G2 narrows G1

There is no unresolved contradiction once the bounded handoff explicitly uses G2 for the memory-core milestone. G1's proposed real-PDF sample set and display-oriented AF-04 readiness cannot be imported into this core. G2 reserves `af1-pdf-samples-v1` for later review, rejects it here, and supplies harmless non-PDF preimages instead. It also clarifies transport content decoding versus PDF-internal compression. These are explicit fixture-only refinements, not changes to accepted4f or production S1/S2. New AF1 types must remain separate; no widening or aliasing of the accepted codec, SDK or model is justified.

## Document checks performed and their limits

I reviewed all G2 prose and inspected all 25 complete serialized records through their full decoded structures and cross-record comparisons. Local calculations checked 13 tabulated preimage lengths/hashes, the forged-body and backing-buffer hashes, exact selected subview bytes, A/B caller-only differences, frozen/manifest/byte/request correspondence, error/recovery pairs and the exact r2 delta set. All 44 one-field-negative pointer bases/operations refer to valid documented targets. The 84 recorded calculation checks passed; none is an executed AF1 acceptance test. The positive structures fit the declared limits (largest object14 members, array3, calculated value depth8).

These checks establish document consistency, not that Swift/TS decoders reject the negative vectors, that mutable bytes are actually copied, or that any race is implemented safely. No AF1 repository/store, parser, transport or app was executed. The 13 preserved input blobs and 14 anchors matched exact source; both prior review hashes matched. The candidate adds one Markdown file and changes no parent path. No historical XCTest/UI suite was rerun.

## Next handoff and remaining gates

A new explicit GM handoff may name only the standalone package/targets in G2 line 28: `ios/ExecutionArtifactCoreFixture/Package.swift`, AF1FixtureCore and AF1FixtureCoreTests, the seven proposed source files and four test files, with their exact Sources/Tests paths and permitted local build/evidence destinations. Keep core imports limited to Foundation/CryptoKit, with XCTest additionally allowed for tests, iOS17/macOS14 fixture floors and no dependencies on production app or accepted fakes. The handoff should identify the approved base/candidate custody and preserve native4f/model1f82 refs and the partner Simulator. This review does not create the package or select a test destination.

Owner execution and independent exact-candidate QA must then prove the strict raw grammar and all semantic/oracle negatives; complete P1/P2 sets and ownership/subview mutation; current and obsolete observer/error schedules; identical-context L1/L2 ordering; ABA/restart; revoke-first-document-during-certificate; r1/r2/equal-conflict handling; explicit history, readiness and sanitized denial precedence; genuine fresh recovery; and zero command/provider/legacy/email/finalization effects. Reviewer-local faults must fail the same independent assertions. Record actual counts/commands/source and vector hashes separately from these document calculations.

Actual PDF assets, parser/display readiness, private file materialization/protection/backup/path safety/cleanup, viewer/share host, system-sheet/extension lifetime, device lock behavior, Dynamic Type/VoiceOver and real provider/service enforcement remain unproved and separately gated. D01–D07 and real GM06D remain open. No production size, identity/access, retention, privacy or legal policy is selected by this verdict.

Native HEAD/branch and the sole untracked pause note are unchanged; pause SHA256 remains `40e54470d387eb3104556a739b356f9c0209d6dd4ed92420e9c5de11ec2668fc`. No source/package/project/SDK/config/branch mutation, PDF creation, build/test/install, viewer/share/Simulator/session/defaults operation, provider/account/network request, hosted schema/config, cost, signing/release/TestFlight, legal publication or outreach occurred in this review. Stop after delivery to GM.
