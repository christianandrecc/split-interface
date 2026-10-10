# GM-02 dependency review - October 10, 2026

Baseline: `4bf5a2a`. No production deployment or configuration changes.

## Implemented

- Lock-compatible `source-map-js` 1.2.1 -> 1.2.2 patch.
- Pinned `postcss-selector-parser` 7.1.6 override for the existing Tailwind 3 /
  postcss-nested / typography consumers. This crosses the parser's major version,
  not Tailwind's. Keep it pinned and review removal when consumers update.
- No audit threshold, dependency classification, Tailwind configuration or API changes.

## Evidence

- `npm run verify:beta`: passed, 764 tests / 75 files, typecheck, lint (seven
  existing Fast Refresh warnings), production build. Includes PDF behavior tests.
- Baseline and patched full production CSS SHA-256 are identical:
  `226b150f6580c085dd2f9e99d11a5b4e436a4e02e30d73dce475ab1c826d10f1`.
  Generated JS filenames and asset sizes also remain identical at this commit.
- `npm ls postcss-selector-parser source-map-js braces --all`: parser 7.1.6
  throughout; source-map 1.2.2; braces remains 3.0.3.
- Fresh `npm audit --omit=dev --audit-level=moderate`: exit 1, five high entries
  remaining (down from six high / two moderate). They represent one root advisory
  propagated through braces, chokidar, micromatch, fast-glob and Tailwind.

## Exposure and remaining decision

These packages process repository-controlled selectors, source maps and glob
patterns in the build/development toolchain. The app, API and server sources do
not import these packages. Tailwind content globs are fixed in `tailwind.config.ts`.
No public app-input route to these parsers was identified; this is source evidence,
not a proof of universal non-exploitability. Untrusted build inputs still matter.
The production dependency audit includes the Tailwind peer of tailwindcss-animate;
moving package categories would not repair the build chain and is not this fix.

The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no
patched version; `npm view braces version` still returns 3.0.3. npm proposes a
Tailwind 4 major upgrade. Therefore GM-02 is **partially remediated, not complete**
and the configured release gate still blocks.

Review options: wait for a compatible upstream patch; separately review a maintained,
security-reviewed patched package and its provenance; or explicitly authorize a
Tailwind migration with visual regression testing. Do not force the migration,
vendor an unreviewed security fork, suppress the advisory or lower the threshold.

Other fixed advisories: [selector parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf),
[source maps](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
