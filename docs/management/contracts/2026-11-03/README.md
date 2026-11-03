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
