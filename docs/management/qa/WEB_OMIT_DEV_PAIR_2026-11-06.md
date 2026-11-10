# Production-only install pair — GM evidence readback

GM read the complete report and verified all 45,401 indexed artifact hashes/lengths, recorded permission modes and literal symlink targets. GM independently recomputed equality of the 21,810 indexed node_modules files/links per side, including generated lock metadata. Report SHA-256 7ed62efaea2c1302f763f311af3e483cb0c217c5a05f8029b011baeb3b396245; index 8d3a8426d19b181e1424b43f5ca98fe1faaa8b907acb8a98265116b23d26901b. Durable original packet: /Users/christiancarrera/.codex/artifacts/split-web-omit-dev-pair-20261106-01/.

Both same-resolver script-disabled macOS arm64 production-only installs contain 170 packages/21,809 regular files/one symlink; neither installs fast-deep-equal. This is installation evidence only. No runtime/security remediation, Linux/Windows/script-enabled/deployment or original-gate waiver is inferred. GM02B-E is a separate disposable qualification with an explicitly selected narrow metadata-normalization eligibility exception, conditional on the corrected candidate’s actual production-tree equality first; the accepted app/configured audit gate stay unchanged. Full original report follows byte-for-byte.

---

# GM02B-D | production-only install comparison

**November 6, 2026. The baseline and control locks materialized identical package trees on this macOS arm64 host with lifecycle scripts disabled.** Neither installed `fast-deep-equal`. No package, regular file, mode, symlink target, or npm-generated lock difference was observed under `node_modules`.

## What was compared

Two independent new workspaces began with only `package.json` and `package-lock.json`. The package was copied byte-for-byte from Git at `49eacadc9d2b23639059fc07d2b53a1d133a746c`; its only override in both runs was the original PostCSS override. The baseline lock came directly from the same Git commit. The control lock came from the sealed GM02B-C workspace, not the corrected minimatch experiment. Before execution, the entire parsed control lock was checked against a copy of the baseline with only the expected property removal/addition: `fast-deep-equal@3.1.3` changed from `devOptional:true` to `dev:true`. No additional lock field differed.

| | Accepted baseline | No-new-override control |
| --- | --- | --- |
| Input and unchanged post-install lock SHA-256 | `c427b3f098e3c8780b4514f01f2c3f8bb89788b889a48096f72a57acfc1d3c12` | `9c3df8166100f36dc9aa9ed50f5a7fe7a1497dc12b2fc1d999e10f610f764a3a` |
| Static non-dev lock entries (excluding root) | 171 | 170 |
| npm exit / elapsed | 0 / 2.111 s | 0 / 2.108 s |
| Installed packages | 170 | 170 |
| fast-deep-equal directory / generated entry | absent / absent | absent / absent |
| Directories / regular files / symlinks | 1,503 / 21,809 / 1 | 1,503 / 21,809 / 1 |
| Regular file bytes, including generated metadata | 157,414,460 | 157,414,460 |

Each install ran exactly once, sequentially, as `npm ci --omit=dev --ignore-scripts --no-audit --no-fund --strict-peer-deps`, with separate empty caches, HOME, TMPDIR, work directories and public-only config paths. No lock-only resolution, repair, retry, force, update or lifecycle script ran. Each child had a 512 MiB old-space limit and a 60-second hard timeout. The version-update notice in stderr was not acted on.

## Materialization evidence

- **Package inventory:** compared all physical package roots across top-level, scoped and nested node_modules directories, with actual manifest names/versions, package-manifest SHA-256, and the corresponding input/generated lock tarball integrities. No missing manifest or unmatched version/integrity was found. Integrity fields are npm's recorded tarball values, not a substitute for the separate hashes of actual extracted files.
- **Filesystem inventory:** compared every node_modules directory (including empty directories), regular file, and symlink by relative path, kind and permission bits. Regular files were also compared by byte count and SHA-256; symlinks by their literal targets. The one link was `.bin/loose-envify -> ../loose-envify/cli.js` in both trees. Timestamps, inode numbers, ACLs and extended attributes are not part of this comparison.
- **Generated metadata:** `node_modules/.package-lock.json` was included in the full filesystem comparison, copied to a separate receipt for each variant, and compared as parsed metadata too. Both files had 170 entries, no fast-deep-equal entry, and identical raw SHA-256 `8500899aa92819a714435a4750ecfbe163837f9027925167f9e35067a62e48b1`. The all-path diff, payload-only diff, package diff and generated-metadata diff are all empty.
- Both complete file inventories SHA-256: `429a21ccd4ffb16a879fb0fb909a2286ffb5a7abcfb7394e880396c91db46e8d`. Both package inventories SHA-256: `1aa38e37ffc4eb96a43a77343aabb7baa2d78acd5d6f4ae498c68bfc41e472a7`. See `comparison.json`, `materialized-tree-diff.json`, `materialized-package-diff.json` and `generated-metadata-diff.json`.

## Inputs and preservation

The package SHA-256 was `ef3364ff99e702264d9c1f0dcea70219e5dd1dd4cc2b6b3a76e40d1e52cd5da2` on both sides before and after. Node v24.22.1 SHA-256 `8a7dd4c5cb35e6171dfbea7303650bc311f46971b06dd7e1c62e3f291cfd746c` and npm 11.12.1 CLI entry SHA-256 `8e5f6f3429f8cdbe693cdc29904e9d5a7b127a494bd15c804bd54c7403bfcbe7` matched the GM02B-C receipt before either install. Baseline and control invocation records hash to `f51bb104c5f7b08cd7ac638ecbd6ae665e374424e940f41611cad78d58a94ee3` and `b67d503821c7c23b24645245696ebf21340eb9ea8c9c36098ac698a7dc4604ca`, respectively. Each includes the exact allowlisted environment/argv and limit. Raw logs, inputs, actual trees, per-run receipts/inventories and public settings are preserved in the two external workspaces.

The frozen source tree, web owner ref `40b4a5fa4ace3b8bc69d62faa85c73e9fc70e17e`, worktree status, owner archive/index, 415 partial files and their modes, 957 original selector-attempt indexed artifacts, 967 corrected-attempt artifacts and 551 lock-control artifacts were checked before and after. No accepted app install, old scratch directory or original lock was modified. The corrected/minimatch-override candidate was **not installed**.

**Limit:** this establishes what npm materialized for these two exact locks, binaries, flags, architecture and host. It does not establish Linux/Windows parity, behavior with install scripts enabled, application bundling, CJS/ESM or lint compatibility, production deployment behavior, security remediation, or a fresh audit. The original production-lock preservation requirement remains unchanged. No application module, lifecycle script, browser, Simulator, hosted service or release operation was run.
