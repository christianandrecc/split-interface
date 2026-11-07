# Web scoped-override resolution evidence readback — November 6, 2026

GM read the complete owner report and verified all 957 indexed artifact hashes. This was a failed disposable manifest recipe (EOVERRIDE), not an installed minimatch compatibility failure or a regression in accepted 49. No candidate install, CJS/ESM/lint test or fresh audit occurred. Original lock stayed unchanged. A separate exact-selector/direct-dependency-reference repair remains an untested experiment, not app implementation authority.

Report SHA-256 `7d9da0530850bccd11f3c4c3592b43a081e3a57361563bdd344e2fe104e19db8`; index SHA-256 `7878055906b638e5835678d3933e28ec97af60eb8d8655121c58ecc107b8da8e`. Durable evidence root `/Users/christiancarrera/.codex/artifacts/split-web-minimatch-compat-20261106-01`. Historical owner/exclusion/preservation claims remain separately attributed.

---

# SPLIT tooling compatibility experiment | 2026-11-06

**Disposition: requested override manifest failed resolution. Minimatch 11 runtime compatibility is undetermined.** This is an observed failure of the specified four-selector recipe, not an observed CJS or ESM failure of minimatch.

## What Happened

One strict npm 11.12.1 package-lock-only resolution ran on macOS with Node 24.22.1. It exited 1 in 343 ms, with no timeout or resource-limit event:

> EOVERRIDE: Override for eslint@^9.32.0 conflicts with direct dependency

The scratch manifest kept every direct dependency, script, config, and the existing PostCSS override. The only additions requested minimatch 11.0.4 under these four parent selectors: `eslint@9.32.0`, `@eslint/config-array@0.21.0`, `@eslint/eslintrc@3.3.1`, and `@typescript-eslint/typescript-estree@8.71.1`. No global minimatch override was used.

**Why the resolver refused:** the app declares ESLint as `^9.32.0`, although its lock selects exactly 9.32.0. In this installed Arborist version, a nested override without a `.` value uses the parent selector's spec as its own override value. At the root, npm rejects a replacement for a direct dependency when the spec differs from its declared spec. Here `9.32.0` differs from `^9.32.0`. The npm debug stack places the rejection in the root-override check during virtual-tree loading. The observed error is not a peer, disk, access, network, or matcher error.

| Stage | Result |
| --- | --- |
| Source/install identity | 401 exact frozen source files and 28,052 installed baseline file/link records verified. Original manifest/lock matched exact 49. |
| One strict resolution | Failed with EOVERRIDE; stdout empty, stderr and npm debug log retained. No successful alternative or second attempt. |
| Lock / production diff | Scratch lock remained byte-for-byte identical to frozen lock: **zero changed lock entries, including production entries**. This is an unchanged input lock, not a resolved candidate tree. |
| Install / runtime | No candidate install, tarball execution, CJS/ESM probe, filename exercise, lint-config load, rule comparison, or broad QA. No paired controls or parity claim. |
| Platform / audit | npm ran on macOS arm64. Neither synthetic path-spelling behavior nor actual Linux/Windows behavior was tested. No fresh production or full audit. The retained exact-49 results remain production-only 0 and full 12 moderate. |

## Smallest Next Option

For a **separate disposable resolution attempt**, keep the exact ESLint selector but explicitly set its parent value to the existing direct dependency reference:

```json
"eslint@9.32.0": { ".": "$eslint", "minimatch": "11.0.4" }
```

Leave the other three selectors and the app declaration untouched. This syntax is a hypothesis based on the installed Arborist implementation, **not a tested fix**. Require the lock still select ESLint 9.32.0, all four intended parent paths resolve as expected, and no production or unrelated package changes occur. Only then install in scratch and try the public CJS/ESM entries against actual baseline controls. The retained config-array ESM source imports a default minimatch export; that remains a concrete risk to test, not a runtime result from this run. No shim, config change, deployment, or behavior change is selected here.

## Reproducibility

- Frozen executable: `49eacadc9d2b23639059fc07d2b53a1d133a746c`; frozen owner evidence: `40b4a5fa4ace3b8bc69d62faa85c73e9fc70e17e`.
- Baseline manifest SHA-256: `ef3364ff99e702264d9c1f0dcea70219e5dd1dd4cc2b6b3a76e40d1e52cd5da2`. Scratch manifest: `4525b33aaeba79d62d8d8d2df1872ca89d15d3b29d50536266ae86d467148510`.
- Both lock SHA-256: `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12`. Both still describe baseline minimatch 3.1.5 and nested 10.2.6.
- Target minimatch 11.0.4 published integrity from retained registry metadata: `sha512-/UJ1dEoVQTjPNDh6SGlUo+ueLMmoHTas4q+8yaAR/5t6nLAIiBDJtoYUh20IYleix7ehiQkgczb84PE3uzHkxg==`. No installed 11.0.4 integrity or runtime result is claimed.
- The Node executable still identifies as v24.22.1 but its hash differs from November 3. Current SHA-256: `8a7dd4c5cb35e6171dfbea7303650bc311f46971b06dd7e1c62e3f291cfd746c`. See `continuation-provenance.json` for both hashes. The November 3 partial had no resolution or runtime result.
- `logs/manifest-resolution-argv.json` records exact argv, public registry configuration, isolated HOME/cache, 512 MiB old-space limit, and 30-second kill timeout. `logs/manifest-resolution-result.json`, stdout/stderr, and `npm-cache/_logs/` preserve the failure. `results/resolution-verdict.json` records installed resolver-source hashes and observed outcomes.
- `evidence-index.json` hashes every output file except the index and its checksum. `prior-partial-inventory.json` and `postflight.json` support preservation checks. The prior 415-file partial directory was rechecked, not repaired. No source, installed baseline package, old evidence, branch, gate, or Simulator change.
