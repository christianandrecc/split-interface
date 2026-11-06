# GM13H — isolated AF1 memory core

November 6, 2026, America/New_York. This is the concrete bounded local implementation assignment following both exact G2 document reviews. Dispatch and startup are recorded in the [resume record](RESUME_2026-11-03.md). It implements a fixture validation core; real PDF, native host and provider/service work remain later milestones.

## Approved specification and custody

Use G2 `485c7b11db9e981d0d9588bb191b9e6bb2eca3e6`, file `build-it-app-main/docs/beta-docusign-af1-g2-protocol-vectors-2026-11-06.md`, SHA-256 `e6b66bb5d97ba2168083f6fb9faf9a1d9f5f5885aadb78efe384f54ff5184a36`. [Exact archived text](contracts/2026-11-06/beta-docusign-af1-g2-protocol-vectors-2026-11-06.md) controls this memory-only milestone where G1 differs. All 25 serialized records, canonical driver deltas, negative instructions and ordering requirements are part of the selected scope. The only dataset is `af1-integrity-preimages-v1`; its bodies are ASCII NON-PDF preimages.

[Native review](qa/AF1_G2_NATIVE_REVIEW_2026-11-06.md) closes N1–N3 at specification level and defers H1. [Web review](qa/AF1_G2_WEB_REVIEW_2026-11-06.md) closes W-AF1-1…5 for this narrowed core. GM read both complete reports and verified their 40/3 indexed artifacts; these are document reviews, not runtime acceptance. Preserve their implementation/claim limits below. No additional protocol addendum is required for this exact scope.

Owner: existing iOS Development Agent, owned `22b2` worktree. Start a new `codex/ios-af1-memory-core` branch from accepted `4f01499b0a926d141497d82bbd4c195d7b2922f5` after inspecting current instructions and custody. GM readback found that exact HEAD and only the pre-existing untracked pause note. Preserve the original branch/ref, note (SHA-256 `40e54470d387eb3104556a739b356f9c0209d6dd4ed92420e9c5de11ec2668fc`), all accepted source/history and model `1f82c270710079687e1cd45e04ee97afbfb26486`. If the checkout changes or target paths already exist, reconcile with GM without cleaning/resetting/overwriting. Read G2 through its immutable blob/archive; do not merge the backend history into native just to obtain the document.

## Exact writable implementation surface

Create only the new standalone package and these twelve files:

- `ios/ExecutionArtifactCoreFixture/Package.swift`
- `ios/ExecutionArtifactCoreFixture/Sources/AF1FixtureCore/ProtocolValues.swift`
- `ios/ExecutionArtifactCoreFixture/Sources/AF1FixtureCore/StrictJSONGate.swift`
- `ios/ExecutionArtifactCoreFixture/Sources/AF1FixtureCore/SeedOracle.swift`
- `ios/ExecutionArtifactCoreFixture/Sources/AF1FixtureCore/ByteIntegrity.swift`
- `ios/ExecutionArtifactCoreFixture/Sources/AF1FixtureCore/MemoryReadStore.swift`
- `ios/ExecutionArtifactCoreFixture/Sources/AF1FixtureCore/FixtureRepository.swift`
- `ios/ExecutionArtifactCoreFixture/Sources/AF1FixtureCore/ProcessLocalOwners.swift`
- `ios/ExecutionArtifactCoreFixture/Tests/AF1FixtureCoreTests/ProtocolVectorTests.swift`
- `ios/ExecutionArtifactCoreFixture/Tests/AF1FixtureCoreTests/OracleAndBytesTests.swift`
- `ios/ExecutionArtifactCoreFixture/Tests/AF1FixtureCoreTests/ReadOwnershipTests.swift`
- `ios/ExecutionArtifactCoreFixture/Tests/AF1FixtureCoreTests/AuthorizationAndManifestTests.swift`

Target/module `AF1FixtureCore`, tests `AF1FixtureCoreTests`; fixture-only iOS17/macOS14 minimums. Sources import only Foundation/CryptoKit; tests may additionally import XCTest and the tested module. No package dependencies. Keep expected fixtures and hostile raw metadata in the named source/test files; no new PDF/resource/network package is authorized. If another tracked path is necessary, present the concrete reason to GM before expanding scope.

