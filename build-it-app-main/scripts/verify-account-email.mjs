import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const legacyOwner = "99999999-1111-4111-8111-111111111111";
export async function seedLegacyAccountEmail(db) {
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'legacy_account@example.test',$2)",
    [legacyOwner, { username: "email_legacy", display_name: "Legacy Artist" }]);
  await db.query("update public.profiles set email='wrong@example.test',profile_data=$1 where user_id=$2",
    [{ emailAddress: "wrong@example.test", publisherName: "Legacy Publisher", displayName: "Legacy Artist" }, legacyOwner]);
}

// This verifies PostgreSQL triggers and RLS, not GoTrue email delivery.
export async function verifyAccountEmail({ db, report, admin, login, save, action, load, fixture }) {
  const legacy = (await admin("select email,profile_data from public.profiles where user_id=$1", [legacyOwner])).rows[0];
  assert.equal(legacy.email, "legacy_account@example.test");
  assert.deepEqual(legacy.profile_data, { emailAddress: "legacy_account@example.test", publisherName: "Legacy Publisher", displayName: "Legacy Artist" });
  report.checks.push("Email: migration repairs existing mismatched profile emails without discarding other profile data");
  const owner = randomUUID();
  const other = randomUUID();
  const oldEmail = "email_owner@example.test";
  const newEmail = "email_confirmed@example.test";
  const read = async () => (await admin("select email,profile_data,display_name,publisher_name from public.profiles where user_id=$1", [owner])).rows[0];
  await admin("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)", [owner, oldEmail,
    { username: "email_owner", display_name: "Email Owner", email: "forged@example.test", profile_data: { emailAddress: "forged@example.test", publishingShare: "legacy value" } }]);
  await admin("insert into auth.users(id,email,raw_user_meta_data) values($1,'email_other@example.test',$2)",
    [other, { username: "email_other", legal_name: "Email Partner" }]);
  assert.equal((await read()).email, oldEmail);
  assert.equal((await read()).profile_data.emailAddress, oldEmail);
  report.checks.push("Email: signup profile uses Auth email rather than editable signup metadata");

  await login(owner);
  await db.query("update public.profiles set email=$1, profile_data=profile_data || $2, display_name='Edited Artist', publisher_name='Legacy Publisher' where user_id=$3",
    [newEmail, { emailAddress: newEmail, ipiNumber: "0012345" }, owner]);
  assert.equal((await read()).email, oldEmail);
  assert.equal((await read()).profile_data.emailAddress, oldEmail);
  assert.equal((await read()).display_name, "Edited Artist");
  assert.equal((await read()).profile_data.ipiNumber, "0012345");
  assert.equal((await admin("select email from auth.users where id=$1", [owner])).rows[0].email, oldEmail);
  report.checks.push("Email: direct profile writes cannot change sign-in email; unrelated edits still save");

  await admin("update auth.users set email_change=$1 where id=$2", [newEmail, owner]);
  const pending = await read();
  assert.equal(pending.email, oldEmail);
  assert.equal(pending.profile_data.emailAddress, oldEmail);
  report.checks.push("Email: pending Auth changes leave the current profile address active");

  await db.query("update public.profiles set legal_name='Email Owner' where user_id=$1", [owner]);
  const source = fixture();
  source.data.parties[0].email = oldEmail;
  source.data.parties[1].inviteValue = "@email_other";
  let signed = await save(source);
  await login(other);
  signed = await action(await load(signed.id), "invite_accept");
  signed = await action(signed, "split_accept");
  await login(owner);
  signed = await action(await load(signed.id), "sign");
  await login(other);
  signed = await action(await load(signed.id), "sign");
  assert.equal(signed.status, "Verified and Stored");
  await login(owner);

  const records = async () => (await admin("select id,document_payload from public.split_sheets order by id")).rows;
  const before = await records();
  await admin("update auth.users set email=$1,email_change='' where id=$2", [newEmail, owner]);
  assert.deepEqual(await read(), { ...pending, email: newEmail, profile_data: { ...pending.profile_data, emailAddress: newEmail } });
  assert.deepEqual(await records(), before);
  assert.equal((await load(signed.id)).status, "Verified and Stored");
  assert.deepEqual((await load(signed.id)).splitSignatures, signed.splitSignatures);
  await login(other);
  assert.equal((await load(signed.id)).status, "Verified and Stored");
  await login(owner);
  report.checks.push("Email: confirmed Auth updates synchronize profile column/JSON without rewriting split documents or legacy publishing fields");

  // A stale form saved after confirmation cannot restore the previous address.
  await db.query("update public.profiles set email=$1,profile_data=profile_data || $2 where user_id=$3", [oldEmail, { emailAddress: oldEmail }, owner]);
  assert.equal((await read()).email, newEmail);
  assert.equal((await read()).profile_data.emailAddress, newEmail);
  report.checks.push("Email: stale profile saves cannot revert a confirmed account email");

  await login(other);
  const unchanged = await read();
  const result = await db.query("update public.profiles set email='intruder@example.test' where user_id=$1 returning user_id", [owner]);
  assert.equal(result.rows.length, 0);
  assert.deepEqual(await read(), unchanged);
  await assert.rejects(db.query("update auth.users set email='intruder@example.test' where id=$1", [owner]), error => error.code === "42501");
  const functions = (await admin(`select p.proname, p.proconfig, has_function_privilege('anon',p.oid,'execute') as anon_access,
    has_function_privilege('authenticated',p.oid,'execute') as user_access from pg_proc p join pg_namespace n on p.pronamespace=n.oid
    where n.nspname='split_private' and p.proname in ('canonical_profile_email','sync_profile_account_email')`)).rows;
  assert.equal(functions.length, 2);
  for (const fn of functions) {
    assert.equal(fn.anon_access, false);
    assert.equal(fn.user_access, false);
    assert.ok(fn.proconfig.includes('search_path=""'));
  }
  report.checks.push("Email: cross-account writes and client Auth-table updates are blocked; internal email triggers are not callable by clients");

  await admin("update auth.users set email=null where id=$1", [owner]);
  assert.equal((await read()).email, null);
  assert.equal((await read()).profile_data.emailAddress, "");
  report.checks.push("Email: accounts without an Auth email cannot fall back to stale profile metadata");
}
