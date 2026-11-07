Archived by GM November 3, 2026. Docs/source compatibility review only; final simulation contract alignment is recorded separately. Original report SHA-256: `97360c361d6b0e9e43390c9d9f37e6bab2403f1373edea0ffb4aff6bbc050678`.

# DocuSign local contract — independent web compatibility review

November 3, 2026. **DOCS_WEB_BOUNDARY_ALIGNMENT_WITH_PRECODE_REQUIREMENTS.** The backend and native proposals agree on the essential boundaries for an isolated, visibly simulated native prototype. They are not yet a final shared schema. GM must record a common versioned example/projection/error contract and fixture IDs before native executable work. This is bounded independent compatibility advice, not approval from the web development owner or approval to cut over live signing.

## Exact reviewed revisions

| Source | Revision / path |
| --- | --- |
| Backend proposal | `a5a5c26fd83bf6c4b8a675401dbac9f6ed856a5f` — `build-it-app-main/docs/beta-docusign-local-contract-2026-11-03.md` |
| Native readiness | `1a7deec7e88eac5d0d9fb526a99ec1d4cf92de63` — `ios/docs/DOCUSIGN_NATIVE_READINESS_2026-11-03.md` |
| Native fixture matrix | Same `1a7deec` — `ios/docs/DOCUSIGN_NATIVE_FIXTURE_MATRIX_2026-11-03.md`, proposed N01–N30 and B01–B07 |
| Actual web/SQL baseline | `c2105759bdeb8a288644f5a4bc0f43f97555e638`, existing detached QA checkout; no source change or test rerun during this review |

The backend owner's pending version 0.1 addendum was not supplied to this reviewer at this snapshot. Its final field names, enum/error examples and shared fixture mappings need comparison against the requirements below; this review does not approve an unseen revision. Copies read through immutable `git show` are retained in `/tmp/split-web-beta-qa/docusign-alignment/`.

## Concrete current-source findings and required treatment

1. **Provider policy cannot safely be added only to legacy document JSON.** At web c210, `supabase/migrations/20260911163414_enforce_split_profile_privacy.sql:144–146` explicitly allowlists the top-level keys in a sent-document privacy projection; future provider-policy fields would not survive that projection. Conversely `src/components/contract-builder/document.ts:107–116` and `src/lib/splitSheetStorage.ts:425–428` accept a structurally recognizable legacy document without validating provider policy/schema. An old client therefore cannot be relied upon to reject unknown policy fields. A separate typed execution projection plus server-enforced legacy-read boundary is required. This is a future-cutover hazard, not a demonstrated current hosted exploit: provider-required records are not implemented here.
2. **Legacy read and export are the same compatibility surface.** `loadSplitSheetDocuments` uses `load_my_split_sheets` (`splitSheetStorage.ts:431–472`); `loadSplitSheetDocumentForExport` uses the same RPC at 475–484. The SQL function at 227–237 returns privacy-projected payloads after existing normalization. New provider records must not reach either route as ordinary legacy-certified documents. Define per-record unsupported/upgrade handling for mixed legacy/provider collections without silently converting provider evidence or leaking contents. Current old parsing may simply omit an unfamiliar record rather than display an upgrade screen; do not promise a new old-client UI behavior without code.
3. **Guard both public wrappers and actual mutators before effects.** Public `upsert_split_sheet_document` and `apply_split_sheet_participant_update` wrap private writers before applying privacy projection (`...enforce_split_profile_privacy.sql:207–225`). A check only in `visible_document` is too late: the writer may already have mutated. Current legacy sign writes `SPLIT in-app acknowledgement` and performs registration/status/audit/notification work; its provider-required rejection must precede every one of those effects. Also cover creation/draft/send/update paths: latest `20260911195254_separate_in_app_split_delivery.sql:106–134` derives a replacement payload from client JSON and resets workflow fields. Server-owned execution policy must be established/preserved independently and cannot be deleted, downgraded or invented through that payload. Keep existing owner/revision checks; do not make the provider worker impersonate recipient sign actions.
4. **Do not encode provider completion in legacy status/signature rows.** `splitWorkflow.ts:22–30` groups Fully Signed, Verified and Stored and Executed as completed stages; `splitSigningEvidence.ts` recognizes the exact in-app method. `splitSheetPdfModel.ts:28–64` consumes that helper, and `splitSheetDownload.ts` regenerates a SPLIT PDF from a fresh canonical document. Provider records need a separate typed display/download path. No fabricated in-app signature rows, method aliases, legacy verification timestamp or regenerated PDF can serve as a DocuSign execution original. Inventory direct permitted metadata reads too: `...enforce_split_profile_privacy.sql:240–245` grants status/signature metadata columns. Preserve least-privilege RLS and define what those old read surfaces mean during cutover, rather than assuming only the main RPC exists.

