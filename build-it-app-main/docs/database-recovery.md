# Local Database Recovery

## Verified September 11, 2026

The owner approved an encrypted local backup and isolated restore test, not a
production restore, paid plan, off-site upload or recurring schedule.

- Source: SPLIT `hpwquupkqssqqgqtwdyu`, PostgreSQL 17.6.1.155.
- Snapshot: `2026-09-12T02:48:08.553Z` (September 11, 10:48 PM Eastern).
- Encrypted PostgreSQL custom archive: 573,959 bytes. The separately encrypted
  manifest holds integrity digests, schema definitions, role metadata and the
  source access-control baseline. No plaintext database dump was written.
- Restored and compared all 41 tables / 994 rows in `public`, `split_private`,
  `auth`, `storage`, and `supabase_migrations`. Whole-row SHA-256 comparisons
  cover profiles, preferences, split JSON, signatures, responses, audit records,
  account links, Auth records and migration contents, including empty tables.
- Verified all 23 deployed migrations, latest `20260911183758`. The two pending
  local migrations and undeployed application changes are NOT in this snapshot.
- Schema ownership, effective grants, columns, functions, RLS policies, triggers,
  constraints, indexes and default privileges match. PostgreSQL parses ACL
  defaults and CHECK expressions; comparisons normalize dropped-column position
  holes without ignoring differences in visible column order or validation.
- Five database identity contexts match the source baseline: anonymous, the
  three saved users, and an unrelated identity. Anonymous/unrelated contexts
  cannot read application rows. This is database access parity, not a replacement
  for the separate hosted multi-account browser/RPC tests.
- Wrong-key decryption and a modified archive are rejected. All successful
  checks were repeated from the saved ciphertext without reconnecting to live
  Supabase. The latest proof is dated `2026-09-12T02:58:21.638Z`.
- Restore uses PostgreSQL 17.11, a fresh private directory, a local Unix socket
  and no TCP listener. No Auth, API, email or job workers are started. Restore
  login roles are disabled. The server was stopped and plaintext test files
  removed after each attempt. FileVault was confirmed on for this Mac.
- A separate SIGTERM drill interrupted the test server during startup; the
  verifier exited with code 143 and removed its private database directory.
- Five recovery guard tests and the full `npm run verify:deploy` gate passed:
  518 application tests, 152 disposable database checks across 25 local
  migrations, typecheck, build and dependency audit. Seven existing Fast Refresh
  warnings and existing large-bundle warnings remain. This did not deploy code.

The approximately one-second successful database drill excludes initial tool
setup, downloading a backup, hosted provisioning and service reconfiguration.
It is not a promised recovery-time objective. A snapshot protects its capture
time only; subsequent changes require another backup.

## Local Locations

Backup directory on this Mac:

```text
~/Library/Application Support/SPLIT/Backups/2026-09-12T02-48-03.594Z-aaAbkY/
```

It contains `database.dump.age`, `manifest.backup.json.age`, aggregate
`restore-proof-*.json` receipts and encrypted diagnostics from initial restore
setup attempts. Directories are owner-only `0700`, files `0600`; nothing is
uploaded or stored in this public repository. The archive is a full logical
`pg_dump`; only the five listed schemas are covered by this local restore proof.

The age identity is a generic password in the local macOS Keychain:

```text
Label:   SPLIT local database recovery
Service: SPLIT database backup hpwquupkqssqqgqtwdyu
Account: age-recovery-v1
```

The command retrieves it privately. It never prints it or supplies it in process
arguments. Do not delete that Keychain item: the encrypted files need it. An
off-device recovery key has NOT been established. Loss of this Mac can therefore
lose both the backup and the means to decrypt it. Key escrow in an approved
password manager/offline location is a separate required step; never Git/chat.

## Repeat The Drill

From the app root, rerun the saved backup entirely offline:

```bash
node scripts/recovery/backup-local.mjs verify \
  "$HOME/Library/Application Support/SPLIT/Backups/2026-09-12T02-48-03.594Z-aaAbkY"
```

To capture another live snapshot when authorized, set `SUPABASE_CLI` to the
absolute path of the authenticated Supabase CLI and run:

```bash
node scripts/recovery/backup-local.mjs backup-and-verify
```

`backup` captures/encrypts without claiming a verified restore. `verify` accepts
only a backup in this Mac's dedicated directory and always creates a new local
database. There is intentionally no production restore URL/overwrite flag.

Source access uses CLI temporary login credentials in memory, certificate and
hostname verification, a read-only repeatable-read transaction, and an exported
snapshot shared with `pg_dump`. A 128 MiB command-output limit bounds the current
small-project workflow; larger projects need a reviewed streaming implementation.
Storage/Vault data becoming nonempty makes capture fail closed until their
separate recovery plan is approved.

Interrupt/termination handlers stop and remove only this invocation's test
cluster. An OS crash, forced kill or power failure cannot run those handlers.
If that happens, inspect owner-only `/private/tmp/split-restore-*` directories
before continuing, stop any associated test server, and remove only those test
files. File deletion is not a claim of forensic secure erasure.

## Tooling

Tools are isolated under `~/Library/Application Support/SPLIT/BackupTools`, not
added to the web application's dependencies:

- Node 24; `pg` 8.23.0 and `age-encryption` 0.3.1, pinned with a local lockfile.
  The isolated dependency audit reported no known vulnerabilities.
- [Postgres.app 2.9.6](https://github.com/PostgresApp/PostgresApp/releases/tag/v2.9.6),
  PostgreSQL 17.11. `Postgres-2.9.6-17.dmg` SHA-256 verified against the release:
  `b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168`.
  Its app bundle is stored in BackupTools, not launched or installed as a service.
- Supabase CLI 2.117.0. The parser intentionally rejects changed CLI export
  formats, different projects, transaction-pooler connections and shell expansion.
- `supabase-ca.crt` in BackupTools is the Supabase CA obtained over HTTPS from
  `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.
  Renew it through the verified Supabase certificate source when necessary; never
  disable TLS certificate verification to work around a connection error.

Guard tests, with no production access:

```bash
node --test scripts/recovery/safety.test.mjs
```

See [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups),
[logical restore considerations](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[verified TLS connections](https://supabase.com/docs/guides/database/psql), and
the [age encryption implementation](https://github.com/FiloSottile/typage).

## Still Required Before Public Beta

1. Choose an off-device encrypted destination, independent key escrow, operator,
   retention policy, backup cadence, failure alerts and acceptable data loss.
   No recurring automation or cloud upload was configured in this pass.
2. Prove recovery in a separately approved Supabase environment, including
   hosted Auth/login/email, API settings, RPC workflows, PDF output and realtime.
   The local drill does not run GoTrue, PostgREST, Storage or managed extensions.
3. Securely preserve necessary project configuration and secrets separately:
   API/JWT keys, SMTP/OAuth credentials, redirects, provider settings, deployment
   variables and Edge Function code/config. Database role passwords are omitted;
   the encrypted Auth table data is not the entire hosted authentication service.
4. Add object-file backup when Storage is introduced. This snapshot has zero
   buckets/objects and zero Vault secrets. Do not infer future files or encryption
   root keys are covered by a database dump.
5. Deploy and verify pending migrations separately with authorization, then take
   another snapshot. Restoring an older database is not the same as rolling back
   the Vercel frontend. Never restore this drill over the active partner project.

The local backup/restore milestone is complete. The broader operational recovery
and public-beta gates remain open.
