import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { sha256 } from "./safety.mjs";
import { MIGRATIONS_DIRECTORY, SYNTHETIC_TARGET, migrationInventory, readPreparationManifest, requireSyntheticTarget } from "./beta-preparation.mjs";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const D = "44444444-4444-4444-8444-444444444444";
const evidenceTables = ["split_sheets", "split_sheet_collaborators", "split_sheet_proposal_versions", "split_sheet_responses", "split_sheet_audit_records"];

// Inert test substitutes, NOT Supabase extension implementations. No connection,
// provider client, socket listener, file input, or supplied credential is accepted.
const bootstrap = `
  create role anon; create role authenticated; create role service_role; create role supabase_auth_admin;
  create schema auth; create schema extensions; create schema supabase_migrations;
  create table auth.users (id uuid primary key, email text, phone text, email_confirmed_at timestamptz,
    phone_confirmed_at timestamptz, email_change text default '', raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,public to anon,authenticated;
  grant execute on function auth.uid() to anon,authenticated;
  alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
  alter default privileges in schema public grant all on functions to anon,authenticated,service_role;
  create table supabase_migrations.schema_migrations (version text primary key, source_sha256 text not null, local_mode text not null);
  create schema cron; create schema net; create schema vault;
  create table cron.job (jobid bigint generated always as identity primary key, jobname text, schedule text, command text, active boolean default true);
  create function cron.schedule(job_name text,job_schedule text,job_command text) returns bigint language sql as $$
    insert into cron.job(jobname,schedule,command) values(job_name,job_schedule,job_command) returning jobid $$;
  create table net.http_request_queue (id bigint primary key);
  create table net._http_response (id bigint primary key);
  create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer)
    returns bigint language plpgsql as $$begin raise exception 'Synthetic network disabled' using errcode='42501'; end$$;
  -- Test-only transient plaintext. Cleared before archive; no source Vault rows are restored.
  create table vault.secrets (id uuid primary key default gen_random_uuid(),secret text not null,name text unique,description text);
  create view vault.decrypted_secrets as select id,secret as decrypted_secret,name from vault.secrets;
  create function vault.create_secret(value text,secret_name text,secret_description text) returns uuid language sql as $$
    insert into vault.secrets(secret,name,description) values(value,secret_name,secret_description) returning id $$;
  revoke all on schema cron,net,vault,supabase_migrations from public,anon,authenticated,service_role;
`;

async function replayMigrations(db, inventory, excludeVaultValues = false) {
  await db.exec(bootstrap);
  // A fresh archive builder cannot persist even its generated fixture secret.
  // DELETE is not sufficient to erase dead secret bytes from a physical image.
  if (excludeVaultValues) await db.exec(`create or replace function vault.create_secret(value text,secret_name text,secret_description text)
    returns uuid language sql as $$select gen_random_uuid()$$`);
  for (const migration of inventory) {
    let sql = readFileSync(`${MIGRATIONS_DIRECTORY}/${migration.name}`, "utf8");
    if (migration.localMode === "inert-platform-shim") {
      sql = sql.replace(/^create extension if not exists (pg_cron|pg_net|supabase_vault).*;$/gm, "-- Inert local platform substitute; managed extension not executed.");
    }
    await db.exec(sql);
    await db.query("insert into supabase_migrations.schema_migrations values($1,$2,$3)", [migration.name.slice(0,14), migration.sha256, migration.localMode]);
  }
}

