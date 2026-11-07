# Archived native AF1 G1 proposal review — November 6, 2026

GM read the full native owner report and verified all 28 indexed artifacts, including 18 immutable source snapshots and 6 official Apple documentation snapshots. This is a docs-only compatibility/custody review, not runtime or PDF/device/security acceptance. G1 needs G2 N1–N3 clarification before any local core code; H1 is an additional host-only gate. Accepted native 4f/web 49/model 1f82 remain unchanged.

- Report SHA-256 `4f69570de0bc1d4cc7afa22ac92b81e33963ef99ee2470f025e3b03f95190b9e`.
- Index SHA-256 `e0b9df522a272d366b8da4e9574ba256e765d28ef51548f32b2a4aefb046f306`.
- Durable original root: `/Users/christiancarrera/.codex/artifacts/split-native-af1-g1-review-20261106-5a097eecf6`.

---

# Native AF1 G1 compatibility and custody review

November 6, 2026, America/New_York. Docs-only review by the native owner; no runtime verification or independent code acceptance is claimed.

**Verdict: NEEDS_G2_BEFORE_AF1_CORE_HANDOFF.** G1 is compatible in direction with the frozen native architecture and S1/S2 as a separate synthetic read fixture. Resolve N1–N3 below in a reviewed G2 and name the bounded core target/files before implementation. H1 is an additional host gate, not a reason to require production retention or actual provider integration before a memory-only core. This report authorizes no code, PDF creation, build, test, viewer or Simulator activity.

## Exact candidate and evidence

- Candidate: `1d1c087a83ae47fcb7905c98bdfcb0ecff23e051`; parent: `1f82c270710079687e1cd45e04ee97afbfb26486`.
- G1 path: `build-it-app-main/docs/beta-docusign-artifact-retrieval-fixture-plan-2026-11-06.md`; 124 lines; SHA256 `10df910307b828b95f10c76dba8cee9d12540e36ace37dd6a06186ee2fabc9c3`.
- The GM archive copy in `/Users/christiancarrera/.codex/worktrees/3303/SPLIT INTERFACE (CODEX)/docs/management/contracts/2026-11-06/` is byte-identical to that commit object.
- Native baseline remains `4f01499b0a926d141497d82bbd4c195d7b2922f5`, branch `codex/ios-execution-denial-correction`. References below use immutable commit source, not a prospective implementation.
- S1: `536dfe65ad44a096c6939a2c5c150ab9ec21a508`, SHA256 `c79ea6f9dea633d1d96c08f4200b7981c21ffa55748b04930dbf64a5311e3ac7`.
- S2: `0a5b9808667913033de8bc9efd77a7717dccbf50`, SHA256 `9a9184f2581dcb9c08217ffae8b3d5aded7f1e27ba9670b4f95920364f593ba3`.
- GM13E plan: `17fbba641ffb21da1e8851e65fd09d0afa4bb00f`, SHA256 `d96d153f900ff20ee1ccbea646dec179cd9b694c0ed64224a29711d5c2f11c5e`.

`source-reference-hashes.json` records all 18 source snapshots, full commits/paths, byte counts, line counts and hashes. `sources/` preserves them. `public-documentation-hashes.json` and `public-docs/` preserve six official Apple documentation responses. `review-verification.json` records final read-only checks and exclusions. The report is external to the native checkout.

## N1 — core blocker: same-context work needs local publication ownership

**Anchors:** G1 lines 64, 72–74, 93 and 99; accepted native store lines 31–38, 69–94 and 255–273.

G1 promises that an old error cannot clear a newer valid package. Its proposed stamp contains authority/context/revision fields, but no local read/load owner. A newer successful read need not change any listed field.

Concrete schedule: L1 reads package M/r under context C and pauses a transient failure after authorization. An explicit L2 retry under the identical C and M/r completes and publishes a valid whole package. No denial or context change has occurred. L1 resumes: equality against the listed stamp still succeeds, so an implementation following only that stamp can clear L2's state. An old parser/materializer error or cleanup callback can cause the same problem later. Advancing the denial-observation revision when L1 eventually fails is too late.

**Minimum G2:** define a local monotonic load generation/owner token, or explicit serialized/coalesced ownership with replacement invalidation. Capture ownership through projection, manifest, every byte, validation, all typed/thrown failures and publication. Only the current owner may alter eligibility/error state. Presentation/materialization also need distinct ownership so stale cleanup cannot delete a newer or sibling consumer's files. These are local ordering guards, not new wire authority. Preserve the separate access-observation revision: a newer denial must still invalidate earlier authorized successes and errors.

