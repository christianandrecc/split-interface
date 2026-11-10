# Local execution v0.1 — codec clarification C1

November 3, 2026. Docs revision **C1** clarifies omitted serializations in [alignment v0.1](beta-docusign-local-alignment-v0.1-2026-11-03.md), exact source `5d77b47ccee1b8219ba067deb56a3ae11793e1f4`. That addendum is unchanged. Contract `split.execution.local.v0.1` and fixtures `split.execution.fixtures.v0.1` remain unchanged: these are missing representations of already specified local shares, bytes, command outcomes and nested bindings, not new execution capabilities or production behavior. Any prior serialized fixture using a contradictory representation must be revised/reviewed explicitly; do not silently accept both. A discovered semantic conflict requires GM review and, if necessary, a new version.

The GM's recorded clearance still governs the isolated Debug-only simulation. C1 does not authorize production code/schema/provider/network activation or add a real PDF, certificate, URL/token or storage policy. No executable code or tests are changed here.

## Common literal fields

Every named DTO, including the nested named DTOs below, contains these six required fields **flat on that object**, not inherited from its parent or nested under a header: `contractVersion = split.execution.local.v0.1`, `fixtureVersion = split.execution.fixtures.v0.1`, `origin = simulation`, `provider = docusign`, `providerEnvironment = localSimulation`, `executionPolicy = providerRequired`. The existing digest value object remains exactly `{algorithm: sha256, hex: <64 lowercase hex characters>}`; it does not gain these fields.

## 1. Review allocations and required parties

`ReviewContextV01.allocations` is a nonempty ordered array of named `AllocationEntryV01` objects. Each entry has exactly the common literals plus `partyId: String` and `units: Int64`. `ReviewContextV01.requiredPartyIds` is a nonempty ordered array of nonempty canonical party-ID strings; entries are values, not DTO objects.

- Each `units` is an integer-valued JSON number decoded exactly as Int64, in 0…10000 inclusive. Reject fractional values, booleans, numeric strings, null, overflow and any conversion that rounds/truncates. Canonical fixture encoding emits ordinary integer literals. The agreement total uses checked integer addition and must equal 10000; no floating-point percentage conversion or tolerance is allowed.
- `partyId` values are unique and case-sensitive. Both arrays have equal length; `allocations.map(partyId)` equals `requiredPartyIds` **in order**, with no duplicate, missing or additional party. An empty array is invalid. No new production maximum is introduced; the named first fixtures contain A/B's two required parties.
- `ownParty.partyId` occurs exactly once and its account/participant binding matches the authorized fake registry. The complete private signer registry supplies the expected `requiredSignerSetDigest`; the client cannot derive account authorization from party names/IDs or invent the digest from a partial public list.
- A zero-unit party remains required if included in the canonical required set; it is not removed from consensus/session/completion checks. For the two-party fixture, allocations A=7000/B=3000 match ordered required IDs A/B. A=6999/B=3000, duplicate A, missing B, a fractional unit, or reversed/mismatched ordering fails review binding.

## 2. Artifact byte encoding

`ArtifactBytesV01.bytes` is one JSON string containing **standard RFC4648 base64** of the synthetic bytes, compatible with Swift Data's base64 Codable representation. It is not an integer array, URL, file path, data URL or PDF text. Other ArtifactBytes/manifest/binding fields remain as defined in v0.1.

Strict fixture decoder rules, applied after JSON string decoding:

1. Require ASCII standard alphabet `A–Z a–z 0–9 + /` and canonical terminal padding `=`. URL-safe `-`/`_`, whitespace/newlines, controls, embedded padding, more than two padding characters and other characters are invalid.
2. Before base64 decode, require UTF8 encoded string length 4…5464 inclusive and a multiple of 4. Decode without ignoring unknown characters. Require the decoded byte count 1…4096 inclusive.
3. Re-encode the decoded bytes with standard base64 **including canonical padding** and require exact string equality. This rejects missing/excess padding, noncanonical pad bits and malformed equivalents; do not repair the input.
4. Require decoded count to equal the selected manifest entry's declared `byteLength`, and SHA-256 of the **decoded bytes** to equal that entry's digest. Hashing the encoded base64 string is wrong. All account/execution/attempt/manifest/artifact/role/media-type binding checks still apply independently.

