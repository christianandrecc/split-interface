# Four-parent override — GM compatibility rejection

GM read the complete report and paired raw public-entry verdict. GM verified every one of 91,090 sealed entries: 81,789 regular-file hashes/lengths/modes, 9,258 directories, 43 literal/resolved symlinks and complete membership with only index/checksum excluded. Report SHA-256 6da041a805e0d9b1b19def9694b68946453e5189720c6a6f832e381c94bf7e71; index 081cb68206ef8f67b81c3e1138c681052bcfab7fa4c9d533e49cc9ef43c86583; checksum receipt a570d86b1bec09974a05dcafb6b5f51a0328cc168bd703d21e54eef02110415e. Durable packet /Users/christiancarrera/.codex/artifacts/split-web-minimatch-qualification-20261106-01/.

**Reject this exact four-parent override as a drop-in tooling fix.** Fresh developer paired public CJS loads pass both sides; ESM baseline passes/corrected fails for the missing minimatch default export. Candidate omit-dev tree equals baseline and both full installs pass, but those facts do not clear the consumer incompatibility. GM evidence verification is readback/recomputation, not a new public-entry execution. No app/source/gate change or audit was performed; other parents, TS/TSX lint/rules, browser/build/PDF/platforms remain untested.

The original owner turn delivered unrelated historical fork advice after writing this report and omitted its index. A successful preservation-only handoff sealed existing evidence without rerunning installs/probes/tests; latest supported snapshot confirms completed/idle delivery. This is not a new founder scope instruction or a reason to create another chat. Public-source options are separately assigned; current advisory changes require a fresh audit before another recipe is selected. Full original report follows byte-for-byte.

---

# GM02B-E | minimatch 11.0.4 compatibility verdict

**Reject the exact four-parent override as a drop-in tooling fix.** On macOS arm64 / Node 24.22.1, the baseline public ESM import of `@eslint/config-array@0.21.0` loaded and matched the fixed filenames. The same import from the corrected full install failed during module linking, before any matcher could be constructed:

> SyntaxError: The requested module 'minimatch' does not provide an export named 'default'

The consumer entry was byte-identical on both sides (SHA-256 `f53cf1bd9ca3b28a0311e35926947ed78fd3f28709e3b750eb14baa52d1c89c8`). Line 4 of its public `dist/esm/index.js` says `import minimatch from 'minimatch';`. The baseline resolves minimatch 3.1.5, whose CommonJS entry supplies the default through Node interop. The corrected parent resolves minimatch 11.0.4, whose ESM entry has no default export. A package.json export-condition key named `default` selects a file; it does not add a JavaScript default export to that file. The result is a consumer contract break, **not** a new npm EOVERRIDE, a failure to install, or proof that the frozen web app fails.

## Stage results

| Stage | What ran | Observed result |
| --- | --- | --- |
| 1: corrected omit-dev | One fresh scripts-disabled strict ci, 2.192 s | Exit 0. All 23,313 paths under node_modules matched GM02B-D's sealed baseline: 170 packages, 1,503 directories, 21,809 regular files, one symlink. Zero differences in package inventory, file bytes, mode, link target or generated lock. No installed fast-deep-equal. |
| 2: full installs | One fresh baseline ci (5.317 s), one fresh corrected ci (3.033 s), sequential | Both exit 0, no scripts. 434 vs 440 actual packages. All four parent routes matched their sealed versions and integrities. The 15 differing package paths and 322 tree paths fell within the sealed dependency changes, associated containing directories or generated metadata; no unrelated path change found by these checks. |
| 2: public CommonJS | Two isolated `require('@eslint/config-array')` children | Baseline and corrected both exit 0. Constructed and normalized ConfigArray, called its matching API, and obtained identical normalized outcomes on all 12 fixed spellings. |
| 2: public ESM | Two isolated `import('@eslint/config-array')` children | Baseline exit 0, with the same 12 normalized outcomes as baseline CommonJS. Corrected exit 1 with the SyntaxError above. Actual stop condition reached. |
| Remaining probes | Not run | No eslintrc, ESLint or estree public-entry parity claim; no TS/TSX lint/rule/file-selection suite. The .ts/.tsx **filenames** in the 12-case matcher probe were not application lint tests. |

