import assert from "node:assert/strict";

export async function verifyInviteDecline({ report, admin, login, save, load, action, fixture, rejectsWithoutWrites, creator, participant, outsider }) {
  await login(creator);
  const twoParty = await save(fixture());
  await rejectsWithoutWrites("Decline: creator cannot decline another account's pending invite",
    () => action(twoParty, "invite_decline"), "55000", /Only a pending invitee/);
  await login(outsider);
  await rejectsWithoutWrites("Decline: unrelated user cannot respond to an invite",
    () => action(twoParty, "invite_decline"), "42501", /not a participant/);
  await login(null);
  await rejectsWithoutWrites("Decline: anonymous responses are blocked",
    () => action(twoParty, "invite_decline"), "42501", /permission denied/);

  await login(creator);
  const input = fixture();
  input.data.parties[0].percent = 50;
  input.data.parties[1].percent = 30;
  input.data.parties.push({ ...input.data.parties[1], id: "third-party", percent: 20,
    professionalName: "QA Outsider", legalName: "QA Outsider", inviteValue: "@qa_outsider" });
  const sent = await save(input);
  const stored = async () => (await admin("select document_payload from public.split_sheets where id=$1", [sent.id])).rows[0].document_payload;
  const before = await stored();
  await login(participant);
  const current = await load(sent.id);
  const forged = structuredClone(current);
  forged.title = "Forged title";
  forged.creatorUserId = participant;
  forged.collaboratorInvites.forEach(invite => { invite.status = "Declined"; });
  const declined = await action(forged, "invite_decline");
  assert.equal(declined.status, "Disputed");
  assert.equal(declined.serverRevision, current.serverRevision + 1);
  assert.equal(declined.creatorUserId, creator);
  assert.equal(declined.title, sent.title);
  const after = await stored();
  for (const key of ["data", "splitApprovals", "splitSignatures", "splitProposalVersions"]) assert.deepEqual(after[key], before[key]);
  assert.deepEqual(after.collaboratorInvites.find(invite => invite.partyId === "third-party"),
    before.collaboratorInvites.find(invite => invite.partyId === "third-party"));
  const ownInvite = after.collaboratorInvites.find(invite => invite.partyId === "participant-party");
  assert.equal(ownInvite.status, "Declined");
  assert.ok(ownInvite.respondedAt);
  const responses = (await admin("select responder_user_id,response_type from public.split_sheet_responses where split_sheet_id=$1", [sent.id])).rows;
  assert.deepEqual(responses, [{ responder_user_id: participant, response_type: "invite_reject" }]);
  const notes = (await admin("select recipient_user_id,action_target from public.split_notifications where split_sheet_id=$1 and event_type='invite_decline' order by recipient_user_id", [sent.id])).rows;
  assert.deepEqual(notes, [creator, outsider].sort().map(id => ({ recipient_user_id: id, action_target: "messages" })));
  assert.equal(after.auditTrail.at(-1).actorUserId, participant);
  assert.equal(after.auditTrail.at(-1).action, "Declined the collaboration invite");
  for (const user of [creator, participant, outsider]) {
    await login(user);
    assert.equal((await load(sent.id)).collaboratorInvites.find(invite => invite.id === ownInvite.id).status, "Declined");
  }
  report.checks.push("Decline: only the authenticated invitee changes; response, audit and notifications route correctly to all three accounts without altering shares or approvals");

  await login(participant);
  await rejectsWithoutWrites("Decline: stale accept cannot reverse a declined invitation",
    () => action(current, "invite_accept"), "40001", /Refresh/);
  for (const kind of ["invite_accept", "invite_decline", "split_accept", "split_reject", "counter_offer", "sign", "local_chat"]) {
    await rejectsWithoutWrites(`Decline: declined account cannot perform ${kind}`,
      () => action(declined, kind, "Attempt"), "55000", /pending invitee|Accept the collaboration|declined/);
  }
  await login(outsider);
  const accepted = await action(await load(sent.id), "invite_accept");
  assert.equal(accepted.status, "Disputed");
  await rejectsWithoutWrites("Decline: an accepted invite cannot later be declined as though still pending",
    () => action(accepted, "invite_decline"), "55000", /pending invitee/);
  await login(creator);
  await rejectsWithoutWrites("Decline: other parties cannot sign by omitting the declined participant",
    async () => action(await load(sent.id), "sign"), "55000", /Every party/);
}
