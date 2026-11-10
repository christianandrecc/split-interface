# Server boundary S2 — bearer-free duplicate session response

November 3, 2026. **Docs-only correction candidate S2** to [S1](beta-docusign-server-boundary-cutover-proposal-v0.1-2026-11-03.md), exact commit `536dfe65ad44a096c6939a2c5c150ab9ec21a508`. S1 remains byte-identical; read it with the normative replacements below. Reserved identifier `split.execution.service.proposal.v0.1` remains an unimplemented review proposal. This corrects native finding **S1-N1**, without changing the accepted local simulation v0.1+C1 or native `4f01499`. Native review is `/tmp/split-native-s1-compatibility-536dfe6/NATIVE_S1_COMPATIBILITY_2026-11-03.md`, SHA256 `0236a720ca0b9c6d324b0d5b63c684e327186c6e0f1c2fc6486c6bbf188848be`; web review is not claimed by this correction.

## Selected representation and exact response

For an authorized **duplicate direct** `issueOwnSession` with the same initiating account, command kind, operation ID O1 and exact immutable input/request digest, when the stored operation is already **confirmed**, return exactly one safe representation: a standalone `Failure` with `code = sessionOutcomeAvailable`, HTTP **409**, and `recovery = readOperationOutcome`.

Required root JSON members are exactly `contractVersion`, `code`, `messageKey`, `recovery`, `requestId`, `operationId`. Values are the reserved service identifier, `sessionOutcomeAvailable`, `execution.session.outcomeAvailable`, `readOperationOutcome`, the new sanitized diagnostic request ID, and O1 respectively. All are nonnull strings. No other root or nested members are permitted in this case: no `replyKind`, `result`, `inputBinding`, `projection`, `session`, `sessionReceipt`, lease, ceremony, URL, token or other-account data. This is a **response to the duplicate request**, not a denied outcome for the stored operation.

Complete synthetic shape example (not a live request or executed fixture):

~~~json
{"contractVersion":"split.execution.service.proposal.v0.1","code":"sessionOutcomeAvailable","messageKey":"execution.session.outcomeAvailable","recovery":"readOperationOutcome","requestId":"diag-duplicate-1","operationId":"O1"}
~~~

The same response applies whether the original URL is still in the original request's memory, was delivered, was lost, expired, was used, or vanished on process loss. Do not branch into a second duplicate receipt representation, persist/replay/remint the URL, invent an empty ceremony, or return a confirmed direct response without its required session. After current authorization is checked, the exact-key lookup precedes any attempt to issue again; normal revision advancement caused by O1 cannot make O1 a fresh command. A changed duplicate input fails `idempotencyConflict`; a no-longer-authorized/other-account caller gets the existing generic denial with no stored outcome/body. An operation ID alone never grants this lookup.

## Reconciled S1 clauses

These replacements resolve only S1 §3 line56, §4 lines77–79 and88–111, and §5 line115. Other S1 requirements and D01–D07 remain in force.

| S1 boundary | Normative S2 clarification |
| --- | --- |
| SessionLease custody, §3 line56 | Only the original issuance-owner request may deliver its ephemeral live SessionLease once, through its still-owned direct response continuation. There is no bearer URL in durable outcomes/logs, no delivery to a duplicate request, and no recovery of the URL from process memory as an API fallback. If that continuation is gone, the confirmed issuance remains recorded and only its receipt can be read. |
| issueOwnSession/readOperationOutcome, §4 lines77–79 | One persisted O1 dispatch owner performs issuance. Duplicates cannot claim another dispatch or subscribe to a later bearer delivery. A pending/unresolved duplicate uses the corresponding bearer-free CommandOutcome case; a confirmed duplicate uses the standalone 409 failure above. Outcome reads return only the original authorized receipt, with delivery `notIncluded`; never issue, launch or replay a ceremony. |
| Confirmed result case, §4 line93 | `replyKind=commandReply`, `commandKind=issueOwnSession`, `result=confirmed` with `session:SessionLease` exists only for the original issuance-owner response while it still owns that live delivery. A confirmed duplicate is **not** this union case: it returns the standalone failure above. `replyKind=operationOutcome` confirmed session reads retain the S1 `sessionReceipt` case only. Do not permit a receipt under commandReply or a URL under operationOutcome. |
| Absent/null/payload rules, §4 line97 | All S1 union omission/non-null/exclusivity rules remain. Standalone sessionOutcomeAvailable has its own exact six-member Failure shape above, no CommandOutcome payload. It cannot mutate stored result, inputBinding, outcomeRevision or issuance facts. |
| HTTP/recovery matrix, §4 lines99–111 | Add `sessionOutcomeAvailable /409`, recovery `readOperationOutcome`, only for the authorized exact confirmed duplicate. It means read the confirmed issuance receipt; it is neither stored denial, unavailable ceremony, uncertain provider outcome nor permission to repeat the command. Existing denied/conflict/pending/unresolved responses remain distinct. |
| Idempotency, §5 line115 | Same authenticated account/kind/operationId + identical input never repeats a provider effect. Non-session outcomes replay their safe durable representation; pending/unresolved session operations replay only the appropriate bearer-free outcome case. **Confirmed session duplicates use sessionOutcomeAvailable instead of replaying the original direct URL response.** The initiating confirmed outcome/input/receipt remain immutable; no status downgrade or new issuance occurs. |

