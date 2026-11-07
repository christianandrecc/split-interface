# GM clearance — isolated native execution simulation v0.1

November 3, 2026, America/New_York. Scope: local Debug-only iOS prototype under the founder's explicit conditional instruction verified in native chat turn `01a1a299-e47a-77d2-b027-cb214bfe60cd`. This clears two prerequisites for a bounded implementation handoff, not provider integration or beta release.

## Prerequisite evidence

| Gate | Exact evidence | GM conclusion |
| --- | --- | --- |
| Native signing correction | `33cbbaeb19ef5bf6e02f9da00dfd3435c0f717e0`; [independent QA](qa/IOS_SIGNING_33CBBAE_2026-11-03.md): 130 XCTest/build, unchanged 177 reconstructed plus overlapping 11, and 115 additional assertions pass | Local technical correction accepted; earlier failure evidence retained |
| Concrete shared contract | Backend `5d77b47ccee1b8219ba067deb56a3ae11793e1f4`, `build-it-app-main/docs/beta-docusign-local-alignment-v0.1-2026-11-03.md`; GM read all 130 lines | Contract `split.execution.local.v0.1`, fixtures `split.execution.fixtures.v0.1` fixed for this prototype |
| Independent web compatibility | [Original review](qa/DOCUSIGN_WEB_ALIGNMENT_2026-11-03.md), then exact-5d77b47 read-only follow-up: no unresolved blocker to isolated native simulation | Web read/write/export projection hazards explicitly retained as future service work; fake decoder tests do not prove service guards |
| Native owner compatibility | Supported owner report: `PASS_COMPATIBILITY_FOR_LOCAL_V0_1_SCOPE_ONLY` against exact 5d77b47 and native readiness `1a7deec7e88eac5d0d9fb526a99ec1d4cf92de63` | No material mismatch; design confirmation is not test evidence or self-authorization |

The exact alignment file SHA-256 is `dfaa4a532eb6b8eb736f2f5f60c8258e258bf1a026cbae8744734c8408b4aac4`. The read-only web follow-up is `/tmp/split-web-beta-qa/DOCUSIGN_WEB_ALIGNMENT_V01_2026-11-03.md`, SHA-256 `ad663072801cb4597b2b01b82b11bca90c30607f2c391a18b9fdd5369cd6c57e`; its full text is durably archived with the [web compatibility record](qa/DOCUSIGN_WEB_ALIGNMENT_2026-11-03.md). Backend proposal `a5a5c26` and native readiness remain historical inputs; v0.1 resolves their local DTO/state/cardinality ambiguities.

## Authorized first candidate

Use the native owned worktree, preserve `codex/ios-development` at db6c64a and the corrected 33cbbae branch/evidence, then branch `codex/ios-docusign-prototype` from 33cbbae after checking for unfinished changes. Read native AGENTS/README and retain the current Simulator session and untracked pause note.

Deliver separate Debug-only strict models/decoder, `FakeExecutionRepositoryV01`, injected deterministic clock/account/suspended responses, an isolated main-actor store, and one visibly simulated native review/status surface. It must not construct an AuthClient, Supabase client, URLSession, provider SDK or real transport, open a browser/external URL, parse/register a real OS callback, add entitlements, mutate the canonical app store/production navigation, or implement PDF viewing/sharing. All sample bytes and leases remain synthetic and in memory. Release excludes the fixture entry point and feature code as specified by native build configuration.

Use literal versions/provenance/policy and full frozen/account/party/attempt bindings. Common required literals apply to named DTOs, including nested named DTOs; digest value objects keep their explicitly defined algorithm/hex shape. `observedAt` belongs to the immutable canonical projection revision: clock advancement alone cannot change an equal-revision body. Record any serialization ambiguity before changing the shared v0.1 definition.

Prepare, request and issue-own-session are distinct explicit actions. Reads, return hints and Close never complete or replay a mutation. Unknown outcomes keep operation correlation and block another attempt. Account/access/generation changes clear stale leases, sample bytes and publication. Completed-with-files-pending is not final. Preserve valid individual facts while unknown evidence blocks aggregate finality.

Exactly one prepared sample and its executed-sample counterpart plus separate completion-evidence sample are fixture cardinality only. The 1–4096-byte limit is not a future PDF policy. No sample is an executed agreement, PDF, certificate or verified badge. Old records/history remain byte-identical and outside the new store/decoder.