For example, string value `QQ==` encodes one synthetic byte A; `QQ`, `QR==`, `QQ==` followed by a newline, and `QQ===` are invalid. This is a codec-value example, not a complete ArtifactBytes DTO or a certificate. The 4KiB and encoded-size limits apply only to this fake byte fixture and do not select a real PDF/provider limit. There is no URL/file/network fallback on decode or authorization failure.

## 3. Operation outcomes and immutable tagged caller binding

`OperationOutcomeV01` has exactly the common literals plus required `operationId`, `commandKind`, `callerBinding`, `result`, and the case-specific payload below. `commandKind` is exactly `prepareExecution`, `requestExecution` or `issueOwnSession`; `result` is exactly `pending`, `confirmed`, `denied` or `unresolved`. Unknown values, cross-kind payloads or missing required members fail closed.

`callerBinding` is a tagged union of the following **named DTOs**, each with its own flat common literals. It is the captured immutable command **input**, not a mutable copy of the latest execution. Its `kind` equals the top-level `commandKind`; its nonempty `operationId` equals the top-level operation ID. Account ID and workspace generation must match the active caller captured before the command.

| Binding variant / tag | Required fields beyond common literals, kind and operationId | Absent fields and result cross-check |
| --- | --- | --- |
| `PrepareCallerBindingV01`, kind `prepareExecution` | `accountId`, `workspaceGeneration`, `review: ReviewContextV01` | No executionId, frozen, attempt or envelope fields: none exists yet. Confirmed projection must match review sheet/proposal/own party, terms/signer-set digests and source revision; its signedTermsDigest equals reviewedTermsDigest. Newly assigned snapshot/execution/document IDs are accepted only as the typed authoritative fake result, never matched against guessed placeholders. Initial command result is frozen/notRequested with attempt null and projection revision 1. |
| `RequestCallerBindingV01`, kind `requestExecution` | `accountId`, `workspaceGeneration`, `executionId`, `expectedProjectionRevision`, `frozen: FrozenBindingV01`, `ownParty: OwnPartyV01`, `stableRequestKey` | No attempt, requestId, envelope or recipient fields are invented in the input. Confirmed projection must retain exact execution/frozen/own-party bindings and contain a correlated attempt whose stableRequestKey matches the input; its revision advances from the expected input revision. It confirms persisted request intent, not signature completion. The result may be createPending with no known envelope yet; no own-session issuance until a known signing attempt exists. |
| `SessionCallerBindingV01`, kind `issueOwnSession` | `accountId`, `workspaceGeneration`, `executionId`, `expectedProjectionRevision`, `frozen: FrozenBindingV01`, `ownParty: OwnPartyV01`, `attempt: AttemptBindingV01` | Attempt is the complete selected known signing attempt: requestId, attemptId/generation, stableRequestKey, providerAccountRef and nonempty known envelopeRef must all match. No null/absent field is a wildcard. Confirmed lease must match the operation, execution/frozen/full attempt and own account/party/participant; its newly issued lease/recipient/return correlation is authorized against the fake registry, not supplied email/name or guessed identifiers. Expired/used/late or no-longer-permitted leases are not presented. |

In all variants, `review.ownParty.accountId` or `ownParty.accountId` equals the captured caller account. An output may introduce legitimate authoritative IDs without retroactively changing its caller binding. Persisted operation outcomes retain that original input across pending→confirmed/unresolved transitions and read-only recovery. A later execution read is a separate projection, not permission to replace the input comparison with a more convenient newer tuple. Expected revisions are command preconditions; output revisions and the frozen source revision are distinct concepts.

