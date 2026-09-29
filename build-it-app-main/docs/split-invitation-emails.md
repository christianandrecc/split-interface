# Split Invitation Emails

## Release Status (2026-09-29)

- Outbox migrations, Vault-backed scheduler and `send-split-invitations` Edge Function deployed to SPLIT (`hpwquupkqssqqgqtwdyu`).
- Website release `c5dc667` is live at `https://www.mysplit.co/`; the production aliases were confirmed on Vercel.
- Delivery is **enabled for new invitations** from `2026-09-29 17:05:05 UTC`. No historical invitations were queued.
- A single clearly labeled unsigned test split was created from the user-approved beta account to the approved beta email alias. Other invitations were excluded during that controlled test.
- The worker returned HTTP 200 with one send and no failures. Resend accepted it on the first attempt, and the user confirmed receipt in Gmail. The actual account display name and test work title were used, not the preview placeholders.
- Authenticated health check returned 200 / `configured: true`; the subsequent real submission verified the key's sending access.
- Live unauthenticated worker request returned 401. Client roles cannot read the queue or execute worker RPCs.
- pg_net transport hardening needs a Supabase-admin follow-up: the grant owner is `supabase_admin`, and the project `postgres` role cannot revoke its default public table grants. The attempted REVOKE returned success but effective privileges remained unchanged. Do not describe that migration as successful hardening. Keep the `net` schema excluded from the Data API and never expose privileged SQL/transport wrappers to clients.
- Verified the production Data API rejects `Accept-Profile: net` with HTTP 406 / `PGRST106`, requesting only an empty ID result (no request headers or secrets read). Thus these internal transport grants are not reachable by application clients through REST. The worker health check still passes after the attempted restriction.
- Scheduled job runs every minute. Pausing delivery prevents it from invoking the worker.
- Playwright checked the deployed invitation link through the Sign In screen at 1280px and 390px. The split ID was retained, no horizontal overflow or browser errors were detected, and the new elephant share image loaded.
- A complete authenticated recipient round trip (sign in or create the invited account, then review and explicitly accept/decline) remains a user beta check. The email test split is synthetic and must not be signed.

## Behavior

Sending a new split creates its existing in-app invitations and, after activation, one private email job per invited collaborator. The creator receives no invitation email. There is no historical backfill or bulk resend.

- Bound accounts use their confirmed Supabase Auth email, never editable profile metadata.
- An explicit email invite can be emailed before the recipient creates an account.
- Unknown handles or accounts without a confirmed email wait for an address. Unresolved jobs expire after seven days. No SMS is sent.
- Accepted/declined invitations, finalized splits, or changed recipient addresses are skipped when checked immediately before sending. A response concurrent with an already submitted provider request cannot retract that email.
- Opening the email cannot accept, approve, or sign. The link contains only a split UUID, not an access token. Existing account-level database access still controls the split.
- A wrong account sees an account-switch/refresh/dismiss prompt instead of being routed to a different split.
- The new split ID survives signup, confirmation, resend and password-recovery navigation. Same-tab fallback expires after 24 hours.

The sender is `SPLIT <notifications@mail.mysplit.co>`. Reply-To and Contact SPLIT use the user's approved temporary address, `xtiancarrera@gmail.com`, until the dedicated support inbox is set up. Emails include the inviter's public name and work title, but no ownership percentages, legal addresses, registration numbers, signatures or attachments.

## Secrets and Deployment

1. Resend API Keys: create a **Sending access** key restricted to `mail.mysplit.co`.
2. Save it as `RESEND_API_KEY` in Supabase > Edge Functions > Secrets. Never put it in a `VITE_` variable, GitHub source or chat. Auth SMTP is separate and unchanged.
3. Apply all application migrations. The hosted scheduler migration installs `pg_cron`, `pg_net`, and uses Supabase Vault; the transport-permissions migration attempts to remove public access to pg_net request/response tables, but requires owner privileges to take effect (see status above). `verify:database` explicitly skips these two hosted-only migrations because PGlite cannot run these services.
4. Deploy all four files in `supabase/functions/send-split-invitations/`. With MCP, explicitly pass `entrypoint_path: "index.ts"` and `import_map_path: "deno.json"` on updates so a previous deployment's temporary import-map path is not reused. JWT gateway verification is disabled **only because the handler requires its own 256-bit worker bearer secret**, verified against a private hash. Anonymous, publishable-key and user-JWT requests are rejected.
5. Set `split_private.invitation_email_config.worker_url` to this project's HTTPS `send-split-invitations` endpoint. The schema rejects unrelated hosts/paths.
6. The scheduler generates its worker secret inside PostgreSQL and stores it in Vault. Never print or copy `vault.decrypted_secrets`, worker request headers or secret environment values into logs.
7. Deploy the frontend and verify its account-scoped routing before activation. Confirm Supabase Auth allows `https://www.mysplit.co/` and invitation query parameters. A live invalid-token redirect probe preserved `?split=<uuid>` on this domain; actual confirmation still needs an inbox test.

