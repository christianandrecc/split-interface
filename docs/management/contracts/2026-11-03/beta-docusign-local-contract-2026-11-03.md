# GM-13A: shared DocuSign execution contract — local proposal

November 3, 2026, America/New_York. **Design proposal for web/iOS/GM review; no provider integration, schema or RPC change is implemented.** Founder selected DocuSign and resumed development with local testing only. Existing SPLIT acknowledgements and historical signed agreements remain intact and are not represented as DocuSign signatures.

## Scope, source baseline and critical compatibility finding

This packet was prepared on `codex/docusign-local-contract`, starting at backend preparation commit `dd74071395dd74d7470a12a6ba09754cb304776e`. Inspected sources:

| Source / immutable revision | Observed contract |
| --- | --- |
| `build-it-app-main/supabase/migrations/20260911163414_enforce_split_profile_privacy.sql:216–225` at dd74071 | Public participant RPC delegates to the private guarded function and applies the authorized privacy projection. |
| `build-it-app-main/supabase/migrations/20260911164913_capture_collaborator_registration.sql:45–93,181–207,238–265` at dd74071 | Server binds actor/membership, locks the sheet, checks revision/proposal/consensus and appends `signatureMethod: SPLIT in-app acknowledgement`; matching acknowledgements can produce Verified and Stored. |
| Same migration, lines 211–235 and 275–278 | Legacy signing captures permitted own-party registration fields; counters preserve prior evidence while resetting current participant state. |
| `build-it-app-main/src/lib/splitSheetStorage.ts:562–613` at dd74071 | Existing web sends the sign action to that RPC. An unconfigured client follows a local, non-persisted path. |
| `build-it-app-main/src/lib/splitSigningEvidence.ts:29–61` at web `c2105759bdeb8a288644f5a4bc0f43f97555e638` | Server source, canonical actor, current proposal, exact acknowledgement method and ambiguity checks determine legacy evidence. Required-party counts and aggregate completeness are distinct. |
| `ios/SPLIT/Domain/SigningReview.swift` at native `db6c64ae8c544119340a029b3546c1c37f1a860b` | Native evidence/confirmation explicitly recognize SPLIT in-app acknowledgement and validate the reviewed response. These checks cannot establish DocuSign execution. |

**Provider selection alone does not enforce provider signing.** A legacy client can still call the current sign RPC unless a later reviewed server change rejects it for provider-required records. A client-only switch would leave an execution bypass. Proposed server policy and versioned reads below are required before a real cutover; this document does not add them.

Authority remains limited to source/documentation review and a later separately reviewed local fake-provider prototype. No DocuSign account, OAuth/consent, hosted demo/production API, envelope, agreement upload, email, tunnel, provider credential, hosted Supabase action, migration, purchase, legal publication, merge, push or deployment is included. Public documentation research is allowed. Demo is a hosted service, not a local test target.

## Proposed records and immutable correlation

The following names describe proposed data boundaries, not approved table names, migration fields or shipped JSON. A shared contract version must be accepted by web, iOS and GM before implementation.

| Proposed record | Required information and ownership |
| --- | --- |
| Execution policy | Server-owned mode: legacy in-app, DocuSign-required or unsupported. Frozen for each execution version; never trusted from editable client JSON. Unknown policy fails closed. Existing historical records keep their original mode. |
| Frozen execution snapshot | Sheet ID, unique proposal ID, source server revision, snapshot ID, contract/template/renderer versions, exact signable PDF bytes and SHA-256, signed-terms manifest/digest, required signer-set digest and creation audit. Full original canonical snapshot remains restricted and unchanged. |
| Required signer binding | Canonical party ID, participant ID and authenticated account ID kept distinct; provider recipient ID maps to exactly one required party. Frozen legal-name/contact/authority disclosures are reviewed before inclusion. Display name or email matching alone is not authorization. |
| Provider execution attempt | Opaque attempt ID, stable request key, snapshot/digest, DocuSign environment and account identity, provider envelope ID when known, current lifecycle/uncertainty, correlation timestamps and allowed recovery action. Environment/account/envelope form a composite binding, not envelope ID alone. |
| Event inbox / reconciliation ledger | Authentication result, exact raw-body digest, relevant envelope/configuration correlation, durable receipt/deduplication state, normalized facts, reconciliation outcome and audit reference. No raw document/session secrets in ordinary logs or client responses. |
| Artifact manifest | Artifact kind, immutable object reference, exact byte digest/length/media type, provider envelope/account/environment, snapshot ID, retrieval state and permission/retention/recovery metadata. Executed document and completion certificate are individually identified. |

