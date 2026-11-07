# Independent AF1 core QA — exact ebb3041

**FAIL_LOCAL_GM13H_F1_F2**, November 6, 2026. GM read the complete final independent report and verified all 61 indexed artifact hashes/lengths. All 62 originals, including the index, are additionally preserved in a GM-owned bundle. This is an executed failure of the new isolated synthetic library, with no production or previously accepted app exposure demonstrated.

Candidate `ebb3041ac7b00155f5a0e328715ac17de36d0c36`, parent accepted native `4f01499b0a926d141497d82bbd4c195d7b2922f5`. Exactly twelve authorized new files; all 643 parent tree entries and all 25 G2 serialized input byte identities verified by independent QA. [Controlling G2](../contracts/2026-11-06/beta-docusign-af1-g2-protocol-vectors-2026-11-06.md) and [bounded handoff](../AF1_MEMORY_CORE_HANDOFF_2026-11-06.md) define the selected memory-only scope.

- **F1/P1:** optional replaceable transport replays correct G2 projection/manifest/bytes despite independently revoked reader, first entry or either permit. It publishes integrityValidated without an authority read. `MemoryReadStore.swift:43` checks invocation ownership, while transport reads at 88/99/116/127 and publication 133 have no independent grant barrier. Two reviewer methods produce eight assertions across four grant scenarios; one underlying finding.
- **F2/P2:** after a manifest conflict creates quarantine, revoke the reader and accept the actual current denied notice. A fresh explicit load returns integrity before authoritative denial because of `MemoryReadStore.swift:83`. One method/one failed assertion. Authorized quarantine must remain restrictive, while inaccessible records must receive denied before resource diagnostics.

| Fresh independent execution | Result |
| --- | --- |
| Pristine owner-authored XCTest suite | 28 methods pass, no failures; independent execution, owner-authored assertions |
| Reviewer-authored expanded suite | 17 methods: 14 pass/3 fail, 9 assertions attributable only to F1/F2 |
| macOS Release build | Pass |
| iOS17 arm64 Debug/Release library-module compilation | Both pass; no app link/iOS runtime/Simulator/device proof |
| Five isolated reviewer-local fault controls | Each passing baseline method detects its omitted guard: owner 64, whole-entry 6, byte-oracle 2, copy 2, duplicate-member 3 assertion failures; expected fault results, not candidate findings |

The independently extracted vectors, raw/recursive grammar, independent byte/oracle/copy, readiness/history/error, revision/high-water, deterministic ownership/observer/ABA and whole-set permission checks are covered in the full report. Parameterized and overlapping assertions are not summed as unique journeys. Initial three-method evidence remains preserved; final equivalent finding assertions suppress whole-package dumps without changing expectations. No reviewer product fix or unexpected-expectation correction occurred on this exact candidate.

[Complete original report](/Users/christiancarrera/.codex/artifacts/split-af1-core-independent-20261106-05deffb039/INDEPENDENT_AF1_CORE_EBB3041_2026-11-06.md), SHA-256 `47581dfb8b2b8f608f4b2d1d5b8a7e76d706b546ed04c98380362f6c56dda643`. [Original index](/Users/christiancarrera/.codex/artifacts/split-af1-core-independent-20261106-05deffb039/evidence-index.json), SHA-256 `4c29b24d25a10df2c8164ee237afb94cdca84659bb322c426741a600335059cb`.

GM preservation: `/Users/christiancarrera/.codex/artifacts/split-gm-af1-ebb3041-qa-20261106/original-evidence.tar.gz`, SHA-256 `3e082f46c521db51aa52983fdd67b239fa21463af4a9f3286a0474435fde1ece`, 62 original files. `preservation.json` records original root/report/index identities. This durable GM summary preserves the original report separately, including its original relative source links.

GM13H-FIX is active on a new branch from frozen ebb; owner acknowledged both findings. New corrected SHA and independent retest are mandatory. Preserve the two explicitly documented corrected-source schedule/expectation changes in the [initial finding record](AF1_CORE_EBB3041_INITIAL_FINDINGS_2026-11-06.md); they do not rewrite the original ebb verdict. Original reviewer stopped after report delivery, and has not inspected a correction candidate.

No actual PDF/parser/files/viewer/share/H1, full G1 AF-07 completion-known/files-assembling, real lifecycle/storage/provider/database/identity, D01–D07, device/accessibility, hosted integration or release gate is accepted. No developer checkout, Simulator, hosted service or external account was touched by this review.
