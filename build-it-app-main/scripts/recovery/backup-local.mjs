import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdirSync, mkdtempSync, chmodSync, lstatSync, realpathSync, readFileSync,
  writeFileSync, openSync, closeSync, fsyncSync, rmSync } from "node:fs";
import { PROJECT, SCHEMAS, sha256, identifier, connectionFromDryRun, localConnection, assertSame, localRestoreList } from "./safety.mjs";

process.umask(0o077);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const root = join(homedir(), "Library/Application Support/SPLIT");
const runtime = join(root, "BackupTools");
const backups = join(root, "Backups");
const require = createRequire(join(runtime, "package.json"));
const { Client } = require("pg");
const age = await import(pathToFileURL(require.resolve("age-encryption")).href);
const bin = join(runtime, "Postgres.app/Contents/Versions/17/bin");
const caPath = join(runtime, "supabase-ca.crt");
const service = `SPLIT database backup ${PROJECT}`;
const account = "age-recovery-v1";
const limit = 128 * 1024 * 1024;
let stage = "setup", diagnostic, runDirectory, recoveryIdentity, activeRestore;

function removeRestore() {
  if (!activeRestore) return;
  const { temp, data } = activeRestore;
  // Only a directory created by this invocation can ever be stopped/removed.
  try { lstatSync(join(data, "postmaster.pid")); }
  catch { rmSync(temp, { recursive: true, force: true }); activeRestore = undefined; return; }
  run(join(bin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"], { timeout: 30000 });
  rmSync(temp, { recursive: true, force: true });
  activeRestore = undefined;
}

for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => process.exit(code));
}
process.on("exit", () => {
  try { removeRestore(); }
  catch { console.error("Local recovery cleanup incomplete; inspect the private split-restore directory before continuing."); }
});

function run(program, args, options = {}) {
  try {
    return execFileSync(program, args, {
      stdio: ["pipe", "pipe", "pipe"], maxBuffer: limit, timeout: 180000,
      env: { HOME: homedir(), PATH: process.env.PATH, LANG: "en_US.UTF-8" }, ...options,
    });
  } catch (error) {
    // Child-process errors can contain passwords, COPY rows or SQL. Never log them.
    diagnostic = error.stderr?.toString();
    const safe = new Error("Recovery command failed");
    safe.code = typeof error.status === "number" ? error.status : "command_failure";
    throw safe;
  }
}

function privateDirectory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid()) {
    throw new Error("Unsafe backup directory");
  }
  chmodSync(path, 0o700);
}

