# Bounded QA space recovery — November 3, 2026

The local Data volume fell to roughly 195 MiB free during independent native retesting. GM reviewed a read-only exact-path/ownership/symlink/open-file inspection, then authorized removing five completed, reproducible QA dependency installations. The independent web reviewer performed that exact cleanup; no owner worktree, active export, native cache/build/result bundle, source, user data or Simulator was touched. Disclosed generated Vite cache residues inside these disposable node_modules were included; no standalone/shared npm/browser cache was selected.

## Completed targets

| Exact completed QA dependency tree | Prior allocated bytes |
| --- | --- |
| `/private/tmp/split-web-beta-qa/gm02-independent/candidate/build-it-app-main/node_modules` | 417357824 |
| `/private/tmp/split-web-beta-qa/focus-325f64d-independent/candidate/build-it-app-main/node_modules` | 386502656 |
| `/private/tmp/split-web-beta-qa/tooling-7ea2359-independent/candidate/build-it-app-main/node_modules` | 417366016 |
| `/private/tmp/split-web-beta-qa/zod-resolver-options-20261103/control-z3-r3/build-it-app-main/node_modules` | 386506752 |
| `/private/tmp/split-web-beta-qa/zod-resolver-options-20261103/candidate-z4-r7/build-it-app-main/node_modules` | 391467008 |

The baseline symlink to separately owned c210575-checkout dependencies was excluded. Each target was rechecked immediately before removal: exact canonical nonsymlink root, current ownership, only internal links and no active process/open file. No parent directories or broad path patterns were removed.

## Verification and attribution

- Removed allocated-byte estimate: 1,999,200,256 (1.862 GiB).
- Data available snapshot: 204,210,176 before, 4,233,879,552 after at 4:02 PM ET. The observed +4,029,669,376-byte change includes concurrent builds/APFS activity and is not attributed solely to cleanup.
- GM independently verified all 2,041 retained source/provenance hashes. Reports, source/lock manifests, install/tree receipts, source archives, package evidence, all six external manifest supplements and original indexes/bundles remain intact.
- Seven hashed native-library/resolver/Zod source artifacts referenced inside removed trees were copied out before removal. GM verified all seven digests and preserved additional durable copies with old→retained→durable path mappings. Original verification ledgers were not rewritten.
- No dependency version, application behavior, audit threshold, provider/service, hosted state or release changed.

## Durable evidence

Inspection: SHA-256 `74b0af55d2a7bc22f9d45f9b79cfa2f9660e6db38e7a5ea64c9e69eb7dbff9e9`. Cleanup receipt: SHA-256 `cf25857a69ee23f8a68235b1f0bc262f9c53a1b5e0ce8f5567ae5d42fca477dd`. Copies of both JSON files and the seven retained artifacts are stored in `/Users/christiancarrera/.codex/artifacts/split-qa-dependency-cleanup-20261103/`; `durable-artifact-mapping.json` records exact original/retained/durable paths and hashes.

The preserved report/ledger findings remain dated evidence. Future replay of these five exports requires exact-lock npm ci; a missing installed tree after this documented cleanup is not missing source or a changed historical result. Native original 87 and corrected 4f evidence paths are unaffected. No further cleanup is authorized by this record.
