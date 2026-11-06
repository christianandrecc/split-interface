# Web lock control — GM readback

GM read the complete owner report and verified all 551 indexed artifacts/lengths. Report SHA-256 94d6b6a504a96d660e465e3f2fc6d68215ef4adce57c4eb63400ad386cb3e59a; index 786e5f87a20d730a36d2f516179c513a23671c738811ada4e8260032205732f9. GM independently recomputed exact 49 package/lock inputs, identical output manifest and the single control lock-entry flag delta; all other lock/top-level entries unchanged.

The same-resolver control reproduces fast-deep-equal devOptional:true→dev:true without new minimatch overrides. This explains one incidental classification delta, not production safety or compatibility. No install/runtime/audit acceptance follows. Accepted 49, configured audit gate and original preservation constraint remain unchanged. Next GM02B-D is two disposable script-disabled production-only baseline/control installs, not corrected-candidate installation. Full original report follows byte-for-byte.

---

# GM02B-C | same-resolver lock control

**November 6, 2026. Result: the classification change reproduces without any minimatch override.** With the unmodified manifest and lock from accepted web49, npm changed exactly one line: `fast-deep-equal@3.1.3` lost `devOptional: true` and gained `dev: true`. Its complete control entry equals the corresponding entry in the corrected experiment. The four overrides were **not necessary** to observe this change under this resolver. That does not establish why the original lock had the old flag or whether shipping the changed lock is safe.

## Three-way comparison

| | Frozen baseline | No-new-override control | Prior corrected recipe |
| --- | --- | --- | --- |
| Source manifest | Exact 49, PostCSS override only | Identical to frozen baseline | Adds four scoped minimatch overrides |
| fast-deep-equal flags | devOptional: true; dev absent | dev: true; devOptional absent | dev: true; devOptional absent |
| Lock entries incl. root | 521 | 521 | 527 |
| Non-dev entries, excluding root | 171 | 170 | 170 |
| Changed entries vs frozen lock | 0 | 1 | 16 |
| SHA-256 of lock | `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12` | `9c3df8166100f36dc9aa9ed50f5a7fe7a1497dc12b2fc1d999e10f610f764a3a` | `3fab9681b69c0d52170f81ce4c9240029a21f6453932e179974c41b19320692c` |

The non-dev comparison uses the same predicate as the earlier preservation gate: exclude the root and include entries without a truthy `dev` flag. **Baseline to control:** one classification change, no additions, removals, version, peer, engine, integrity or top-level changes. **Control to corrected:** 15 other development-tooling paths differ, and the non-dev projections are equal. **Baseline to corrected:** the original non-dev comparison still fails. The control is explanatory evidence, not a replacement baseline.

In all three locks the entry has version `3.1.3`, license `MIT`, URL `https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz`, and integrity `sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==`. The raw unified diff is in `baseline-control.diff`; `complete-diffs.json` contains every old/new entry for each of the three pairs.

## Dependency ancestry

Static nearest-installed-path resolution of **lock declarations**, not modules actually loaded, found the same incoming edges in all three cases:

| Direct declaring package | Requested range | Lock classification |
| --- | --- | --- |
| ESLint 9.32.0 | ^3.1.3 | dev |
| AJV 6.15.0 nested under ESLint | ^3.1.1 | dev |
| AJV 6.15.0 nested under @eslint/eslintrc | ^3.1.1 | dev |

Four root dev declarations reach this entry through dependency/peer paths: ESLint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, and typescript-eslint. No path from a root production dependency was found by this lock traversal (including resolvable optional and peer edges). `fast-deep-equal-ancestry.json` records the actual edges and shortest paths per root. Absence of such a static path does **not** prove what an omit-dev installation, bundler or application would do.

## Execution and preservation

- One npm resolver child, exit **0**, **498 ms**, no timeout, signal or retry. Same Node v24.22.1 (`8a7dd4c5cb35e6171dfbea7303650bc311f46971b06dd7e1c62e3f291cfd746c`) and npm 11.12.1 CLI entry (`8e5f6f3429f8cdbe693cdc29904e9d5a7b127a494bd15c804bd54c7403bfcbe7`); both hashes checked before invocation.
- Read the prior full report and argv receipt first. Used its exact args: `install --package-lock-only --ignore-scripts --no-audit --no-fund --strict-peer-deps`, 512 MiB old space and 30-second timeout. Only the scratch cwd/HOME/TMPDIR/cache/npmrc paths changed; public registry, config bytes and env allowlist matched. No private config or credentials were loaded by the harness.
- Both input files came directly from Git objects at `49eacadc9d2b23639059fc07d2b53a1d133a746c`. The package SHA remained `ef3364ff99e702264d9c1f0dcea70219e5dd1dd4cc2b6b3a76e40d1e52cd5da2`. No accepted installed application was read or invoked. The scratch workspace started with only the package and lock; no node_modules appeared.
- Pre/post checks matched frozen web source tree, owner ref `40b4a5fa4ace3b8bc69d62faa85c73e9fc70e17e`, worktree status, old owner archive/index, 415 original partial files and their modes, 957 first-attempt indexed artifacts, and 967 corrected-attempt indexed artifacts. No cleanup, source/ref edit, or changed original lock.
- `preflight.json`, `invocation.json`, `result.json`, `postflight.json`, raw stdout/stderr/debug logs and `comparison.json` support the result. The sealed relative-path index records evidence hashes without importing host environment values or credentials.

**Decision boundary:** keep the frozen candidate and original production-lock gate intact. No hand-edited flags, corrected-candidate install, CJS/ESM test, audit, lint, build, browser, DB, Simulator, hosted service or release action occurred. Runtime compatibility is still **not tested**. No fresh audit result or remediation acceptance follows from this control.
