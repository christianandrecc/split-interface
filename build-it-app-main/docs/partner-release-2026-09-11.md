# September 11 Partner Release

Scope: the existing SPLIT projects for private partner testing, not public beta.
The frontend release target is GitHub `main` and the existing Vercel Git deployment
at https://split-interface.vercel.app/. No new project or backend is created.

## Included

- Server-enforced profile/search privacy and viewer-specific split responses.
- Account PRO/IPI captured for the accepting/signing collaborator only.
- Full artist names retained through signup, profiles, creation and exports.
- Supported owner-only settings, split defaults and PDF history preference.
- Publishing setup deferred without deleting legacy account or signed-record data.
- Confirmed Auth email as the canonical profile/sign-in address, pending email
  change controls, and confirmation callback/error handling.
- Neutral signup-confirmation wording and an explicit, rate-limited resend button.

## Database Rollout

Applied through the Supabase CLI to project `hpwquupkqssqqgqtwdyu`:

1. `20260911163414_enforce_split_profile_privacy.sql`
2. `20260911164913_capture_collaborator_registration.sql`
3. `20260911173132_persist_account_settings.sql`
4. `20260911183758_sync_profile_account_email.sql`

The hosted migration list contains all 23 local migrations. Existing split JSON
checksums, statuses and revisions were identical before and after migration.
Canonical profile-email mismatch count is zero; settings RLS is enabled; browser
roles cannot read raw split JSON or access the private implementation schema.

A hosted rollback-only transaction verified synthetic signup/profile triggers,
canonical email guards, settings ownership/revision conflicts, draft isolation,
send/accept, PRO/IPI capture, two-party signing, finalized-record immutability,
and confirmed Auth email synchronization without rewriting the signed document.
All synthetic accounts, splits, notifications and delivery-queue rows were rolled
back. No real emails were sent. This exercises PostgreSQL, not GoTrue delivery.

## Release Gate

`npm run verify:deploy` passed locally:

- TypeScript and deployment environment validation.
- 397 application tests in 49 files, with two workers for stable resource usage.
- ESLint: zero errors, seven existing fast-refresh warnings.
- Production build; existing large-chunk warnings remain.
- Production dependency audit: zero reported vulnerabilities.
- All 23 migrations replayed; 121 disposable PostgreSQL checks passed.

Isolated Chrome browser checks covered signup/resend/errors/cooldown, sign-in,
full artist-name persistence, draft creation/preview/PDF download, and account
email pending/resend/confirmation/profile-save behavior. Responsive confirmation
and email controls were checked down to 320px. All Supabase HTTP and WebSocket
traffic was intercepted; no real account credentials or email sends were used.

Vercel must run the same checked-in release gate and report READY for the pushed
commit. Verify the production alias and assets after that build, not just the
local server. Refresh old browser tabs after release. Database changes are not
automatically reverted by rolling back the frontend.

## Remaining Beta Checks

- Real inbox confirmation, password recovery and two-inbox email changes remain
  controlled-user checks. The reported account was already confirmed and had a
  successful sign-in; it did not need another signup confirmation. Do not bypass
  verification or reset a partner's password automatically.
- Custom SMTP configuration was not inspected by the connector. The default
  Supabase email service restricts recipients; configure and verify an appropriate
  sender before opening beta: [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- The hosted advisor still flags nine intentionally authenticated, guarded
  [SECURITY DEFINER RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
  Do not revoke their required access without replacing the workflow.
- [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
  remains disabled and should be reviewed before public beta.
- External contract delivery, signature/proposal emails and scheduled reminders
  remain unavailable. In-app invitations and manual PDF downloads are supported.
- Multi-account hosted browser testing, monitoring, retention and load testing
  remain separate from this release gate.