## Activation and Verification

The initial controlled test and activation above are complete. For future rollouts, agree the website release and controlled test before activation. Keep tests limited to user-approved dedicated accounts/inboxes; do not reset active users or alter signed records.

For a credential-presence check (does not send email), as the database administrator:

```sql
select split_private.dispatch_invitation_emails(true) as request_id;
-- Inspect only status_code, content and timed_out for that ID in net._http_response.
-- Never inspect outbound request headers; they contain the private worker token.
```

Once ready, enable new invitations from this moment onward:

```sql
update split_private.invitation_email_config
set enabled=true, activated_at=coalesce(activated_at,clock_timestamp())
where singleton;
```

Then send one new unsigned test split to an approved inbox. Confirm: queue -> Resend acceptance -> inbox receipt -> correct split after sign-in/signup -> accept or decline remains an explicit action. Verify the cron run and queue state, and verify the same invite is not sent twice. Do not infer inbox delivery from an HTTP success.

Emergency stop, without altering agreements or account access:

```sql
update split_private.invitation_email_config set enabled=false where singleton;
```

The scheduler stays installed but does not invoke the worker while disabled. Already submitted provider requests cannot be recalled.

## Operations

The private table `split_private.invitation_emails` records `waiting_address`, `queued`, `processing`, `sent`, `skipped` or `failed`. `sent` means Resend accepted the request, not delivered/read. Provider delivery/bounce webhooks and a creator-facing email-status panel are separate follow-ups, not implemented here. Use the Resend dashboard for delivery/bounce status meanwhile.

- Five messages per batch, every minute; exclusive five-minute leases prevent overlapping drains.
- Stable Resend idempotency key: `split-invitation-v1/<job UUID>`; payload remains fixed during retries.
- Retry network failures, HTTP 429 and 5xx, with bounded backoff. Other 4xx are terminal. Maximum eight attempts and 20 hours from the first claim, inside Resend's 24-hour deduplication window.
- A slow worker stops starting more messages before the runtime limit; untouched leases recover later.
- Creator cap: 100 newly queued invitation records/day; recipient cap: five per creator/day. Cap failures do not block split creation or its in-app invite.
- Unknown handles cannot hold up confirmed recipients. Resolving an address later still checks the recipient cap.
- Review failed/skipped counts without dumping recipient addresses or request bodies. Do not blindly reset failed jobs, change their payload, or replay outside the deduplication window. Check Resend first when delivery is ambiguous.
- Template changes during retries can cause a Resend idempotency conflict; terminal 409 handling avoids duplicate sends. Pause/drain outstanding jobs before changing templates in a live release.
- Signed-sheet/PDF delivery, reminders, counteroffer/signature emails, preferences, unsubscribe/suppression handling and marketing emails are not part of this invitation-only rollout.

## Verification

`npm run verify:beta` covers typecheck, lint, all unit/component tests and production build. Seven existing Fast Refresh warnings and the existing bundle-size warning remain.

`npm run verify:database` runs disposable PostgreSQL checks for no backfill, identity authority, access isolation, duplicate prevention, leases, timeout recovery, retry limits, accept/decline cancellation, email changes, late signup and caps. It sends nothing.

`npx deno@2.9.6 check supabase/functions/send-split-invitations/index.ts` type-checks the deployed runtime.

Playwright checked local email rendering and deployed invitation -> account access -> Sign In at 1280px and 390px, with no runtime errors or horizontal overflow. These browser checks do not cover Outlook/Gmail rendering. The user separately confirmed the live test's Gmail receipt.

Supabase advisors report deny-all RLS without policies on the two private tables (intentional), existing explicitly authorized SECURITY DEFINER entry points, and the existing leaked-password-protection warning. Do not grant clients access to the private queue to silence the RLS notice.

References: [private RLS notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
