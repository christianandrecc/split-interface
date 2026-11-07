# Web beta candidate review record

October 10, 2026. Founder selected **local testing only**. All product candidates below remain unmerged. No beta release is approved by local checks or developer delivery.

## GM-03 creation safeguards: corrections required

Exact reviewed candidate: `a5add19dccb5b78ae3cdcc9ec10634da2b352624`; parent `c8a06edf2359e2952b73dc9bfbc71a31219c0cd6`. Independent QA used a detached disposable checkout and synthetic browser fixtures, with an empty environment and network denial. Developer checkout was unchanged.

**Acceptance: FAIL pending two bounded P2 corrections.**

| Finding | Reproduction | Required behavior |
| --- | --- | --- |
| QA-GM03-1: editing text lost | Enter `33.333` in Collaborators, footer Back to Sample, return to Collaborators; the field becomes blank. StepParties component-local raw text is lost when the stage unmounts, while the parent percent is NaN. | Preserve invalid-but-editable text across internal navigation; continue blocking Review/save/send until valid. Never round or clamp ownership into validity. |
| QA-GM03-2: focus lost | Focus Home, open discard confirmation, choose Keep editing; active element becomes BODY. | Restore focus to the invoking Back/Home/Cancel control after cancellation or Escape. Successful exit may navigate normally. |

Candidate targeted suite: **81/81 tests across nine files**, TypeScript passes. Independent adversarial cases: **21/23 pass**, with both failures matching the findings. CUA Chrome reproduces both findings; inspected 1280px/320px layouts have no horizontal overflow or captured runtime errors. Strict percentages, zero-share cases, normal valid Back navigation, guarded exits and full fixture document/party retry identity pass locally.

Native reload warning remains **inconclusive**: fixture beforeunload event checks pass, but browser reload completed without an observable warning. Real persistence, server-committed lost-response recovery and hosted multi-account journeys are not certified.

Detailed session artifacts: `/tmp/split-web-beta-qa/QA_REPORT_a5add19.md`, `verification_a5add19.json`, independent test source/results and screenshots. These temporary artifacts are not durable release sign-off. The bounded corrections were delivered to **Web Development Agent (SPLIT)** through the supported chat tool, with a distinct commit and independent retest required.

## GM-05 original signing evidence: corrections required

Exact candidate: `06317a59ac8a600268db3da0fb7676484397f081`, branch `codex/web-beta-signing-evidence`, stacked on GM-03/02. Changes gate missing signing names through profile completion, distinguish original confirmed/incomplete/local record evidence in detail and PDF, and describe actual any-order signing. Historical records are preserved.

Developer reported **812 web tests** and **166 disposable database checks** passing. Independent original-candidate review subsequently **failed**: 88/88 focused candidate tests/typecheck pass, but 19/22 adversarial checks pass with three failures representing two P2 findings. Detail labels select the first conflicting approval instead of a neutral ambiguity state; a control-only supplied signing name sanitizes to empty in PDF while still certifying. The actual PDF contradiction was reproduced locally. No Auth bypass is asserted. Report: `/tmp/split-web-beta-qa/QA_REPORT_06317a5.md`.

Review criteria: absent profile, wrong/missing signer IDs or names, unsupported methods, local/legacy final status, ambiguous/duplicate/stale evidence, valid current bound signatures, detail/PDF counts and labels, profile navigation and historical immutability. This consistency review does not establish real-world identity or legal enforceability. Versioned consent and legacy name provenance remain separate review gaps.

## Delivered corrections and bounded local acceptance