| Result | Exact payload membership / validation |
| --- | --- |
| `pending` | `projection`, `lease`, `failure` are all absent. Retain operation ID/caller binding, block a second mutation and allow only authorized outcome/status reads. |
| `confirmed` + prepare/request | `projection: ExecutionProjectionV01` is required. `lease` and `failure` are absent. Validate the command-specific binding/preconditions above before publication; no provider-completion inference from the word confirmed. |
| `confirmed` + own-session | `lease: SessionLeaseV01` is required. `projection` and `failure` are absent. Validate full known attempt/own-party binding plus current account/generation, clock, use and permission gates. |
| `denied` | `failure: ExecutionFailureV01` is required; `projection` and `lease` are absent. The failure's operationId equals the enclosing operation ID; code is one of denied, staleBinding, busy, unsupportedContract, unsupportedPolicy, unsupportedLegacyProjection, evidenceUnavailable, integrity, unavailable. Its recoveryAction follows v0.1 and never authorizes mutation replay. |
| `unresolved` | `failure: ExecutionFailureV01` is required, with `code = uncertainOutcome`, the same operationId and `recoveryAction = readOperationOutcome`. `projection` and `lease` are absent. Retain original caller binding/uncertainty and block another create/issue; a missing lookup result cannot clear it. |

**Absent means the key is omitted.** A forbidden payload key is rejected even if its JSON value is null. Required payload keys cannot be missing or null, and confirmed outcomes can never include both projection and lease. No untyped result/payload dictionary, empty placeholder DTO, guessed execution ID or null-wildcard comparison is allowed. The original projection rule `attempt = null` while notRequested is unchanged; that is an explicit projection member, not an outcome payload convention.

Operation failure association is account scoped: an authorized caller reading their own operation may receive the denied/unresolved outcome above. An outsider/new account looking up another account's operation receives a standalone minimal typed denied failure **without** its stored caller binding, projection, lease or sample bytes. Knowing an operation ID, same title or stable request key grants no access. Every post-await publication rechecks captured account/generation and current selected binding; old-account error/results are discarded too. Read-only outcome resolution never implicitly replays prepare, request, session issuance or consent.

`observedAt` is fixed when a canonical projectionRevision is created and remains the same in all authorized views of that revision. Account-scoped ownParty fields can differ between A/B; equal-revision body comparison is within the same captured account/execution view. Advancing the injected clock or repeatedly reading a confirmed outcome does not rewrite its archived projection body. A newer status observation is obtained by a separately versioned execution read; equal revision with changed body within that view still fails integrity/quarantines.

## 4. Nested shape sweep and deterministic digest inputs

These complete the local key names; they introduce no production artifact/session behavior. Every named object in this table has its own common literals as specified above. Listed optional absence is intentional; otherwise all listed members are required, nonnull and typed as in v0.1. Do not accept alternate flattened binding names or both alias keys.

| Named DTO / member | Exact shape beyond common literal fields |
| --- | --- |
| `PreparedDocumentEntryV01`, each `FrozenBindingV01.documentSet` entry | `documentId: String`, `preparedDocumentDigest: DigestValue`, `byteLength: Int64`, `mediaType: application/x-split-simulation`. The digest key is **preparedDocumentDigest**, not digest. documentSet has exactly one entry; its digest equals FrozenBinding.preparedDocumentDigest and its length 1…4096 matches the prepared sample. |
| `AttemptBindingV01` | `requestId`, `attemptId`, `attemptGeneration`, `stableRequestKey`, `providerAccountRef`; `envelopeRef` is omitted while unknown, otherwise a nonempty string. Explicit null is not an envelope identifier or wildcard. A SessionCallerBinding/SessionLease requires the known nonempty envelopeRef. |
| `SimulationArtifactEntryV01`, role executedSample | `artifactId: String`, `role: executedSample`, `documentId: String`, `digest: DigestValue`, `byteLength: Int64`, `mediaType: application/x-split-simulation`. documentId equals the one prepared document ID. |
| `SimulationArtifactEntryV01`, role completionEvidenceSample | `artifactId: String`, `role: completionEvidenceSample`, `digest: DigestValue`, `byteLength: Int64`, `mediaType: application/x-split-simulation`. **documentId is absent**, not null; completion evidence is package-level, not another prepared document. |
| `SimulationManifestV01` | `manifestId`, `executionId`, `attempt: AttemptBindingV01`, `frozen: FrozenBindingV01`, `entries: [SimulationArtifactEntryV01]`. entries has exactly two ordered distinct IDs/roles: executedSample first, completionEvidenceSample second; no third entry/implicit merge. |
| `ArtifactBytesV01` | `manifestId`, `entry: SimulationArtifactEntryV01`, `executionId`, `attempt: AttemptBindingV01`, `frozen: FrozenBindingV01`, `bytes: String`. Entry exactly equals the selected entry in the fresh authorized manifest, including its role/documentId/digest/length/media type. Manifest ID, execution, full known attempt and frozen binding all match it. No extra URL/path/account authority is inferred from the bytes or artifact ID. |
| `SessionLeaseV01` | `leaseId`, `operationId`, `executionId`, `attempt: AttemptBindingV01`, `frozen: FrozenBindingV01`, `ownParty: OwnPartyV01`, `recipientRef`, `expiresAt`, `returnCorrelationId`. Use ownParty as a nested named DTO, not duplicate flattened accountId/partyId/participantId aliases. |
| `RequiredPartyV01` | `partyId`, `participantId`, `state`, `ambiguous`; do not derive a private account from the participant ID or expose another account's lease. OwnPartyV01 remains accountId/partyId/participantId plus its common literals. |
| `ExecutionFailureV01` | `code`, `messageKey`, `recoveryAction`, and optional `operationId`. Omit operationId for a non-command-bound failure; otherwise it is a nonempty string, never null. Inside denied/unresolved OperationOutcome it is required and equals the enclosing operationId. Unauthorized lookup never returns the stored other-account caller binding. |

