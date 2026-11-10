# GM13J — standalone PDF1 first executable candidate

Objective: implement the cross-reviewed first synthetic PDF asset/inspection boundary, separately from accepted AF1 memory core, application and real DocuSign/service work. GM accepts [exact R1 specification only](qa/PDF1_R1_SHARED_ACCEPTANCE_2026-11-06.md), not its future outcomes. The native owner receives this bounded assignment under founder-resumed local development; independent exact-candidate QA follows delivery.

Start from native HEAD 4e2deed6132dbdffe691de1e03e08b20d96905ba on a NEW `codex/ios-pdf1-curated-inspector` branch, after verifying the existing HEAD/status. All 655 parent paths and the pre-existing untracked pause note must remain byte-identical; never reset, clean, overwrite or reuse another agent's files. Read native AGENTS and required platform instructions. Read the entire immutable base 6c4630f and controlling R1 91f5a90 plus both full R1 reports before implementation. The management snapshots are [base](contracts/2026-11-06/beta-docusign-pdf-asset-parser-fixture-plan-2026-11-06.md), [R1](contracts/2026-11-06/beta-docusign-pdf1-r1-catalog-test-seams-2026-11-06.md).

Only these 18 new paths under `ios/PDFAssetInspectionFixture/` are authorized:

1. `Package.swift`.
2. `Sources/PDF1InspectionFixture/PDF1AssetValues.swift`.
3. `Sources/PDF1InspectionFixture/PDF1FixtureCatalog.swift`.
4. `Sources/PDF1InspectionFixture/PDF1Inspector.swift`.
5. `Tests/PDF1InspectionFixtureTests/PDF1InspectionTests.swift`.
6. `Tests/PDF1InspectionFixtureTests/PDF1DatasetBoundaryTests.swift`.
7. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/doc-a.pdf`.
8. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/doc-b.pdf`.
9. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/evidence-sample.pdf`.
10. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/malformed-matching-hash.bin`.
11. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/encrypted-locked.pdf`.
12. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/encrypted-empty-password.pdf`.
13. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/asset-manifest.json`.
14. `Tests/PDF1InspectionFixtureTests/Fixtures/pdf1-curated-originals-v1/SOURCE.md`.
15. `Tools/generate_pdf1_assets.py`.
16. `Tools/requirements-pdf1.lock`.
17. `Tools/GENERATION.md`.
18. `Tools/licenses/reportlab-license.txt`.

Package: Swift tools6.0, product/target PDF1InspectionFixture and tests PDF1InspectionFixtureTests, iOS17/macOS14 fixture floors, no Swift external or app/AF1 dependency. Production sources only Foundation/CryptoKit/PDFKit; tests may also XCTest/CoreGraphics/ImageIO. Resources use explicit `.copy("Fixtures")`. No root package/project/SDK/app target changes. Tooling is authoring-only; no generation, dependency fetch or font/network work during Swift import/build/tests/app startup. Put complete transitive licenses/notices and exact interpreter/distribution provenance in the authorized generation/source files; no extra tracked path is implied.

Before generation/import, freeze the exact available Python executable and full ReportLab5.1.0/transitive distribution hashes/versions/notices, public-only configuration, options/metadata/IDs/time/argv and generator source. Public publisher documentation/distribution downloads are permitted in a NEW external scratch environment; no global installs, private config, provider material, automatic extras/build downloads or spending. Use self-authored ASCII, standard Helvetica references, explicit synthetic/non-agreement/non-certificate text, fixed simple Letter layouts and the curated no-active-feature subset. Preserve the exact public fixture passwords and rejection-only RC4 configuration without treating it as production security. Generate twice in separate fresh destinations; compare raw bytes for **all six** assets before copying them into the candidate. Preserve both runs and full source/object/licensing/provenance evidence. If generation differs or a required actual parser observation differs, stop acceptance, preserve raw outputs and report the mismatch; do not falsify flags/pages, relax a requirement or silently replace a frozen accepted asset.

Implement exact R1 APIs/ordering: inspector-owned immutable catalog/private issuer, ID-only bound handles and closed resolver; actual Q1/Q2 complete ordered handle/body group validator with all membership checks/bounds before extra copy/hash and zero parser calls. Public `inspect(copying:asset:)` must use the same internal owned-intake/product-parser route as tests. Rebind snapshots to inspector/asset/record; hash against the checking-side retained expected record before actual PDFDocument initialization. Genuine matching-hash malformed and both encrypted inputs must reach actual initialization; typed stage/reason/optional observations come only from real call/property sites, encryption rejects before pages, and no Data/PDFDocument/URL/eligibility escapes. No explicit unlock/decrypt/rewriting; framework automatic empty-password behavior is acknowledged.

Test actual macOS PDFKit positives/negatives, whole-group/identity/world/dataset rejection, exact span/sentinels/budget and owned-input cases through product functions. Both special private test worlds have fixed no-argument construction. Mandatory calibration: the digest derivative has **exactly** approved length and genuinely parses as one page; the identical derivative fails approved-world digest before parsing. Full copying-path expected2/observed1 must pass integrity and fail at real page comparison. Show caller-view bytes really change after intake on bridged and nonzero-offset backing while private owned facts remain original; an already-copied Foundation wrapper is inconclusive. Do not expose a private storage accessor or use a data race.

Record required three fault discriminators, preferably in separate disposable reviewer copies: omit only expected digest; drop encrypted while retaining locked; omit the product page comparison. The same safe assertions must discriminate each real-path fault. At minimum deliver exact candidate tests and identified local fault locations for independent QA; owner results do not substitute for reviewer execution. Do not predeclare passing counts. Independently retained full asset lengths/digests are required before final acceptance and must be compared with committed catalog/manifest/copied bundle resources; self-consistent adjacent metadata is insufficient.

Render all four positive pages offscreen using real PDFPage/CoreGraphics/ImageIO from test helpers into NEW external evidence only. Read the applicable PDF skill for artifact/render verification. Actually inspect every image for synthetic provenance, legible content/identity/order, no clipping/signature/certificate appearance. Preserve source/page/box/geometry/dimensions/scale/transform/background, OS/tool versions, PNG hashes and owner notes. Independent visual and exact-byte review follows; PNG hashes alone are not visual review. No viewer, share sheet or Simulator needed.

Verification is confined to the new standalone package: macOS XCTest plus relevant Debug/Release package/library checks and isolated iOS17 arm64 SDK library compilation if available. Use new external scratch/caches/build evidence; preserve command exits, real methods/assertions/counts/versions and distinguish compilation from iOS runtime. Do not rerun old completed milestones or modify the unchanged app/root packages. No Simulator service/session/device/data/window operations; partner preview is untouched.

Deliver one immutable new candidate commit, exact parent/18-path diff, all 655 parent identities/ref/pause preservation, actual byte/generator/toolchain/resource/oracle evidence, full tests/builds/observations/failure details and all-four visual captures/notes in a sealed indexed external packet. Do not commit caches/builds/renders/private configuration. Stop for GM and bounded independent QA; no self-acceptance or executable continuation beyond this candidate.

Excluded: AF1 package/dataset/adapter or permission claims; root app/navigation/legacy renderer/temp materializer/files/view/share/session; real originals/certificate, provider/API/OAuth/account/envelope/upload/email/public tunnel; hosted credentials/config/Supabase/schema/RPC changes; D01–D07 policy; new spend, legal/outreach, push/main merge/deploy/TestFlight. H1/GM06D/provider/device/accessibility/integration/release remain open. If an assumption or allowed path is insufficient, preserve partial evidence and report the concrete issue before widening scope.
