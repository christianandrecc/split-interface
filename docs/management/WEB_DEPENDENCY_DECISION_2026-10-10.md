# Web dependency decision for founder review

October 10, 2026. Proposal source: docs-only `355203b71b70542ec99e81333a521be5112743fe`, based on corrected web `c57f8b2`. Founder subsequently explicitly approved local implementation of the reviewed proposal; no app migration or release has been accepted. This record stays in the GM worktree when the web owner changes branches.

## Proposed decision

Authorize a bounded **local Tailwind 4 migration**, preserving React/Vite, the existing PostCSS integration, application design, APIs/PDFs and the configured audit gate. Estimate: **4–7 engineering/QA days**, not a committed delivery date. Approve the web browser floor **Safari 16.4+, Chrome 111+, Firefox 128+**, and removal of the existing development component-tagging plugin (`lovable-tagger`). Older browsers would be outside the supported floor. The tagging removal affects the development workflow and must be explicit.

Alternative: retain Tailwind 3 and keep the dependency release gate blocked until a compatible upstream fix exists. Its timing is unknown. No audit waiver, dependency-category shuffle, parser fork or force upgrade is proposed.

## Why this decision is needed

Current conservative remediation leaves five high production audit package entries from one braces advisory. The tested Tailwind 3 patch passes developer 844 tests and produces identical production CSS, but does not clear the audit. Replacement glob/watcher packages lack required APIs; blind overrides would break build/watch behavior. The current [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. Current ordinary tagger upgrades also retain Tailwind 3.

The complete proposed manifest removes braces and independently passes fresh production **and full** audits with zero findings. The reviewed lock hash is `70f0a4d2a78d5c1ef4c973b8e56449ee087c6ba2f71be7f3493d4a6a27bc7c7e`. This proves dependency resolution/audit only; it does not prove the migrated app builds, looks correct or runs on supported browsers.

## Exact initial dependency scope

| Declaration | Existing | Proposed |
| --- | --- | --- |
| tailwindcss | ^3.4.17 | 4.3.3 |
| @tailwindcss/postcss | absent | 4.3.3 |
| tailwind-merge | ^2.6.0 | 3.7.0 |
| typescript-eslint | ^8.38.0 | 8.71.1 |
| lovable-tagger | ^1.1.13 | remove |
| autoprefixer | ^10.4.21 | remove |

Preserve other direct declarations and the existing selector-parser override. The verified plan changes 212 lock entries, including 40 additions, 122 removals and 23 version changes; remaining changes are metadata/root declarations. Linter update removes its remaining braces chain. Remove the tagger import/plugin from Vite config. Use `@tailwindcss/postcss`, the Tailwind CSS import and explicit theme/source migration, without switching build architecture.

## Acceptance and rollback

- Preserve all existing colors, tokens, dark mode, container spacing, animations, fonts, focus outlines, ownership bars, dialogs and responsive behavior. Review renamed utility meanings and migrate existing v3 CSS-variable shorthand in sidebar/chart components explicitly.
- Run Node 24 `npm ci`, unchanged `verify:beta`, production/full audits and installed-tree review. Verify actual Oxide/LightningCSS native installation/build on macOS and an available production-like Linux runner; a manifest-only audit does not exercise native binaries.
- Compare baseline/candidate CSS/computed styles and desktop/mobile 320/390/430 screens for account flows, dashboard, creation, negotiation/signing, final agreement/PDF, profile/settings and notifications. Check keyboard, reduced motion, touch hover, light/dark and supported Safari/WebKit, Chrome and Firefox.
- Verify dev watch/HMR and production class generation, including repository paths with spaces/parentheses and Radix variants. Preserve signing/PDF/API behavior, run applicable disposable database checks and independently review the exact candidate.
- Keep the original `c57f8b2` refs and isolated branch for rollback. Do not integrate or release a failing migration; report missing browser/runner evidence as open.

Implementation and QA stay synthetic/local. No hosted auth/data/email, credentials/config activation, shared schema, new costs, main merge/deployment, TestFlight, legal publication or outreach. Approval of this work would not approve integration or release.

## Independent review and authority

Independent review received and inspected: **PASS_OPTIONS_REVIEW_WITH_ACCEPTANCE_ADDITIONS**. Exact docs-only source, six manifest changes/212 lock entries, unchanged proposed lock and fresh zero-finding production/full audits at 19:23 UTC confirmed. The two additions above cover CSS-variable shorthand and real native-binary installation/build; minimum browser-version evidence or explicitly recorded gaps is required. Reports: `/tmp/split-web-beta-qa/QA_REPORT_355203b.md` and `verification_355203b.json`. Audit success is not app acceptance.

Browser/API migration facts: official [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide). Current source/probe evidence and full options are preserved at exact 355203b and `/tmp/split-web-gm02-recheck-20261010`; session artifacts are temporary.

Founder approval is required by root [AGENTS.md](../../AGENTS.md): "consequential architecture/product changes need founder authorization." This migration changes the styling toolchain/browser floor and removes a development feature. Founder explicitly approved the local migration through GM user-input UI on October 10; implementation handoff delivered. Deployment/integration remains separately authorized.