The PDF sent for execution is generated from authorized server data. Its signed terms include the agreed rights, parties, exact hundredth-percent allocations, relevant work/registration details and reviewed terms version. The complete restricted snapshot preserves unknown JSON; new/unknown potentially signable fields require contract review rather than silent omission. An existing privacy-projected client response is not the authoritative full source for generating the agreement. Every signer must see the same approved signable package without automatically exposing unrelated private profile fields.

The original source revision proves what was frozen. It is not a permanent requirement that every later server revision equal that value: chat, receipt and audit events may legitimately advance the revision. Completion instead requires the still-current execution policy, proposal/snapshot ID, signer bindings and signed-terms/document digests to match under a server transaction. A material change creates a different snapshot and execution cycle. Later profile edits do not silently rewrite a frozen signer's name or registration details.

## Proposed operations, permissions and state

The names below are logical interfaces, not API/RPC signatures. Existing invite/approve/counter/chat behavior remains separate from execution.

| Operation | Preconditions and result |
| --- | --- |
| Prepare execution | Authenticated authorized participant; accepted invitations, complete current consensus, exact allocations and unique party mapping; compare expected revision/proposal and validate provider policy. Freeze one snapshot atomically. No email or signature is implied. |
| Request execution | Explicit authorized action referencing snapshot ID/digest and stable request key. Persist intent before external work. Only a server adapter may create an envelope. Return pending/known/uncertain state, never a fabricated success. |
| Get own signer session | Reauthorize current account, membership, required recipient and current snapshot/attempt. Issue an ephemeral provider session for only that role. No cached/email-distributed signing URL and no URL in telemetry. Account change invalidates client publication/use. |
| Read execution status | Authorized member receives a versioned, minimal projection with explicit policy, evidence origin, current attempt and artifact availability; unrelated users get no existence/identity leakage. Status reads never create, resend or sign. |
| Receive provider notification | Service-only event boundary validates the exact raw bytes, allowed provider configuration and account correlation before durable admission. It does not run as a collaborator or accept a user-supplied actor. |
| Reconcile / retrieve evidence | Worker uses server-only credentials to confirm current provider state, expected recipients/documents and snapshot linkage; persists exact artifacts before publishing a complete downloadable package. |
| Supersede unfinished attempt | Explicit authorized operation records supersession and requests provider voiding. Unknown void outcome remains blocked for reconciliation; a new cycle must not race a still-signable old one. Completed originals cannot be voided or edited through this operation. |

Separate dimensions avoid conflating a provider event with SPLIT finalization:

- **Preparation:** negotiating → ready → frozen; stale or ambiguous input returns to explicit review.
- **Provider attempt:** not requested → create pending → created/signing → completed, declined, voided or expired. Create/void/status uncertainty is represented explicitly rather than silently treated as a terminal success or failure.
- **Evidence package:** absent → retrieval pending → validated/retained, or failed/quarantined. Provider-completed with unavailable artifacts is shown as completion confirmed, evidence pending—not ready for certified download.
- **SPLIT projection:** final execution is published only after the current correlated attempt is reconciled, all required recipients are satisfied, no evidence ambiguity remains and required artifact records are durable. It increments canonical revision/audit through a guarded server operation without replacing the document with a webhook payload.
- **Local provenance:** simulation is a distinct mode, not a DocuSign environment alias. Fixture completion is visibly simulated, uses no external URL and cannot produce a genuine provider certificate, verified badge or release-ready status.

The server must enforce transition preconditions even if a client presents a valid old revision or invents a completed state. Decline/expiry/void results remain distinct and cannot become completion through a late client callback. The web/iOS return URL or session-end event is navigation information that triggers a read/reconciliation; it is never sufficient evidence of execution.

## Unknown-create recovery, notifications and evidence retrieval

**Unknown create:** persist the stable attempt/request key and provider correlation before making a create request. If the provider response is lost, retain the same unresolved attempt; do not create a second envelope or mark the first request failed merely because its ID is unknown. Reconcile within the configured account/environment using supported provider correlation. A known envelope that matches the snapshot can be adopted once; conflicting/multiple matches go to quarantine. No result or an expired lookup window is not proof that no envelope exists. It requires a bounded reviewed recovery/operator decision, not automatic re-send.

DocuSign documents transaction-ID lookup for response-loss recovery and a seven-day validity window. It is not permanent exactly-once delivery or permanent deduplication; SPLIT's durable attempt ledger remains required. Current details must be rechecked before an adapter is implemented. [DocuSign transaction-ID recovery](https://www.docusign.com/blog/developers/common-api-tasks-use-transactionid-to-find-the-envelope-you-created).

