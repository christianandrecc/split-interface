# Account email

Supabase Auth is the source of truth for the account's sign-in and password-reset
email. Profile edits no longer change it independently.

## Flow

- Profile > Sign In Details > Change email requests an Auth email change using
  `auth.updateUser({ email }, { emailRedirectTo })`.
- The current email remains active while Auth exposes `new_email`. Pending state
  is loaded from `auth.getUser()`, not a browser-only flag or editable metadata.
- The dialog does not save other profile edits. Duplicate clicks are blocked;
  validation, rate-limit and connection errors do not claim success.
- Check status reloads Auth state. Returning to the browser or an Auth user-update
  event refreshes the current email. Unrelated unsaved profile fields are retained.
- Resend confirmation uses `auth.resend({ type: 'email_change', email: currentEmail })`.
  GoTrue resolves the account by its current email and sends to its pending change.
  No pending change means no resend request.
- Password recovery continues through `resetPasswordForEmail`. The user must use
  the current sign-in address: old while pending, new after confirmation.
- Existing PKCE and implicit callback handling is reused; callback errors are
  surfaced and credentials/codes are removed from the URL.

## Storage

`20260911183758_sync_profile_account_email.sql` depends on `split_private` from
the earlier privacy migration. It adds two internal triggers:

1. Before profile insert/update, copy `auth.users.email` into `profiles.email` and
   `profile_data.emailAddress`. Ordinary or stale profile writes cannot replace it.
2. After an actual Auth email change, synchronize the profile. Changing only
   `auth.users.email_change` does not update the profile's current email.

The migration repairs previously mismatched profile emails. Other account fields,
including deferred publishing data, remain intact. Split documents, signature
snapshots and audit records are not rewritten. Existing invitation membership
remains bound to user IDs; the privacy migration still requires verified Auth
contacts to claim unassigned invitations.

The trigger functions use fixed empty search paths in the unexposed private
schema, with no PUBLIC/anon/authenticated execution. They require definer access
to the Auth table from profile writes and to profiles from the Auth server. Client
ownership is still enforced by profiles RLS; users cannot directly update Auth.
No Auth metadata field is accepted as proof of an account email.

## Deployment and real-inbox verification

The four dependent migrations are applied to the existing project as part of the
[September 11 partner release](partner-release-2026-09-11.md).
Keep Secure email change enabled in Supabase so
both the current and new inbox must confirm. Do not use an admin email update to
bypass confirmation. Ensure email confirmations, SMTP delivery and redirect URL
allowlists are configured for the partner-testing domain.

The existing redirect resolver prefers an explicitly configured app URL; localhost
otherwise redirects to the production app. For local inbox testing, explicitly
configure and allowlist the local callback URL. Do not send test mail to production
accounts simply to exercise the UI.

Before live beta, test with two controlled inboxes: request, confirm only one link,
verify the old email remains active, complete the second confirmation, then verify
sign-in and password recovery at the new address. Also test expired links, resend,
an unavailable address, and a second browser. Confirm existing signed records and
partner access remain unchanged. If a link is stale, return to Profile and check
status before requesting another confirmation.

`npm run verify:beta` covers service, component, callback and session-cache tests.
`npm run verify:database` replays migrations in disposable PostgreSQL, including a
pre-migration mismatched profile, direct-write attempts, pending/confirmed changes,
RLS, and an actual two-party signed record. It simulates the Auth table transition;
it does not run hosted GoTrue, prove SMTP delivery, or send real emails. Browser
QA likewise intercepts Supabase HTTP and WebSockets.

## References

- [Supabase updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [Supabase resend](https://supabase.com/docs/reference/javascript/auth-resend)
- [GoTrue resend account lookup](https://github.com/supabase/auth/blob/master/internal/api/resend.go)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

Read-only hosted security advisors after migration still report the nine existing
authenticated SECURITY DEFINER RPC notices and disabled leaked-password protection:
[RPC review guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Signup confirmation

The confirmation screen no longer claims that an email was definitely sent.
Supabase may return an obfuscated response for a repeated signup, so the screen
offers Sign In for existing accounts without exposing whether an address exists.
Resend confirmation uses `auth.resend({ type: 'signup' })`, validates and normalizes
the address, uses the approved Auth redirect, and blocks duplicate clicks with a
60-second cooldown. Rate-limit and delivery errors remain visible. This does not
create another account, change a password, or bypass email verification.

An already-confirmed account should sign in with its existing password, or use
Forgot password. A new signup attempt does not reset that password. A successful
API response is not proof of inbox delivery. Before live beta, verify custom SMTP
and delivery with controlled inboxes; Supabase's default SMTP restricts recipients
to project-team addresses. Do not grant testers project administration to work
around that restriction: [SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp).
