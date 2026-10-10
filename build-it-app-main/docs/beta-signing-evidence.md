# GM-05: signing identity and truthful export evidence

Candidate prepared October 10, 2026. This is a local implementation and verification
record, not independent QA acceptance, hosted verification, legal approval, or a
release authorization. Stacked on GM-03 `a5add19` and GM-02 `c8a06ed`.

## Changes

- Missing-profile sign-in no longer manufactures legal identity from the email
  local part. Supplied signup metadata remains supported. Existing saved profiles
  and historical signatures are not rewritten.
- The reachable Messages signing action requires a nonblank saved legal name.
  Missing identity routes to Edit Profile; the server's existing identity check
  remains the security boundary. No new acknowledgement or consent is introduced.
- Record detail uses `agreement.exportDocument` (the original record), not the
  compatibility adapter's synthesized legacy approvals/signatures. Accepted
  invitations, final status, and matching display names do not establish signing.
- Record-detail counts and PDF badges use the same evidence predicate. A confirmed
  signature needs one current proposal, unambiguous participant membership, a
  server revision and explicit server source, the expected signer account, a
  recorded legal-name snapshot, a parseable signing time, and the current
  `SPLIT in-app acknowledgement` method. Duplicate signatures do not count.
- Final signed certification additionally requires an exact integer-hundredth
  100% allocation, every current approval, accepted invitations, and a final
  recorded status. The verification badge also requires a recorded verification
  timestamp. Conflicting duplicate approvals cannot certify a final export.
- Local source defaults to unconfirmed even when a snapshot carries server-like
  metadata. Download reuses the existing participant-scoped fresh-read path;
  failed/inaccessible remote reads cannot produce a stale signed export.
- Original signing names, times, methods, record status, and history remain
  available. Unconfirmed records show their recorded status and evidence warning;
  PDFs say Unconfirmed/Unverified and do not typeset a signature from a roster name.
- New creation defaults disable the unenforced signing-order option. Detail and
  PDF describe actual behavior as any order after all approvals, while separately
  retaining the original order setting. Historical contract data is untouched.

## Local verification

`npm run verify:beta`: exit 0, 812 tests in 79 files, typecheck/lint/build passed.
Seven existing Fast Refresh warnings and the existing large-bundle warning remain.
The deliberate `Sensitive agreement contents` exception in the error-boundary
test is expected test output, not a browser error in these flows.

`npm run verify:database`: exit 0, 166 checks, 30 replayed migrations in disposable
PGlite. The two hosted cron/net/Vault migrations are excluded by the existing
harness. No hosted authentication, provider, inbox, or real-user data was used.

Coverage includes missing/wrong signer IDs, missing names, unknown and synthetic
methods, invalid signing time, stale and duplicate proposals/signatures,
ambiguous account/participant membership, missing revision, duplicate approvals,
over-precise allocations, local copies, and final status without evidence. A
legitimate bound current-record fixture still renders its supplied snapshots.
Tests assert original document immutability. Missing-profile sign-in and the
Dashboard -> profile completion -> saved name -> signing control path are covered
with isolated mocks; no signature is submitted by that navigation test.

Browser plugin not available: isolated installed Chrome via bundled Playwright,
`http://127.0.0.1:8185/`, desktop 1280x900 and mobile 320x900. All non-local requests
were blocked; zero external requests were attempted. Page identity, meaningful
content, no framework overlay, no console warnings/errors, and horizontal bounds
passed. Flows exercised:

1. Split Sheets -> final-status legacy fixture -> 0/2, Evidence incomplete,
   no fabricated Approved/All signed, original record remains read-only.
2. Ready-to-sign fixture without a legal name -> Complete signing details ->
   Personal details -> enter a name -> expected local-only save failure. Entered
   values survive and no saved identity is fabricated.
3. Separately seed a saved-profile fixture -> reopen Messages -> Sign is available.
   This is rendered-state coverage, not proof of hosted profile persistence.

The browser fixture harness reseeds sent-record fixtures on reload because the
real dashboard caches only unsent drafts. Successful persistence is mocked in the
component integration test, not simulated as a successful hosted browser save.
No Sign button was pressed. The temporary QA server was stopped after testing.

Canonical, local, and legacy PDF first pages were rendered with Poppler and
visually inspected. Counts, badge/placeholder differences, footer separation,
names and timestamps are readable. Layout assertions also check notice/history
non-overlap; existing multipage stress tests continue to pass. The preexisting
unconfirmed-PDF logo is still the old mark, a separate branding follow-up.

Reproducible test sources are committed. Session-only logs/scripts/screenshots
are outside Git under `/tmp/split-web-gm05-*`; no private agreements or tokens are
part of the candidate.

## Consent evidence: coordinated review required

These are observed product/technical gaps, not legal conclusions or proposed
final legal language:

1. `AccountAccess.prepareProfileForRegistration` stamps terms/privacy acceptance
   times using the browser clock and sends the version fields with the profile.
   These are client-originated metadata, not an independent server receipt proving
   which text was presented, to whom, and when it was acknowledged.
2. The reachable Messages Sign action does not present/capture a distinct versioned
   electronic-record consent. The current server action stores the authenticated
   account, current proposal, server time, supplied legal name and fixed method.
   That record is not a substitute for a reviewed consent-presentation design.
3. The missing-profile fix prevents future email-derived fallback names only.
   Existing nonblank names have no provenance field distinguishing genuinely
   supplied data from old fallback values. They cannot be silently repaired,
   independently identity-verified, or retrospectively re-consented by this patch.

Product, backend, native and counsel should agree on the intended acknowledgement
semantics; the presentation/wording and versioning; evidence bound to the account
and proposal; server capture/retention; repeat-signing and version-change behavior;
and a non-destructive treatment of legacy records. The web and native flows must
then share the reviewed contract. No schema expansion, legal copy publication,
new consent checkbox, signature invalidation, or production repair is included.

The existing PDF disclaimer remains: recorded activity is not proof of copyright
ownership or contributor-supplied identity accuracy. The stricter badge predicate
checks record consistency, not real-world identity or legal enforceability.

## Remaining gates

- Independent QA must review the committed candidate before acceptance.
- Hosted persistence, multi-account/concurrent lifecycle, actual inbox/provider
  behavior and recovery remain deferred by the founder's local-only decision.
- `npm audit --omit=dev --audit-level=moderate` still exits 1: five high entries in
  the unresolved braces/chokidar/fast-glob/micromatch/Tailwind chain. No audit rule
  was lowered or suppressed. See `beta-dependency-review.md` for compatible options.
- No merge, deploy, production settings/data changes, provider provisioning,
  real invitation, purchase, legal publication or external contact occurred.