These requirements are already consistent with the proposals' stated intent. The unresolved work is making them an explicit shared local contract and future server-compatibility acceptance matrix, not rewriting current web behavior or applying SQL now.

## Minimum common contract before a simulated prototype

| Boundary to settle in version 0.1 | Web alignment requirement / native fixture mapping |
| --- | --- |
| Policy, contract version and origin | Distinguish legacy in-app, provider-required, unsupported and **simulation**. Unknown/missing schema or policy must not fall back to legacy signing for a new execution. Keep local simulation separate from any real/demo provider environment. N21/N28/N30. |
| Identity and immutable binding | Separate account ID, canonical party ID, legacy participant/invitation ID, provider recipient ID, proposal ID, frozen snapshot ID and attempt ID. Bind selected account/environment, required-signer digest, terms/template/renderer/document-set manifest and exact prepared bytes/digest. Names, email, document number and display proposal number are not authority. N03–N06/N17/N18. |
| Revision model | Freeze source sheet revision, but track monotonic execution projection revision separately. Later chat/audit revision changes alone must not invalidate identical signed terms; material same-proposal-ID content changes must invalidate them. N04/N05/N21/N22. |
| Explicit operations | Distinct prepare/freeze, request execution, issue own session, read execution, read operation outcome and read/fetch original artifacts. Preparation must not create/send; view entry and status reads must not mutate. Clarify N01 as several distinct deliberate steps rather than a combined automatic preparation/request/view action. N01/N02/N08–N12/B04. |
| Stable outcome recovery | Agree operation-key scope, in-flight state, unknown-create/unknown-void handling and read-only resolution. Missing lookup result or elapsed provider lookup window is not safe retry authority. Preserve one attempt and quarantine conflicts; no consent replay. N09/N10/N16/N19/B03–B05. |
| State versus evidence availability | Preparation, provider attempt, per-recipient facts and artifact availability remain separate. Provider-completed with missing certificate/files is not SPLIT-final/evidence-ready and has no completed-package share. Preserve valid individual facts while aggregate ambiguity denies completion/action. N07/N13/N15/N21–N24/B03/B06. |
| Return/navigation | Return/cancel/close is only a navigation hint followed by an authorized state read. It cannot finalize, switch accounts, issue another session or apply decline/void implicitly. Agree stale-account/generation discard and explicit malformed/duplicate/old-return results. No external URL or browser is needed for the local fake. N11–N20/N29/N30. |
| Original artifact manifest | Agree artifact cardinality/ordering and required kinds; bind separate prepared, executed and certificate digests, lengths, media types, version/document/attempt IDs and availability. Backend currently describes a singular signable PDF while native permits an ordered set; version 0.1 must state which subset the prototype supports rather than silently drop or merge artifacts. Every party receives identical original bytes/digests, though authorization handles differ. N23–N28/B06. |
| Typed error/denial examples | Define unknown/unsupported version/policy, unauthorized membership, stale binding, uncertain outcome, evidence unavailable and integrity failure. Permission failure clears stale preview/share eligibility; no local/legacy export fallback for provider-required records. These are semantic examples, not approved RPC/error-code names. N03–N06/N09/N10/N21/N25/N26. |
| Synthetic server guards | Include old-client sign, alternate upsert/create/send/update and old read/export vectors; all are inert fake policy tests during this phase, not claims that SQL protection exists. Preserve original legacy positive controls and old signed JSON. B04/B05/B07 plus explicit new shared cutover fixture IDs. |

## Safe local acceptance scope