The issuance-owner claim is an internal dispatch/delivery ownership fact, not a new client-supplied capability or another provider operation. Serialize dispatch ownership and confirmed-state observation under the existing operation lock. A concurrent duplicate that observes pending can receive pending even if O1 confirms immediately afterwards; its next allowed action is an authorized outcome read. It never later receives a URL from that duplicate call. A duplicate that observes confirmed receives sessionOutcomeAvailable even if the original owner has not yet sent its response. Only O1's single issuance effect is permitted; neither result ordering nor response loss licenses replay.

If the provider response itself is lost and issuance has **not** been confirmed, preserve unresolved/uncertainSession and its read-only recovery, not sessionOutcomeAvailable. If issuance was confirmed but the direct response was lost, the client may remain uncertain until its own readOperationOutcome returns the confirmed bearer-free receipt. Process loss, URL expiry/use, lookup reads and duplicate failures do not change the stored confirmed fact. Current access denial still prevents disclosure of that receipt.

A confirmed receipt resolves uncertainty about **issuance**, without creating a launchable lease or claiming a signature/completion. An unavailable URL can be replaced only by a **new explicit intent and operation ID O2**, after fresh current policy/identity/unique own-party/recipient/full-attempt authorization and then-configured lease expiry/use/replacement checks. The client does not auto-submit O2, reopen a ceremony, reuse O1, infer URL revocation or claim permission from the receipt. Existing D02/D03/D07 ceremony, identity and safe-replacement policy gates remain open. Choosing the S2 duplicate representation itself needs no new production-policy decision.

## Proposed future fixture vectors

These are requirements for the later separately assigned fixture-only adapter/permission design, **not executed tests**. Use synthetic bindings and intercepted issuance counters; no provider URL, token or network is needed to establish the response rule.

| ID | Scenario and required observations |
| --- | --- |
| SRV-08.N1a | O1 confirmed and original response delivered; identical duplicate returns exact standalone 409/six-member Failure, no URL/lease/receipt/CommandOutcome keys. O1 input/result/outcomeRevision/receipt unchanged; issuance count remains 1. |
| SRV-08.N1b | O1 confirmed but first direct response dropped; client remains uncertain until authorized read returns confirmed receipt with delivery notIncluded. Duplicate direct uses the same409 shape; no automatic issuance/ceremony. |
| SRV-08.N1c | Clear original process memory after persisting confirmation; repeat O1 with original exact input. Same failure and receipt, no reconstructed/persisted bearer, no second issuance. Repeat with expired/used/unavailable URL state: same shape and unchanged original outcome. |
| SRV-08.N1d | Two exact O1 commands concurrent; one dispatch owner. A duplicate observing pending gets pending with no payload; observing confirmed gets exact 409. It never receives a delayed bearer success. Total issuance 1; one original confirmed outcome, immutable input and no hidden follow-up work. |
| SRV-08.N1e | O1 provider response unknown, not confirmed: duplicate remains unresolved/readOperationOutcome, not 409 sessionOutcomeAvailable and not another issuance. Missing lookup does not resolve uncertainty. |
| SRV-08.N1f | Same O1 changed input conflicts; C/other account/revoked A cannot read stored O1/input/receipt or receive a session. Account/access change during duplicate/outcome await suppresses late publication, preserving S1 F1 ordering. No additional provider call. |
| SRV-08.N1g | Confirmed receipt read resolves issuance uncertainty; no sessionReady/ceremony without a new usable lease. A separate explicit O2 may issue only after all fresh configured checks; O2 denied leaves counter 1, O2 permitted increments to 2 under its own immutable input. No auto-O2 from retry, receipt, callback, foreground or process restoration. |

## Review and validation boundary

S2 changes representation only. It makes no new provider capability/security claim and requires no additional public-documentation research. Real wire/API/schema, SQL/RPC, identity/browser/session lifetime/retention, collaboration/cutover, provider/legal and release decisions remain unimplemented/open as in S1. The local fake's in-memory lease replay is intentionally unchanged and is not evidence for this service behavior.

Validation is exact source-clause/report comparison, immutable S1 preservation, local Markdown reference and staged whitespace review only; no runtime tests for prose. No accepted fake/store, app code, migration/schema/RPC, SDK/transport/provider/account/credentials/configuration, hosted service, cost, email, push, merge or deployment is changed. Return the exact docs revision to GM for short web/native cross-review before any fixture-adapter design handoff.
