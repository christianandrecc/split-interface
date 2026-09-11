import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

// Disposable PostgreSQL only: no credentials, network calls, or live records.
// The auth shim models PostgREST's user claim, not hosted GoTrue.
const db = new PGlite({ extensions: { pgcrypto } });
const report = { migrations: [], checks: [] };
const creator = "11111111-1111-4111-8111-111111111111";
const participant = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
const now = new Date().toISOString();
let currentUser;

async function login(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
  await db.exec(id ? "set role authenticated" : "set role anon");
  currentUser = id;
}
async function admin(query, params = []) {
  await db.exec("reset role");
  try { return await db.query(query, params); }
  finally { await login(currentUser); }
}
async function load(id) {
  return (await db.query("select * from public.load_my_split_sheets()")).rows.find(row => row.id === id)?.document_payload;
}
async function save(doc, mode = "send") {
  return (await db.query("select public.upsert_split_sheet_document($1,$2,'Untrusted actor') as doc", [doc, mode])).rows[0].doc;
}
async function deleteDraft(doc) {
  return (await db.query("select public.delete_split_sheet_draft($1,$2) as id", [doc.id, doc.serverRevision ?? null])).rows[0].id;
}
async function action(doc, kind, notes = null, response = null) {
  return (await db.query("select public.apply_split_sheet_participant_update($1,$2,$3,'Untrusted actor',$4,$5) as doc",
    [doc.id, doc, kind, response, notes])).rows[0].doc;
}
const tables = ["split_sheets", "split_sheet_collaborators", "split_sheet_proposal_versions", "split_sheet_responses", "split_sheet_audit_records", "split_sheet_contract_deliveries", "split_notifications"];
async function snapshot() {
  const state = {};
  for (const table of tables) state[table] = (await admin(`select to_jsonb(t) as row from public.${table} t order by id`)).rows;
  return state;
}
async function rejectsWithoutWrites(label, operation, code, pattern) {
  const before = await snapshot();
  await assert.rejects(operation, error => error.code === code && pattern.test(error.message), label);
  assert.deepEqual(await snapshot(), before, `${label}: failed operation changed stored state`);
  report.checks.push(label);
}
const activeSignatures = doc => doc.splitSignatures.filter(s => s.proposalVersionId === doc.currentProposalId);
const activeApprovals = doc => doc.splitApprovals.filter(a => a.proposalVersionId === doc.currentProposalId);
function fixture() {
  return {
    id: randomUUID(), title: "Isolated signing QA", status: "Draft", version: 1,
    documentNumber: "SPLIT-QA", createdAt: now, updatedAt: now,
    creatorProfile: { displayName: "Untrusted creator name" }, collaborators: ["QA Participant"],
    data: { songTitle: "Isolated signing QA", parties: [
      { id: "creator-party", isCurrentUser: true, legalName: "QA Creator", professionalName: "QA Creator", inviteMethod: "creator", percent: 60 },
      { id: "participant-party", isCurrentUser: false, legalName: "QA Participant", professionalName: "QA Participant", inviteMethod: "username", inviteValue: "@qa_participant", percent: 40 },
    ] },
    collaboratorInvites: [], currentProposalId: "untrusted-proposal-id", splitProposalVersions: [],
    splitApprovals: [], splitSignatures: [], auditTrail: [],
  };
}
function counter(doc, creatorPercent) {
  const next = structuredClone(doc);
  next.currentProposalId = "untrusted-proposal-id";
  next.data.parties[0].percent = creatorPercent;
  next.data.parties[1].percent = 100 - creatorPercent;
  return next;
}

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema extensions;
    create table auth.users (id uuid primary key, email text, phone text, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  for (const file of readdirSync("supabase/migrations").filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    report.migrations.push(file);
  }
  const privileges = (await db.query(`select p.proname,
    has_function_privilege('anon',p.oid,'execute') as anon_access,
    has_function_privilege('authenticated',p.oid,'execute') as user_access,
    p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef`)).rows;
  assert.equal(privileges.filter(row => row.anon_access).length, 0);
  for (const name of ["load_my_split_sheets", "upsert_split_sheet_document", "apply_split_sheet_participant_update", "is_split_sheet_participant", "delete_split_sheet_draft"]) {
    assert.equal(privileges.find(row => row.proname === name).user_access, true);
    assert.ok(privileges.find(row => row.proname === name).proconfig.some(value => value.startsWith("search_path=")));
  }
  for (const row of privileges.filter(row => /^(initialize_|sync_|replace_)/.test(row.proname))) assert.equal(row.user_access, false, row.proname);
  report.checks.push("All migrations replay; anonymous privileged calls blocked; internal writers inaccessible; RPC search paths fixed");
  for (const [id, username, legalName] of [
    [creator, "qa_creator", "QA Creator"], [participant, "qa_participant", "QA Participant"], [outsider, "qa_outsider", "QA Outsider"],
  ]) {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [id, `${username}@example.test`, { username, display_name: username, legal_name: legalName }]);
  }
  assert.equal((await db.query("select count(*)::integer as count from public.profiles")).rows[0].count, 3);
  report.checks.push("Signup still creates profiles with legal names");
  await login(creator);
  const maliciousDraft = fixture();
  maliciousDraft.status = "Verified and Stored";
  maliciousDraft.verifiedAt = "2000-01-01T00:00:00Z";
  maliciousDraft.sentAt = maliciousDraft.verifiedAt;
  maliciousDraft.splitSignatures = [{ status: "Signed", collaboratorId: "creator" }];
  maliciousDraft.auditTrail = [{ timestamp: now, actor: "Other signer", action: "Signed" }];
  let doc = await save(maliciousDraft, "draft");
  assert.equal(doc.status, "Draft");
  assert.equal(doc.verifiedAt, undefined);
  assert.equal(doc.sentAt, undefined);
  assert.equal(doc.serverRevision, 1);
  assert.ok(activeSignatures(doc).every(s => s.status === "Pending"));
  assert.equal(doc.auditTrail[0].actor, "QA Creator");
  assert.notEqual(doc.currentProposalId, maliciousDraft.currentProposalId);
  report.checks.push("Draft ignores forged final status, signatures, timestamps, actor and audit history");
  assert.equal((await admin("select id from public.split_notifications where split_sheet_id=$1", [doc.id])).rows.length, 0);
  assert.equal((await admin("select id from public.split_sheet_contract_deliveries where split_sheet_id=$1", [doc.id])).rows.length, 0);
  report.checks.push("Saving a draft does not notify collaborators or queue invitations");
  await login(participant);
  assert.equal(await load(doc.id), undefined);
  assert.equal((await db.query("select id from public.split_sheets")).rows.length, 0);
  report.checks.push("Invitee cannot read unsent draft through RPC or RLS");
  await login(creator);
  const staleDraft = doc;
  const draftAudit = (await admin("select * from public.split_sheet_audit_records where split_sheet_id=$1 order by created_at,id", [doc.id])).rows;
  doc = await save({ ...doc, title: "Revised QA title" }, "draft");
  assert.deepEqual((await admin("select * from public.split_sheet_audit_records where split_sheet_id=$1 order by created_at,id", [doc.id])).rows.slice(0, draftAudit.length), draftAudit);
  report.checks.push("Draft audit records are append-only and retain authenticated actor ids");
  await rejectsWithoutWrites("Stale draft save rejected", () => save(staleDraft, "draft"), "40001", /Refresh/);
  doc = await save(doc);
  assert.equal(doc.status, "Pending Collaborator Acceptance");
  assert.equal(activeApprovals(doc).find(a => a.collaboratorId === "creator").status, "Approved");
  const inviteRecipients = (await admin("select distinct recipient_user_id from public.split_notifications where split_sheet_id=$1 and event_type='split_invite'", [doc.id])).rows;
  assert.deepEqual(inviteRecipients.map(row => row.recipient_user_id), [participant]);
  assert.equal((await admin("select id from public.split_sheet_contract_deliveries where split_sheet_id=$1", [doc.id])).rows.length, 1);
  assert.equal(doc.collaboratorInvites[0].status, "Pending");
  report.checks.push("Sending queues invitations and notifies only the assigned collaborator, with no automatic acceptance");
  await rejectsWithoutWrites("Creator cannot replace sent state", () => save(doc, "update"), "55000", /Messages/);
  await rejectsWithoutWrites("Repeated send cannot requeue delivery", () => save(doc), "55000", /Messages/);
  await rejectsWithoutWrites("Creator cannot sign before approval", () => action(doc, "sign"), "55000", /Every party/);
  await rejectsWithoutWrites("Internal state writer inaccessible", () => db.query("select public.replace_split_sheet_collaborators_from_payload($1,$2,$3)", [doc.id, doc, creator]), "42501", /permission denied/);
  await rejectsWithoutWrites("Direct authenticated update blocked", () => db.query("update public.split_sheets set title='bad' where id=$1", [doc.id]), "42501", /permission denied/);
  await login(outsider);
  assert.equal(await load(doc.id), undefined);
  assert.equal((await db.query("select id from public.split_sheets")).rows.length, 0);
  await rejectsWithoutWrites("Unrelated account cannot sign", () => action(doc, "sign"), "42501", /not a participant/);
  await rejectsWithoutWrites("Unrelated account cannot overwrite record", () => save(doc), "42501", /Only the creator/);
  await login(null);
  await rejectsWithoutWrites("Anonymous action blocked", () => action(doc, "sign"), "42501", /permission denied/);
  await login(participant);
  doc = await load(doc.id);
  await rejectsWithoutWrites("Pending invitee cannot approve", () => action(doc, "split_accept"), "55000", /Accept the collaboration/);
  await rejectsWithoutWrites("Pending invitee cannot counter", () => action(counter(doc, 50), "counter_offer"), "55000", /Accept the collaboration/);
  await rejectsWithoutWrites("Missing revision rejected", () => action({ ...doc, serverRevision: undefined }, "invite_accept"), "40001", /Refresh/);
  const beforeInvite = doc;
  doc = await action(doc, "invite_accept");
  assert.equal(doc.collaboratorInvites[0].status, "Accepted");
  assert.equal(doc.status, "Pending Split Approval");
  await rejectsWithoutWrites("Stale invite replay rejected", () => action(beforeInvite, "invite_accept"), "40001", /Refresh/);
  await rejectsWithoutWrites("Duplicate invite acceptance rejected", () => action(doc, "invite_accept"), "55000", /pending invitee/);
  const forged = structuredClone(doc);
  forged.status = "Verified and Stored";
  forged.title = "Changed through chat";
  forged.creatorUserId = participant;
  forged.verifiedAt = now;
  forged.data.parties[0].percent = 0;
  forged.data.parties[1].percent = 100;
  forged.splitSignatures.forEach(s => { s.status = "Signed"; s.signerUserId = participant; });
  forged.auditTrail = [];
  const priorAudit = doc.auditTrail;
  doc = await action(forged, "local_chat", "Hello from the participant", "signature");
  assert.equal(doc.status, "Pending Split Approval");
  assert.equal(doc.title, "Revised QA title");
  assert.equal(doc.creatorUserId, creator);
  assert.equal(doc.verifiedAt, undefined);
  assert.equal(doc.data.parties[0].percent, 60);
  assert.ok(activeSignatures(doc).every(s => s.status === "Pending"));
  assert.deepEqual(doc.auditTrail.slice(0, priorAudit.length), priorAudit);
  const message = JSON.parse(doc.auditTrail.at(-2).action.slice("__splitChatMessages:".length));
  assert.equal(message.senderId, doc.collaboratorInvites[0].id);
  assert.equal(message.senderName, "QA Participant");
  assert.equal(message.body, "Hello from the participant");
  report.checks.push("Chat appends authenticated message only; forged unrelated fields cannot change signing state");
  doc = await action(doc, "split_reject", "Please review");
  assert.equal(doc.status, "Disputed");
  doc = await action(doc, "split_accept");
  assert.equal(doc.status, "Ready to Sign");
  await rejectsWithoutWrites("Wrong proposal cannot be signed even with a current revision", () => action({ ...doc, currentProposalId: "other-proposal" }, "sign"), "40001", /proposal changed/);
  const beforeCounter = doc;
  const wrongParties = counter(doc, 50);
  wrongParties.data.parties[1].id = "replacement-person";
  await rejectsWithoutWrites("Counter cannot replace participants", () => action(wrongParties, "counter_offer"), "22023", /invalid/);
  const badTotal = counter(doc, 50);
  badTotal.data.parties[0].percent = 40;
  await rejectsWithoutWrites("Counter total must equal 100", () => action(badTotal, "counter_offer"), "22023", /total exactly 100/);
  doc = await action(counter(doc, 45), "counter_offer", "Proposed shares");
  assert.equal(doc.version, 2);
  assert.notEqual(doc.currentProposalId, beforeCounter.currentProposalId);
  assert.equal(doc.splitProposalVersions.at(-1).proposedByUserId, participant);
  assert.equal(doc.splitProposalVersions.at(-1).proposedByParticipantId, doc.collaboratorInvites[0].id);
  for (const kind of ["split_accept", "split_reject", "counter_offer"]) {
    const forgedAuthor = counter(doc, 50);
    forgedAuthor.splitProposalVersions.at(-1).proposedByUserId = creator;
    forgedAuthor.splitProposalVersions.at(-1).proposedByParticipantId = "creator";
    await rejectsWithoutWrites(`Own counter response blocked despite forged attribution (${kind})`,
      () => action({ ...forgedAuthor, currentProposalId: doc.currentProposalId }, kind), "55000", /own proposal/);
  }
  assert.equal(activeApprovals(doc).find(a => a.collaboratorId === "creator").status, "Pending");
  assert.ok(activeSignatures(doc).every(s => s.status === "Pending"));
  assert.equal(doc.status, "Pending Split Approval");
  await rejectsWithoutWrites("Counter proposer cannot approve for creator", () => action(doc, "sign"), "55000", /Every party/);
  await login(creator);
  await rejectsWithoutWrites("Old proposal acceptance rejected", () => action(beforeCounter, "split_accept"), "40001", /Refresh/);
  doc = await action(doc, "split_accept");
  assert.equal(doc.status, "Ready to Sign");
  const staleSigningState = structuredClone(doc);
  const forgedSigning = structuredClone(doc);
  forgedSigning.splitSignatures.forEach(s => { s.status = "Signed"; s.signerLegalName = "Spoofed"; s.signedAt = "2000-01-01T00:00:00Z"; });
  doc = await action(forgedSigning, "sign");
  assert.equal(doc.status, "Pending Signatures");
  const signature = activeSignatures(doc).find(s => s.status === "Signed");
  assert.equal(signature.collaboratorId, "creator");
  assert.equal(signature.signerUserId, creator);
  assert.equal(signature.signerLegalName, "QA Creator");
  assert.notEqual(signature.signedAt, "2000-01-01T00:00:00Z");
  assert.equal(activeSignatures(doc).filter(s => s.status === "Signed").length, 1);
  await rejectsWithoutWrites("Duplicate signature rejected", () => action(doc, "sign"), "55000", /already signed/);
  await rejectsWithoutWrites("Approval cannot change after signing starts", () => action(doc, "split_reject"), "55000", /Signatures have started/);
  await login(participant);
  await rejectsWithoutWrites("Stale signer cannot overwrite first signature", () => action(staleSigningState, "sign"), "40001", /Refresh/);
  report.checks.push("Only authenticated signer recorded; creator review and participant counter-offer work");
  await login(creator);
  const oldProposal = doc.currentProposalId;
  doc = await action(counter(doc, 50), "counter_offer", "Revised after discussion");
  assert.equal(doc.version, 3);
  assert.equal(doc.splitSignatures.find(s => s.proposalVersionId === oldProposal && s.status === "Signed").signerUserId, creator);
  assert.ok(activeSignatures(doc).every(s => s.status === "Pending"));
  const collaboratorRows = (await db.query("select signature_status, signed_at from public.split_sheet_collaborators where split_sheet_id=$1", [doc.id])).rows;
  assert.ok(collaboratorRows.every(row => row.signature_status === "Pending" && row.signed_at === null));
  for (const kind of ["split_accept", "split_reject", "counter_offer"]) {
    await rejectsWithoutWrites(`Creator cannot respond to own counter (${kind})`, () => action(doc, kind), "55000", /own proposal/);
  }
  await login(participant);
  doc = await action(doc, "split_accept");
  await admin("update public.profiles set legal_name=null where user_id=$1", [participant]);
  await rejectsWithoutWrites("Signing requires profile legal name", () => action(doc, "sign"), "55000", /legal name/);
  await admin("update public.profiles set legal_name='QA Participant' where user_id=$1", [participant]);
  doc = await action(doc, "sign");
  await login(creator);
  doc = await load(doc.id);
  doc = await action(doc, "sign");
  assert.equal(doc.status, "Verified and Stored");
  assert.ok(doc.verifiedAt);
  assert.deepEqual(activeSignatures(doc).map(s => s.signerUserId).sort(), [creator, participant].sort());
  assert.equal((await load(doc.id)).serverRevision, doc.serverRevision);
  assert.deepEqual((await load(doc.id)).splitSignatures, doc.splitSignatures);
  const responses = (await db.query("select responder_user_id from public.split_sheet_responses where split_sheet_id=$1 and proposal_version_id=$2 and response_type='signature'", [doc.id, doc.currentProposalId])).rows;
  assert.deepEqual(responses.map(r => r.responder_user_id).sort(), [creator, participant].sort());
  report.checks.push("Creator counter-offer resets consent and retains history; two current signatures finalize; export reload is canonical");
  for (const mode of ["draft", "send", "update", "contract_delivery"]) {
    await rejectsWithoutWrites(`Final creator save blocked (${mode})`, () => save({ ...doc, title: "Changed", status: "Draft" }, mode), "55000", /Signed records/);
  }
  for (const who of [creator, participant]) {
    await login(who);
    for (const kind of ["invite_accept", "invite_decline", "split_accept", "split_reject", "counter_offer", "sign", "local_chat"]) {
      await rejectsWithoutWrites(`Final ${who === creator ? "creator" : "participant"} action blocked (${kind})`, () => action(doc, kind, "Attempt"), "55000", /Signed records/);
    }
  }
  await rejectsWithoutWrites("Final internal update blocked", () => admin("update public.split_sheets set document_payload=document_payload || '{\"title\":\"changed\"}'::jsonb where id=$1", [doc.id]), "55000", /Signed records/);
  await rejectsWithoutWrites("Final deletion blocked", () => admin("delete from public.split_sheets where id=$1", [doc.id]), "55000", /Signed records/);
  assert.ok((await db.query("select * from public.load_my_split_notifications(100)")).rows.length > 0);
  report.checks.push("Notifications still readable after signing");
  await login(creator);
  const duplicate = fixture();
  await rejectsWithoutWrites("Final record cannot be deleted through draft RPC", () => deleteDraft(doc), "55000", /unsent, unsigned/);
  duplicate.data.parties[1].id = duplicate.data.parties[0].id;
  await rejectsWithoutWrites("Duplicate party ids rejected", () => save(duplicate), "22023", /unique ids/);
  const duplicateUser = fixture();
  duplicateUser.data.parties[1].inviteValue = "@qa_creator";
  await rejectsWithoutWrites("Same account cannot be a second party", () => save(duplicateUser), "22023", /one party per account/);
  const nonNumber = fixture();
  nonNumber.data.parties[0].percent = "NaN";
  await rejectsWithoutWrites("Non-numeric allocation rejected", () => save(nonNumber), "22023", /must be numbers/);
  let declined = await save(fixture());
  await login(participant);
  declined = await action(declined, "invite_decline");
  assert.equal(declined.status, "Disputed");
  await login(creator);
  await rejectsWithoutWrites("Declined party cannot be skipped", () => action(declined, "sign"), "55000", /Every party/);
  const oneParty = fixture();
  oneParty.data.parties = [oneParty.data.parties[0]];
  oneParty.data.parties[0].percent = 100;
  let solo = await save(oneParty);
  assert.equal(solo.status, "Ready to Sign");
  solo = await action(solo, "sign");
  assert.equal(solo.status, "Verified and Stored");
  report.checks.push("Single-owner sheet requires its owner's signature");

  let legacy = await save(fixture());
  await login(participant);
  legacy = await action(legacy, "invite_accept");
  legacy = await action(legacy, "split_accept");
  const oldSignature = { ...activeSignatures(legacy)[0], status: "Signed", signedAt: now };
  legacy.splitSignatures[0] = oldSignature;
  await admin("update public.split_sheets set document_payload=$1 where id=$2", [legacy, legacy.id]);
  legacy = await load(legacy.id);
  assert.equal(activeSignatures(legacy)[0].status, "Pending");
  assert.equal(activeSignatures(legacy)[0].signedAt, undefined);
  legacy = await action(legacy, "sign");
  assert.equal(legacy.status, "Pending Signatures");
  await login(creator);
  legacy = await action(legacy, "sign");
  assert.equal(legacy.status, "Verified and Stored");
  report.checks.push("Unfinished legacy records request fresh authenticated signatures; existing finalized records remain untouched");
  await login(creator);
  let deletable = await save(fixture(), "draft");
  for (const who of [participant, outsider]) {
    await login(who);
    await rejectsWithoutWrites("Non-owner cannot delete an unsent draft", () => deleteDraft(deletable), "42501", /Only the creator/);
  }
  await login(null);
  await rejectsWithoutWrites("Anonymous draft deletion blocked", () => deleteDraft(deletable), "42501", /permission denied/);
  await login(creator);
  await rejectsWithoutWrites("Direct draft deletion blocked", () => db.query("delete from public.split_sheets where id=$1", [deletable.id]), "42501", /permission denied/);
  await rejectsWithoutWrites("Draft deletion requires revision", () => deleteDraft({ ...deletable, serverRevision: undefined }), "40001", /Refresh/);
  const oldDraft = deletable;
  deletable = await save(deletable, "draft");
  await rejectsWithoutWrites("Draft edited in another tab cannot be deleted from stale view", () => deleteDraft(oldDraft), "40001", /Refresh/);
  assert.equal(await deleteDraft(deletable), deletable.id);
  for (const table of tables) {
    const key = table === "split_sheets" ? "id" : "split_sheet_id";
    assert.equal((await admin(`select id from public.${table} where ${key}=$1`, [deletable.id])).rows.length, 0);
  }
  assert.equal(await deleteDraft(deletable), deletable.id);
  assert.equal(await deleteDraft(fixture()) !== undefined, true);
  report.checks.push("Owner deletion removes draft and dependent rows; retry and local-only deletion are idempotent");
  await rejectsWithoutWrites("Deleted draft cannot be resurrected by a stale save", () => save(deletable, "draft"), "40001", /no longer exists/);
  await rejectsWithoutWrites("Deleted draft cannot be sent from another tab", () => save(deletable, "send"), "40001", /no longer exists/);
  const beforeSend = await save(fixture(), "draft");
  const afterSend = await save(beforeSend, "send");
  await rejectsWithoutWrites("Sending wins the race: old draft cannot be deleted", () => deleteDraft(beforeSend), "55000", /unsent, unsigned/);
  await rejectsWithoutWrites("Sent records cannot be deleted even with current revision", () => deleteDraft(afterSend), "55000", /unsent, unsigned/);
  const signedDraft = await save(fixture(), "draft");
  signedDraft.splitSignatures[0].status = "Signed";
  await admin("update public.split_sheets set document_payload=$1 where id=$2", [signedDraft, signedDraft.id]);
  await rejectsWithoutWrites("Draft with a historical signature cannot be deleted", () => deleteDraft(signedDraft), "55000", /unsent, unsigned/);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(JSON.stringify({ message: error.message, code: error.code, detail: error.detail, where: error.where, stack: error.code ? undefined : error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await db.close();
}
