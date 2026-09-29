# SPLIT account emails

Three Supabase Auth templates, delivered through the existing Resend SMTP setup:

| Dashboard template | HTML | Subject |
| --- | --- | --- |
| Confirm signup | `confirmation.html` | Confirm your email to join SPLIT |
| Reset password | `recovery.html` | Reset your SPLIT password |
| Change email address | `email_change.html` | Confirm your SPLIT email change |

Open `preview.html` directly in a browser to switch between templates. Preview
actions are inert; Copy HTML copies the real template, not the fake preview link.
The subject appears above each preview. These are account-security emails only,
not collaboration invitations or signature/reminder emails.

## Editing

The source of truth is `scripts/auth-email-templates.mjs`. Regenerate the checked-in
HTML, preview and API payload with:

```sh
node scripts/build-auth-emails.mjs
node scripts/build-auth-emails.mjs --check
npm test -- src/test/authEmailTemplates.test.ts
```

Keep both action links as `{{ .ConfirmationURL }}`. Do not replace them with the
homepage or a preview link. The email-change template uses `{{ .NewEmail }}` and
requires secure email change (confirmation from both inboxes). No exact expiry is
advertised, since the hosted Auth expiration can change.

The logo uses an already published HTTPS PNG at
`https://www.mysplit.co/split-android-chrome-512x512.png`. The publisher verifies it
matches the local artwork before writing templates. The plain-text SPLIT wordmark
and message remain readable with images blocked. No tracking pixels, web fonts,
JavaScript or attachments are included in sent emails. Contact SPLIT uses the
existing approved support inbox, not an unconfigured `support@mysplit.co` mailbox.

## Publishing

The connected database tools do not expose Auth template settings. Publishing
requires a Supabase Management API token with Auth configuration read/write access
for this project (including the permissions required by the endpoints below).
This is not the Resend key or the public Supabase key.

Place a short-lived token in the Git-ignored `.env.email-templates.local` using
`SUPABASE_ACCESS_TOKEN=...`, with file permissions `600`, or supply that variable
through the process environment. Never commit it, paste it into chat, use a
`VITE_` prefix, or add it to the website's hosting environment.

```sh
# Read-only: check whether the three templates differ.
node scripts/publish-auth-emails.mjs

# Publish only the six subject/template fields, then read them back to verify.
node scripts/publish-auth-emails.mjs --apply
```

Before a write, the publisher saves only the previous six template fields in a
private file under `~/Library/Application Support/SPLIT/email-template-backups/`.
It never backs up or logs SMTP credentials. SMTP, redirects, security flags,
notification switches and all other email templates remain untouched. A failed
request is not automatically retried. Check the hosted state before retrying.

To restore a previous template-only snapshot:

```sh
node scripts/publish-auth-emails.mjs --restore=/absolute/path/to/backup.json
node scripts/publish-auth-emails.mjs --apply --restore=/absolute/path/to/backup.json
```

Revoke the temporary token in Supabase after publication and clear the local file.
No frontend release or database migration is required for the template update.
Saving files or pushing them to GitHub does not publish them to hosted Auth.

## Verification

Automated checks cover secure links, supported variables, accessible image/text
fallbacks, preview isolation, exact publication scope, backup-before-write,
idempotency, failed publication and preservation of security/SMTP settings.
Browser previews do not prove rendering in Outlook, Gmail or Apple Mail. Verify
those with real inboxes after publication, including image blocking and dark mode.
Keep Resend click/open tracking disabled on the Auth sending domain.

Use only authorized dedicated test accounts. Confirm new signup/resend, password
reset, and email change through both inboxes still work. Do not send test resets
to the owner's primary account or partner accounts. Never record live Auth links,
passwords or tokens in screenshots, logs or docs.

## References

- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/reference/api/v1-update-auth-service-config
- https://resend.com/docs/send-with-supabase-smtp
