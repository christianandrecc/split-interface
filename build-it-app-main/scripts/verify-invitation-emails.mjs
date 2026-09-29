import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function verifyInvitationEmails({ db, report, admin, login, save, load, action, fixture, creator, participant, outsider }) {
  const token = "a".repeat(64);
  const jobs = async id => (await admin("select * from split_private.invitation_emails where split_sheet_id=$1", [id])).rows;
  const service = async (sql, args = []) => {
    await db.exec("reset role; set role service_role");
    try { return (await db.query(sql, args)).rows[0]?.result; }
    finally { await login(creator); }
  };
  const claim = () => service("select public.claim_split_invitation_emails($1) as result", [token]);
  const prepare = lease => service("select public.prepare_split_invitation_email($1,$2,$3) as result", [token, lease.id, lease.leaseId]);
  const finish = (lease, outcome) => service("select public.finish_split_invitation_email($1,$2,$3,$4,$5,$6) as result",
    [token, lease.id, lease.leaseId, outcome, outcome === "sent" ? "test-provider-id" : null, outcome === "sent" ? null : "network_error"]);
  const clearQueue = () => admin("update split_private.invitation_emails set status='skipped',lease_id=null,lease_until=null where status in ('queued','processing','waiting_address')");
  const emailFixture = (email = `${randomUUID()}@example.test`) => {
    const input = fixture(); input.data.parties[1].inviteMethod = "email"; input.data.parties[1].inviteValue = email; return input;
  };
  await login(creator);
  await admin("update auth.users set email_confirmed_at=now() where id=any($1::uuid[])", [[creator, participant]]);
  const historical = await save(fixture());
  assert.equal((await jobs(historical.id)).length, 0);
  await admin("update split_private.invitation_email_config set enabled=true,activated_at=clock_timestamp(),worker_token_hash=encode(extensions.digest($1,'sha256'),'hex')", [token]);
  await admin("update public.split_sheet_collaborators set invite_status=invite_status where split_sheet_id=$1", [historical.id]);
  assert.equal((await jobs(historical.id)).length, 0);
  const draft = await save(fixture(), "draft");
  assert.equal((await jobs(draft.id)).length, 0);
  const sent = await save(draft);
  assert.equal((await jobs(sent.id)).length, 1);
  const recipient = (await admin("select email from auth.users where id=$1", [participant])).rows[0].email;
  assert.equal((await jobs(sent.id))[0].recipient_email, recipient.toLowerCase());
  assert.notEqual((await jobs(sent.id))[0].inviter_name, "Untrusted creator name");
  await admin("update public.split_sheet_collaborators set invite_status=invite_status where split_sheet_id=$1", [sent.id]);
  assert.equal((await jobs(sent.id)).length, 1);
  report.checks.push("Invitation email: rollout excludes historical invitations, drafts and creators; confirmed Auth address and one durable job per invite");

  for (const user of [null, creator, participant, outsider]) {
    await login(user);
    for (const sql of ["select * from split_private.invitation_emails", "select * from split_private.invitation_email_config",
      "select public.claim_split_invitation_emails('fake')", "select public.verify_split_invitation_worker('fake')"]) {
      await assert.rejects(() => db.query(sql), error => error.code === "42501");
    }
  }
  await assert.rejects(() => service("select public.claim_split_invitation_emails($1) as result", ["b".repeat(64)]), error => error.code === "42501");
  let leases = await claim(); assert.equal(leases.length, 1);
  assert.deepEqual(await claim(), []);
  const payload = await prepare(leases[0]);
  assert.equal(payload.to, recipient.toLowerCase());
  assert.deepEqual(Object.keys(payload).sort(), ["id", "inviterName", "splitId", "to", "workTitle"]);
  assert.equal(await finish({ ...leases[0], leaseId: randomUUID() }, "sent"), false);
  assert.equal(await finish(leases[0], "retry"), true);
  assert.deepEqual(await claim(), []);
  await admin("update split_private.invitation_emails set available_at=now()-interval '1 minute' where id=$1", [leases[0].id]);
  const retried = (await claim())[0];
  assert.equal(retried.id, leases[0].id); assert.notEqual(retried.leaseId, leases[0].leaseId);
  assert.deepEqual(await prepare(retried), payload);
  assert.equal(await finish(leases[0], "sent"), false);
  assert.equal(await finish(retried, "sent"), true);
  assert.equal((await jobs(sent.id))[0].status, "sent");
  assert.equal((await load(sent.id)).collaboratorInvites[0].status, "Pending");
  assert.deepEqual(await claim(), []);
  report.checks.push("Invitation email: queue and worker RPCs reject all clients; exclusive leases, delayed retries, stable payload and stale-worker protection preserve consent");

  for (const kind of ["invite_accept", "invite_decline"]) {
    const doc = await save(fixture()); const [lease] = await claim();
    await login(participant); await action(await load(doc.id), kind);
    assert.equal(await prepare(lease), null);
    assert.equal((await jobs(doc.id))[0].status, "skipped");
  }
  await login(creator);
  const changed = await save(fixture()); const [changedLease] = await claim();
  await admin("update auth.users set email='changed-invitation@example.test' where id=$1", [participant]);
  assert.equal(await prepare(changedLease), null);
  await admin("update auth.users set email=$1 where id=$2", [recipient, participant]);
  report.checks.push("Invitation email: accepted, declined and changed-address invitations are cancelled before sending");

  const emailInput = emailFixture();
  await save(emailInput); const [emailLease] = await claim();
  assert.equal((await prepare(emailLease)).to, emailInput.data.parties[1].inviteValue);
  await finish(emailLease, "sent");
  const lateId = randomUUID(); const lateUsername = `mail_${randomUUID().slice(0, 8)}`;
  await admin("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [lateId, "late-mail@example.test", { username: lateUsername, legal_name: "Late Recipient" }]);
  const late = fixture(); late.data.parties[1].inviteValue = `@${lateUsername}`;
  const lateDoc = await save(late);
  assert.equal((await jobs(lateDoc.id))[0].status, "waiting_address");
  assert.deepEqual(await claim(), []);
  await admin("update auth.users set email_confirmed_at=now() where id=$1", [lateId]);
  const [lateLease] = await claim(); assert.equal((await prepare(lateLease)).to, "late-mail@example.test");
  await finish(lateLease, "sent");
  report.checks.push("Invitation email: explicit email invites work before signup; username invites wait for a confirmed account email");

  const expired = await save(emailFixture()); const [oldLease] = await claim();
  await admin("update split_private.invitation_emails set lease_until=now()-interval '1 minute' where id=$1", [oldLease.id]);
  const [newLease] = await claim(); assert.equal(newLease.id, oldLease.id); assert.notEqual(newLease.leaseId, oldLease.leaseId);
  assert.equal(await finish(oldLease, "sent"), false);
  await finish(newLease, "retry");
  await admin("update split_private.invitation_emails set first_attempt_at=now()-interval '21 hours',available_at=now() where id=$1", [oldLease.id]);
  assert.deepEqual(await claim(), []); assert.equal((await jobs(expired.id))[0].status, "failed");
  const exhausted = await save(emailFixture());
  await admin("update split_private.invitation_emails set attempts=8 where split_sheet_id=$1", [exhausted.id]);
  assert.deepEqual(await claim(), []); assert.equal((await jobs(exhausted.id))[0].status, "failed");
  report.checks.push("Invitation email: crashed workers recover with new leases; attempt and time limits prevent unsafe late retries");

  for (let i = 0; i < 6; i++) {
    const limited = await save(emailFixture("mail-limit@example.test"));
    assert.equal((await jobs(limited.id))[0].status, i < 5 ? "queued" : "skipped");
  }
  leases = await claim(); assert.equal(leases.length, 5);
  await clearQueue();
  for (let i = 0; i < 100; i++) {
    const missing = fixture(); missing.data.parties[1].inviteValue = `@no_mail_${i}`;
    const saved = await save(missing);
    await admin("update split_private.invitation_emails set created_at=now()-interval '2 days',status='waiting_address' where split_sheet_id=$1", [saved.id]);
  }
  await admin("update auth.users set email_confirmed_at=null where id=$1", [lateId]);
  await admin("update split_private.invitation_emails set created_at=now()-interval '2 days',updated_at=now()-interval '2 days' where recipient_email='late-mail@example.test'");
  const later = [];
  for (let i = 0; i < 6; i++) {
    const input = fixture(); input.data.parties[1].inviteValue = `@${lateUsername}`;
    const saved = await save(input); later.push(saved.id);
    await admin("update split_private.invitation_emails set created_at=now()-interval '1 day' where split_sheet_id=$1", [saved.id]);
  }
  await admin("update auth.users set email_confirmed_at=now() where id=$1", [lateId]);
  assert.equal((await claim()).length, 5);
  assert.equal((await jobs(later[5]))[0].status, "skipped");
  await clearQueue();
  report.checks.push("Invitation email: 100 unresolved handles cannot starve confirmed recipients; late email resolution still obeys the recipient cap");
  await admin("update split_private.invitation_email_config set enabled=false");
  const disabled = await save(emailFixture()); assert.equal((await jobs(disabled.id)).length, 0);
  assert.deepEqual(await claim(), []);
  report.checks.push("Invitation email: recipient abuse cap and five-message batches are enforced; emergency disable stops sends without blocking split creation");
}