Once GM compares the versioned addendum with native/backend reviews and records the common fixture mapping, an isolated Debug-only native fake may implement those semantic examples. It must instantiate no provider/Supabase client, real transport, browser URL or credential path; Release excludes its entry. Every state remains visibly and accessibly **Simulated — no documents sent**. A simulated completed state cannot generate a real certificate, verified seal, legacy signature row or real agreement-completion claim. Small deterministic synthetic bytes can exercise hashes/manifest availability, but cannot masquerade as executed originals. No production callback route, entitlement, schema, bucket or live server policy is implied.

The c210 signing correction retains its separate prior local acceptance; the native count correction has its own independent review. Neither that source acceptance nor this paper contract certifies DocuSign. The active web Tailwind worktree, browser, files and dependency gate were not touched by this review.

## Residual gates

Before executable provider/backend rollout: accepted additive schema/RPC/security design, all legacy/direct read/write compatibility tests, original artifact authorization/retention/recovery, provider account/authentication/commercial/API/ISV rights, legal template/consent/authority review, controlled hosted provider/backend/inbox tests, physical device/accessibility/browser evidence and explicit release approval. All remain open. Do not infer host/API or legal compatibility from this source-only local audit.

Validation performed: immutable Git reads, existing-source path/line comparison and this report's reference/scope review only. No new test, app build, browser/Simulator action, source edit, hosted/provider call, migration, purchase, message to another development chat, merge or deployment occurred. Parent GM owns final shared-contract alignment and next assignment.


## Exact v0.1 follow-up

GM read the complete November 3 read-only follow-up for exact backend5d77b47. Original follow-up SHA-256 `ad663072801cb4597b2b01b82b11bca90c30607f2c391a18b9fdd5369cd6c57e`; original report remains outside Git.

# Independent web compatibility follow-up — local execution v0.1

Reviewed 2026-11-03T18:27:22.816216+00:00. Read-only documentation comparison; no new runtime tests, source changes or provider/service calls. Original DOCUSIGN_WEB_ALIGNMENT_2026-11-03.md remains intact.

Exact reviewed revision: `5d77b47ccee1b8219ba067deb56a3ae11793e1f4`, `build-it-app-main/docs/beta-docusign-local-alignment-v0.1-2026-11-03.md`. SHA-256 of reviewed file: `dfaa4a532eb6b8eb736f2f5f60c8258e258bf1a026cbae8744734c8408b4aac4`. Compared with the prior web boundary report, web c210575, backend a5a5c26 and native readiness/matrix 1a7deec already reviewed.

**Result: no unresolved web compatibility blocker to the narrowly isolated native simulation described in v0.1.** This is independent compatibility advice to the GM, not developer-owner approval or prototype/release authorization. GM still records alignment and the independent native count-correction prerequisite.

The addendum resolves the earlier pre-code ambiguities: exact version/provenance/policy DTOs and typed errors; canonical account/party/participant binding; distinct source and projection revisions; three explicit prepare/request/session operations; unresolved operations and one active attempt; callback/Close reads only; separate finality and evidence; one prepared/executed sample plus separate completion-evidence sample, exact byte digests and per-artifact authorization; persistent simulation labeling with no URLs, real certificates or real signing claims. Legacy records remain byte-identical and outside the new fake store/decoder.

The legacy hazard is now explicit and correctly scoped: authoritative policy guards must precede **both** privacy/read/export projection **and** every old sign/upsert/create/draft/send/update effect, including metadata reads. EXL-018.p checks strict fake decoder rejection only; EXL-018.s retains the unimplemented service vectors and legacy controls. The packet does not claim that source inspection or local decoder tests prove deployed guards.

Acceptance restriction: separate Debug-only models/fake in-memory repository/store/simulated surface; strict literal versions/policy and binding validation; required 15 fixture groups with independent exact-SHA review; zero real transport, external browser, provider SDK, canonical app-store mutation, production navigation, SQL, real callback registration, PDF viewing/sharing or real artifacts. No SDK, hosted, device, identity/security, retention, commercial entitlement, legal, schema, integration or release gate is closed. Future real multi-document cardinality and server cutover remain open; neither blocks this deliberately synthetic one-document simulation.
