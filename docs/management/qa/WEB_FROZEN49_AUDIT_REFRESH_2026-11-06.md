# Frozen 49 audit refresh — GM readback

GM read the complete new report, verified all 161 sealed entries/hashes/lengths/modes and complete membership, and recomputed raw npm response totals. Exact frozen 49 manifest/lock and configured moderate threshold remain unchanged. Full graph: 7 moderate package entries/1 advisory, exit 1. Production-only: 0, exit 0. November 3 retained full 12 moderate is preserved; the reduced current propagation follows revised advisory data, not a code fix.

Report SHA-256 84b266b286f364dd385aa0d2c771e1950dfd9b64476757912787b51735137aef; index 5b50f68b467a610140f23b1891c501d34f9492115c7bf025eb6d50456e8e2f85. Packet /Users/christiancarrera/.codex/artifacts/split-web-frozen 49-audit-refresh-20261106-01/. Two read-only public advisory queries, no install/fix/resolution/application test. Root matcher 3 remains present and outside the current GHSA range; nested estree matcher 10.2.6 remains affected. No release, full-toolchain safety or dependency remediation approval. The complete original report follows byte-for-byte.

---

# GM02B-G | Frozen SPLIT web audit refresh | November 6, 2026

**Full audit: fails the unchanged moderate threshold. Production-only audit: passes.** The same frozen lock now returns **7 moderate package entries tracing to 1 unique advisory**, down from **12 moderate entries tracing to the same advisory** on November 3. The production-only response remains zero and is byte-identical to November 3. This is an advisory-data revision, not code remediation, an approval to release, or a change to the original gate.

## Two measured snapshots

| UTC date / scope | Exit | Moderate package entries | Unique advisories | Distinct lock paths named by npm |
|---|---:|---:|---:|---:|
| Nov 3, full | 1 | 12 | 1 | 13 |
| Nov 3, omit dev | 0 | 0 | 0 | 0 |
| Nov 6, full | 1 | 7 | 1 | 7 |
| Nov 6, omit dev | 0 | 0 | 0 | 0 |

All other severity counts were zero. Package entries are keys of npm's vulnerabilities object, not independent vulnerabilities. Unique advisories are deduplicated by advisory URL, not npm's numeric source ID. Distinct paths are the union of npm's nodes arrays. The six non-minimatch entries today have only transitive "via" references. Both dates reported 520 total dependencies, and all 520 non-root locked locations are unchanged. Omit-dev filters the audit findings, not the summary of the underlying lock's size.

The exact November 3 owner logs and command receipts are copied in `nov03/` and checked against the historical evidence index (SHA-256 `c92ce2d927d78b86a38c08d8074792516cf786890d9179a84ab66d26b16f1b0f`). That full query used npm's default audit threshold; today's full query explicitly set moderate. Both reported only moderate findings and exited 1. Both production queries explicitly set moderate.

## Which minimatch copy is affected?

[GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249) is the only advisory in both full responses. GitHub lists **moderate**, updated November 4, with affected versions **>=7.0.0 <11.0.1** and patched version 11.0.1. November 3 npm source 1244012 returned **<11.0.1**; November 6 source 1244623 returned **>=7.0.0 <11.0.1**. The advisory describes denial of service from glob-pattern amplification; this audit did not test exploitability.

- Still flagged: `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch@10.2.6`. Immediate parent `@typescript-eslint/typescript-estree@8.71.1` declares `^10.2.2`.
- No longer flagged by this advisory: `node_modules/minimatch@3.1.5`. Its lock parents are `@eslint/config-array@0.21.0`, `@eslint/eslintrc@3.3.1` and `eslint@9.32.0`. The package is still present in the full lock. Nothing was removed or upgraded.
- Five package entries dropped: `@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/eslintrc`, `eslint`, and `eslint-plugin-react-refresh`. No new package entry appeared.

## Complete current full-audit entries

