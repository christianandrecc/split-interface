# GM-03 creation verification - October 10, 2026

Stacked on GM-02 `c8a06ed`; no schema, RPC, deployed settings or historical records changed.

- Creation and counters share integer-hundredth parsing. Blank, non-finite,
  negative, over-100 and greater-than-two-decimal inputs are rejected, not rounded
  or clamped. Valid shares must sum to exactly 10,000 hundredths.
- Creation, review shortcuts and persistence validation all gate invalid shares.
  Zero shares are allowed under the existing server contract; blank is not zero.
- Back/Home/Cancel confirm dirty exits. Step navigation does not abandon the form.
  Reload/tab close uses the native beforeunload warning while dirty or saving.
  Browsers may suppress that warning without prior user interaction; no promise
  of crash recovery or partial-draft persistence is added.
- Existing stable document identity survives failed saving and editing. Successful
  save/send removes the warning; device-only drafts keep their existing explicit
  local-save message. Complete draft persistence is unchanged.

## Original candidate evidence (`a5add19`)

- Focused behavior checks: 63 tests across seven files passed, including invalid
  33.333/33.333/33.334 vs valid 33.33/33.33/33.34, blank editing, exact totals,
  three-way equal shares, cancel/confirm destination, dirty reload, clean/reverted
  exits, resumed draft retry ID and successful-save warning cleanup.
- `npm run verify:beta`: 788 tests / 77 files passed; typecheck, lint (seven
  pre-existing warnings), and build passed.
- `npm run verify:database`: 166 disposable PGlite checks / 30 migrations passed;
  two hosted scheduler/transport migrations intentionally skipped. Not live QA.
- Browser plugin unavailable. Bundled Playwright with installed Chrome, isolated
  contexts at 1280x900 and 320x900; no backend configuration, all external requests
  blocked. Actual app flow: local synthetic profile -> New SPLIT -> collaborators
  -> invalid share -> correct share -> review -> exit/cancel -> reload/dismiss.
  Reload evidence here is automated headless Chrome, not independent native UI
  acceptance; the independent headed/CUA check was inconclusive.
  Both sizes pass, no horizontal overflow, page exceptions or framework overlay.
  No external requests attempted. Screenshots inspected under
  `/tmp/split-web-gm03-{invalid,review,exit}-{1280,320}.png`.

Independent review/hosted QA remain required. The unchanged GM-02 dependency gate
still fails on the five braces-related audit entries; this is not a release approval.

## Bounded correction candidate

Independent review rejected `a5add19` on QA-GM03-1 and QA-GM03-2. This follow-up
is a distinct commit after unchanged GM-05 `06317a5`, not an amendment or acceptance
of that signing candidate.

- QA-GM03-1: the builder now owns raw percentage edits so leaving Collaborators
  for Sample or Work and returning does not erase invalid-but-editable text.
  Numeric state still rejects invalid shares; Review, save and send retain their
  exact hundredth validation. Switching to equal splits clears the old drafts.
  No local persistence, server schema or draft recovery behavior was added.
- QA-GM03-2: the discard dialog records its actual Back/Home/Cancel opener.
  Keep editing and Escape restore that control's focus. Confirmed exit clears
  the reference and leaves destination focus alone.
- Twelve regressions cover blank/over-precision/negative/over-100 shares through
  real component unmounts, correction to valid shares, equal/removal resets,
  all three openers with both dismissal methods, and confirmed navigation focus.
  Before the fix, nine new assertions reproduced both reported failures; the
  focused safety suite now passes all 18 cases.
- Developer rerun of QA's unchanged external test file: 23/23 passed, with its
  fetch/WebSocket deny shim. Dependencies were resolved from this candidate to
  avoid mixing two React copies. This rerun does not replace independent review.
- `npm run verify:beta`: 824 tests / 79 files passed, with typecheck, lint and
  production build passing. The seven existing Fast Refresh warnings and existing
  bundle-size warning remain; no warning thresholds were changed.
- Disposable database verification: 166 checks / 30 migrations passed; no hosted
  settings, data, email, or schema changes. Audit still exits 1 with five high
  braces-chain entries; no gate changes or suppressions.
- Browser plugin unavailable; isolated Playwright/installed Chrome on
  `http://127.0.0.1:8186`, 1280x900 and 320x900, synthetic local draft only.
  Invalid three-way shares remain exact after Sample and Work round trips,
  Review stays blocked, and corrected shares enable Review. Keyboard cancellation
  restores Back/Home/Cancel at desktop and the visible Back/Cancel at mobile.
  Page identity, nonblank content, overflow, overlay, console and external-request
  checks passed. Screenshots inspected at
  `/tmp/split-web-gm03-corrections-{shares,focus}-{1280,320}.png`.
- Automated headless Chrome observed `beforeunload` on both dismiss and accept:
  dismiss retained the same document marker and unsaved title; accept loaded a
  fresh document. Independent native reload cancel/confirm remains inconclusive
  and open. No event fixture or headless result is represented as that acceptance.

The candidate remains subject to independent QA and the unchanged release gates.
