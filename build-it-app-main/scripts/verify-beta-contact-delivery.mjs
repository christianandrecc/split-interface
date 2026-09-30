import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function verifyBetaContactDelivery({ db, report, login, admin, save, load, action, fixture, creator, participant, outsider }) {
  const status = async () => (await db.query("select public.my_phone_verification_status() as result")).rows[0].result;
  await login(creator);
  assert.equal((await status()).required, false);
  assert.equal((await status()).userId, creator);
  await assert.rejects(() => db.query("update split_private.phone_verification_config set required=true"), e => e.code === "42501");
  const pending = await save(fixture());
  await admin("update split_private.phone_verification_config set required=true");
  await admin("update auth.users set phone=null,phone_confirmed_at=null,raw_user_meta_data=raw_user_meta_data||'{\"phone_verified\":true}'::jsonb where id=any($1::uuid[])", [[creator, participant]]);
  await admin("update public.profiles set phone_country_code='+1',phone_number='2025550100' where user_id=$1", [creator]);
  assert.equal((await status()).verified, false);
  const rejected = fixture();
  await assert.rejects(() => save(rejected), e => e.code === "42501" && /Verify your phone/.test(e.message));
  assert.equal(await load(rejected.id), undefined);
  await login(participant);
  const before = await load(pending.id);
  await assert.rejects(() => action(before, "invite_accept"), e => e.code === "42501");
  assert.deepEqual(await load(pending.id), before);
  await login(creator);
  await assert.rejects(() => db.query("select public.sync_my_verified_phone('+1','2025550100')"), e => e.code === "42501");
  await admin("update auth.users set phone='12025550100',phone_confirmed_at=now(),email_confirmed_at=now() where id=$1", [creator]);
  assert.equal((await status()).verified, true);
  await assert.rejects(() => db.query("select public.sync_my_verified_phone('+1','2025550101')"), e => e.code === "42501");
  await db.query("select public.sync_my_verified_phone('+1','2025550100')");
  const profile = (await db.query("select phone_country_code,phone_number,profile_data from public.profiles where user_id=$1", [creator])).rows[0];
  assert.equal(profile.phone_number, "2025550100");
  assert.equal(profile.profile_data.phoneCountryCode, "+1");
  await save(fixture(), "draft");
  await admin("update split_private.phone_verification_config set required=false");
  await login(null);
  await assert.rejects(status, e => e.code === "42501");
  report.checks.push("Phone verification: owner-only status, disabled rollout, server-enforced writes, forged metadata rejected, participant actions roll back and only confirmed Auth numbers sync");

  await login(creator);
  await admin("update split_private.invitation_email_config set enabled=true");
  const makeJob = async () => {
    const input = fixture();
    input.data.parties[1].inviteMethod = "email";
    input.data.parties[1].inviteValue = `${randomUUID()}@example.test`;
    const doc = await save(input);
    const job = (await admin("select * from split_private.invitation_emails where split_sheet_id=$1", [doc.id])).rows[0];
    assert.ok(job);
    return { doc, job };
  };
  const delivery = async id => (await db.query("select public.load_split_invitation_delivery($1) as result", [id])).rows[0].result;
  const retry = id => db.query("select public.retry_split_invitation_email($1)", [id]);
  const receipt = async (providerId, type, id = `evt_${randomUUID()}`) => {
    await db.exec("reset role; set role service_role");
    try { await db.query("select public.record_split_invitation_delivery($1,$2,$3,now())", [id, providerId, type]); }
    finally { await login(creator); }
  };
  const { doc, job } = await makeJob();
  for (const user of [null, participant, outsider]) {
    await login(user);
    await assert.rejects(() => delivery(doc.id), e => e.code === "42501");
    await assert.rejects(() => retry(job.id), e => e.code === "42501");
    await assert.rejects(() => db.query("select public.record_split_invitation_delivery('evt','provider','delivered',now())"), e => e.code === "42501");
    await assert.rejects(() => db.query("select * from split_private.invitation_delivery_events"), e => e.code === "42501");
  }
  await login(creator);
  assert.equal((await delivery(doc.id))[0].status, "queued");
  assert.equal(JSON.stringify(await delivery(doc.id)).includes(job.recipient_email), false);
  await assert.rejects(() => retry(job.id), e => e.code === "22023");
  const provider = `provider_${randomUUID()}`;
  await receipt(provider, "bounced", "evt_duplicate");
  await receipt(provider, "bounced", "evt_duplicate");
  assert.equal((await admin("select count(*)::int as n from split_private.invitation_delivery_events where event_id='evt_duplicate'")).rows[0].n, 1);
  // A receipt arriving before the worker commits must still appear and notify the creator.
  await admin("update split_private.invitation_emails set status='sent',provider_id=$1 where id=$2", [provider, job.id]);
  assert.equal((await delivery(doc.id))[0].status, "bounced");
  await receipt(provider, "delivered");
  await receipt(provider, "delivery_delayed");
  assert.equal((await delivery(doc.id))[0].status, "bounced");
  assert.equal((await delivery(doc.id))[0].canRetry, false);
  const alerts = (await admin("select recipient_user_id from public.split_notifications where dedupe_key=$1", [`invitation-email-problem/${job.id}`])).rows;
  assert.deepEqual(alerts.map(a => a.recipient_user_id), [creator]);
  await assert.rejects(() => retry(job.id), e => e.code === "22023");
  report.checks.push("Delivery: status and retry creator-only; private receipts service-only; early and duplicate receipts notify once; out-of-order delivery cannot erase a bounce; no recipient address is exposed");

  const failed = await makeJob();
  await admin("update split_private.invitation_emails set status='failed',error_code='resend_403',attempts=1,first_attempt_at=now() where id=$1", [failed.job.id]);
  assert.equal((await delivery(failed.doc.id))[0].canRetry, true);
  const original = (await admin("select first_attempt_at,attempts,recipient_email,work_title from split_private.invitation_emails where id=$1", [failed.job.id])).rows[0];
  await retry(failed.job.id);
  await assert.rejects(() => retry(failed.job.id), e => e.code === "22023");
  assert.deepEqual((await admin("select first_attempt_at,attempts,recipient_email,work_title from split_private.invitation_emails where id=$1", [failed.job.id])).rows[0], original);
  assert.equal((await delivery(failed.doc.id))[0].status, "queued");
  await admin("update split_private.invitation_emails set status='failed' where id=$1", [failed.job.id]);
  assert.equal((await delivery(failed.doc.id))[0].canRetry, false, "Manual retry cooldown ignored");
  for (const condition of ["error_code='network_error'", "first_attempt_at=now()-interval '21 hours'", "attempts=8", "provider_id='already-sent'"]) {
    await admin(`update split_private.invitation_emails set status='failed',error_code='resend_403',first_attempt_at=now(),attempts=1,provider_id=null,manual_retry_at=null where id=$1`, [failed.job.id]);
    await admin(`update split_private.invitation_emails set ${condition} where id=$1`, [failed.job.id]);
    await assert.rejects(() => retry(failed.job.id), e => e.code === "22023");
  }
  await admin("update split_private.invitation_emails set status='failed',error_code='resend_403',first_attempt_at=now(),attempts=1,provider_id=null,manual_retry_at=null where id=$1", [failed.job.id]);
  await admin("update public.split_sheet_collaborators set invite_status='Accepted' where id=$1", [failed.job.collaborator_id]);
  await assert.rejects(() => retry(failed.job.id), e => e.code === "22023");
  await admin("update public.split_sheet_collaborators set invite_status='Pending',invite_value='changed-recipient@example.test' where id=$1", [failed.job.collaborator_id]);
  await assert.rejects(() => retry(failed.job.id), e => e.code === "22023");
  await admin("update public.split_sheet_collaborators set invite_value=$1 where id=$2", [failed.job.recipient_email, failed.job.collaborator_id]);
  await admin("update split_private.invitation_email_config set enabled=false");
  await assert.rejects(() => retry(failed.job.id), e => e.code === "22023");
  report.checks.push("Delivery: explicit failures can retry once with immutable payload/deadline; duplicate, cooldown, ambiguous, expired, exhausted and already-sent retries rejected");
  report.checks.push("Delivery: accepted invitations, changed recipients and emergency-disable block manual retries");
}