async function copySyntheticApplicationState(source, destination) {
  const tables = ["auth.users", ...(await source.query(`select n.nspname||'.'||c.relname name from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','split_private') and c.relkind='r' order by 1`)).rows.map(t => t.name)];
  // Restricted to known fixture schemas: no Vault, cron, transport or provider data.
  assert.ok(tables.every(t => /^(auth\.users|(?:public|split_private)\.[a-z_]+)$/.test(t)));
  await destination.exec(`set session_replication_role=replica; truncate table ${tables.join(",")} cascade`);
  for (const table of tables) {
    const records = (await source.query(`select coalesce(jsonb_agg(to_jsonb(t)),'[]') records from ${table} t`)).rows[0].records;
    await destination.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table},$1::jsonb)`, [records]);
  }
  await destination.exec("set session_replication_role=origin");
}

async function login(db, id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || ""]);
  await db.exec(id ? "set role authenticated" : "set role anon");
}

async function seedAgreement(db, signed) {
  const payload = {
    id: randomUUID(), title: "Synthetic recovery fixture", status: "Draft", data: {
      songTitle: "Synthetic recovery fixture", parties: [
        { id: "creator-party", isCurrentUser: true, legalName: "Synthetic Creator", inviteMethod: "creator", percent: 60 },
        { id: "invitee-party", isCurrentUser: false, legalName: "Synthetic Invitee", inviteMethod: "username", inviteValue: "@recovery_b", percent: 40 },
      ],
    }, creatorProfile: {}, auditTrail: [],
  };
  await login(db, A);
  let doc = (await db.query("select public.upsert_split_sheet_document($1,'send',null) doc", [payload])).rows[0].doc;
  const action = async kind => {
    doc = (await db.query("select public.apply_split_sheet_participant_update($1,$2,$3,null,null,null) doc", [doc.id, doc, kind])).rows[0].doc;
  };
  if (signed) {
    await login(db, B); await action("invite_accept"); await action("split_accept");
    await login(db, A); await action("sign"); await login(db, B); await action("sign");
    assert.equal(doc.status, "Verified and Stored");
    assert.deepEqual(doc.splitSignatures.filter(s => s.status === "Signed").map(s => s.signerUserId).sort(), [A, B]);
  }
  await db.exec("reset role");
  return doc.id;
}

async function evidenceDigest(db) {
  await db.exec("reset role");
  const result = {};
  for (const table of evidenceTables) {
    result[table] = (await db.query(`select encode(extensions.digest(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by id),''),'sha256'),'hex') digest from public.${table} t`)).rows[0].digest;
  }
  return result;
}

async function permissionEvidence(db) {
  await db.exec("reset role");
  const tables = (await db.query(`select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','split_private') and c.relkind='r' order by 1,2`)).rows;
  assert.equal(tables.length, 13); assert.ok(tables.every(t => t.relrowsecurity));
  const grants = (await db.query(`select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,p.prosecdef,p.proconfig,
    p.proname||'('||oidvectortypes(p.proargtypes)||')' signature,
    has_function_privilege('anon',p.oid,'execute') anonymous,has_function_privilege('authenticated',p.oid,'execute') authenticated,
    has_function_privilege('service_role',p.oid,'execute') service
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','split_private') order by 1,2,3`)).rows;
  assert.deepEqual(grants.filter(f => f.nspname === 'public' && f.prosecdef && f.anonymous).map(f => f.proname), ["is_signup_username_available"]);
  const api = readPreparationManifest().dataApi;
  assert.deepEqual(grants.filter(f => f.nspname === 'public' && f.prosecdef && f.authenticated).map(f => f.signature).sort(),
    [...api.authenticatedRpc,...api.anonymousDefinerRpc].sort());
  for (const signature of api.serviceOnlyRpc) {
    const rpc = grants.find(f => f.nspname === 'public' && f.signature === signature);
    assert.ok(rpc && rpc.service && !rpc.anonymous && !rpc.authenticated);
  }
  for (const role of ["anon", "authenticated"]) {
    const checks = (await db.query(`select has_column_privilege($1,'public.split_sheets','document_payload','select') raw_document,
      has_function_privilege($1,'public.claim_split_invitation_emails(text)','execute') worker,
      has_schema_privilege($1,'split_private','usage') private,has_schema_privilege($1,'vault','usage') vault,
      has_schema_privilege($1,'net','usage') network`, [role])).rows[0];
    assert.ok(Object.values(checks).every(v => v === false));
    for (const table of [...evidenceTables,"split_sheet_contract_deliveries","split_notifications"]) {
      const writes = (await db.query("select has_table_privilege($1,$2,'insert,update,delete') allowed", [role,`public.${table}`])).rows[0];
      assert.equal(writes.allowed, false);
    }
  }
  const contexts = [];
  for (const id of [null, A, B, C, D]) {
    await login(db, id);
    const visible = id ? (await db.query("select count(*)::int count from public.load_my_split_sheets()")).rows[0].count : null;
    if (id === C || id === D) assert.equal(visible, 0);
    if (id === A || id === B) assert.equal(visible, 2);
    if (!id) await assert.rejects(db.query("select * from public.load_my_split_sheets()"), e => e.code === "42501");
    contexts.push({ context: id === null ? "anonymous" : id === A ? "creator" : id === B ? "invitee" : id === C ? "outsider" : "unknown-account", visible });
  }
  await db.exec("reset role");
  return { tables, grants, contexts };
}