All seven entries are moderate and development-only in the frozen lock. Paths below are exact, relative to the package root. In the parents column, `ts/` denotes the `@typescript-eslint/` scope; every named non-minimatch package there is locked to **8.71.1**. The machine-readable `findings.json` retains each parent's complete path, version, declaration type and requested range, each entry's full raw npm fields, and the locked package integrity. These are lock locations, not a new on-disk installation.

| Lock path | Version | Immediate incoming lock parents | npm entry range | npm fix flag |
|---|---|---|---|---|
| `node_modules/@typescript-eslint/eslint-plugin` | 8.71.1 | typescript-eslint | >=6.16.0 | true |
| `node_modules/@typescript-eslint/parser` | 8.71.1 | ts/eslint-plugin (peer), typescript-eslint | >=6.16.0 | proposed downgrade |
| `node_modules/@typescript-eslint/type-utils` | 8.71.1 | ts/eslint-plugin | >=6.16.0 | true |
| `node_modules/@typescript-eslint/typescript-estree` | 8.71.1 | ts/parser, ts/type-utils, ts/utils, typescript-eslint | >=6.16.0 | proposed downgrade |
| `node_modules/@typescript-eslint/utils` | 8.71.1 | ts/eslint-plugin, ts/type-utils, typescript-eslint | >=6.16.0 | proposed downgrade |
| `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch` | 10.2.6 | ts/typescript-estree | 7.0.0 - 11.0.0 | proposed downgrade |
| `node_modules/typescript-eslint` | 8.71.1 | project root (devDependency) | * | proposed downgrade |

“Proposed downgrade” preserves npm's exact `fixAvailable` meaning here: `{"name":"typescript-eslint","version":"8.36.0","isSemVerMajor":true}`, not a recommendation or verified fix. The other two flags are the literal boolean `true`. No fix was requested, tried or inferred. Historical flags are retained without modification in the original JSON.

## Execution and custody

- Source: Git commit `49eacadc9d2b23639059fc07d2b53a1d133a746c`. Only its `build-it-app-main/package.json` and `package-lock.json` were exported into an empty work directory. No `node_modules`, application source, project config or inherited credentials. Both files were read-only; names and hashes matched before and after each query.
- Package SHA-256 `ef3364ff99e702264d9c1f0dcea70219e5dd1dd4cc2b6b3a76e40d1e52cd5da2`; lock SHA-256 `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12`.
- Node 24.22.1 executable SHA-256 `8a7dd4c5cb35e6171dfbea7303650bc311f46971b06dd7e1c62e3f291cfd746c`; npm 11.12.1 CLI entry SHA-256 `8e5f6f3429f8cdbe693cdc29904e9d5a7b127a494bd15c804bd54c7403bfcbe7`.
- Exactly two audit children, sequential, full then omit-dev. Both used `--json --audit-level=moderate --package-lock-only --ignore-scripts`, separate fresh HOME/tmp/cache, empty user/global npmrc, public HTTPS npm registry and zero fetch retries. Both bulk advisory POSTs returned HTTP 200. Both stderr files are empty. Each child had a 60-second wall guard, a 512-MiB Node old-space limit and a 512-MiB sampled RSS guard (25-ms polling); neither guard fired.
- Full: 20:24:40.592 to 20:25:02.786 UTC, 22.195 s, peak sampled RSS 506,445,824 bytes; stdout SHA-256 `b292e2e148e81e1351a3d09554570b62b1a971457b67dd5070ae5a1ca0e14b13`.
- Production: 20:25:02.787 to 20:25:03.324 UTC, 0.537 s, peak sampled RSS 112,738,304 bytes; stdout SHA-256 `c0cd6892d6e56d1d76b921f7a7ba1afb5d423cb58cc03684635fd4ad6ab507d2`.

`full/query.json` and `production/query.json` retain the exact argv, allowlisted environment, times, limits and exits alongside raw stdout/stderr and npm logs. See `preflight.json` and `postflight.json` for identities and unchanged work-directory checks. No installs, lock regeneration, fixes, app execution or new compatibility probes. Prior failed evidence, the frozen source and the gate are untouched.
