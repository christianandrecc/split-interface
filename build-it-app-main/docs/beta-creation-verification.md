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

## Evidence

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
  Both sizes pass, no horizontal overflow, page exceptions or framework overlay.
  No external requests attempted. Screenshots inspected under
  `/tmp/split-web-gm03-{invalid,review,exit}-{1280,320}.png`.

Independent review/hosted QA remain required. The unchanged GM-02 dependency gate
still fails on the five braces-related audit entries; this is not a release approval.
