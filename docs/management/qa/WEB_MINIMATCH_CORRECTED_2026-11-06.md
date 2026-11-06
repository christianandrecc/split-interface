# Corrected tooling recipe evidence readback — November 6, 2026

GM read the complete owner report and verified all 967 indexed artifacts. Resolver succeeded for the scoped 11.0.4 recipe but the unchanged-production-lock check failed on fast-deep-equal classification. No candidate install/runtime/lint/audit or application failure is established. A same-npm no-override resolution control is needed before attributing this flag delta. Accepted49 and the configured gate stay unchanged.

- Report SHA-256 `bd44549224551d84cd8dc2d0f8d40f5544cae6066ad7fc94fe52debc9509f000`.
- Index SHA-256 `088c4a2d49b4bad86f6ca5ebf1f74deae0a0e2fb368553aa90f6c4bb8088e389`.
- Durable evidence root `/Users/christiancarrera/.codex/artifacts/split-web-minimatch-corrected-20261106-01`.

---

# GM02B-R | corrected minimatch recipe | 2026-11-06

**Verdict: selector repair passed; production-lock preservation failed; runtime compatibility NOT TESTED.** The earlier EOVERRIDE was not reproduced. One strict lock-only resolution succeeded (npm exit 0, 881 ms). Its output did not qualify for installation. There was no npm ci, fresh audit, second resolution, paired runtime test or app change.

## Resolver result

Exact source: `49eacadc9d2b23639059fc07d2b53a1d133a746c`; owner evidence `40b4a5fa4ace3b8bc69d62faa85c73e9fc70e17e`. The NEW scratch manifest retains ESLint's direct `^9.32.0` declaration, scripts, engine, and existing PostCSS override. Its four parent overrides are unchanged from the earlier attempt except that the ESLint parent explicitly uses `".": "$eslint"`. No global override was applied. The app's direct package specs and all four parent package versions survived resolution.

| Parent selected before and after | Parent's declared minimatch range | Before | After (lock, not installed) |
| --- | --- | --- | --- |
| eslint 9.32.0 | ^3.1.2 | root 3.1.5 | nested 11.0.4 |
| @eslint/config-array 0.21.0 | ^3.1.2 | root 3.1.5 | nested 11.0.4 |
| @eslint/eslintrc 3.3.1 | ^3.1.2 | root 3.1.5 | nested 11.0.4 |
| @typescript-eslint/typescript-estree 8.71.1 | ^10.2.2 | nested 10.2.6 | nested 11.0.4 |

Each route has the expected registry URL and published 11.0.4 integrity: `sha512-/UJ1dEoVQTjPNDh6SGlUo+ueLMmoHTas4q+8yaAR/5t6nLAIiBDJtoYUh20IYleix7ehiQkgczb84PE3uzHkxg==`. These are lock/metadata facts only. There is no runtime observation of minimatch 11.0.4 in this experiment.

## Why the install stopped

**One unrelated package changed production classification.** The baseline entry for `node_modules/fast-deep-equal@3.1.3` has `devOptional:true` with no `dev:true`. The corrected lock instead has `dev:true`, with `devOptional` absent. Its version, tarball URL, integrity and license did not change. This is not a new package version, but it changes which entries belong to the non-dev lock projection: **171 before, 170 after**, excluding the root. We did not execute an omit-dev install or establish a production break. The comparison nevertheless fails the explicit requirement that production lock entries remain unchanged.

There are **16 changed lock paths** (521 to 527 total entries including root):

- Three ESLint-family parents gained nested minimatch 11.0.4, brace-expansion 5.0.12 and balanced-match 4.0.4 (nine additions). The estree branch updated its existing nested minimatch 10.2.6 to 11.0.4 (one change). Four patched paths, no hidden root minimatch override.
- The new minimatch line adds `@isaacs/nonrecursive-glob-match@1.1.0` (one addition). Old root minimatch 3.1.5, brace-expansion 1.1.21, balanced-match 1.0.2 and concat-map 0.0.1 disappear (four removals). The harness flagged concat-map as outside its narrow name allowlist; inspection of the base lock explains that removal: the displaced brace-expansion 1.x branch required concat-map. This does not explain away the separate production-classification change.
- The final changed path is fast-deep-equal. Its direct parent references in both lockfiles are the same development ESLint and nested AJV entries. Without a same-npm, no-override resolution control, the cause of the flag change is **not established**. No control resolve was performed in this one-attempt scope.
- No peer declaration changed among these 16 entries, and strict peer resolution returned no conflict. Target minimatch 11.0.4 and brace-expansion 5.0.12 declare Node `20 || >=22`; balanced-match 4.0.4 declares `18 || 20 || >=22`. The replaced minimatch 3.1.5 accepted any Node; estree's former 10.2.6 accepted `18 || 20 || >=22`. Node 24 satisfies the new engines; no app engine edit occurred. Every old/new entry including dependency, integrity, peer/engine/flag fields is retained in `resolution-analysis.json`.

## Evidence boundary and next option

The resolver child succeeded. The **controller** exited 1 on the unchanged-production check; this is neither another npm EOVERRIDE nor a CJS/ESM/API failure. The frozen consumer's ESM default import remains a static compatibility concern, not a tested outcome. No baseline/candidate public-entry, TS/TSX rule, file-selection, ignore, PDF, browser, database or other application tests ran. This was npm on macOS arm64, not Linux or Windows; even simulated path fixtures did not execute. The frozen production-only 0 and full 12 moderate audit findings are historical retained results; no remediation or waiver was established.

**Smallest next option:** in a separately bounded investigation, run a no-override lock-only control from exact 49 under the same Node/npm and compare precisely this flag and its dependency ancestry. That distinguishes ordinary resolver normalization from an override-specific change. It is not authority to hand-edit flags or to install the failed candidate. Keep the frozen app unchanged; an upstream-supported patched parent remains the compatible remediation route.

## Receipts

- Baseline package SHA-256 `ef3364ff99e702264d9c1f0dcea70219e5dd1dd4cc2b6b3a76e40d1e52cd5da2`; corrected scratch package `925c74048345106e307233a9d1ec1594bf793fc431104e4f1256c43ab8b8e09f`.
- Baseline lock `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12`; corrected scratch lock `3fab9681b69c0d52170f81ce4c9240029a21f6453932e179974c41b19320692c`.
- Node v24.22.1 executable `8a7dd4c5cb35e6171dfbea7303650bc311f46971b06dd7e1c62e3f291cfd746c`; npm 11.12.1 CLI entry `8e5f6f3429f8cdbe693cdc29904e9d5a7b127a494bd15c804bd54c7403bfcbe7`.
- Controller `6cb2b34a06bd39bff10ceabfe321edb2461be2fce4516395c5c5c71f7825d4ac`. Exact argv/environment `logs/manifest-resolution-argv.json` SHA-256 `b8d3fb119f9bdea503d05b84a5dd6cfa0215699833f61806047c1a9b19c90eac`. npm child stdout/stderr, debug logs, exit receipt and full diff are retained. The only child used a 512 MiB old-space limit, 30-second timeout and isolated public npm settings with scripts/audit/funding disabled.
- Before and after: 401 original tracked source files and 28,052 original installed file/link records verified; current branch/status, accepted archive and evidence-index hashes unchanged during the experiment. Both prior minimatch attempt artifacts remained intact. No original installs were recreated or cleaned.
- See `results/verdict.json`, `postflight.json`, and `evidence-index.json` for machine-readable evidence. No application candidate, production change, service/account access, Simulator, or release work.
