import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { makeDocument } from "../src/test/fixtures/splitSheet.ts";

// Uses the disposable database and real RPCs from verify-database.mjs.
export async function verifySplitPrivacy({ db, report, login, admin, load, save, action, fixture }) {
  const owner = randomUUID();
  const collaborator = randomUUID();
  const stranger = randomUUID();
  const users = [[owner, "privacy_owner"], [collaborator, "privacy_partner"], [stranger, "privacy_stranger"]];
  for (const [id, username] of users) {
    await admin("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [id, `${username}@example.test`, { username, display_name: username, legal_name: `${username} Legal` }]);
    await admin("update public.profiles set profile_visibility='Collaborators only', profile_location=null, city='PRIVATE_CITY', state='PRIVATE_STATE', country='PRIVATE_COUNTRY' where user_id=$1", [id]);
  }
  const search = async (query) => (await db.query("select * from public.search_split_profiles($1,20)", [query])).rows;
  const visible = async (id, query = "privacy_") => (await search(query)).some(row => row.user_id === id);
  const setVisibility = (value) => admin("update public.profiles set profile_visibility=$1 where user_id=$2", [value, owner]);
  const raw = async (id) => (await admin("select document_payload from public.split_sheets where id=$1", [id])).rows[0].document_payload;
  const expectNoSecrets = (doc, secrets) => {
    const text = JSON.stringify(doc);
    for (const secret of secrets) assert.ok(!text.includes(secret), `Shared response leaked ${secret}`);
  };
  await login(stranger);
  assert.equal(await visible(owner), false);
  assert.equal(await visible(owner, "privacy_owner@example.test"), false);
  assert.equal(await visible(stranger), true);
  await setVisibility("Public");
  assert.equal(await visible(owner), true);
  assert.equal((await search("privacy_owner"))[0].profile_location, null);
  await admin("update public.profiles set profile_location='Public hometown' where user_id=$1", [owner]);
  assert.equal((await search("privacy_owner"))[0].profile_location, "Public hometown");
  for (const visibility of ["Private", null, "unknown", "Collaborators only"]) {
    await setVisibility(visibility);
    assert.equal(await visible(owner), false, `${visibility} exposed an unrelated profile`);
  }
  report.checks.push("Privacy: public/self search works; unrelated private/collaborators-only profiles and legal location stay hidden");

  await login(owner);
  const source = fixture();
  const defaults = makeDocument();
  source.data = { ...defaults.data, ...source.data,
    parties: source.data.parties.map((party, index) => ({ ...defaults.data.parties[index], ...party })) };
  source.creatorProfile = { ...defaults.creatorProfile, ...source.creatorProfile, emailAddress: "OWNER_EMAIL_SECRET", phoneNumber: "OWNER_PHONE_SECRET",
    legalAddress: "OWNER_ADDRESS_SECRET", publisherName: "OWNER_PUBLISHER_SECRET", adminCompanyName: "OWNER_ADMIN_SECRET" };
  Object.assign(source.data.parties[0], { email: "OWNER_EMAIL_SECRET", phoneNumber: "OWNER_PHONE_SECRET",
    publisherName: "OWNER_PUBLISHER_SECRET", publisherContact: "OWNER_PUBLISHER_CONTACT_SECRET", proAffiliation: "ASCAP", ipiNumber: "123456789" });
  Object.assign(source.data.parties[1], { inviteValue: "@privacy_partner", email: "PARTNER_EMAIL_SECRET", phoneNumber: "PARTNER_PHONE_SECRET",
    publisherName: "PARTNER_PUBLISHER_SECRET", registrationNotes: "PARTNER_ROUTING_SECRET", proAffiliation: "BMI", ipiNumber: "987654321" });
  source.data.accountSnapshot = { address: "NESTED_ACCOUNT_SECRET" };
  source.privateSnapshot = { address: "EXTRA_ACCOUNT_SECRET" };
  let doc = await save(source, "draft");
  const qa = { draft: structuredClone(doc) };
  assert.equal(doc.data.parties[1].publisherName, "PARTNER_PUBLISHER_SECRET");
  await login(collaborator);
  assert.equal(await load(doc.id), undefined);
  assert.equal(await visible(owner), false, "Unsent draft created a search relationship");
  await login(owner);
  doc = await save(doc);
  assert.equal(doc.collaboratorInvites[0].collaboratorUserId, collaborator, "Exact hidden username did not resolve");
  const ownerSecrets = ["OWNER_EMAIL_SECRET", "OWNER_PHONE_SECRET", "OWNER_ADDRESS_SECRET", "OWNER_PUBLISHER_SECRET", "OWNER_ADMIN_SECRET", "OWNER_PUBLISHER_CONTACT_SECRET"];
  const partnerSecrets = ["PARTNER_EMAIL_SECRET", "PARTNER_PHONE_SECRET", "PARTNER_PUBLISHER_SECRET", "PARTNER_ROUTING_SECRET"];
  expectNoSecrets(doc, [...partnerSecrets, "NESTED_ACCOUNT_SECRET", "EXTRA_ACCOUNT_SECRET"]);
  assert.equal(doc.creatorProfile.emailAddress, "OWNER_EMAIL_SECRET");
  assert.equal((await raw(doc.id)).data.parties[1].publisherName, "PARTNER_PUBLISHER_SECRET");
  await login(collaborator);
  assert.equal(await visible(owner), false, "Pending invitation created a search relationship");
  doc = await load(doc.id);
  qa.pending = structuredClone(doc);
  expectNoSecrets(doc, [...ownerSecrets, "NESTED_ACCOUNT_SECRET", "EXTRA_ACCOUNT_SECRET"]);
  assert.equal(doc.data.parties[1].publisherName, "PARTNER_PUBLISHER_SECRET");
  assert.equal(doc.data.parties[0].proAffiliation, "ASCAP");
  assert.equal(doc.data.parties[0].ipiNumber, "123456789");
  assert.deepEqual(Object.keys(doc.data).sort(), Object.keys(source.data).filter(key => key !== "accountSnapshot").sort());
  assert.deepEqual(doc.data.parties.map(party => party.percent), [60, 40]);
  report.checks.push("Privacy: drafts stay owner-only; exact-username invites resolve; shared load/send responses hide other parties' contact and publishing data");

  doc = await action(doc, "invite_accept");
  qa.accepted = structuredClone(doc);
  expectNoSecrets(doc, ownerSecrets);
  assert.equal(await visible(owner), true);
  await login(owner);
  assert.equal(await visible(collaborator), true);
  await login(stranger);
  assert.equal(await load(doc.id), undefined);
  assert.equal(await visible(owner), false);
  await login(collaborator);
  await setVisibility("Private");
  assert.equal(await visible(owner), false);
  await setVisibility(null);
  assert.equal(await visible(owner), true);
  await setVisibility("Collaborators only");
  report.checks.push("Privacy: only accepted collaborators on sent sheets become searchable; private profiles remain hidden even then");

  doc = await action(doc, "local_chat", "Privacy workflow message");
  expectNoSecrets(doc, ownerSecrets);
  doc.data.parties[0].percent = 55;
  doc.data.parties[1].percent = 45;
  doc = await action(doc, "counter_offer", "A revised allocation");
  qa.counter = structuredClone(doc);
  expectNoSecrets(doc, ownerSecrets);
  await login(owner);
  doc = await action(await load(doc.id), "split_accept");
  expectNoSecrets(doc, partnerSecrets);
  doc = await action(doc, "sign");
  expectNoSecrets(doc, partnerSecrets);
  await login(collaborator);
  doc = await action(await load(doc.id), "sign");
  assert.equal(doc.status, "Verified and Stored");
  qa.signed = structuredClone(doc);
  expectNoSecrets(doc, ownerSecrets);
  const stored = await raw(doc.id);
  assert.equal(stored.creatorProfile.legalAddress, "OWNER_ADDRESS_SECRET");
  assert.equal(stored.data.parties[1].publisherName, "PARTNER_PUBLISHER_SECRET");
  for (const who of [owner, collaborator]) {
    await login(who);
    const signed = await load(doc.id);
    assert.deepEqual(signed.splitSignatures, stored.splitSignatures);
    assert.deepEqual(signed.auditTrail, stored.auditTrail);
    expectNoSecrets(signed, who === owner ? partnerSecrets : ownerSecrets);
  }
  assert.deepEqual(await raw(doc.id), stored, "Privacy projection rewrote a signed document");
  report.checks.push("Privacy: acceptance, chat, counter, approval, signing and final reload all redact correctly without changing stored signatures/history");

  for (const [table, column] of [
    ["split_sheets", "document_payload"], ["split_sheet_collaborators", "invite_email"],
    ["split_sheet_proposal_versions", "allocations"], ["split_sheet_responses", "notes"],
    ["split_sheet_audit_records", "metadata"], ["split_sheet_contract_deliveries", "payload"],
  ]) {
    assert.equal((await db.query("select has_column_privilege('authenticated',$1,$2,'select') as allowed", [`public.${table}`, column])).rows[0].allowed, false);
    await assert.rejects(() => db.query(`select ${column} from public.${table}`), error => error.code === "42501");
  }
  assert.equal((await db.query("select has_schema_privilege('authenticated','split_private','usage') as allowed")).rows[0].allowed, false);
  await assert.rejects(() => db.query("select split_private.visible_document($1)", [stored]), error => error.code === "42501");
  assert.ok((await db.query("select id,status from public.split_sheets where id=$1", [doc.id])).rows.length);
  assert.equal((await db.query("select user_id from public.profiles where user_id=$1", [owner])).rows.length, 0);
  report.checks.push("Privacy: raw sensitive columns and internal projection/writer functions cannot bypass the authenticated RPC");

  await login(owner);
  const emailInvite = fixture();
  Object.assign(emailInvite.data.parties[1], { inviteMethod: "email", inviteValue: "external@example.test",
    email: "external@example.test", professionalName: "external@example.test", legalName: "" });
  emailInvite.collaborators = ["external@example.test"];
  const emailDoc = await save(emailInvite);
  expectNoSecrets(emailDoc, ["external@example.test"]);
  assert.equal((await raw(emailDoc.id)).data.parties[1].email, "external@example.test");
  const legacy = await raw(emailDoc.id);
  legacy.collaboratorInvites[0].profileSnapshot = { displayName: "external@example.test", email: "external@example.test",
    phoneNumber: "OLD_PRIVATE_PHONE", legalAddress: "OLD_PRIVATE_ADDRESS" };
  await admin("update public.split_sheets set document_payload=$1 where id=$2", [legacy, legacy.id]);
  expectNoSecrets(await load(legacy.id), ["external@example.test", "OLD_PRIVATE_PHONE", "OLD_PRIVATE_ADDRESS"]);
  legacy.collaboratorInvites[0].profileSnapshot = null;
  await admin("update public.split_sheets set document_payload=$1 where id=$2", [legacy, legacy.id]);
  assert.ok(await load(legacy.id));
  report.checks.push("Privacy: legacy contact snapshots and automatic email display labels are hidden; null snapshots remain readable");
  await login(stranger);
  await db.query("update public.profiles set email='external@example.test', phone_number='2025550100', phone_country_code='+1' where user_id=$1", [stranger]);
  assert.equal(await load(emailDoc.id), undefined, "Editable profile email claimed another person's invite");
  await admin("update auth.users set email='external@example.test', email_confirmed_at=null where id=$1", [stranger]);
  assert.equal(await load(emailDoc.id), undefined, "Unverified Auth email claimed an invite");
  await admin("update auth.users set email_confirmed_at=now() where id=$1", [stranger]);
  assert.equal((await load(emailDoc.id)).collaboratorInvites[0].collaboratorUserId, stranger);
  await login(owner);
  emailInvite.id = randomUUID();
  assert.equal((await save(emailInvite)).collaboratorInvites[0].collaboratorUserId, stranger);
  const phoneInvite = fixture();
  Object.assign(phoneInvite.data.parties[1], { inviteMethod: "phone", inviteValue: "+1 202-555-0100", phoneNumber: "+1 202-555-0100" });
  const phoneDoc = await save(phoneInvite);
  await login(stranger);
  assert.equal(await load(phoneDoc.id), undefined, "Editable profile phone claimed an invite");
  await admin("update auth.users set phone='+12025550100', phone_confirmed_at=null where id=$1", [stranger]);
  assert.equal(await load(phoneDoc.id), undefined);
  await admin("update auth.users set phone='+442025550100', phone_confirmed_at=now() where id=$1", [stranger]);
  assert.equal(await load(phoneDoc.id), undefined, "Phone matching ignored country code");
  await admin("update auth.users set phone='+12025550100' where id=$1", [stranger]);
  assert.equal((await load(phoneDoc.id)).collaboratorInvites[0].collaboratorUserId, stranger);
  report.checks.push("Privacy: editable or unverified contact details cannot claim invites; verified Auth contacts resolve pending and new invites with full phone country codes");
  await login(owner);
  const declinedInvite = fixture();
  declinedInvite.data.parties[1].inviteValue = "@privacy_stranger";
  const declined = await save(declinedInvite);
  await login(stranger);
  await action(await load(declined.id), "invite_decline");
  assert.equal(await visible(owner), false, "Declining an invitation established profile access");
  report.checks.push("Privacy: declined invitations do not establish search access");
  if (process.env.SPLIT_PRIVACY_QA_OUTPUT) {
    writeFileSync(process.env.SPLIT_PRIVACY_QA_OUTPUT, JSON.stringify({ ...qa,
      viewer: { ...defaults.creatorProfile, authUserId: collaborator, username: "privacy_partner", displayName: "Privacy Partner",
        legalName: "Privacy Partner", legalFirstName: "Privacy", legalLastName: "Partner", emailAddress: "privacy_partner@example.test" },
    }, null, 2));
  }
}
