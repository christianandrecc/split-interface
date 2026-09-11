# Account settings

Settings are owner-only rows in `public.account_settings`, keyed by the verified
Supabase Auth user ID. No preferences are stored in browser local storage.

## Supported fields

| Column | Default | Consumer |
| --- | --- | --- |
| `default_split_method` | Custom | New split's `data.splitType` (Equal or Custom) |
| `default_user_role` | Songwriter | New split creator party's composition role |
| `default_territory` | Worldwide | New split creator party's `societyTerritory` |
| `include_audit_trail` | true | Requesting viewer's PDF export: optional version/activity history |

Society territory is not the collaborator's country or a grant of geographic
rights. Custom territory text is trimmed and limited to 100 characters. The
composition-role list matches the split builder, not general signup role tags.

Defaults are loaded before a new form is initialized. Saved drafts keep their
recorded fields. Settings changes do not rewrite profiles, existing drafts,
signatures, audit entries, invitations, or finalized records.

The PDF preference is read at download time for the authenticated viewer. Turning
history off leaves names, shares, signatures, signing status and core record
details in the PDF. It does not change the agreement's recorded audit preference
or remove history from Supabase. Direct renderer calls default to full history.

## Save behavior

Missing rows return application defaults without an insert. The first explicit
Save inserts a row; subsequent saves match both user ID and server revision.
The database increments revision and timestamp. A concurrent first save or stale
revision reports a conflict; it never silently upserts over newer preferences.
Errors retain the pending edits. Reload saved settings explicitly discards them.
Switching accounts remounts the form and ignores the old account's late reads.

RLS permits authenticated users to read/insert/update only their own row. Column
grants prevent clients from changing ownership, revision or timestamps. Clients
cannot delete rows or execute the private revision trigger directly.

## Not connected

- Signature/proposal email delivery and scheduled reminders are disabled. No
  preferences for unavailable services are saved or represented as active.
- Phone numbers and addresses remain private during beta. The control is fixed
  on; privacy is enforced by the preceding profile-privacy migration, not a switch.
- External sharing/delivery is unavailable. Existing in-app notifications and
  invitation workflows are unchanged.

## Rollout

`20260911173132_persist_account_settings.sql` and its dependencies are applied to
the existing project for the [September 11 partner release](partner-release-2026-09-11.md).
This table depends on the `split_private` schema from the privacy migration;
fresh environments must apply all migrations in order before serving the frontend.
Old frontend versions remain compatible with the added table.

Until that migration is applied, authenticated settings, new-work defaults and
PDF preference reads report the missing backend rather than pretending to save
or silently ignoring preferences. Existing draft editing does not require a
settings read.

Run `npm run verify:beta` and `npm run verify:database`. The database suite replays
all migrations in disposable PostgreSQL and exercises ownership, column grants,
validation, revision conflicts and unchanged existing split records. It does
not modify the connected Supabase project.
