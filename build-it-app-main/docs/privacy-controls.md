# Profile and Split Privacy

Migration: `20260911163414_enforce_split_profile_privacy.sql`, applied to the existing
project for the [September 11 partner release](partner-release-2026-09-11.md).

## Rules

- Public profiles are discoverable by authenticated users. Private profiles appear only to their owner.
- Collaborators-only profiles are discoverable only when the viewer and profile owner have both accepted participation in the same sent split. Unsent drafts and pending/declined invitations do not establish that relationship. A missing visibility value defaults to collaborators-only; unknown values fail closed.
- Search returns only public identity fields and the explicitly entered profile location. It never falls back to the legal address.
- A known exact username can still receive an invitation without appearing in search.
- Email and phone invitations resolve using verified Supabase Auth contacts, never editable profile contact fields. Phone matching includes the country code. Unverified contacts remain pending; Auth confirmation links eligible pending invites. Phone verification is not implemented by this change.
- An unsent draft remains visible only to its creator, with all draft inputs intact.
- Sent records expose agreement identity, ownership shares, roles, PRO/IPI details, proposal history, and signatures. Each viewer retains their own contact/publishing fields; other parties' private contact/publishing fields and the creator's full account snapshot are removed from responses.
- Deliberately shared agreement metadata (including the designated registration contact) and user-authored notes/messages remain shared. This is not a general-purpose text redaction service.

## Implementation

`load_my_split_sheets`, `upsert_split_sheet_document`, and `apply_split_sheet_participant_update` all return a viewer-specific projection. The existing validated writers live in the inaccessible `split_private` schema. Their public wrappers retain the existing RPC signatures and apply the projection after successful writes.

Raw JSON and contact columns are not selectable by browser roles. Row-level security still limits the small set of status/identity columns that remain selectable. Notifications retain their existing recipient-only read path and realtime subscription.

`collaboratorUserId` in each returned invitation is the authoritative account binding. The UI uses it before legacy contact matching; an explicit null means the server has not linked the invitation. Legacy/local records without this field retain their existing matching behavior.

Projection does not rewrite stored records, delete private data, or alter signed agreements. Previously downloaded/exported information cannot be recalled. Existing account bindings are not retroactively reassigned. New agreement fields must be added deliberately to the projection allowlist.

Future writer migrations must update the private implementation and keep the public projection wrapper intact. Do not re-grant raw table SELECT or expose `split_private` through the API.

## Verification and Rollout

- `npm run verify:database` replays the migrations in disposable PostgreSQL and tests privacy, invitation routing, signing, immutable records, and direct-column permissions. It makes no network calls or live writes.
- `SPLIT_PRIVACY_QA_OUTPUT=/tmp/split-privacy-qa-records.json npm run verify:database` optionally exports synthetic RPC responses for isolated browser checks.
- `npm run verify:beta` runs typechecking, lint, application tests, and the production build.
- Local Chrome checks used actual disposable-database responses with mocked network requests: invitation acceptance, counter-offer ownership controls, desktop/mobile preview, and real PDF generation passed. This does not verify hosted Auth email/SMS delivery.
- Before an approved rollout, inspect existing email/phone invitation bindings for historical mismatches. The read-only hosted check during this task found only creator and username bindings.
- Hosted advisors were checked again after migration. They still flag the nine intentionally authenticated [application RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Apply migrations before deploying the compatible frontend, then refresh old tabs and test with separate real accounts. Vercel deployments do not automatically apply Supabase migrations. Do not restore broad raw-data grants as a rollback shortcut.

Supported settings now persist separately in `account_settings`. Phone/address
privacy remains enforced independently; the UI does not offer an opt-out during beta.

References: [Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security), [database functions](https://supabase.com/docs/guides/database/functions).
