import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function verifyAccountRetention({ db, report, login, admin, save, load, action, fixture }) {
  const owner = randomUUID(), partner = randomUUID(), draftOwner = randomUUID();
  const createUser = async (id, username) => admin(
    "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
    [id, `${username}@example.test`, { username, display_name: username, legal_name: username }],
  );
  await createUser(owner, "retention_owner");
  await createUser(partner, "retention_partner");
  const tables = ["auth.users", "public.profiles", "public.account_settings", "public.split_sheets",
    "public.split_sheet_collaborators", "public.split_sheet_proposal_versions", "public.split_sheet_responses",
    "public.split_sheet_audit_records", "public.split_sheet_contract_deliveries", "public.split_notifications"];
  const snapshot = async () => {
    const rows = {};
    for (const table of tables) rows[table] = (await admin(`select to_jsonb(t) as row from ${table} t order by to_jsonb(t)::text`)).rows;
    return rows;
  };
  const rejectDeletion = async (label, id) => {
    const before = await snapshot();
    await assert.rejects(admin("delete from auth.users where id=$1", [id]),
      error => error.code === "55000" && /preserve signed split records/.test(error.message));
    assert.deepEqual(await snapshot(), before, `${label}: deletion partially changed data`);
    report.checks.push(label);
  };
  const input = fixture();
  input.data.parties[1].inviteValue = "@retention_partner";
  await login(owner);
  let doc = await save(input);
  await login(partner);
  doc = await action(await load(doc.id), "invite_accept");
  doc = await action(doc, "split_accept");
  doc = await action(doc, "sign");
  await rejectDeletion("Retention: partially signed participant deletion rejected without any cascades", partner);
  await rejectDeletion("Retention: partially signed creator deletion preserves another person's signature", owner);

  await login(partner);
  const counter = await load(doc.id);
  counter.data.parties[0].percent = 50;
  counter.data.parties[1].percent = 50;
  doc = await action(counter, "counter_offer");
  assert.ok(doc.splitSignatures.filter(s => s.proposalVersionId === doc.currentProposalId).every(s => s.status === "Pending"));
  await rejectDeletion("Retention: prior-version signatures stay protected after a counter resets active consent", partner);
  await login(owner);
  doc = await action(await load(doc.id), "split_accept");
  doc = await action(doc, "sign");
  await login(partner);
  doc = await action(await load(doc.id), "sign");
  assert.equal(doc.status, "Verified and Stored");
  await rejectDeletion("Retention: finalized creator deletion preserves Auth/profile/settings and all split evidence", owner);
  await rejectDeletion("Retention: finalized collaborator deletion cannot cascade into signature response rows", partner);
  await admin("create role supabase_auth_admin");
  await admin("grant usage on schema auth to supabase_auth_admin");
  await admin("grant select,delete on auth.users to supabase_auth_admin");
  const beforeAuthAdmin = await snapshot();
  await db.exec("reset role; begin; set local role supabase_auth_admin");
  try {
    await assert.rejects(db.query("delete from auth.users where id=$1", [partner]),
      error => error.code === "55000" && /preserve signed split records/.test(error.message));
  } finally {
    await db.exec("rollback");
    await login(owner);
  }
  assert.deepEqual(await snapshot(), beforeAuthAdmin);
  report.checks.push("Retention: limited Auth-admin role reaches the guard without needing private-schema or split-table grants");
  const signatures = (await admin("select responder_user_id from public.split_sheet_responses where split_sheet_id=$1 and proposal_version_id=$2 and response_type='signature'", [doc.id, doc.currentProposalId])).rows;
  assert.deepEqual(signatures.map(row => row.responder_user_id).sort(), [owner, partner].sort());
  for (const id of [owner, partner]) {
    await login(id);
    assert.deepEqual((await load(doc.id)).splitSignatures, doc.splitSignatures);
  }
  report.checks.push("Retention: both signers retain canonical read/export data after rejected deletions");

  // The guard must not change existing deletion behavior for genuinely unsigned accounts.
  await createUser(draftOwner, "retention_draft");
  await login(draftOwner);
  const draft = await save(fixture(), "draft");
  await admin("insert into public.account_settings(user_id) values($1) on conflict do nothing", [draftOwner]);
  await admin("delete from auth.users where id=$1", [draftOwner]);
  assert.equal((await admin("select user_id from public.profiles where user_id=$1", [draftOwner])).rows.length, 0);
  assert.equal((await admin("select user_id from public.account_settings where user_id=$1", [draftOwner])).rows.length, 0);
  assert.equal((await admin("select id from public.split_sheets where id=$1", [draft.id])).rows.length, 0);
  await login(owner);
  assert.deepEqual((await load(doc.id)).splitSignatures, doc.splitSignatures);
  report.checks.push("Retention: unsigned draft-only account cleanup still works without altering unrelated signed sheets");

  for (const role of ["anon", "authenticated", "service_role"]) {
    const privilege = (await admin("select has_function_privilege($1,'split_private.protect_signed_account_deletion()','execute') as allowed", [role])).rows[0];
    assert.equal(privilege.allowed, false);
  }
  const fn = (await admin("select proconfig,prosecdef from pg_proc where oid='split_private.protect_signed_account_deletion()'::regprocedure")).rows[0];
  assert.equal(fn.prosecdef, true);
  assert.ok(fn.proconfig.some(value => value.startsWith("search_path=")));
  report.checks.push("Retention: private trigger has a fixed search path and no direct client execution grants");
}
