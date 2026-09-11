import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { makeDocument } from "../src/test/fixtures/splitSheet.ts";

export async function verifySplitRegistration({ db, report, login, admin, load, save, action, rejectsWithoutWrites }) {
  const owner = randomUUID(), partner = randomUUID(), outsider = randomUUID();
  for (const [id, username, pro, ipi] of [
    [owner, "registration_owner", "ASCAP", "00123456789"],
    [partner, "registration_partner", "BMI", "00987654321"],
    [outsider, "registration_outsider", "SESAC", "00888888888"],
  ]) {
    await admin("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [id, `${username}@example.test`,
      { username, display_name: username, legal_name: `${username} Legal`, pro_affiliation: pro, ipi_number: ipi,
        publisher_name: "ACCOUNT_PRIVATE_PUBLISHER", phone_number: "ACCOUNT_PRIVATE_PHONE" }]);
  }
  const raw = async id => (await admin("select document_payload from public.split_sheets where id=$1", [id])).rows[0].document_payload;
  const fields = party => ({ proAffiliation: party.proAffiliation, customProName: party.customProName, ipiNumber: party.ipiNumber });
  const profile = async (id, pro, custom, ipi, payload = {}) => {
    await login(id);
    await db.query("update public.profiles set pro_affiliation=$1,custom_pro_name=$2,ipi_number=$3,profile_data=$4 where user_id=$5", [pro, custom, ipi, payload, id]);
  };
  const fixture = () => {
    const doc = makeDocument();
    doc.id = randomUUID(); doc.title = "Registration QA"; doc.data.songTitle = "Registration QA";
    doc.creatorUserId = owner; doc.creatorProfile.authUserId = owner;
    doc.data.parties[1].inviteValue = "@registration_partner";
    for (const party of doc.data.parties) Object.assign(party, { proAffiliation: "Unknown", customProName: "", ipiNumber: "" });
    return doc;
  };
  const expectNoPrivateProfile = doc => assert.doesNotMatch(JSON.stringify(doc), /ACCOUNT_PRIVATE_/);
  await login(owner);
  let doc = await save(fixture(), "draft");
  assert.equal(doc.data.parties[1].ipiNumber, "", "Draft guessed another account's registration fields");
  doc = await save(doc);
  const before = await raw(doc.id);
  await login(outsider);
  await rejectsWithoutWrites("Registration: unrelated user cannot accept or import their profile", () => action(doc, "invite_accept"), "42501", /not a participant/);
  await login(partner);
  const forged = structuredClone(doc);
  forged.data.parties.forEach(party => Object.assign(party, { proAffiliation: "Forged PRO", customProName: "Forged", ipiNumber: "99999999999", role: "Forged role" }));
  forged.creatorProfile.proAffiliation = "Forged PRO";
  doc = await action(forged, "invite_accept");
  const accepted = structuredClone(doc);
  assert.deepEqual(fields(doc.data.parties[1]), { proAffiliation: "BMI", customProName: "", ipiNumber: "00987654321" });
  assert.equal(doc.data.parties[1].role, before.data.parties[1].role);
  assert.deepEqual((await raw(doc.id)).data.parties[0], before.data.parties[0]);
  const row = (await admin("select profile_snapshot from public.split_sheet_collaborators where split_sheet_id=$1 and collaborator_user_id=$2", [doc.id, partner])).rows[0];
  assert.equal(row.profile_snapshot.ipiNumber, "00987654321");
  expectNoPrivateProfile(doc);
  assert.match(doc.auditTrail.at(-1).action, /PRO\/IPI updated from account/);
  assert.equal((await load(doc.id)).data.parties[1].ipiNumber, "00987654321");
  report.checks.push("Registration: signup PRO/IPI copies to only the accepting account's party and stored snapshot; client metadata is ignored");

  await profile(partner, "Other", "  Independent Writers Society  ", "  00012345678  ");
  doc = await action(doc, "local_chat", "Registration workflow check");
  assert.equal(doc.data.parties[1].proAffiliation, "BMI", "Chat silently refreshed registration metadata");
  doc = await action(doc, "split_accept");
  const stale = structuredClone(doc);
  doc = await action(doc, "sign");
  const atSigning = { proAffiliation: "Other", customProName: "Independent Writers Society", ipiNumber: "00012345678" };
  assert.deepEqual(fields(doc.data.parties[1]), atSigning);
  const partnerSignature = doc.splitSignatures.find(signature => signature.signerUserId === partner);
  assert.deepEqual(partnerSignature.registrationSnapshot, atSigning);
  await login(owner);
  await rejectsWithoutWrites("Registration: stale signing cannot overwrite a newer registration snapshot", () => action(stale, "sign"), "40001", /Refresh/);
  await profile(partner, "SESAC", "", "00777777777");
  doc = await action(doc, "local_chat", "My signed metadata must stay unchanged");
  assert.deepEqual(fields(doc.data.parties[1]), atSigning);
  await login(owner);
  doc = await action(await load(doc.id), "sign");
  assert.equal(doc.status, "Verified and Stored");
  assert.equal(doc.data.parties[0].ipiNumber, "00123456789");
  assert.deepEqual(fields(doc.data.parties[1]), atSigning);
  expectNoPrivateProfile(doc);
  const finalized = await raw(doc.id);
  await profile(owner, "BMI", "", "00666666666");
  for (const id of [owner, partner]) {
    await login(id);
    assert.deepEqual((await load(doc.id)).splitSignatures, finalized.splitSignatures);
    assert.deepEqual(fields((await load(doc.id)).data.parties[1]), atSigning);
  }
  await rejectsWithoutWrites("Registration: finalized records cannot be refreshed from a changed profile", () => action(doc, "sign"), "55000", /Signed records/);
  assert.deepEqual(await raw(doc.id), finalized);
  report.checks.push("Registration: signing captures latest custom PRO and leading-zero IPI; other signers, chat, reloads and later profile edits leave that snapshot intact");

  for (const value of [null, "", "  ", "Unknown"]) {
    await login(owner);
    const input = fixture();
    Object.assign(input.data.parties[1], { proAffiliation: "Other", customProName: "Recorded Society", ipiNumber: "00011122233" });
    let blank = await save(input);
    await profile(partner, value, "", "");
    blank = await action(blank, "invite_accept");
    assert.deepEqual(fields(blank.data.parties[1]), { proAffiliation: "Other", customProName: "Recorded Society", ipiNumber: "00011122233" });
  }
  await login(owner);
  let legacy = await save(fixture());
  await profile(partner, null, null, null, { proAffiliation: "Other", customProName: "Legacy Society", ipiNumber: "00044455566" });
  legacy = await action(legacy, "invite_accept");
  assert.deepEqual(fields(legacy.data.parties[1]), { proAffiliation: "Other", customProName: "Legacy Society", ipiNumber: "00044455566" });
  await profile(partner, "None", "Stale custom name", "", { proAffiliation: "BMI", ipiNumber: "SHOULD_NOT_REAPPEAR" });
  legacy = await action(legacy, "split_accept");
  legacy = await action(legacy, "sign");
  assert.deepEqual(fields(legacy.data.parties[1]), { proAffiliation: "None", customProName: "", ipiNumber: "00044455566" });
  report.checks.push("Registration: blank/unknown profiles preserve recorded details; legacy payloads work; explicit None clears stale custom PRO without reviving stale profile values");

  const oldSignature = structuredClone(legacy.splitSignatures.find(signature => signature.signerUserId === partner));
  const next = structuredClone(legacy);
  next.data.parties[0].percent = 50; next.data.parties[1].percent = 50;
  legacy = await action(next, "counter_offer", "New proposal");
  await login(owner);
  legacy = await action(await load(legacy.id), "split_accept");
  await profile(partner, "BMI", "", "00099988877");
  legacy = await action(await load(legacy.id), "sign");
  assert.deepEqual(legacy.splitSignatures.find(signature => signature.id === oldSignature.id), oldSignature);
  assert.equal(legacy.splitSignatures.find(signature => signature.proposalVersionId === legacy.currentProposalId && signature.signerUserId === partner).registrationSnapshot.ipiNumber, "00099988877");
  report.checks.push("Registration: a new proposal can capture changed details without rewriting previous signature evidence");

  await login(owner);
  let declined = await save(fixture());
  await login(partner);
  declined = await action(declined, "invite_decline");
  assert.equal(declined.data.parties[1].ipiNumber, "");
  assert.equal((await admin("select has_function_privilege('authenticated','split_private.apply_split_sheet_participant_update(uuid,jsonb,text,text,text,text)','execute') as allowed")).rows[0].allowed, false);
  report.checks.push("Registration: declined invitations do not copy profile data and the unfiltered writer remains inaccessible");
  if (process.env.SPLIT_REGISTRATION_QA_OUTPUT) {
    writeFileSync(process.env.SPLIT_REGISTRATION_QA_OUTPUT, JSON.stringify({ accepted, signed: await load(doc.id),
      viewer: { ...makeDocument().creatorProfile, authUserId: partner, username: "registration_partner", legalName: "Registration Partner",
        legalFirstName: "Registration", legalLastName: "Partner", displayName: "Registration Partner", emailAddress: "registration_partner@example.test" },
    }, null, 2));
  }
}
