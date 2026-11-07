# Archived independent local service-model failure — November 3, 2026

GM read the full final report and verified its report/ledger plus all 55 indexed artifact hashes. Exact cbda187 fails local semantic acceptance with two P1 findings and one P2. This is a synthetic in-memory model failure, not a production incident or regression in accepted web49/native4f. Owner corrections and a new independent exact-candidate retest are required.

- Report SHA-256 `a22d3e26f16d2979f3f4e9abcf37334c15270ef2d9d7cd2a679fc320b750075b`.
- Ledger SHA-256 `1502dd27af91d79e86b90e36f7ad7b291fd6de2c18a808331235490f4f39c15c`.
- Original durable root: `/Users/christiancarrera/.codex/artifacts/split-gm13f-independent-cbda187-20261103`.
- Additional GM-preserved bundle: `/Users/christiancarrera/.codex/artifacts/split-gm13f-independent-cbda187-20261103/gm-preserved-evidence.tar.gz`, SHA-256 `b89728dc4fe342287350c0cc2f8ddeb90c05e6f6516a9b904a3ba517fc7c0f94`; 56 originals verified directly from members.
- Owner-authored 43 tests pass freshly; reviewer 59 unique cases reconcile to 48 pass/11 requirement failures after one isolated reviewer-expectation correction. Initial failure history and correction provenance remain intact.

---

# Independent GM13F semantic-model QA — cbda187

**Disposition: FAIL — corrections required before local semantic acceptance.** Three confirmed model defects (two P1, one P2); no production exposure or enforcement was tested. Web49 and native4f acceptance remain separate.

## Immutable scope and provenance

Reviewed executable `cbda18719d01e83bd798e9356c02571d24b35cbe`, parent `17fbba641ffb21da1e8851e65fd09d0afa4bb00f`, branch `codex/docusign-service-fixture-model`. All **13 added files only** under `local-fixtures/execution-service-proposal-v0.1/` were exported from Git, checked against exact blobs, made read-only, and rehashed after tests. All pre-existing parent paths, including app/package/Supabase/native files, are unchanged in this diff. Owner checkout was never edited; its branch still points to candidate. The source archive SHA256 is `03485ca94ba39d2019db9aa8a250496d86ee05a0e2f8f58178f419af493dafff`; source-set SHA256 (12 files, manifest self excluded) `3e9d6c22ddc676b79c01803cfddc9dae32268ef2efc362ee02232351ecce5750`. Scope manifest and each declared source hash match. No source patch, hidden unsafe mode or production import was used. Explicit allowed Node builtins/local imports and constructor seam requirements were inspected; no transport, environment/config read, filesystem import, dynamic import, subprocess or timer exists in the model.

Exact input snapshots:

| Input | Git SHA | Content SHA256 |
| --- | --- | --- |
| S1 | `536dfe65ad44a096c6939a2c5c150ab9ec21a508` | `c79ea6f9dea633d1d96c08f4200b7981c21ffa55748b04930dbf64a5311e3ac7` |
| S2 | `0a5b9808667913033de8bc9efd77a7717dccbf50` | `9a9184f2581dcb9c08217ffae8b3d5aded7f1e27ba9670b4f95920364f593ba3` |
| GM13E | `17fbba641ffb21da1e8851e65fd09d0afa4bb00f` | `d96d153f900ff20ee1ccbea646dec179cd9b694c0ed64224a29711d5c2f11c5e` |

The complete S1/S2/GM13E documents, README, OWNER_VERIFICATION, model/protocol/seams/data/provider, all four specs, test assertions and scope manifest were read. Management instructions/status/tasks/decisions are snapshotted under `inputs/`; current management hash is evidence of the read, not an approval. No repository-root AGENTS.md exists at backend worktree root or candidate Git root; supplied and management instructions govern. An initial report-finalization attempt expected that Git path and failed before report creation; its error is preserved, the assumption corrected, and no model test repeated. Exact fixture-input canonical hash `5e0f75e958f720c19911c9270e5279c265fcc6096dc32eac581d15be3ca4e020` was freshly derived from exported constants; it matches the declared hash and owner external input record, whose SHA256 is `70dcb8788d8ccd78f2d567d4962bcbf6bb7c8e7010c4a6b970baa3781cd1ad9e`. The latter is artifact readback, separate from fresh input derivation.

## Executed checks and attribution

