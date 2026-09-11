# Publishing Setup Deferred

For the current beta scope, SPLIT focuses on composition split percentages,
collaborators, invitations, approvals, signatures, and split-record downloads.

- Signup and Profile no longer ask for publishing status, publisher/admin company
  details, publishing control percentages, or admin collection percentages.
- Creator role and writer PRO/IPI remain available.
- New drafts do not hydrate publisher/admin fields from the creator's account and
  default `authorizePublisherAdmin` and `sendToPublisherAdmin` to false.
- Split previews have no new publishing section. PDF downloads omit the deferred
  per-party publishing setup; they retain existing recorded authorizations and
  sample-disclosure metadata as historical record information.
- Editing existing drafts preserves their stored data. Profile saves preserve hidden
  legacy publishing fields rather than clearing them or inferring a new percentage.
- Existing database columns and records remain intact. No publishing snapshot or
  validation migration is included, and no publishing collection/fee calculation or
  external delivery service has been added.

Privacy, collaborator PRO/IPI, artist-name, and account-settings work from earlier
passes remains in place. This change is included in the
[September 11 partner release](partner-release-2026-09-11.md).

Verification: `npm run verify:beta` and `npm run verify:database`, plus isolated browser
checks for signup, Profile saves, draft creation, and PDF download. No live records
are needed for these checks.
