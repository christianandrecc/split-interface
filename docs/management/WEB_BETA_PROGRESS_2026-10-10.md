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

## GM-05 signing evidence: independent review active

Exact candidate: `06317a59ac8a600268db3da0fb7676484397f081`, branch `codex/web-beta-signing-evidence`, stacked on GM-03/02. Changes gate missing signing names through profile completion, distinguish original confirmed/incomplete/local record evidence in detail and PDF, and describe actual any-order signing. Historical records are preserved.

Developer reports: **812 web tests**, typecheck/lint/build pass; **166 disposable database checks** pass; synthetic desktop/mobile and PDF visual checks pass. These are developer results. Independent QA was assigned through `followup_task` and acknowledged an isolated exact-SHA review; acceptance is pending.

Review criteria: absent profile, wrong/missing signer IDs or names, unsupported methods, local/legacy final status, ambiguous/duplicate/stale evidence, valid current bound signatures, detail/PDF counts and labels, profile navigation and historical immutability. This consistency review does not establish real-world identity or legal enforceability. Versioned consent and legacy name provenance remain separate review gaps.

## Next sequence and remaining gates

1. Commit the two GM-03 corrections and independently retest the exact correction SHA.
2. Complete independent GM-05 review and correct any acceptance findings.
3. Expand local full-lifecycle checks: create, invite, counter, approve, sign, retrieve/export; permission denials, stale/duplicate requests, retry/session fixtures and responsive/accessibility behavior.
4. Resolve GM-02's remaining dependency gate. Partial remediation leaves five high entries in the braces dependency chain; no audit threshold or rule was changed.
5. Review delivered synthetic recovery and legal/support/closure preparation. Hosted Auth, actual inbox/receipt/alerts, current backup/restore and operating approval remain future beta gates.

SPLIT is the selected organization for a future isolated environment. Founder deferred its creation; no cost confirmation, target provisioning, hosted writes or mail are authorized by this record. No production merge/deployment, external contact or legal publication occurred.