function writePrivate(path, bytes) {
  const fd = openSync(path, "wx", 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}

async function identity(create) {
  try {
    return execFileSync("/usr/bin/security", ["find-generic-password", "-a", account, "-s", service, "-w"],
      { stdio: ["ignore", "pipe", "pipe"], timeout: 30000, encoding: "utf8" }).trim();
  } catch (error) {
    if (error.status !== 44 || !create) throw new Error("Recovery key unavailable in Keychain");
  }
  const key = await age.generateIdentity();
  if (!/^AGE-SECRET-KEY-1[A-Z0-9]+$/.test(key)) throw new Error("Unexpected key format");
  // The new secret travels over stdin, not argv, shell history, Git or logs.
  run("/usr/bin/security", ["-i"], { timeout: 30000,
    input: `add-generic-password -a "${account}" -s "${service}" -l "SPLIT local database recovery" -w "${key}"\n` });
  const stored = await identity(false);
  if (stored !== key) throw new Error("Keychain verification failed");
  return stored;
}

async function encrypt(bytes) {
  const encrypter = new age.Encrypter();
  encrypter.addRecipient(await age.identityToRecipient(recoveryIdentity));
  return encrypter.encrypt(bytes);
}

async function decrypt(bytes) {
  const decrypter = new age.Decrypter();
  decrypter.addIdentity(recoveryIdentity);
  return Buffer.from(await decrypter.decrypt(bytes));
}

async function connect(config) {
  const client = new Client({ ...config, connectionTimeoutMillis: 15000, statement_timeout: 120000 });
  client.on("error", () => {});
  await client.connect();
  await client.query("set timezone='UTC'; set datestyle='ISO, MDY'; set intervalstyle='postgres'; set extra_float_digits=3");
  return client;
}

async function fingerprints(client, tables) {
  const result = {};
  for (const { schema, name } of tables) {
    const table = `${identifier(schema)}.${identifier(name)}`;
    // Only digests leave SQL; individual account/contract fields are never printed.
    const { rows } = await client.query(`select h from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') as h
      from ${table} t) hashes order by h collate "C"`);
    result[`${schema}.${name}`] = { rows: rows.length, sha256: sha256(rows.map(r => r.h).join("\n")) };
  }
  return result;
}

async function catalog(client) {
  const queries = {
    schemas: `select nspname,pg_get_userbyid(nspowner) owner,nspacl::text acl from pg_namespace where nspname=any($1) order by 1`,
    relations: `select n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
      pg_get_userbyid(c.relowner) owner,c.relacl::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=any($1) and c.relkind in ('r','p','S','v','m') order by 1,2`,
    columns: `select table_schema,table_name,column_name,ordinal_position,column_default,is_nullable,data_type,
      udt_schema,udt_name,is_identity,is_generated,generation_expression from information_schema.columns
      where table_schema=any($1) order by table_schema,table_name,ordinal_position`,
    functions: `select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition,
      pg_get_userbyid(p.proowner) owner,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname=any($1) and p.prokind in ('f','p') order by 1,2,3`,
    policies: `select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
      where schemaname=any($1) order by 1,2,3`,
    triggers: `select n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition
      from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=any($1) and not t.tgisinternal order by 1,2,3`,
    constraints: `select n.nspname,c.conrelid::regclass::text relation,c.conname,c.convalidated,
      pg_get_constraintdef(c.oid) definition from pg_constraint c join pg_namespace n on n.oid=c.connamespace
      where n.nspname=any($1) order by 1,2,3`,
    indexes: `select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname=any($1) order by 1,2,3`,
    defaults: `select pg_get_userbyid(d.defaclrole) role,n.nspname,d.defaclobjtype,d.defaclacl::text acl
      from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace where n.nspname=any($1) order by 1,2,3`,
  };
  const result = {};
  for (const [label, query] of Object.entries(queries)) result[label] = (await client.query(query, [SCHEMAS])).rows;
  return result;
}

async function canonicalCatalog(client, source) {
  const result = structuredClone(source);
  const positions = new Map();
  // Logical dumps omit dropped-column holes while preserving visible column order.
  for (const column of result.columns) {
    const table = `${column.table_schema}.${column.table_name}`;
    positions.set(table, (positions.get(table) || 0) + 1);
    column.ordinal_position = positions.get(table);
  }
  for (const [kind, records] of Object.entries(result)) {
    for (const record of records) {
      if (!Object.hasOwn(record, "acl")) continue;
      const objectType = kind === "schemas" ? "n" : kind === "functions" ? "f" :
        kind === "defaults" ? record.defaclobjtype : record.relkind === "S" ? "S" : "r";
      // NULL ACL means PostgreSQL's default grants, not "no permissions".
      // Parse ACLs in PostgreSQL so quoting, grant options and defaults stay exact.
      record.acl = (await client.query(`select case when grantee=0 then 'PUBLIC' else pg_get_userbyid(grantee) end grantee,
        pg_get_userbyid(grantor) grantor,privilege_type,is_grantable from
        aclexplode(coalesce($1::aclitem[],acldefault($2::"char",$3::regrole))) order by 1,2,3,4`,
      [record.acl, objectType, record.owner || record.role])).rows;
    }
  }
  return result;
}

async function visibility(client, tables) {
  const ids = (await client.query("select id from auth.users order by id")).rows.map(row => row.id);
  const result = [];
  for (const id of [null, ...ids, "00000000-0000-4000-8000-000000000000"]) {
    const role = id ? "authenticated" : "anon";
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
      [id || "", JSON.stringify({ sub: id || "", role })]);
    const visible = {};
    for (const table of tables.filter(t => t.schema === "public")) {
      const name = `${table.schema}.${table.name}`;
      const allowed = (await client.query("select has_table_privilege(current_user,$1,'SELECT') allowed", [name])).rows[0].allowed;
      visible[name] = allowed ? (await fingerprints(client, [table]))[name] : "denied";
    }
    result.push({ id, role, visible });
    await client.query("reset role; set local role postgres");
  }
  return result;
}