Existing `/usr/local/bin/node` **v24.15.0**; builtins only, no install/network. Subprocess environment supplied only PATH and LANG; no live environment/config import. Exact argv/cwd/UTC timestamps/exit code/stdout/stderr hashes are in each `*.run.json`.

| Execution | Result | Meaning |
| --- | --- | --- |
| Exported owner suite, all four spec paths, once | **43/43 pass**, 0 fail/cancel/skip/todo | Fresh independent execution of owner-authored 33 behavior +9 mutant controls +1 constructor tests; not 43 reviewer-designed cases. |
| Reviewer suite initial run | **59 tests: 47 pass, 12 fail**, 0 cancel/skip/todo | Eleven requirement failures across F1/F2/F3; one incorrect reviewer expectation in I06. Original harness/log/run receipt preserved. |
| I06 corrected assertion only | **1/1 pass** | Old B projection correctly receives staleBinding after A intent advances revision; a freshly captured B projection then receives existingAttempt. One dispatch/create verified. No product change and no broad rerun. |
| Reconciled unique reviewer cases | **59: 48 pass, 11 fail** | Combined case disposition, not a new full-suite run; total reviewer test executions60. |
| Source/import/scope/input/post-review checks | PASS | Exact declared13 files/import allowlist/manifest/source and input hashes/parent and preserved reference bytes; no app/service integration inference. |

The reviewer harness's first-run bytes are preserved as `independent-first-run.spec.mjs` and `run-checks-first-run.py`; `first-run-harness-snapshots.json` maps digests. The original I06 mismatch remains in `independent-suite.stdout`; it is excluded from product findings with the reason above. No failure history was overwritten. Source errors and requirement assertion failures remain distinct.

Coverage includes every modeled legacy action across private/helper/body-claimed-internal surfaces for all four policy classes, public provider/unknown policy denial, genuine legacy actions/membership/read/export positives; trusted-principal/consensus forgery and all frozen/attempt binding fields; immutable accepted input/result copies/digest; explicit A/B pending interleaving; process loss before/after dispatch with no replay; S2 pending/confirmed-before-original-reply/confirmed process-loss/expiry/receipt/strict corrupted-output cases, account scope and explicit denied/allowed O2; raw-body public-key HMAC/overlap/tamper/size/scope/persistence/ack barriers; independent canonical authority, wrong-private-binding lookup and genuine adoption; sticky terminal quarantine and latest legitimate signer facts. All introduced changes use documented test seams, not unsafe subclass overrides or fabricated success payloads.

**25 reviewer stale-publication cases passed**: actual projection/outcome/session and typed/thrown decoder errors crossed with newer denial/account/selection/attempt/access changes; all earlier work suppressed, with a fresh actual latest positive retained afterward. Barrier-controlled after-provider-read attempt change also prevents old completion. Session marker delivery is a nonlaunchable in-memory surrogate only. No sleep/timer was used.

## Confirmed findings and exact repros

### GM13F-F1 — P1: Pre-dispatch binding changes do not stop create/session effects

Source: candidate `local-fixtures/execution-service-proposal-v0.1/model.mjs`, relevant lines 135, 171.

At afterIntentCommitBeforeDispatch barrier selection superseded, frozen snapshot changed, or attempt generation advanced; resumed model still increments fake create/issue to1. Request selection/attempt cases can confirm; issue cases deny delivery only after unnecessary issuance. Policy/access controls stop calls.

Required correction: Recheck the captured current execution/frozen/attempt/selection plus current authorization immediately before dispatch, preserving uncertainty only for calls that may actually have dispatched.

Repro names: `I08 request revalidates selection at dispatch boundary`; `I08 request revalidates frozen at dispatch boundary`; `I08 request revalidates attempt at dispatch boundary`; `I08 issue revalidates selection at dispatch boundary`; `I08 issue revalidates frozen at dispatch boundary`; `I08 issue revalidates attempt at dispatch boundary`.

### GM13F-F2 — P1: Unresolved signing recipients are published as known/zero and authorize own sessions

Source: candidate `local-fixtures/execution-service-proposal-v0.1/model.mjs`, relevant lines 100, 260.

Independently configured signing observation has A pending and missing/ambiguous/unknown B or an extra recipient; reconcile publishes known with unresolvedRecipientCount0, then actual issue(A) dispatches and delivers marker. All4 cases issue1/directDeliveries1.

