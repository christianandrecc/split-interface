# Beta Phone Verification

## Rollout Status

Implementation prepared September 29, 2026. Backend migration applied September
30 with `required=false`; SMS verification is not activated on hosted Supabase.
Phone remains mandatory at signup, with international format validation. Phone
invitations are disabled; collaborators use email or @username instead.

SMS rollout is paused. `VITE_PHONE_VERIFICATION_ENABLED` defaults to off (unset
or `false`), so signed-in users can reach onboarding and the dashboard without
calling the pending phone-status RPC. Email confirmation and normal sign-in
remain unchanged; no phone is marked verified. Missing phone infrastructure
must not block the preview while this work is on hold.

SMS is a separate paid provider integration, not part of Resend. No provider,
billing, SMS send, production verification requirement or account has been
changed by this implementation. Do not claim live verification from mocked tests.

## Account Flow

1. Create and confirm the email account as before.
2. When the frontend rollout and private database verification switches are enabled, the dashboard and
   onboarding wait for verification. Password recovery remains accessible.
3. Request a text with `auth.updateUser({ phone })` on that signed-in account.
4. Verify the six-digit code with `verifyOtp({ type: "phone_change", phone, token })`.
   Do not use `signInWithOtp` here: that can create a separate phone-only account.
5. Recheck the authenticated user and confirmed phone, then synchronize the
   private profile fields. Status refresh recovers an interrupted profile sync.

Auth's confirmed phone is authoritative, not editable metadata. Split-write
triggers enforce the requirement even for direct client RPC calls. Verification
is proof of possession during onboarding, **not MFA**, a legal identity check or
a new SMS password-recovery/sign-in flow. Email/password sign-in remains in use.
Verified-number changes are support-assisted during beta; ordinary profile edits
cannot replace the verified phone. Authenticated users can sign out from the gate.

## Provider Setup and Activation

1. Choose an SMS provider supported by Supabase and approve its costs. Configure
   its credentials directly in Supabase Auth > Providers > Phone, not chat,
   browser environment variables or source control. Enable the Phone provider.
2. Configure a six-digit OTP, a reasonable expiry and server SMS rate limits.
   Keep signups email-first. Limit provider sending regions and spending, enable
   provider fraud controls, and use production-approved sender registrations.
   The UI's 60-second resend cooldown is convenience, not an abuse boundary.
   If CAPTCHA is enabled in Supabase, wire its challenge/token through the Auth
   flow before rollout; this change does not introduce CAPTCHA.
3. Apply `20260930145527_beta_contact_verification.sql` before deploying the
   frontend. Its `required` flag defaults to false. Apply the delivery migration
   as well if releasing the combined frontend change. Confirm the status RPC is
   available through the Data API before enabling the frontend phone gate.
4. Set `VITE_PHONE_VERIFICATION_ENABLED=true` in the dedicated test build and
   restart/rebuild it. Test the provider with dedicated, user-approved accounts and real numbers.
   Verify receipt, wrong/expired codes, resend throttling, an existing number,
   international numbers, reload, switching accounts, sign-out, and recovery.
   Confirm no phone-only duplicate account is created and private numbers remain
   absent from collaborator searches and shared split payloads.
5. Once the live SMS checks pass, enable `VITE_PHONE_VERIFICATION_ENABLED=true`
   in the intended deployment and rebuild. Activate explicitly as an administrator:

```sql
update split_private.phone_verification_config set required=true where singleton;
```

This gates **existing as well as new users** at their next app load. Announce the
requirement before activation. Old tabs are still blocked from split writes by
the database. Keep email recovery and the temporary support contact operational.

Emergency rollback (does not erase verified phones, profiles or signed records):

```sql
update split_private.phone_verification_config set required=false where singleton;
```

Users at the gate can press Check status after rollback. Do not disable email
confirmation or manually mark someone else's number verified to bypass testing.
For a full rollout pause, also unset `VITE_PHONE_VERIFICATION_ENABLED` (or set it
to `false`) and restart/rebuild the frontend. This frontend switch does not
override database enforcement if the backend requirement has already been enabled.

## Verification

`npm run verify:deploy` covers the client, gate, profile authority, private RPCs,
write enforcement and rollback of blocked participant actions. Disposable
PostgreSQL models stored Auth fields; it does not execute hosted GoTrue or SMS.
Browser fixtures cover desktop/mobile layouts without contacting any provider.

September 29 verification: production build, dependency audit, database replay
and Deno webhook typecheck passed. Playwright fixture checks at 1280px and 390px
passed phone entry/OTP continuation and creator delivery-status/retry confirmation,
with no horizontal overflow or runtime errors; screenshots were visually reviewed.
The browser plugin was unavailable, so isolated Playwright/Chrome contexts were
used with mocked service responses and external requests blocked. No texts or
emails were sent during these checks.

References: [Supabase phone Auth](https://supabase.com/docs/guides/auth/phone-login),
[update an account](https://supabase.com/docs/reference/javascript/auth-updateuser),
[verify an OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp).