**Required future evidence:** deterministic L1-error/L2-positive schedules with identical server tuples and no intervening denial; typed failure, thrown decode/hash/inspection failure, and later materialization/cleanup variants. L2's exact bytes, eligibility and files must survive stale L1 work. Conversely, newer denial must suppress stale success. Include a deliberate omitted-owner-check fault that fails those same assertions. This is a gap in the new AF1 guarantee, not a new executed finding against accepted4f or a request to modify it.

## N2 — core blocker: close nested schema and manifest revision semantics

**Anchors:** G1 lines 48–60, 64 and 70–72; S1 lines 45–57; model `fixture-data.mjs` lines 3–4, 21–30.

The raw `Data/Uint8Array` body plus separately bound metadata is appropriate for an injected fixture; it is not the accepted base64 codec or an HTTP adapter. The full frozen/attempt/read-view tuple and retained-manifest digest comparison are also appropriate. However, G1 defers expansion of nested fields, and its required-party wording can produce different strict decoders: G1 line 52 mentions pending/signed/declined/unknown/ambiguous, while S1 line 55 defines four state literals plus a separate `ambiguous:Bool`.

**Minimum G2, shared with web:**

1. Spell out exact fields for Digest, OwnParty, PreparedDocument, FrozenBinding, known AttemptRef and required-party entries. Preserve S1's `{partyId, participantId, state:pending|signed|declined|unknown, ambiguous:Bool}` unless an explicitly reviewed AF1 change is intended. AF1 requires a known nonnull attempt and envelopeId; do not import S1's pre-request null/omission case accidentally.
2. Freeze root-only AF1 literals, exact allowed keys, required nonnull values and role-dependent omission. The completion sample omits documentId; optional manifest lookup ID is omitted, not null. Do not insert the old six simulation literals into nested AF1 values. Reject unknown keys/discriminants and implicit string/bool/number coercion consistently. State the fixture's UUID spelling and exact integer/date decoding rules; exercise boundaries and duplicate-key behavior rather than relying on different decoder defaults.
3. Define P1/P2 prepared-document order and the mapping to consecutive entry order, certificate-last ordering, unique IDs and complete-set counts. Freeze the metadata vectors independently of later asset generation. Later asset approval must fill exact binary lengths/hashes/page expectations before execution; this review creates none.
4. Define manifest identity/revision stability and client acceptance: identical identity/revision cannot acquire different entries/bytes; older or equal-conflicting metadata cannot replace a newer accepted package; a changed current revision invalidates in-flight work and cannot mix entries. State which observation exposes replacement and how a fresh authorized read recovers. Do not promise detection of an unobserved server change or use projection timestamps as ordering.
5. Provide common positive and negative serialized vectors, with full expected decoded values, P1/P2 correspondence and byte-metadata bindings. A/B may have different caller-bound views while retrieving identical retained artifact bytes; do not demand globally identical personalized projection bodies.

Trusted fixture principals must be GM13E A `00000000-0000-4000-8000-0000000000a1`, B `00000000-0000-4000-8000-0000000000b2`, C `00000000-0000-4000-8000-0000000000c3`, D `00000000-0000-4000-8000-0000000000d4`. Native4f's A/B/outsider constants (`SimulationSeams.swift` lines 19–21) are different and must stay unchanged. Driver injection and registry grants establish fixture authority; a response ownParty, copied viewTag, artifact ID, email or old account alias does not. Certificate access needs its own grant check. These seeds prove neither JWT identity nor production recipient/reader policy.

The proposed 1MiB/artifact, three-artifact/3MiB package and 64KiB metadata bounds are acceptable experiment parameters only. G2 must distinguish rejecting an already supplied in-memory body before copying/hashing/parsing from a future transport enforcing bounds before allocation. No injected value-object test proves HTTP buffering, headers, redirects or caching. Actual Int64/JSON production representation and limits remain D04.

## N3 — core blocker: choose the actual PDF validation boundary

**Anchors:** G1 lines 26–27, 38, 42, 64, 72, 91, 101 and 112.

Stage 1 lists DTO/byte/store tests; stage 2 introduces native PDF inspection after core acceptance. Meanwhile, the readiness and AF-04 language requires actual PDF validation, including matching-digest unrenderable input. Those milestones need distinct acceptance claims.