The CJS success does not offset the ESM failure. The equally important limit in the other direction: this report does not assert that a particular Vercel deployment, Vite build, ESLint CLI invocation, Linux or Windows installation has failed. A backslash in a synthetic filename on macOS is not a Windows run.

## Exact dependency and preservation boundary

- Frozen executable `49eacadc9d2b23639059fc07d2b53a1d133a746c`; owner evidence `40b4a5fa4ace3b8bc69d62faa85c73e9fc70e17e`. Baseline package/lock SHA-256 `ef3364ff99e702264d9c1f0dcea70219e5dd1dd4cc2b6b3a76e40d1e52cd5da2` / `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12`. Corrected package/lock `925c74048345106e307233a9d1ec1594bf793fc431104e4f1256c43ab8b8e09f` / `3fab9681b69c0d52170f81ce4c9240029a21f6453932e179974c41b19320692c`. No lock regeneration or edits.
- Only this experiment permitted the exact GM02B-C fast-deep-equal metadata normalization. Every other non-dev entry was checked unchanged, then actual omit-dev materialization was checked separately in Stage 1. Generated `node_modules/.package-lock.json` was included and matched byte-for-byte (SHA-256 `8500899aa92819a714435a4750ecfbe163837f9027925167f9e35067a62e48b1`). The original preservation gate and historical failed result have not been changed.
- eslint 9.32.0, @eslint/config-array 0.21.0 and @eslint/eslintrc 3.3.1 each resolved minimatch 3.1.5 in the fresh baseline; @typescript-eslint/typescript-estree 8.71.1 resolved 10.2.6. All four resolve their own nested 11.0.4 in the fresh corrected install. Installed manifest versions, selected CJS paths, input-lock and generated-lock integrities were checked. All four target integrities: `sha512-/UJ1dEoVQTjPNDh6SGlUo+ueLMmoHTas4q+8yaAR/5t6nLAIiBDJtoYUh20IYleix7ehiQkgczb84PE3uzHkxg==`. Stage 2 has the exact routes/hashes.
- Node v24.22.1 executable SHA `8a7dd4c5cb35e6171dfbea7303650bc311f46971b06dd7e1c62e3f291cfd746c`; npm 11.12.1 CLI entry `8e5f6f3429f8cdbe693cdc29904e9d5a7b127a494bd15c804bd54c7403bfcbe7`. Public npm config only; each install had new HOME/TMP/cache/config/workspace. Each child was bounded to 512 MiB old space and 60 seconds. Public-entry children had real network, subprocess launching and native-addon loading disabled. No guard denial was recorded. Exact argv, allowlisted env, raw stdout/stderr and exits are retained for all seven children.
- Pre/post verification checked original exported sources, all 28,052 baseline installed-file/link records and their modes, frozen source tree/owner branch/worktree status, owner archive/index, the 415 partial files, and retained indexed bytes/recorded modes/links of GM02B-D and preceding experiments. No original file/install/ref was repaired or cleaned.

## Discriminating evidence

`probe-verdict.json` (SHA-256 `c7eb5003d8777f81010b5bcd7703637d96bd44d744f2b10f6c983c05eeeeb9fb`) pairs the successful baseline ESM record with the failed corrected ESM record, including resolved consumer path, phase and raw stack. See `full-baseline/logs/eslint_config-array-import.stdout.log` and `full-corrected/logs/eslint_config-array-import.stdout.log`; the latter hashes to `b8e6520ed3a3d523aa5b88763c17388f97a221e7d5a8bd69b2819b2bf1725cb4`. The probe source was identical (SHA-256 `14080629995fbfc6f0870efaa775662855be7f1dce7844ce70f1bb941fb91f59`). Stage 1 and 2 receipts, raw inventories, full dependency diff and postflight are in this directory.

**Smallest next option:** retain the frozen toolchain and keep the full-audit finding open. Revisit when there is a supported fixed dependency/backport or a parent release whose public entries explicitly support the patched matcher. Do not switch to CJS-only, patch an import, introduce a shim, change file selection/rules, or weaken the audit gate in response to this result. No audit ran here: production-only 0 / full 12 moderate are earlier exact-49 results, not a fresh audit or remediation approval. No app build, browser, PDF, database, provider, Simulator, merge, or deployment was exercised.