**Notifications:** verify a configured raw-body HMAC in constant time against the allowed active key set, with bounded body size and safe parsing. Do not recompute over reserialized JSON. Authentication proves origin/integrity, not freshness or that the event applies to this agreement. Only after durable inbox admission acknowledge receipt; process slow reconciliation outside the request. Persist an internal message fingerprint/deduplication key and make state/artifact changes idempotent. Do not assume every notification format supplies a globally unique event ID. [DocuSign raw-body HMAC guidance](https://www.docusign.com/blog/developers/manually-authenticating-hmac-signatures-docusign-connect-webhook-configurations).

For duplicates, acknowledge without repeating completion/audit/artifact writes. For out-of-order or replayed messages, compare correlated attempt facts and reconcile authoritative provider state; do not regress a completed projection because an older sent notification arrives. Unknown account/envelope/snapshot, malformed evidence or contradictory terminal facts are quarantined with an actionable sanitized operator record. A completed message for a superseded snapshot never finalizes the new proposal. If an old ceremony unexpectedly completes, preserve the evidence and flag the conflict; do not silently discard a potentially executed document or rewrite the newer agreement.

**Artifact retrieval:** fetch the expected executed document and completion certificate separately, validate type/size/account/envelope/document correlation, and compute fresh SHA-256 over the received bytes. The executed PDF hash is distinct from the original unsigned PDF hash; signatures change bytes. Keep both linked by the immutable snapshot/attempt. Store provider-returned bytes as originals, with authorized download on both clients. A human-readable SPLIT summary may be separately generated but cannot replace or masquerade as the provider original. Retrieval failure, wrong content, partial downloads or storage failure prevent publishing an evidence-complete package. Do not silently regenerate a signed PDF from current editable data. [DocuSign document retrieval reference](https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopedocuments/get/).

No bucket or retention period is selected here. Proposed private storage and recovery must cover encrypted originals/manifests, access revocation, signed-record retention, independent recovery custody and disabled outbound work on restore. A storage signed URL is short-lived authorization, not a stable public record link. Restoring an uncertain attempt must reconcile it before any new create/send; a recovery drill must never replay invitations or signatures.

## Additive cutover and web/iOS compatibility review

| Boundary | Proposed behavior / release requirement |
| --- | --- |
| Existing completed agreements | Preserve current status, signatures, terms, audit/proposal history and evidence method exactly. Continue honest legacy reads; no backfill of DocuSign provider IDs, certificates or consent. |
| Existing unfinished agreements | Do not silently convert a partially acknowledged record. Define an explicit reviewed continuation/new-agreement policy and require all affected parties to review any new execution package. |
| New provider-required agreements | Server-owned policy is established at creation/preparation and cannot be deleted through client JSON/upsert. All old/new mutation paths enforce it under the existing ownership/revision checks. |
| Legacy sign RPC | Proposed guard rejects p_action=sign for provider-required records before any signature, audit/response, status, notification or registration side effect. It cannot be bypassed with old client versions or alternate payload fields. Legacy records retain authorized existing behavior. |
| Legacy reads/exports | Do not return a new provider record to an old model that might infer SPLIT certification from status. Use an explicit unsupported/upgrade-required boundary on legacy routes and versioned provider-capable read/export operations. A claimed client capability alone is not authorization. |
| Web c210 evidence helper | Keep legacy helper/method semantics. Add a separate typed provider execution projection and artifact download path; no forged SPLIT acknowledgement rows to make old counts pass. |
| Native db6 model | Keep legacy evidence/response integrity checks and unknown-field preservation. Add explicit provider policy/state/recipient/artifact models and navigation/reconciliation state. An unfamiliar method or missing version stays unconfirmed. |
| Shared persistence/security | Proposed execution attempt, event inbox and artifact metadata are server-owned; web/iOS have only authorized projections and command surfaces. Use private/non-exposed boundaries, least privilege and permission tests; future schema/RPC work needs additive migration review/recovery plan. |
| Rollout/rollback | Reader support and server policy enforcement precede accepting new provider-required agreements. Rollback may disable new preparations, not erase execution records, revive old sign RPC access or abandon in-flight envelopes. Keep evidence retrieval/reconciliation available. |

The provider worker cannot simply call the existing legacy sign RPC on behalf of recipients. That would fabricate the method/actor semantics and risk profile-registration mutations after freezing. A future guarded completion operation must derive canonical facts from validated provider evidence, preserve original snapshots and write distinct provider provenance. This requires independent web/iOS/backend review before SQL or executable implementation.

## Synthetic fixture and acceptance matrix

Each fixture uses non-production IDs, memory/disposable local persistence and a deterministic fake adapter. No live provider transport, OAuth, tunnel or external callback is needed.

| Fixture group | Required result |
| --- | --- |
| Accepted A/B/C agreement with exact 100% | Unique current proposal/signer binding freezes one identical signable package; outsider cannot prepare, read or obtain a session. |
| Wrong account, duplicate identity, missing party or consensus | Fail before freezing/provider request; no partial canonical changes. |
| Concurrent prepare / stale expected revision | One snapshot/attempt intent; stale caller refreshes; unknown/full canonical fields remain intact. |
| Same stable create key / lost response | One local intent; known matching envelope adopted once; no blind second create. |
| Ambiguous/missing correlation or lookup-window expiry | Remains uncertain/quarantined with bounded operator recovery; not re-sent or finalized. |
| Native/web account switch during session/status await | Prior-account result/session/artifact cannot publish to the new workspace. |
| Local simulation | Permanent visible simulation origin; no genuine DocuSign verified label/certificate or live URL. |
| Raw-body HMAC modified, missing or disallowed key | Reject before inbox admission/projection/provider fetch; key-rotation positive control succeeds. |
| Authentic wrong account/envelope/configuration | No canonical update or unrelated document retrieval. |
| Duplicate/replayed notification | Exactly one effective transition/audit/artifact set; no signature or envelope resend. |
| Sent after completed / conflicting terminal event | No regression; reconcile/quarantine contradiction rather than trusting delivery order. |
| Completed for old proposal/attempt | Current proposal not finalized; old evidence retained and conflict surfaced. |
| One signer pending/declined or unresolved extra recipient | No aggregate completion; valid individual facts/counts remain truthful. |
| Browser return claims signing_complete | Navigation/read only; zero finalization without server/provider evidence. |
| PDF, certificate or storage retrieval fault | Provider completion and artifact availability remain separate; no substituted/regenerated original. |
| Tampered/truncated/wrong-document artifact | No evidence-complete projection; failure is visible without exposing contents. |
| Changed terms / supersede / void response lost | New cycle blocked until safe reconciliation; completed original is immutable. |
| Old-client direct sign and alternate upsert on provider-required record | Denied with zero legacy acknowledgement/status/response/notification side effects; legacy control still works. |
| Authorized cross-client download / revoked or outsider access | Same exact PDF/certificate bytes and digests on both clients; denied fresh reads cannot fall back to stale certified data. |
| Restore, retry and mixed legacy/provider histories | No outward delivery or consent replay; correct preserved provenance, digests and permissions; pending external uncertainty remains pending. |

Acceptance for the next local prototype is independent execution of these boundaries with exact source/fixture versions and commands, not screenshots alone. Full hosted DocuSign/API/legal/device/interoperability proof remains absent. Existing independent web/native correction reviews retain their separate legacy-integrity scope.

## Next bounded milestone and decisions

1. GM, web and iOS compare this proposal with the native readiness packet; settle a common contract version, state names, signer mapping, server cutover/read compatibility and evidence-retrieval boundary. No schema/API signature is approved by this packet.
2. After alignment, implement only an isolated fake-provider domain/adapter prototype and fixtures, with transport incapable of real provider calls. Keep it out of production execution and distinguish simulation in every output. Independently test correlation/uncertainty, event admission, state/permission and artifact boundaries above. Do not mix it with the Tailwind migration or legacy signing corrections.
3. Before hosted work, obtain a concrete approval for account ownership/commercial API/ISV terms, auth and identity checks, isolated provider/backend targets, controlled recipients, data processing/retention, cost structure, callback security and operator/recovery responsibility. No outreach, signup, purchase or hosted test is authorized now.
4. Before real agreements, complete qualified U.S. music/IP review of rights/template/consent/authority, privacy/support/closure policy, current recovery/alert proof, both-platform integration and exact release approval. Provider use is not an enforceability guarantee or proof of title.

Additional feasibility sources checked during this local design: [DocuSign recipient view](https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/), [Connect implementation](https://developers.docusign.com/platform/webhooks/connect/implement/), [transaction evidence](https://www.docusign.com/trust/security/transaction-data-use), [developer plans](https://ecom.docusign.com/isv/plans-and-pricing/developer) and [ISV embedding](https://www.docusign.com/partners/isv-embed). No particular plan entitlement, provider price, legal conclusion or completion date is asserted.

Validation of this deliverable: source inspection and docs-only whitespace/reference review. No application tests, database tests, provider calls or native UI execution were run, because this packet changes no executable behavior. The existing backend preparation and recovery harness at dd74071 remain unchanged.

Follow-up: [local contract/fixture alignment v0.1](beta-docusign-local-alignment-v0.1-2026-11-03.md) compares this exact proposal with native 1a7deec, defines local DTOs/states and 15 first-prototype fixture groups, and records the pre-privacy-projection legacy load/export guard. It is a cross-review candidate, not mutual approval or executable authorization.