async function quiesce(db) {
  await db.exec(`reset role;
    update split_private.invitation_email_config set enabled=false,activated_at=null,worker_url=null,worker_token_hash=null;
    update cron.job set active=false;
    delete from net.http_request_queue;
    update split_private.invitation_emails set status='skipped',error_code='recovery_quarantine',lease_id=null,lease_until=null
      where status in ('waiting_address','queued','processing');
    delete from vault.secrets;
  `);
}

async function assertQuiescent(db) {
  await db.exec("reset role");
  const checks = (await db.query(`select
    (select count(*)::int from cron.job where active) active_jobs,
    (select count(*)::int from net.http_request_queue) network_queue,
    (select count(*)::int from split_private.invitation_emails where status in ('waiting_address','queued','processing')) pending_emails,
    (select enabled from split_private.invitation_email_config where singleton) invitations,
    (select worker_url is not null from split_private.invitation_email_config where singleton) worker_url`)).rows[0];
  assert.deepEqual(checks, { active_jobs: 0, network_queue: 0, pending_emails: 0, invitations: false, worker_url: false });
  assert.equal((await db.query("select split_private.dispatch_invitation_emails(true) request")).rows[0].request, null);
  // Independent denial even if a caller directly reaches the inert transport.
  await assert.rejects(db.query("select net.http_post('https://invalid.example','{}','{}',1000)"), e => e.code === "42501");
  return checks;
}

function seal(bytes, key, context) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify(context)));
  return { iv, bytes: Buffer.concat([cipher.update(bytes), cipher.final()]), tag: cipher.getAuthTag(), context };
}

function open(archive, key, expected) {
  requireSyntheticTarget(expected.target);
  if (JSON.stringify(archive.context) !== JSON.stringify(expected)) throw new Error("Synthetic archive target or migration mismatch");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, archive.iv);
    decipher.setAAD(Buffer.from(JSON.stringify(expected))); decipher.setAuthTag(archive.tag);
    return Buffer.concat([decipher.update(archive.bytes), decipher.final()]);
  } catch { throw new Error("Synthetic archive authentication failed"); }
}

