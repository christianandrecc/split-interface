# Account Deletion And Recovery Gate

## Interim Beta Closure Process: September 14

The owner approved manual review, with no automatic account deletion. Christian
is the responsible operator; the approved public contact is
`xtiancarrera@gmail.com`. Settings > Privacy & sharing > Request account closure
opens a pre-addressed email after explaining review and record preservation.
Opening the email does not submit a request, close an account or change data.
The address is also visible for users without a configured mail application.

Operator procedure:

1. Acknowledge receipt and record the request date, internal user ID, operator,
   verification status and requested outcome in a private support record, not Git.
   Do not collect passwords, session tokens or one-time confirmation links.
2. Verify control of the current confirmed Auth email through a fresh reply or
   approved authenticated check. Do not identify an account by display name,
   username alone, forwarded messages or editable profile metadata. Escalate
   requests where the user cannot access that email; do not bypass verification.
3. Review drafts, shared work, partial/prior signatures and finalized agreements.
   Explain what can be removed and what shared evidence remains before taking
   action. Signed agreements, signer identity, signature responses and audit
   evidence must not be erased or reassigned to another account.
4. Handle access closure separately from data deletion. Use supported Auth-admin
   controls to prevent new sessions and revoke existing sessions, then verify
   that refresh and sign-in fail. Existing JWTs may remain valid until expiry;
   do not promise immediate access removal from a ban alone. Keep the request
   pending until access has actually ended and verify from a separate browser.
5. Review removal of nonessential private profile/contact data separately. Never
   cascade-delete an Auth user associated with signed evidence or disable the
   database guard to force it. Unsigned-only deletion also requires explicit
   approval and review of shared records; there is no automated deletion job.
6. Confirm the actual outcome and retained categories to the requester. Record
   verification evidence and a review date privately; do not label a request
   completed merely because an email was opened or an account was banned.

No account has been closed by this implementation. A formal retention duration,
legal basis, user notice, deletion tooling and hosted session-revocation exercise
still require review before public launch. This operational checklist is not a
final legal retention policy. A one-time follow-up was scheduled for September 21.

## September 11 Review

Hosted checks were read-only: SPLIT is active on the Free plan, and the Auth-user
foreign keys still cascade to collaborator rows. No account, agreement, backup,
subscription, deployment or hosted migration was changed during this review.

A disposable PostgreSQL reproduction using the 24 prior migrations confirmed:

- Deleting a finalized split's creator is blocked atomically by the parent guard.
- Deleting its other signer was not blocked: collaborator rows fell from two to
  one, and relational signature responses fell from two to one. The signed JSON
  document stayed identical. Parent immutability alone does not protect children.
- An unused account's profile can be removed. There is no self-service account
  deletion/closure workflow in the app; draft deletion and sign-out are different.

## Guard Deployed September 14

Migration `20260912021844_protect_signed_account_deletion.sql` prevents an Auth
hard delete when associated splits have final status, verification or any stored
signature evidence, including previous proposal versions and partially signed
work. It aborts before cascading writes so Auth, profile, settings, collaborator,
response, audit and notification rows stay intact.

Applied to the existing hosted project on September 14. Pre/post-migration
checksums of all five existing split documents, revisions, collaborators,
responses and audit rows matched. A hosted rollback-only transaction verified
partial/final signer deletion rejection, two-party signing and preserved export
evidence. All synthetic data was rolled back; this did not test live Auth-session
revocation or close any existing account.

The private trigger uses a fixed search path, has no direct execution grants for
anonymous, authenticated or service roles, and locks matching parents before
examining consent. Existing signing code also locks parents. No new browser RPC
or public data access is introduced; unsigned draft-only cleanup is unchanged.

Regression checks in `scripts/verify-account-retention.mjs` verify partial/final
creator and collaborator deletion, historical signatures after counters, atomic
rejection, continued reads/exports, unsigned cleanup, and limited Auth-admin
permissions. These run in disposable PGlite, not hosted GoTrue; hosted concurrent
sign/delete behavior still needs dedicated test accounts on an isolated target.

`npm run verify:deploy` passed after this change: environment validation,
typecheck, lint, all application tests, production build, dependency audit, and
152 disposable database checks across 25 migrations (nine retention checks).
Seven existing Fast Refresh warnings and the existing bundle warning remain.

This is a guard against destructive deletion, NOT an implemented account-closure
service or an approved retention policy. It neither disables login nor revokes
sessions. The owner must choose a closure/request workflow, responsible operator,
retention periods, and a reviewed distinction between private profile data and
shared agreement evidence. Do not bypass the guard, delete signers via dashboard,
or erase signed records to make an account deletion succeed.

Supabase notes that deleting an Auth user does not immediately invalidate issued
access tokens; sensitive operations need session-aware handling or must account
for token expiry. A ban alone is not session revocation. See
[Auth user management](https://supabase.com/docs/guides/auth/managing-user-data).
The local database Auth shim does not verify these hosted session behaviors.

## Backup And Restore: Local Proof Complete

Supabase recommends regular off-site database exports for Free-plan projects;
managed daily backup access is documented for paid plans. Database backups omit
Storage file contents and custom-role passwords. See
[Supabase backups](https://supabase.com/docs/guides/platform/backups).

The owner approved local-only recovery testing. An encrypted snapshot of the
deployed database has now been restored in isolated native PostgreSQL: all 41
tables / 994 rows, 23 migrations, schema/permission checks and five identity
contexts match. Wrong-key and altered-file checks fail as intended. The temporary
database was stopped and removed; the recovery key remains in macOS Keychain.
See [database-recovery.md](database-recovery.md) for the receipt and repeatable
commands. No off-site copy, cadence, paid upgrade or production restore is
configured. The operational recovery gate still requires:

1. Assign an operator and approve the backup destination, encryption/access rules,
   maximum acceptable data loss, and maximum recovery time.
2. Inventory recovery coverage: application rows, signed document evidence,
   migrations, necessary Auth data, Storage objects, and platform configuration.
   Keep privileged secrets in a separate approved secret store, never Git/chat.
3. Produce a protected backup using the supported export process. Record time,
   migration version, completeness and a checksum; schema-only export is not a
   data backup. Do not place production dumps in this public repository.
4. Restore into an isolated approved target, with outbound email/jobs disabled.
   Never test restoration over the live partner project or automatically replay
   invitations. Treat restored Auth data and agreement contents as sensitive.
5. Verify row counts, signed payload/signature checksums, foreign keys, roles/RLS,
   migrations, required assets and A/B/C access isolation. Test Auth recovery
   separately from a PostgreSQL restore. Record achieved recovery time/data loss.
6. Establish a backup cadence and failure alerts, with an explicit restoration
   approval process. A PDF download or Vercel rollback is not a database backup.

## Rollout And Remaining Work

Apply the earlier delivery cleanup first, then the account-deletion guard through
an authorized migration rollout. The guard performs no existing-row rewrite.
Verify trigger ownership/permissions and rejected deletions with controlled
accounts after rollout. Do not disable it as a frontend rollback shortcut.

The live security advisor still reports nine intentionally authenticated guarded
[RPC notices](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
and owner-deferred [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
That read-only check covers the deployed baseline, not this pending trigger.

Account closure, a retention policy, hosted Auth/session tests and off-device
operational recovery remain open. The demonstrated local database restoration
does not constitute public-beta approval.