Required correction: Carry unresolved/contradictory recipient-set truth into canonical state and fail own-session eligibility closed until safely resolved; retain legitimate unique individual facts.

Repro names: `I17 signing with missingOther keeps unresolved truth and blocks a new own-session`; `I17 signing with ambiguousOther keeps unresolved truth and blocks a new own-session`; `I17 signing with unknownOther keeps unresolved truth and blocks a new own-session`; `I17 signing with extra keeps unresolved truth and blocks a new own-session`.

### GM13F-F3 — P2: Recipient-order changes bypass semantic dedupe and repeat agreement audit

Source: candidate `local-fixtures/execution-service-proposal-v0.1/model.mjs`, relevant lines 243, 260, 261.

After one canonical completed observation, reverse only fake canonical recipients array; second independently authenticated reordered raw event and reconciliation increments effectiveTransitions and agreementAudits from1to2, although same canonical parties/bindings/states are retained.

Required correction: Dedupe the normalized validated semantic transition under execution revision, rather than treating raw array ordering as a different effective fact.

Repro names: `I16 independent canonical authority, semantic dedupe under recipient-array permutation`.

The raw TAP diagnostics contain actual model responses/execution state/effect and fake-provider counters for every failing vector. `findings.json` and `independent-suite-case-ledger.json` provide indexed observations. F1's missing dispatch revalidation is observable despite later issue-delivery denial or request quarantine; those later protections do not undo the issued semantic effect. F2 is exposed using lifecycle signing rather than the completed-only malformed-recipient owner cases. F3 reverses only canonical recipient-array order, which the model itself maps back to the unchanged required-party order; no identity/state/binding changed.

## Nine owner negative controls

All nine controls genuinely execute the same assertion against the safe model and a test-local override, catching the intentionally introduced failure. They do not merely assert a predeclared mutant label: the handler accepts only ERR_ASSERTION or the expected strict decoder failure and requires an observed detection. Fresh raw diagnostics are in `owner-mutant-observations.json`.

| Fault | Observed detection |
| --- | --- |
| Payload policy | Safe provider mode cannot come from replacement JSON; unsafe override makes send succeed. |
| Early projection | Projection spy increments before guard. |
| Before-denial effect | Registration counter becomes1 on a denied path. |
| Duplicate dispatch | Fake create becomes2 across separate A/B request keys. |
| Direct receipt duplicate | Exact S2 decoder rejects wrong direct duplicate union shape. |
| Event trust | Lifecycle becomes completed without independent canonical authority. |
| Stale success | New denial overwritten when stamp guard disabled. |
| Stale thrown error | Same guard fault exposes converted older error. |
| Missing lookup replay | Fake create becomes2 after zero-match recovery. |

These are narrow unit mutation controls, not exhaustive mutation coverage or separate independent test designs. The publication helper uses synthetic response literals, and the duplicate-dispatch helper is sequential; the reviewer separately used real source responses/decoder throws and explicit pending barriers. They do not detect the dispatch-staleness, unresolved signing-recipient or recipient-order defects above.

## Practical limits and next bounded action

Return F1/F2/F3 to backend owner for a new isolated fixture-only correction candidate, preserving this commit/log/history; independently retest exact corrections and relevant controls before any local model acceptance. This QA does not authorize a fix, integration or new milestone by itself.

This establishes only source review and deterministic in-memory model/spies execution. No actual SQL/RLS/grants/private RPC/trigger/outbox worker, server authentication/JWT identity, HMAC secret management/security certification, Postgres lock/constraint/durability/restore, production wire codec, real Connect/provider/API/recipient view, URL/lease/browser/device, real binary PDF/artifact/certificate/finality or hosted integration was tested. Model privacy and fail-before-effect spies are not proof of actual database enforcement. No app/Simulator, provider/demo/Supabase/network/config/credential discovery, schema, install, cleanup, cost, outbound email/upload/OAuth/tunnel, merge/push/deploy/distribution or legal/outreach action occurred.

Only SRV01–04 and06–11/S2N1a–g selected semantics are in scope; fixture encoding/17 ASCII bytes labeled PDF/two signers/public keys/1024-byte cap/60-second clock/seven-day lookup/replacementAllowed remain synthetic assumptions. SRV05, full12–15, preparation/view tokens/actual restore/binary evidence and production decisions D01–D07 stay open. Accepted web49/native4f are unchanged and not recertified. A model correction pass would still be local semantic acceptance only.