Leave root `ios/Package.swift`, accepted ExecutionSimulation, application/project/navigation/session, SDK pins, web, configuration, shared schema and production floors unchanged. This library has no executable/app target, parser, FileManager/storage, URL/transport, viewer, presentation/share or finalization API. Its positive output is only an owned complete `integrityValidated` memory result. An injected parser flag cannot grant display/share eligibility.

## Behavior and meaningful owner verification

Implement the full selected G2 boundary with deterministic injected repositories/holds and separately trusted seed authority. Keep trusted principal, process ownership, fixture world and canonical drivers out of response authority. No command, signing, session, email, provider or legacy renderer effects may occur.

1. Execute the 25 exact serialized records and prescribed driver variants. Test recursive exact keys/types/omission, four party states and ambiguous Bool, IDs/timestamps/digest objects and bounds. The raw UTF-8/member/number gate must reject duplicate decoded keys, malformed encoding/escapes and noncanonical numeric lexemes before lossy decoding. Exercise all 44 one-field-negative instructions plus specified raw lexical controls; preserve vector hashes.
2. Prove complete P1/P2/A/B sets, ordered correspondence and independently seeded terms/signer/document/manifest/body expectations. Self-consistent forged manifests/bodies and P2 swaps must fail independently retained expected values. Test Swift bridged/mutable Data and selected subview intake before suspension/hash, caller/backing mutations, returned-value mutation and fresh recovery. A value wrapper alone is not proof of byte ownership.
3. Mint and retire private store/account/selection/load and observer generations within one isolation mechanism. Distinguish old and current success, typed failure and thrown error even when server context repeats or a failure lacks readRef. Deterministically test both L1/L2 finish orders, ABA, retirement/restart, current post-success revocation and obsolete observer notices. A historically true revocation held through regrant/new positive must be rejected by trusted generation/context or registry observation; lateness alone cannot decide authority.
4. Reauthorize both permits and every entry grant before and after final held manifest reads, including first-document revocation while certificate retrieval is held. Owner/context/epoch equality and serialized no-suspension publication must prevent partial, stale or mixed sets. Discarded callbacks must not clear newer results, advance epochs/high-water marks or trigger recovery.
5. Test r1/r2 approved revisions, rollback and equal-revision conflicting bodies, personalized A/B contexts, explicit current/history/superseding/superseded selection, every readiness driver and sanitized error/recovery precedence. Only explicit fresh projection reads recover permitted failures. No generated/legacy/cache/session fallback. Fixture-world identity participates in authority; do not key cross-contract state solely by coincident sheet UUIDs.

Record actual test commands, counts, tool versions, results and limits separately from document calculations. Use package-local `swift test` and relevant Debug/Release compile checks, with NEW scratch/cache/evidence destinations outside accepted source: `/Users/christiancarrera/.codex/artifacts/split-native-af1-core-20261106-<unique>/` and an owner-chosen unique `/tmp/split-native-af1-core-<unique>/` for disposable compiler scratch. Obey applicable native verification instructions; do not claim new Simulator/app/device proof from a standalone host test. Keep original completed caches/evidence intact and document any unavailable check.

G2 P1-Assembling is completion-pending. Do not claim the distinct full G1 AF-07 completion-known/files-assembling positive, real same-sheet supersession, real reconciliation transitions or preparation/finalization durability. Readiness drivers are independent trusted test states, not a way to regress actual completed provider records. The application/pdf literal does not turn these preimages into PDFs.

## Delivery and acceptance boundary

Deliver an immutable candidate commit, clean scoped diff/source manifest, complete external report/test logs, exact input/vector/source hashes, custody before/after and a hash index. Identify limitations/failures plainly and stop for independent exact-candidate QA. Independent review must exercise original requirements with its own expected values and fault controls; an owner pass or commit alone does not complete GM13H. No new permanent chat is requested.

Preserve partner Simulator `B0FE7622-16A8-4170-93F3-BE3B053F45E1`, installed applications, sessions/defaults and user data. No Simulator operations, app installs, actual PDF assets/parser/materialization/viewer/share, provider demo/production/account/OAuth/API/upload/envelope/email/tunnel, real credentials, hosted Supabase/config/schema/RPC changes, spending, legal/outreach, merge/deploy or TestFlight. Public docs/dependency downloads remain permitted. D01–D07, H1, actual GM06D, device/accessibility, hosted integration and release approval stay open.