async function canonicalChecks(client, constraints) {
  const result = structuredClone(constraints);
  for (const constraint of result) {
    if (!constraint.definition.startsWith("CHECK ")) continue;
    // PostgreSQL flattens nested ANDs when a logical dump is parsed again.
    // Reparse in empty local temp tables, never by rewriting constraint strings.
    await client.query(`create temp table split_recovery_check (like ${constraint.relation})`);
    try {
      await client.query(`alter table pg_temp.split_recovery_check add constraint recovery_check ${constraint.definition}`);
      constraint.definition = (await client.query(`select pg_get_constraintdef(oid) definition from pg_constraint
        where conrelid='pg_temp.split_recovery_check'::regclass and conname='recovery_check'`)).rows[0].definition;
    } finally { await client.query("drop table pg_temp.split_recovery_check"); }
  }
  return result;
}

async function capture() {
  stage = "source_connection";
  const cli = process.env.SUPABASE_CLI;
  if (!cli?.startsWith("/")) throw new Error("Set SUPABASE_CLI to the authenticated CLI executable");
  const vars = connectionFromDryRun(run(cli, ["db", "dump", "--dry-run"], { cwd: repo }).toString());
  const client = await connect({ host: vars.PGHOST, port: Number(vars.PGPORT), user: vars.PGUSER,
    password: vars.PGPASSWORD, database: vars.PGDATABASE, ssl: { rejectUnauthorized: true, ca: readFileSync(caPath, "utf8") } });
  try {
    await client.query("set role postgres; begin isolation level repeatable read read only");
    const snapshot = (await client.query("select pg_export_snapshot() snapshot,version() server_version,clock_timestamp() captured_at")).rows[0];
    const storage = (await client.query(`select (select count(*) from storage.buckets)::int buckets,
      (select count(*) from storage.objects)::int objects,(select count(*) from vault.secrets)::int vault_secrets`)).rows[0];
    if (storage.objects || storage.buckets || storage.vault_secrets) throw new Error("Storage/Vault requires a separate approved recovery plan");
    const tables = (await client.query(`select n.nspname schema,c.relname name from pg_class c
      join pg_namespace n on n.oid=c.relnamespace where n.nspname=any($1) and c.relkind='r' order by 1,2`, [SCHEMAS])).rows;
    stage = "consistent_database_dump";
    const dump = run(join(bin, "pg_dump"), ["--format=custom", "--role=postgres", `--snapshot=${snapshot.snapshot}`,
      "--lock-wait-timeout=10000"], { env: { HOME: homedir(), PATH: process.env.PATH, ...vars,
        PGSSLMODE: "verify-full", PGSSLROOTCERT: caPath, PGCONNECT_TIMEOUT: "15",
        PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=120000" } });
    if (dump.subarray(0,5).toString() !== "PGDMP") throw new Error("Invalid PostgreSQL archive");
    stage = "snapshot_inventory";
    const rows = await fingerprints(client, tables);
    const schema = await catalog(client);
    const roles = (await client.query(`select rolname,rolsuper,rolbypassrls,rolinherit from pg_roles
      where rolname !~ '^(pg_|cli_login_)' order by rolname`)).rows;
    const memberships = (await client.query(`select r.rolname role,u.rolname member,m.admin_option,m.inherit_option,m.set_option
      from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member
      where u.rolname !~ '^cli_login_' and r.rolname !~ '^cli_login_' order by 1,2`)).rows;
    const extensions = (await client.query(`select e.extname,e.extversion,n.nspname schema from pg_extension e
      join pg_namespace n on n.oid=e.extnamespace order by 1`)).rows;
    const migration = (await client.query("select count(*)::int count,max(version) latest from supabase_migrations.schema_migrations")).rows[0];
    const access = await visibility(client, tables);
    stage = "encrypt_backup";
    const encrypted = await encrypt(dump);
    writePrivate(join(runDirectory, "database.dump.age"), encrypted);
    const manifest = { format: 1, project: PROJECT, capturedAt: snapshot.captured_at, server: snapshot.server_version,
      tool: run(join(bin, "pg_dump"), ["--version"]).toString().trim(), dumpSha256: sha256(dump),
      ciphertextSha256: sha256(encrypted), encryptedBytes: encrypted.length, schemas: SCHEMAS,
      tables, rows, schema, roles, memberships, extensions, migration, storage, access };
    dump.fill(0);
    writePrivate(join(runDirectory, "manifest.backup.json.age"), await encrypt(Buffer.from(JSON.stringify(manifest))));
    console.log(JSON.stringify({ stage: "encrypted_backup_created", directory: runDirectory, migrations: migration.count,
      tables: tables.length, bytes: encrypted.length }));
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function verify() {
  stage = "decrypt_and_authenticate";
  const started = Date.now();
  const manifest = JSON.parse((await decrypt(readFileSync(join(runDirectory, "manifest.backup.json.age")))).toString());
  if (manifest.format !== 1 || manifest.project !== PROJECT) throw new Error("Unexpected backup manifest");
  assertSame(manifest.schemas, SCHEMAS, "Restore schema scope");
  const ciphertext = readFileSync(join(runDirectory, "database.dump.age"));
  assertSame(sha256(ciphertext), manifest.ciphertextSha256, "Encrypted archive");
  const wrongKey = new age.Decrypter();
  wrongKey.addIdentity(await age.generateIdentity());
  await assert.rejects(wrongKey.decrypt(ciphertext), "Wrong recovery key must be rejected");
  const damaged = Buffer.from(ciphertext);
  damaged[damaged.length-1] ^= 1;
  await assert.rejects(decrypt(damaged), "Altered archive must fail authentication");
  const dump = await decrypt(ciphertext);
  assertSame(sha256(dump), manifest.dumpSha256, "Decrypted archive");
  const temp = mkdtempSync("/private/tmp/split-restore-");
  chmodSync(temp, 0o700);
  const config = localConnection(temp);
  const data = join(temp, "data");
  activeRestore = { temp, data };
  const localEnv = { HOME: homedir(), PATH: process.env.PATH, PGHOST: config.host, PGPORT: "5432",
    PGUSER: config.user, PGDATABASE: config.database, PGSSLMODE: "disable" };
  let running = false, client;
  try {
    stage = "isolated_postgres_start";
    run(join(bin, "initdb"), ["-D", data, "-U", config.user, "--auth-local=trust", "--auth-host=reject", "--encoding=UTF8", "--locale=C"]);
    run(join(bin, "pg_ctl"), ["-D", data, "-l", join(temp, "postgres.log"), "-o",
      `-c listen_addresses='' -c unix_socket_directories='${temp}' -c unix_socket_permissions=0700 -c logging_collector=off -c log_statement=none`, "-w", "start"]);
    running = true;
    client = await connect(config);
    const settings = (await client.query("select current_setting('listen_addresses') listen,current_setting('unix_socket_directories') sockets")).rows[0];
    assertSame(settings, { listen: "", sockets: temp }, "Local-only server");
    stage = "restore_roles";
    for (const role of manifest.roles) {
      await client.query(`create role ${identifier(role.rolname)} NOLOGIN ${role.rolsuper ? "SUPERUSER" : "NOSUPERUSER"}
        ${role.rolbypassrls ? "BYPASSRLS" : "NOBYPASSRLS"} ${role.rolinherit ? "INHERIT" : "NOINHERIT"}`);
    }
    for (const membership of manifest.memberships) {
      await client.query(`grant ${identifier(membership.role)} to ${identifier(membership.member)}
        with ADMIN ${membership.admin_option}, INHERIT ${membership.inherit_option}, SET ${membership.set_option}`);
    }
    await client.query('alter database postgres owner to postgres; create schema extensions authorization postgres; grant usage on schema extensions to anon,authenticated,service_role');
    await client.query('set role postgres; create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions; reset role');
    stage = "restore_database";
    // Restore owners, grants, Auth hooks and RLS unchanged. Only platform-specific
    // schemas/extensions are excluded from this local drill, not from the backup.
    const list = localRestoreList(run(join(bin, "pg_restore"), ["--list"], { input: dump }).toString());
    const listPath = join(temp, "restore.list");
    writePrivate(listPath, Buffer.from(list));
    if (list.includes(" SCHEMA - public ")) await client.query("drop schema public");
    run(join(bin, "pg_restore"), ["--exit-on-error", "--single-transaction", "--no-publications", "--no-subscriptions",
      "--use-list", listPath, "--dbname", "postgres"], { input: dump, env: localEnv });
    dump.fill(0);
    await client.query("set role postgres; begin isolation level repeatable read read only");
    stage = "verify_restored_data";
    const restoredRows = await fingerprints(client, manifest.tables);
    assertSame(restoredRows, manifest.rows, "Table data");
    const restoredCatalog = await canonicalCatalog(client, await catalog(client));
    const expectedCatalog = await canonicalCatalog(client, manifest.schema);
    const restoredAccess = await visibility(client, manifest.tables);
    assertSame(restoredAccess, manifest.access, "Anonymous and per-account visibility");
    for (const context of [restoredAccess[0], restoredAccess.at(-1)]) {
      if (Object.values(context.visible).some(table => table !== "denied" && table.rows !== 0)) {
        throw new Error("Unrelated or anonymous context can read application data");
      }
    }
    await client.query("rollback; set role postgres");
    expectedCatalog.constraints = await canonicalChecks(client, expectedCatalog.constraints);
    restoredCatalog.constraints = await canonicalChecks(client, restoredCatalog.constraints);
    for (const [name, expected] of Object.entries(expectedCatalog)) {
      if (JSON.stringify(restoredCatalog[name]) !== JSON.stringify(expected)) {
        diagnostic = JSON.stringify({ catalog: name, expected, actual: restoredCatalog[name] });
      }
      assertSame(restoredCatalog[name], expected, `Catalog ${name}`);
    }
    await client.query("reset role");
    const proof = { verifiedAt: new Date().toISOString(), backupCapturedAt: manifest.capturedAt, project: PROJECT,
      encryptedBytes: manifest.encryptedBytes, tablesVerified: manifest.tables.length,
      tableRowsVerified: Object.values(manifest.rows).reduce((n, table) => n + table.rows, 0),
      migrations: manifest.migration, catalogChecks: Object.keys(manifest.schema),
      visibilityContexts: manifest.access.length, dataAndSignatureDigestsMatch: true,
      wrongKeyAndTamperingRejected: true, anonymousAndUnrelatedReadDenied: true,
      permissionsAndOwnersMatch: true, networkListener: false, seconds: Math.round((Date.now()-started)/1000),
      storageObjects: manifest.storage.objects, vaultSecrets: manifest.storage.vault_secrets,
      limits: ["No hosted GoTrue/login/email/PDF test", "Managed extension schemas not locally restored",
        "No Storage files currently exist", "No project API keys, SMTP secrets or provider configuration",
        "Database login passwords deliberately not copied", "No off-device key or backup", "No backup schedule"] };
    await client.end(); client = undefined;
    run(join(bin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
    running = false;
    rmSync(temp, { recursive: true });
    activeRestore = undefined;
    writePrivate(join(runDirectory, `restore-proof-${Date.now()}.json`), Buffer.from(JSON.stringify({ ...proof, plaintextTestDirectoryRemoved: true }, null, 2)));
    console.log(JSON.stringify({ stage: "restore_verified", ...proof, plaintextTestDirectoryRemoved: true }));
  } finally {
    dump.fill(0);
    if (client) await client.end().catch(() => {});
    if (running) run(join(bin, "pg_ctl"), ["-D", data, "-m", "immediate", "-w", "stop"]);
    rmSync(temp, { recursive: true, force: true });
    activeRestore = undefined;
  }
}

try {
  const [command, directory, ...extra] = process.argv.slice(2);
  if (!["backup", "verify", "backup-and-verify"].includes(command) || extra.length ||
      (command === "verify" ? !directory : directory)) throw new Error("Use backup, backup-and-verify, or verify <backup-directory>");
  privateDirectory(root); privateDirectory(backups);
  recoveryIdentity = await identity(command !== "verify");
  if (command === "verify") {
    runDirectory = realpathSync(directory);
    if (dirname(runDirectory) !== realpathSync(backups)) throw new Error("Verify only accepts this Mac's backup directory");
  } else {
    runDirectory = mkdtempSync(join(backups, `${new Date().toISOString().replaceAll(":", "-")}-`));
    await capture();
  }
  if (command !== "backup") await verify();
} catch (error) {
  if (diagnostic && recoveryIdentity && runDirectory) {
    writePrivate(join(runDirectory, `diagnostic-${Date.now()}.age`), await encrypt(Buffer.from(diagnostic)));
  }
  console.error(JSON.stringify({ stage, failed: true, code: error.code || "verification_failed",
    reason: diagnostic ? "Command failed; raw output withheld" : error.message?.replace(/[^a-zA-Z0-9 ._/-]/g, "").slice(0,140) }));
  process.exitCode = 1;
}