The fake repository reauthorizes **each** sample artifact read, including completion evidence. ArtifactBytesV01 does not gain an account authority field: its async caller captures active account/generation independently and verifies that captured context before publication. A bytes reply matching a different account's manifest cannot authorize retrieval or survive a switch. Both sample roles keep distinct digests; no bytes are a PDF or certificate.

**Local canonical JSON recipe:** UTF8, object keys sorted lexicographically, no insignificant whitespace, arrays preserved in specified order, slash not escaped, integer literals for integer values. Hash the complete resulting bytes with SHA-256. Named DTO common literals are validated separately and are **not** inserted into the digest value-record inputs below. The named fixture vectors contain ASCII IDs/text; this recipe is not a production Unicode/document canonicalization policy.

- `requiredSignerSetDigest` hashes the ordered array of **partyId/participantId value pairs**, in requiredPartyIds order, from the fake canonical registry. It is not a hash of party IDs alone or email/name/provider identity. All account assignments remain separately bound in the frozen private fake registry and own-party authorization; an account reassignment must invalidate/reprepare the snapshot even if these public pairs did not change. The digest alone never proves authority.
- `documentSetDigest` hashes the ordered array of four-field value records **documentId, preparedDocumentDigest, byteLength, mediaType**, extracted from the prepared document set; not the versioned DTO's headers or an executed-artifact manifest. The one prepared sample digest is SHA-256 over its exact raw bytes, including any newline.

Reproducible value vectors (not complete DTOs):

~~~json
[{"participantId":"creator","partyId":"party-a"},{"participantId":"invite-b","partyId":"party-b"}]
~~~

The required-signer input above hashes to `9f41c19246cf9d5ae721f61911cb492222bc2c215d62f49783cd8c429171874b`. Prepared ASCII bytes `SIMULATION PREPARED` followed by one LF have length 20 and digest `6f452b00e2c3475d35767d418ce765a89ff4d614db4b02fb9b03271dfa6ecd64`. Their exact document-set digest input is:

~~~json
[{"byteLength":20,"documentId":"doc-1","mediaType":"application/x-split-simulation","preparedDocumentDigest":{"algorithm":"sha256","hex":"6f452b00e2c3475d35767d418ce765a89ff4d614db4b02fb9b03271dfa6ecd64"}}]
~~~

That input hashes to `98c320520f56ccfc141567f685b232d21c99c6312bd7f634d8ee8eb4670db01b`. Other fixture allocations/IDs must use their own registry/document inputs and computed hashes; never copy these digest values onto different data. The common digest value object retains only algorithm/hex.

## Documentation validation and scope

C1 is additive clarification text only. Check the exact patch and all named nested DTO literal fields when relaying it to the native owner; do not infer completed codec tests or provider acceptance from this document. Real service/session/callback, PDF/certificate, storage, limits, privacy/retention, credentials, hosted tests and legacy server cutover remain outside local v0.1. Validation here is staged Markdown whitespace/reference review, with no runtime tests for prose.