**Recommended G2 choice:** an isolated Foundation/CryptoKit core owns strict metadata, complete immutable bytes, permissions and publication ordering. Its success is explicitly package integrity validated, not PDF display/share ready. It cannot publish preview/share eligibility. An injected inspection result can test ordering but is not evidence of actual parsing. Defer actual PDFKit inspection and AF-04 parser-dependent assertions to the separately approved host milestone. Alternatively, explicitly include a real PDFKit inspection adapter and platform tests in the core scope; do not silently call a header/hash/mock a PDF parser.

For the later native milestone, use read-only PDFKit inspection/viewing over exact validated retained bytes. Review/freeze each synthetic asset's digest, length, page count and expected parsing outcome first. Require actual `PDFDocument(data:)` success, expected nonzero pages and the fixture's encryption/locking checks before display readiness, plus successful page viewing in the host. Apple documents a failable data initializer and distinct encrypted/locked states; an encrypted PDF may already be unlocked, so `isLocked == false` alone does not enforce the no-encryption fixture rule. [PDF initializer](https://developer.apple.com/documentation/pdfkit/pdfdocument/init(data:)), [encryption](https://developer.apple.com/documentation/pdfkit/pdfdocument/isencrypted), [locking](https://developer.apple.com/documentation/pdfkit/pdfdocument/islocked).

A successful parser initialization does not establish that arbitrary PDFs lack actions, links, attachments or hostile behavior. For the bounded fixture, review curated content and explicit expected features; define what “no compression” refers to (transport encoding versus internal PDF compression). Avoid a general sanitizer/security claim. Preserve original bytes; PDFDocument reserialization must not become the retained original. Hash equality/inequality between roles is not proof of execution; G1's correction of native4f's fixture-only inequality rule is sound. Production signature/content validation remains open.

## H1 — additional gate before any native file/viewer/share host

**Anchors:** G1 lines 76–80, 96–97, 109 and 112; native readiness's original-artifact section.

No host or materializer is approved yet. After N1–N3, a memory-only core may proceed under a new bounded handoff without selecting production retention. Before the later host, review a concrete lifecycle/state table and its exact OS/API scope:

- **Isolation:** a new standalone fixture package/target, with a later separate Debug-only host and bundle/container, no production SPLIT dependencies/navigation/session/defaults or accepted ExecutionSimulation changes. The code handoff must name files, build target, minimum OS and allowed test destinations. Partner Simulator/data remain excluded.
- **Location and ownership:** choose a new private app-owned temporary root; generate a unique directory per materialization owner in addition to account generation/manifest identity. Locally generated safe names, private directory/file permissions, exclusive creation, no-follow/regular-file checks and atomic completion must prevent symlink/path substitution and replacement of an existing source or sibling file. A string prefix/path-normalization check alone is insufficient. Verify the completed file's exact bytes and attributes before a consumer receives it.
- **Protection and backup:** for this foreground-only fixture, propose complete file protection and backup exclusion, applied and checked before publication; failure remains restricted. Apple describes complete protection as unavailable while locked/booting and exposes backup exclusion separately. Atomic replacement/copy behavior needs verification; do not assume an earlier attribute survived. This is a fixture custody choice, not a production retention decision or device proof. [Complete protection](https://developer.apple.com/documentation/foundation/fileprotectiontype/complete), [backup exclusion](https://developer.apple.com/documentation/foundation/urlresourcevalues/isexcludedfrombackup).
- **Revocation/cancellation/background:** clear eligibility and request observable viewer/share dismissal before cleanup; invalidate all in-flight owners. Model late parser/write/rename/read/completion callbacks. Do not restore eligibility on foreground, unlock, cancellation or cleanup success without a fresh authorized complete read. Preserve genuine individual facts while package eligibility is blocked.
- **Cleanup and restart:** specify which local consumers own a file and when their leases end. An old owner may not delete a newer/sibling file. Failed deletion is a visible restricted state with bounded explicit recovery, not a claimed deletion. Dropping volatile paths on restart alone leaves crash-orphaned files: review how startup identifies only this fixture's owned root/entries, rejects symlinks and handles interrupted writes/cleanup without touching retained originals or other sessions. Define restart while a consumer was active; do not promise control of external copies.
- **Presentation and handoff:** fresh repository permission/full binding and exact bytes immediately before preview and each explicit share. Use a local presentation owner/once-per-action token; document the last synchronous ownership check and the handoff boundary. Account/selection/access changes at each named barrier must suppress app-controlled publication. OS handoff cannot offer continuous atomic revocation. Intercepted consumers are the first milestone; no Mail/AirDrop/app delivery. A later share-sheet-only check requires its own handoff. Apple describes activity completion/dismissal callbacks, not recall of recipient copies; a callback is not evidence that another app deleted or never retained bytes. [Activity completion](https://developer.apple.com/documentation/uikit/uiactivityviewcontroller/completionwithitemshandler-swift.typealias).

## Compatible requirements to retain

G1 correctly keeps AF1 separate from both strict native `split.execution.local.v0.1` and proposed production S1. No new fields, aliases, caps or media types should be retrofitted into accepted4f. S2 remains a session outcome/one-time bearer custody rule; AF1 introduces no sessions or commands and cannot treat a receipt as access.

Retain P1/P2 whole-package publication, exact frozen document correspondence, separately identified certificate bytes and authorization, pre-read and post-suspension registry checks, denial/error suppression, explicit history selection and no legacy/generated substitute. `simulatedComplete` or `packageState=ready` alone must never grant preview/share readiness. Unknown/extra/missing/ambiguous required parties, unresolved recipients, pending files and failure after the first artifact all block the entire package. Retain separate immutable prepared/executed/certificate records; do not rebuild any from current sheet data. Existing legacy provenance/history stay unchanged. No automatic command or share follows refresh, recovery or foregrounding.

Nonblocking reference correction: G1 N2 cites `SimulationFixtures.swift` lines 47–67, but the exact4f file has 62 lines. Correct the ending anchor to62. Its substantive observation that these are synthetic text, not PDFs, is correct.

## Required future evidence, in order

1. **Reviewed G2 and bounded handoff:** close N1–N3 with web/backend alignment, exact files/target, full vectors and milestone claims. Keep D01–D07 and real GM06D open. No credentials or production policy choice is necessary to close these fixture clarifications.
2. **Core owner tests, then independent exact-candidate QA:** shared strict decoding/omission/null/literal/numeric vectors; P1/P2 complete sets and identity/correspondence; per-entry/certificate denial; independent retained digest/length checks and fixture budgets; latest-manifest/older/equal-conflict cases; explicit superseded history; fresh account/selection/access invalidation; post-authorization and external post-response holds; stale typed/thrown errors and success, including N1's identical-context positive; process reconstruction and genuine fresh recovery. Verify exact source/legacy bytes and zero mutation/provider/email/finalization effects. Use reviewer-local faults against the same assertions, not exported bypass modes. Record actual counts, commands, candidate and hashes separately for owner and QA. No HTTP/PDF/device claim from a pure model.
3. **Separately approved parser/host evidence:** reviewed valid/invalid synthetic assets; actual PDFKit matching-digest malformed and encrypted/locked cases; expected pages opened; complete-package gating; all H1 write/rename/read/protection/backup/symlink/exclusive-create/cleanup failure and restart cases; deterministic materialization/presentation holds, cancellation and late callbacks; intercepted exact bytes/names/order/count and once-per-explicit-share behavior. Preserve original hashes before/after viewing. A macOS parser/unit result is not proof of iOS runtime or file protection.
4. **Later authorized UI/device/accessibility checks:** dedicated disposable Simulator/container, readable synthetic provenance and historical labels, pending/denied/error/recovery, selectors/back/dismiss, background/account/revocation dismissal, Dynamic Type including largest supported sizes, VoiceOver labels/order/focus and actual reading, contrast and reachable controls. Physical-device lock/unlock/protection and backup behavior need device evidence; real system share-sheet/extension lifetime needs separately authorized local checks. No actual sending is needed or authorized here. Passing a build or source inspection does not substitute for those checks.

## Scope and provenance limits

Only immutable source/document reads, source/archive hash comparison, external evidence writes and public Apple documentation retrieval were performed. The web reader exposed Apple's Markdown links but rejected their content type; the linked public Markdown was then fetched directly and hashed. No app/provider/service account or credential endpoint was used. No build, test, PDF asset generation/parse/render, host/viewer/share launch, Simulator operation, data/defaults change, install, schema/SDK/config/source/branch mutation, email/upload, cost, push/merge/deploy/TestFlight, legal publication or outreach occurred.

The frozen native HEAD and the sole existing untracked pause note are preserved; pause SHA256 remains `40e54470d387eb3104556a739b356f9c0209d6dd4ed92420e9c5de11ec2668fc`. Historical independent4f acceptance is a prior local result, not rerun here. This is the native compatibility/custody review of a docs proposal, not an independent runtime review of newly implemented AF1 code. Stop after delivering this report to GM; further implementation requires a new explicit bounded handoff.
