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

## Delivered corrections and active retest

- Creation correction `2fd0c24f6bc7658606b89823fabef70c9cd754e0` preserves invalid share strings at builder lifetime and restores discard-cancel/Escape focus to each opener.
- Signing correction `c57f8b200046f2074c38e3c8cd4f82395478e49b` neutralizes ambiguous approvals and rejects render-empty signing-name evidence, retaining original historical data.
- Developer reports 844 full web tests/typecheck/lint/build, creation 23/23 and signing 22/22 QA-case reruns, 166 disposable DB checks and desktop/mobile/PDF checks passing. These remain attributed developer results.
- Independent combined retest at detached exact `c57f8b2` **passes bounded local correction acceptance**: 68/68 independent cases (45 unchanged original bodies +23 new),151/151 focused candidate checks and typecheck. Desktop/mobile strict editing/focus, neutral approvals and actual control/invisible/Unicode PDF cases pass; historical data preserved. Creation executed at the descendant, without a separate `2fd0c24` run. Actual native browser reload cancel/confirm remains inconclusive/open, so GM-03 is not complete. Hosted signing/consent/integration gates remain open. Report: `/tmp/split-web-beta-qa/QA_REPORT_c57f8b2.md`, `verification_c57f8b2.json`. Corrections do not erase the original failures above.
- GM-02 current compatible dependency-remediation/options investigation was delivered to the web chat and is active. No force Tailwind major, unreviewed fork, audit suppression or threshold reduction is approved.

## Next sequence and remaining gates

1. Complete independent GM-03 correction acceptance at the exact candidate.
2. Complete GM-05 correction acceptance, preserving consent/provenance and hosted limits.
3. Expand local full-lifecycle checks: create, invite, counter, approve, sign, retrieve/export; permission denials, stale/duplicate requests, retry/session fixtures and responsive/accessibility behavior.
4. Resolve GM-02's remaining dependency gate. Partial remediation leaves five high entries in the braces dependency chain; no audit threshold or rule was changed.
5. Review delivered synthetic recovery and legal/support/closure preparation. Hosted Auth, actual inbox/receipt/alerts, current backup/restore and operating approval remain future beta gates.

SPLIT is the selected organization for a future isolated environment. Founder deferred its creation; no cost confirmation, target provisioning, hosted writes or mail are authorized by this record. No production merge/deployment, external contact or legal publication occurred.