- Creation correction `2fd0c24f6bc7658606b89823fabef70c9cd754e0` preserves invalid share strings at builder lifetime and restores discard-cancel/Escape focus to each opener.
- Signing correction `c57f8b200046f2074c38e3c8cd4f82395478e49b` neutralizes ambiguous approvals and rejects render-empty signing-name evidence, retaining original historical data.
- Developer reports 844 full web tests/typecheck/lint/build, creation 23/23 and signing 22/22 QA-case reruns, 166 disposable DB checks and desktop/mobile/PDF checks passing. These remain attributed developer results.
- Independent combined retest at detached exact `c57f8b2` **passes bounded local correction acceptance**: 68/68 independent cases (45 unchanged original bodies +23 new),151/151 focused candidate checks and typecheck. Desktop/mobile strict editing/focus, neutral approvals and actual control/invisible/Unicode PDF cases pass; historical data preserved. Creation executed at the descendant, without a separate `2fd0c24` run. Actual native browser reload cancel/confirm remains inconclusive/open, so GM-03 is not complete. Hosted signing/consent/integration gates remain open. Report: `/tmp/split-web-beta-qa/QA_REPORT_c57f8b2.md`, `verification_c57f8b2.json`. Corrections do not erase the original failures above.
- GM-02 current compatible dependency-remediation/options investigation was delivered to the web chat. The 2:20 PM heartbeat found that turn ended without its requested deliverable and without a new human scope change. A corrective bounded handoff was delivered; compact status confirms active disposable Tailwind 3 patch and Tailwind 4 manifest comparison probes. These probes do not authorize an app dependency migration, force major upgrade, fork, audit suppression or threshold reduction. Gate remains open.

## GM-02: concrete options delivered for review

Docs-only candidate `355203b71b70542ec99e81333a521be5112743fe`, branch `codex/web-beta-dependency-options`, retains app dependencies and correction refs. Committed report: `build-it-app-main/docs/beta-dependency-options-2026-10-10.md`. Developer disposable Tailwind 3.4.19/fast-glob patch probe passes 844 tests/build and byte-identical production CSS, but still five high production audit entries. Published replacements have concrete watcher/glob API incompatibilities. No maintained drop-in fix was found; upstream [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) still lists no patched version (GM checked October 10).