Acceptance requires all 15 first-scope groups: EXL-001–004, 006–007, 011–016, 018.p–020, with assertions for success and denial/uncertainty/account/binding/order/integrity boundaries. Groups count coverage, not test count. Owner provides exact commit, changed-file scope, meaningful model/store results, unsigned build and fixture UI evidence at ordinary/maximum text; independent QA follows in a detached exact-SHA checkout. Source/build evidence, owner UI and independently executed behavior remain separate.

## Open work and authority

EXL-005, 008–010, 017 and 018.s remain future adapter/service work. Server-owned policy enforcement before legacy read/export/privacy projection, metadata reads and every old write effect remains unimplemented. Real transport, browser/callback identity/origin, PDF/certificate/storage, retention, provider commercial terms and qualified legal review remain open.

No hosted DocuSign demo/production or Supabase account/API/OAuth/upload/envelope/email/tunnel, real credentials/configuration, schema/RPC changes, spending, legal publication, external contact, main merge/deployment or TestFlight is authorized. Local synthetic fixtures and disposable local tests remain the only application-test targets. This record permits the bounded handoff; delivery/startup is recorded separately in [resume record](RESUME_2026-11-03.md).

## Codec clarification C1 and implementation continuation

The native owner raised omitted wire-format details while building a transport-free scaffold. Backend docs-only descendant `27ab6345368f24681259e31c25f928f4be353df9` records C1, with unchanged local/fixture versions and unchanged 5d77b47 addendum. GM read all 100 lines and verified C1 SHA-256 `99159054142de88b48c494518f786ab26dc270918e6498b83c070a0a1080937e`, both canonical JSON digest vectors and prepared-byte length/hash. This validates examples only, not codec execution.

C1 fixes allocation entry/ordered required-party keys and exact integer totals, canonical bounded base64, immutable tagged command-input bindings before identifiers exist, command/result payload membership and omission rules, nested document/manifest/lease/artifact keys, and deterministic local digest inputs. It adds no execution capability. Fake registry account authorization remains separate from public party-pair digests; account reassignment invalidates the frozen snapshot. Read-only account-scoped projection comparison is explicit.

The native implementation handoff successfully delivered exact C1 after GM review; affected codecs may proceed inside the original isolated scope. Contradictory existing serialization requires explicit review rather than alias tolerance. [Byte-identical archived contract and C1](contracts/2026-11-03/README.md) make the source reviewable in the management PR. Future exact-candidate QA, service guards, transport and release gates remain open.

## First executable candidate in independent review

Native 87d619629f401fdbdf348e36089535a9fe99689b is frozen and handed to existing independent QA. GM source-identity checks confirm24 manifest entries/55 ios-only changes and original app/project/tests/SDK pin preserved. Owner behavior/build/UI claims await exact-candidate review; construction scans are supplemental, not service/security certification. No next feature/provider integration is authorized by delivery.

## Exact 87d6196 acceptance failed; bounded correction active

[Final independent QA](qa/IOS_SIMULATION_87D6196_2026-11-03.md) finds one P2/two reproductions where an already-authorized delayed response revives sample/session eligibility after a newer denied refresh. This violates local access-loss publication requirements; it does not change v0.1+C1 or demonstrate actual provider exposure. Fresh 168 tests/builds/exclusion/source identity pass, but 1619/1621 adversarial assertions block acceptance. GM verified 23 referenced artifact hashes and archived 25 originals externally; owner received the correction, acknowledged active work and preserves Simulator/data. Exact correction retest precedes any new feature.

Correction 4f01499 is now frozen and assigned for independent retest. GM verified 25 source-manifest entries and output-only harness relocation; independent original 1621 assertions pass, with final175/build/exclusion/additional controls pending. Owner supplied 175/replay/build evidence remains separate; no next-feature or service integration clearance yet.

## Bounded local simulation acceptance at 4f01499

[Final independent correction review](qa/IOS_SIMULATION_4F01499_2026-11-03.md) passes 175 XCTest, 1621 unchanged original assertions and 75 new focused assertions, both unsigned builds/Release exclusions and 25 manifest entries. Both original timing cases retain the newer denial with empty eligibility; no regression/new defect found. GM verified all 28 referenced hashes and archived 29 original artifacts in a durable external bundle. The prior 87 failure and temporary owner overwrite/restoration disclosure remain historical.

GM13C and its F1 correction are complete only for the cleared isolated simulation/15-group scope. Historical owner six UI journeys/20 PNG readback is not new correction UI, device or VoiceOver certification. No real DocuSign/service/schema/callback/storage/PDF/canonical app/legal/integration/release acceptance follows. Native owner received exact acceptance and preserves its branch/Simulator. The next bounded handoff is an active docs-only future server/cutover contract proposal for cross-platform review; it authorizes no implementation.