export async function runSyntheticRecovery() {
  let source, archiveBuilder, restored, stage = "manifest", plain, decrypted, key;
  try {
    readPreparationManifest();
    const inventory = migrationInventory();
    stage = "synthetic_migration_replay";
    source = new PGlite({ extensions: { pgcrypto } });
    await replayMigrations(source, inventory);
    // Establish baseline with real guarded RPCs and synthetic identities only.
    await source.exec("update cron.job set active=false");
    stage = "canonical_synthetic_signatures";
    for (const [id, username, legal] of [[A,"recovery_a","Synthetic Creator"],[B,"recovery_b","Synthetic Invitee"],[C,"recovery_c","Synthetic Outsider"]]) {
      await source.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)",
        [id, `${username}@example.test`, { username, legal_name: legal, display_name: legal, profile_visibility: "Private" }]);
    }
    await seedAgreement(source, true);
    const pendingId = await seedAgreement(source, false);
    await source.query(`insert into split_private.invitation_emails(collaborator_id,split_sheet_id,creator_user_id,recipient_email,work_title,inviter_name,status,lease_id,lease_until)
      select id,split_sheet_id,$1,'recovery_b@example.test','Synthetic recovery fixture','Synthetic Creator','processing',gen_random_uuid(),now()+interval '5 minutes'
      from public.split_sheet_collaborators where split_sheet_id=$2 and invite_method<>'creator'`, [A,pendingId]);
    const before = await evidenceDigest(source);
    const previousToken = randomBytes(32).toString("hex");
    await source.query("update split_private.invitation_email_config set enabled=true,worker_url=$1,worker_token_hash=encode(extensions.digest($2,'sha256'),'hex')",
      ["https://synthetic0000000000000.supabase.co/functions/v1/send-split-invitations", previousToken]);
    await source.query("update vault.secrets set secret=$1 where name='split_invitation_worker_token'", [previousToken]);
    assert.equal((await source.query("select count(*)::int count from vault.secrets")).rows[0].count, 1);
    await source.exec("set role service_role");
    assert.equal((await source.query("select public.verify_split_invitation_worker($1) allowed", [previousToken])).rows[0].allowed, true);
    await source.exec("reset role; insert into net.http_request_queue values(1)");
    await source.exec("update cron.job set active=true");
    stage = "outbound_quarantine";
    await quiesce(source); await assertQuiescent(source);
    assert.deepEqual(await evidenceDigest(source), before);
    assert.equal((await source.query("select count(*)::int count from vault.secrets")).rows[0].count, 0);
    const permissions = await permissionEvidence(source);
    stage = "synthetic_application_only_archive_builder";
    archiveBuilder = new PGlite({ extensions: { pgcrypto } });
    await replayMigrations(archiveBuilder, inventory, true);
    await copySyntheticApplicationState(source, archiveBuilder);
    await quiesce(archiveBuilder); await assertQuiescent(archiveBuilder);
    assert.deepEqual(await evidenceDigest(archiveBuilder), before);
    assert.deepEqual(await permissionEvidence(archiveBuilder), permissions);
    stage = "authenticated_synthetic_archive";
    const context = { target: SYNTHETIC_TARGET, migrationDigest: sha256(JSON.stringify(inventory)) };
    plain = Buffer.from(await (await archiveBuilder.dumpDataDir("none")).arrayBuffer());
    assert.equal(plain.includes(Buffer.from(previousToken)), false);
    key = randomBytes(32); const archive = seal(plain, key, context);
    assert.throws(() => open(archive, key, { ...context, target: "hpwquupkqssqqgqtwdyu" }), /Synthetic target/);
    assert.throws(() => open(archive, key, { ...context, target: "https://other.supabase.co" }), /Synthetic target/);
    assert.throws(() => open(archive, key, { ...context, migrationDigest: "different" }), /mismatch/);
    assert.throws(() => open(archive, randomBytes(32), context), /authentication failed/);
    const changed = { ...archive, bytes: Buffer.from(archive.bytes) }; changed.bytes[changed.bytes.length - 1] ^= 1;
    assert.throws(() => open(changed, key, context), /authentication failed/);
    decrypted = open(archive, key, context); assert.equal(sha256(decrypted), sha256(plain));
    stage = "isolated_restore";
    restored = new PGlite({ extensions: { pgcrypto }, loadDataDir: new Blob([decrypted]) });
    await assertQuiescent(restored);
    assert.equal((await restored.query("select count(*)::int count from vault.secrets")).rows[0].count, 0);
    const freshToken = randomBytes(32).toString("hex"); assert.notEqual(freshToken, previousToken);
    // Fresh test secret is independent of the archived source. Parameterized only;
    // not returned, printed, supplied through argv/env, or written to disk.
    await restored.query("select vault.create_secret($1,'split_invitation_worker_token','Synthetic independently supplied worker secret')", [freshToken]);
    await restored.query("update split_private.invitation_email_config set worker_token_hash=encode(extensions.digest($1,'sha256'),'hex') where singleton", [freshToken]);
    await restored.exec("set role service_role");
    assert.equal((await restored.query("select public.verify_split_invitation_worker($1) allowed", [freshToken])).rows[0].allowed, true);
    assert.equal((await restored.query("select public.verify_split_invitation_worker($1) allowed", [previousToken])).rows[0].allowed, false);
    assert.deepEqual((await restored.query("select public.claim_split_invitation_emails($1) jobs", [freshToken])).rows[0].jobs, []);
    stage = "restored_evidence";
    await restored.exec("reset role");
    assert.deepEqual(await evidenceDigest(restored), before);
    assert.deepEqual(await permissionEvidence(restored), permissions);
    // Deliberate synthetic corruption proves checks detect drift, not just a
    // successful round trip. Restore the fixture before final assertions.
    await restored.exec("grant select(document_payload) on public.split_sheets to authenticated");
    await assert.rejects(permissionEvidence(restored), e => e.code === "ERR_ASSERTION");
    await restored.exec("reset role; revoke select(document_payload) on public.split_sheets from authenticated");
    const audit = (await restored.query("select id,action from public.split_sheet_audit_records order by id limit 1")).rows[0];
    await restored.query("update public.split_sheet_audit_records set action='Tampered synthetic evidence' where id=$1", [audit.id]);
    assert.notEqual((await evidenceDigest(restored)).split_sheet_audit_records, before.split_sheet_audit_records);
    await restored.query("update public.split_sheet_audit_records set action=$1 where id=$2", [audit.action,audit.id]);
    assert.deepEqual(await evidenceDigest(restored), before);
    assert.deepEqual(await permissionEvidence(restored), permissions);
    await assertQuiescent(restored);
    assert.equal((await restored.query("select count(*)::int count from supabase_migrations.schema_migrations")).rows[0].count, 32);
    return { mode: "synthetic-local-only", migrationFiles: 32, applicationSqlMigrations: 30, inertPlatformMigrations: 2,
      permissionContexts: 5, applicationRlsTables: 13, signedEvidenceDigestsMatch: true,
      permissionAndEvidenceDriftDetected: true,
      wrongTargetAndMigrationRejected: true, wrongKeyAndTamperingRejected: true,
      syntheticSourceSecretRowsQuarantined: 1, syntheticSourceNetworkRequestsQuarantined: 1,
      fixturePreviousWorkerTokenAbsentFromArchive: true,
      sourceVaultRowsArchived: 0, freshIndependentWorkerSecretVerified: true, previousWorkerSecretRejected: true,
      cronInactive: true, invitationQueueQuarantined: true, directNetworkDenied: true, outboundDeliveryActivated: false,
      limitations: ["In-memory PGlite archive, not a production backup or pg_dump", "Vault/cron/net are inert substitutes, not hosted extension verification",
        "No hosted Auth/API/Storage/Edge Function/provider test", "No off-device copy/key escrow or billing/provisioning"] };
  } catch (error) {
    // Database errors may attach parameters. Never surface them, even for fresh test secrets.
    const code = typeof error.code === "string" && /^[A-Z0-9_]{1,24}$/.test(error.code) ? error.code : "check_failed";
    throw new Error(`Synthetic recovery failed at ${stage} (${code}); data and credentials withheld`);
  } finally {
    plain?.fill(0); decrypted?.fill(0); key?.fill(0);
    await restored?.close(); await archiveBuilder?.close(); await source?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) {
    console.error("Synthetic recovery accepts no arguments, targets, paths or credentials."); process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(await runSyntheticRecovery(), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