Proposed complete Tailwind 4.3.3 / `@tailwindcss/postcss` 4.3.3 / `tailwind-merge` 3.7.0 / `typescript-eslint` 8.71.1 manifest removes old development tagger/autoprefixer, resolves without braces and reports zero production/full audit findings. This is **manifest-only resolution**, not compiler/build/styling/lint/UI acceptance. Estimated 4–7 engineering/QA days; full preserved behavior/visual/installed-tree audit and independent candidate review required. Official [upgrade guide](https://tailwindcss.com/docs/upgrade-guide) sets Safari 16.4+/Chrome 111+/Firefox 128+; browser floor and development tagging removal require founder authorization. React/Vite and existing PostCSS architecture remain.

Independent exact-`355203b` options review assigned to `/root/web_audit`, checking official upstream facts, locks/probe provenance, package/API/browser tradeoffs and acceptance plan without changing app/browser/developer checkout. Expected `/tmp/split-web-beta-qa/QA_REPORT_355203b.md`, `verification_355203b.json`. Local migration approval was initially pending, then explicitly granted below; fork/gate exception excluded. Retaining Tailwind 3 leaves the gate blocked pending unknown upstream timing.

Final review received: **PASS_OPTIONS_REVIEW_WITH_ACCEPTANCE_ADDITIONS**. Fresh independent production/full lock-based audits at 19:23 UTC both exit 0/zero findings; exact six manifest changes, 212 lock changes and unchanged lock hash verified. App installation/compiler/migration was not executed. Added explicit existing CSS-variable shorthand migration and clean Node 24 native Oxide/LightningCSS compiler/HMR/build on macOS/available production-like Linux, plus minimum browser-version evidence or documented gaps. Reports above inspected by GM. [Concrete founder decision packet](WEB_DEPENDENCY_DECISION_2026-10-10.md) preserves these requirements; local migration approval subsequently explicitly granted below; installed-app gate remains open.

At 3:20 PM, actual GM-03 reload protection verification handoff was delivered to the idle web owner; compact snapshot confirms active local work at corrected `c57f8b2`. The task must distinguish trusted activated browser reload/cancel/confirm from dispatched test events, and document a precise manual procedure if dialog observation is unavailable. No unproven product defect or pass is inferred from prior automation limits.

## Next sequence and remaining gates

1. Implement the founder-approved GM-02 local migration with both independent QA additions. Partial remediation leaves five high entries; no audit threshold or rule was changed.
2. Resolve GM-03 actual browser reload-warning cancel/confirm evidence. Editing/focus correction acceptance already passed locally at `c57f8b2`.
3. Expand local full-lifecycle checks: create, invite, counter, approve, sign, retrieve/export; permission denials, stale/duplicate requests, retry/session fixtures and responsive/accessibility behavior. GM-05 corrected evidence acceptance already passed locally; consent/provenance and hosted limits remain.
4. Review delivered synthetic recovery and legal/support/closure preparation. Hosted Auth, actual inbox/receipt/alerts, current backup/restore and operating approval remain future beta gates.

SPLIT is the selected organization for a future isolated environment. Founder deferred its creation; no cost confirmation, target provisioning, hosted writes or mail are authorized by this record. No production merge/deployment, external contact or legal publication occurred.

Founder subsequently explicitly approved the reviewed local migration/browser floor/tagger removal. Supported handoff delivered, web owner acknowledged it will save current reload outcome first, then start a separate migration branch. QA-GM02-1/2 are included; no app migration acceptance, gate waiver or release approval. A bounded web orphan-Signed-evidence source analogy from native QA is assigned for independent verification; no new web defect is asserted yet.

## GM-05A: new current orphan-signature ambiguity

The bounded follow-up subsequently reproduced the web behavior at exact `c57f8b2`: two legitimate required signatures plus an unresolved extra **current-proposal Signed** object leaves actual helper/PDF model signed/verified/count 2, detail 2/2 All signed without an incomplete warning and PDF complete verification labels. Three fail-closed assertions fail; five controls pass for valid baseline, canonical party alias, historical orphan, current Pending extra and local noncertification. All original JSON remains exact. This is a current-evidence ambiguity gap, not fabricated required signatures or demonstrated hosted authorization bypass.

Earlier independent acceptance explicitly permitted extraneous outsider signatures and did not certify this stronger ambiguity invariant; its historical result remains valid for its stated scope. Current canonical actor/party/proposal rules require unresolved Signed evidence to be surfaced neutrally before complete certification, consistently with native hardening. Preserve legitimate required-party counts, original records/raw final status, valid aliases and historical extras.

Separate bounded GM-05A correction handoff delivered after reload verification and before the founder-approved styling migration; latest supported snapshot confirms owner acknowledgement and active implementation. No new schema/legal/consent policy. Independent exact-candidate retest required. Final report and verification received/inspected: `/tmp/split-web-beta-qa/QA_REPORT_SIGNING_ORPHAN_c57f8b2.md`, `/tmp/split-web-beta-qa/verification_SIGNING_ORPHAN_c57f8b2.json`. Actual emitted PDF bytes independently extracted; no manual visual inspection claimed by this follow-up. No developer source/browser interruption during independent reproduction.

## GM-03: developer native Chrome reload evidence received

Docs-only note `3d39da7`, based on unchanged c57 product source, records developer desktop Chrome 154 native toolbar Reload/Cancel/Reload and real App→draft Edit flow with trusted input. Successful matrix preserves dirty raw 33.333/33.333/33.334 title/stage/IDs on Cancel, discards only unsaved edits on confirmed Reload, and gives no prompt for pristine/saved controls while preserving saved identity. Supplied ledger hash and screenshots are retained in `/tmp/split-web-gm03-native-reload-20261010`; earlier failed/inconclusive attempts are separately preserved. The earlier missing dialog is not retrospectively called a product defect or a pass.

Independent final readback received/inspected: **PASS_SUPPLIED_CHROME_RELOAD_EVIDENCE_ONLY** at docs SHA `3d39da7c4754dd5ad0a541d4c746e485acbeba28`. All **29 artifact consistency checks** pass, exact ledger SHA matches committed note and visually examined native screenshots support four claimed outcomes. These are independent readback checks, not newly executed product tests; no browser launch or broad suite repeat. Report: `/tmp/split-web-beta-qa/QA_REPORT_RELOAD_3d39da7.md`, verification: `/tmp/split-web-beta-qa/verification_RELOAD_3d39da7.json`. Acceptance delivered to web owner; no immediate reload repetition requested.

The controller serves the moving developer checkout with a constant reported source SHA, without a runtime source-tree/bundle digest. Storage proof covers its recorded projection, not complete raw JSON/history. Original Vite config invokes loadEnv before wrapper overrides; named env files are currently absent but historical preflight is not recorded. Network controls cover page requests, with background Chrome GCM/updater messages outside them. Subsequent browser acceptance must pin immutable source/digest and guarantee no live env read before configuration isolation; handoff delivered. Earlier inconclusive runs and Safari/Firefox/mobile/minimum-browser/hosted/recovery/consent/integration gates remain open. Separate orphan-evidence correction is active; approved migration follows it.
