import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Runs only in verify-database's disposable PostgreSQL, never against user data.
export async function verifySignup({ db, report }) {
  const owner = randomUUID();
  const failed = randomUUID();
  const second = randomUUID();
  const metadata = {
    username: "signup_taken", display_name: "Signup Artist", legal_name: "Signup Tester",
    profile_visibility: "Collaborators only", pro_affiliation: "ASCAP", ipi_number: "123456789",
    terms_accepted_at: "2026-09-15T23:00:00Z", privacy_acknowledged_at: "2026-09-15T23:00:00Z",
    profile_data: { username: "signup_taken", displayName: "Signup Artist", legalName: "Signup Tester" },
  };
  await db.exec("grant usage on schema auth, public to supabase_auth_admin; grant insert on auth.users to supabase_auth_admin;");
  await db.exec("set role supabase_auth_admin");
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [owner, "signup-owner@example.test", metadata]);
  await db.exec("reset role");
  const before = (await db.query("select * from public.profiles where user_id=$1", [owner])).rows;
  assert.equal(before.length, 1);
  assert.equal(before[0].pro_affiliation, "ASCAP");
  assert.equal(before[0].ipi_number, "123456789");
  assert.equal(before[0].profile_data.emailAddress, "signup-owner@example.test");
  report.checks.push("Auth's restricted role creates a complete profile without client writes or email autoconfirmation");

  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    const check = async name => (await db.query("select public.is_signup_username_available($1) as available", [name])).rows[0].available;
    assert.equal(await check("signup_taken"), false);
    assert.equal(await check("signup_unused"), true);
    for (const invalid of [null, "", "ab", "a".repeat(25), "bad handle", "%", "SIGNUP_TAKEN", "@signup_taken"]) {
      assert.equal(await check(invalid), false);
    }
    assert.equal((await db.query("select user_id from public.profiles where user_id=$1", [owner])).rows.length, 0);
    await db.exec("reset role");
  }
  report.checks.push("Signup availability exposes only an exact boolean, including private handles; no profile rows, wildcard search or invalid input");

  await db.exec("set role supabase_auth_admin");
  await assert.rejects(() => db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
    [failed, "signup-other@example.test", { ...metadata, username: "SIGNUP_TAKEN" }]),
  error => error.code === "23505" && error.constraint === "profiles_username_unique_idx");
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
    [second, "signup-other@example.test", { ...metadata, username: "signup_unused", profile_data: { ...metadata.profile_data, username: "signup_unused" } }]);
  await db.exec("reset role");
  assert.equal((await db.query("select id from auth.users where id=$1", [failed])).rows.length, 0);
  assert.deepEqual((await db.query("select * from public.profiles where user_id=$1", [owner])).rows, before);
  assert.equal((await db.query("select username from public.profiles where user_id=$1", [second])).rows[0].username, "signup_unused");
  report.checks.push("Competing/case-variant signup cannot steal a username; transaction leaves no partial account; corrected username succeeds");
}
