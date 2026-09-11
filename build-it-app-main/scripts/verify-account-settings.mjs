import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ROLE_OPTIONS } from "../src/components/contract-builder/types.ts";

export async function verifyAccountSettings({ db, report, login, admin, fixture, save, load }) {
  const owner = randomUUID(), other = randomUUID();
  for (const id of [owner, other]) await admin("insert into auth.users(id,email) values($1,$2)", [id, `${id}@example.test`]);
  const snapshot = async () => (await admin("select document_payload from public.split_sheets order by id")).rows;
  const before = await snapshot();
  const read = async () => (await db.query("select * from public.account_settings")).rows;
  const reject = async (label, operation, code) => {
    const beforeSettings = (await admin("select * from public.account_settings order by user_id")).rows;
    await assert.rejects(operation, error => error.code === code, label);
    assert.deepEqual((await admin("select * from public.account_settings order by user_id")).rows, beforeSettings);
    report.checks.push(label);
  };
  await login(null);
  await reject("Settings: anonymous reads denied", read, "42501");
  await login(owner);
  assert.deepEqual(await read(), []);
  await db.query("insert into public.account_settings(user_id) values($1)", [owner]);
  assert.equal((await read())[0].default_user_role, "Songwriter");
  assert.equal((await read())[0].default_split_method, "Custom");
  assert.equal((await read())[0].include_audit_trail, true);
  await reject("Settings: another account cannot be targeted by insert", () => db.query("insert into public.account_settings(user_id) values($1)", [other]), "42501");
  await reject("Settings: duplicate first save cannot replace another tab's values", () => db.query("insert into public.account_settings(user_id) values($1)", [owner]), "23505");
  for (const [field, value] of [["user_id", other], ["revision", 90], ["updated_at", "2020-01-01"]]) {
    await reject(`Settings: client cannot write ${field}`, () => db.query(`update public.account_settings set ${field}=$1 where user_id=$2`, [value, owner]), "42501");
  }
  await reject("Settings: delete is not exposed", () => db.query("delete from public.account_settings where user_id=$1", [owner]), "42501");
  for (const [field, value] of [["default_split_method", "Role-based"], ["default_user_role", "Engineer"], ["default_territory", " "], ["default_territory", "x".repeat(101)]]) {
    await reject(`Settings: rejects invalid ${field} (${value.length} characters)`, () => db.query(`update public.account_settings set ${field}=$1 where user_id=$2`, [value, owner]), "23514");
  }
  await reject("Settings: audit preference cannot be null", () => db.query("update public.account_settings set include_audit_trail=null where user_id=$1", [owner]), "23502");
  const updated = (await db.query("update public.account_settings set default_split_method='Equal', default_territory='Canada',default_user_role='Composer',include_audit_trail=false where user_id=$1 and revision=1 returning *", [owner])).rows[0];
  assert.equal(updated.revision, 2);
  assert.equal(updated.default_territory, "Canada");
  assert.equal(updated.include_audit_trail, false);
  const stale = await db.query("update public.account_settings set default_split_method='Custom' where user_id=$1 and revision=1 returning *", [owner]);
  assert.equal(stale.rows.length, 0);
  assert.equal((await read())[0].default_split_method, "Equal");
  report.checks.push("Settings: successful saves advance server revision; stale-tab updates change nothing");
  for (const role of ROLE_OPTIONS) await db.query("update public.account_settings set default_user_role=$1 where user_id=$2", [role, owner]);
  report.checks.push("Settings: every supported composition role is accepted by the database");
  await login(other);
  assert.deepEqual(await read(), []);
  assert.equal((await db.query("update public.account_settings set include_audit_trail=true where user_id=$1 returning *", [owner])).rows.length, 0);
  await db.query("insert into public.account_settings(user_id) values($1)", [other]);
  assert.equal((await read()).length, 1); assert.equal((await read())[0].user_id, other);
  assert.equal((await read())[0].include_audit_trail, true);
  assert.deepEqual(await snapshot(), before);
  report.checks.push("Settings: accounts cannot read/update each other's preferences; saving leaves all split records untouched");
  assert.equal((await admin("select relrowsecurity from pg_class where oid='public.account_settings'::regclass")).rows[0].relrowsecurity, true);
  assert.equal((await admin("select has_function_privilege('authenticated','split_private.advance_settings_revision()','execute') as allowed")).rows[0].allowed, false);
  report.checks.push("Settings: RLS is enabled and the revision trigger is not directly callable");
  await login(owner);
  await db.query("update public.account_settings set default_user_role='Composer' where user_id=$1", [owner]);
  const preferences = (await read())[0];
  const input = fixture();
  input.data.splitType = preferences.default_split_method;
  Object.assign(input.data.parties[0], { role: preferences.default_user_role, societyTerritory: preferences.default_territory });
  const draft = await save(input, "draft");
  const reloaded = await load(draft.id);
  assert.equal(reloaded.data.splitType, "Equal");
  assert.equal(reloaded.data.parties[0].role, "Composer");
  assert.equal(reloaded.data.parties[0].societyTerritory, "Canada");
  report.checks.push("Settings: defaults survive the actual draft-save RPC and privacy-filtered reload");
}
