# Archived local simulation contract evidence

November 3, 2026. These are byte-identical immutable snapshots from the backend-owned contract branch, included for remote review of the management PR. They are dated evidence, not another maintained API specification or production endpoint. The source owner maintains future revisions in its owned branch; a later snapshot requires a new explicit source revision and review.

[GM scope clearance](../../DOCUSIGN_LOCAL_ALIGNMENT_V0_1_2026-11-03.md) governs the Debug-only native simulation. Contract `split.execution.local.v0.1`, fixture version `split.execution.fixtures.v0.1`, documentation clarification C1. No service/schema/provider/hosted/security/legal/integration/release acceptance is implied.

| Archived file | Exact source commit | SHA-256 |
| --- | --- | --- |
| [beta-docusign-local-contract-2026-11-03.md](beta-docusign-local-contract-2026-11-03.md) | `5d77b47ccee1b8219ba067deb56a3ae11793e1f4` | `c304ecf7c3b1cdd31064c338df935415f51f7601835caaeb1fb1a52028b14934` |
| [beta-docusign-local-alignment-v0.1-2026-11-03.md](beta-docusign-local-alignment-v0.1-2026-11-03.md) | `5d77b47ccee1b8219ba067deb56a3ae11793e1f4` | `dfaa4a532eb6b8eb736f2f5f60c8258e258bf1a026cbae8744734c8408b4aac4` |
| [beta-docusign-local-v0.1-codec-clarifications-2026-11-03.md](beta-docusign-local-v0.1-codec-clarifications-2026-11-03.md) | `27ab6345368f24681259e31c25f928f4be353df9` | `99159054142de88b48c494518f786ab26dc270918e6498b83c070a0a1080937e` |

GM read the alignment/C1 and verified their hashes. C1 canonical JSON/digest examples were recomputed successfully; this is example validation, not application tests. The broader proposal remains future real-service design.

## Future service proposal S1

[beta-docusign-server-boundary-cutover-proposal-v0.1-2026-11-03.md](beta-docusign-server-boundary-cutover-proposal-v0.1-2026-11-03.md) is a byte-identical docs-only snapshot from `536dfe65ad44a096c6939a2c5c150ab9ec21a508`, SHA-256 `c79ea6f9dea633d1d96c08f4200b7981c21ffa55748b04930dbf64a5311e3ac7`. Reserved service review identifier `split.execution.service.proposal.v0.1` is unimplemented and distinct from accepted simulation v0.1+C1. GM read all 205 lines, then delivered bounded web/native compatibility reviews. S1 business/security/encoding/ceremony/retention/commercial/operator decisions D01–D07 remain open; no server/schema/provider implementation is authorized.

## S2 duplicate-session clarification

[beta-docusign-server-boundary-s2-session-duplicate-2026-11-03.md](beta-docusign-server-boundary-s2-session-duplicate-2026-11-03.md) is a byte-identical docs-only snapshot from `0a5b9808667913033de8bc9efd77a7717dccbf50`, SHA-256 `9a9184f2581dcb9c08217ffae8b3d5aded7f1e27ba9670b4f95920364f593ba3`. It normatively corrects S1-N1 with one bearer-free duplicate-direct 409 response while preserving S1. Exact-revision native/web cross-review remains required before any fixture-adapter design; production decisions stay open. [Original native N1 review](../../qa/DOCUSIGN_S1_NATIVE_REVIEW_2026-11-03.md).

Both platform docs reviews are now recorded: [native S2 N1 closure](../../qa/DOCUSIGN_S2_NATIVE_REVIEW_2026-11-03.md) and [web S1+S2 review](../../qa/DOCUSIGN_S1_S2_WEB_REVIEW_2026-11-03.md). GM13D is complete only as cross-reviewed proposal evidence. GM13E is a separately assigned docs-only fixture-test plan, with no runtime or production-policy authorization.

## First isolated fixture model plan

[beta-docusign-gm13e-first-fixture-plan-2026-11-03.md](beta-docusign-gm13e-first-fixture-plan-2026-11-03.md) is a byte-identical snapshot of docs-only plan `17fbba641ffb21da1e8851e65fd09d0afa4bb00f`, SHA-256 `d96d153f900ff20ee1ccbea646dec179cd9b694c0ed64224a29711d5c2f11c5e`. GM read all 91 lines and selected only its isolated Node24 in-memory semantic model for a separate GM13F implementation handoff. Unsafe controls remain test-only/scratch-only. No SQL/RLS/RPC/trigger enforcement, real service or S1 D01–D07 policy is approved by model work.
