import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { makeDocument } from "../src/test/fixtures/splitSheet.ts";

const legacy = [];

// Seed real pre-migration signed records in disposable PostgreSQL, never hosted Auth.
export async function seedLegacyDelivery(db) {
  const owner = randomUUID();
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'delivery_legacy@example.test',$2)",
    [owner, { username: "delivery_legacy", legal_name: "Legacy Delivery Owner" }]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  for (const kind of ["placeholder", "completed", "real-provider"]) {
    const input = makeDocument();
    input.id = randomUUID();
    input.data.parties = [{ ...input.data.parties[0], percent: 100 }];
    await db.exec("set role authenticated");
    let doc = (await db.query("select public.upsert_split_sheet_document($1,'send',null) as doc", [input])).rows[0].doc;
    doc = (await db.query("select public.apply_split_sheet_participant_update($1,$2,'sign',null,null,null) as doc", [doc.id, doc])).rows[0].doc;
    assert.equal(doc.status, "Verified and Stored");
    await db.exec("reset role");
    if (kind === "completed") {
      await db.query("update public.split_sheet_contract_deliveries set delivery_status='sent' where split_sheet_id=$1", [doc.id]);
      await db.query("update public.split_sheets set contract_delivery_status='sent' where id=$1", [doc.id]);
    }
    if (kind === "real-provider") {
      await db.query("update public.split_sheet_contract_deliveries set provider='configured_test_provider' where split_sheet_id=$1", [doc.id]);
    }
    const sheet = (await db.query("select * from public.split_sheets where id=$1", [doc.id])).rows[0];
    const delivery = (await db.query("select * from public.split_sheet_contract_deliveries where split_sheet_id=$1", [doc.id])).rows[0];
    legacy.push({ kind, sheet, delivery });
  }
  await db.query("select set_config('request.jwt.claim.sub','',false)");
}

export async function verifyInAppDelivery({ db, report, admin, login, save, load, fixture, rejectsWithoutWrites, creator }) {
  for (const { kind, sheet, delivery } of legacy) {
    const nextSheet = (await admin("select * from public.split_sheets where id=$1", [sheet.id])).rows[0];
    const nextDelivery = (await admin("select * from public.split_sheet_contract_deliveries where id=$1", [delivery.id])).rows[0];
    if (kind !== "placeholder") {
      assert.deepEqual(nextSheet, sheet);
      assert.deepEqual(nextDelivery, delivery);
      continue;
    }
    assert.equal(nextSheet.contract_delivery_status, "unavailable");
    assert.equal(nextDelivery.delivery_status, "unavailable");
    assert.match(nextDelivery.error_message, /no email or SMS was sent/);
    const { contract_delivery_status, contract_delivery_error, updated_at, ...record } = nextSheet;
    assert.deepEqual({ ...record, contract_delivery_status: sheet.contract_delivery_status,
      contract_delivery_error: sheet.contract_delivery_error, updated_at: sheet.updated_at }, sheet);
    assert.deepEqual({ ...nextDelivery, delivery_status: delivery.delivery_status,
      error_message: delivery.error_message, updated_at: delivery.updated_at }, delivery);
  }
  report.checks.push("Delivery: migration retires queued placeholder jobs only; completed/other-provider requests and signed document evidence are unchanged");

  await login(creator);
  await rejectsWithoutWrites("Delivery: external send mode cannot create a sheet, invite, notification or queue entry",
    () => save(fixture(), "contract_delivery"), "0A000", /External delivery is unavailable/);
  const draft = await save(fixture(), "draft");
  await rejectsWithoutWrites("Delivery: external send mode cannot alter an existing draft",
    () => save(draft, "contract_delivery"), "0A000", /External delivery is unavailable/);
  await rejectsWithoutWrites("Delivery: direct client queue inserts remain blocked",
    () => db.query("insert into public.split_sheet_contract_deliveries(split_sheet_id,requested_by_label) values($1,'QA')", [draft.id]), "42501", /permission denied/);

  const sent = await save(draft, "send");
  const row = (await admin("select contract_delivery_status,contract_delivery_requested_at,contract_delivery_error from public.split_sheets where id=$1", [sent.id])).rows[0];
  assert.deepEqual(row, { contract_delivery_status: "not_requested", contract_delivery_requested_at: null, contract_delivery_error: null });
  assert.equal((await admin("select id from public.split_sheet_contract_deliveries where split_sheet_id=$1", [sent.id])).rows.length, 0);
  const notes = (await admin("select event_type,recipient_user_id from public.split_notifications where split_sheet_id=$1", [sent.id])).rows;
  assert.equal(notes.length, 1);
  assert.equal(notes[0].event_type, "split_invite");
  assert.notEqual(notes[0].recipient_user_id, creator);
  assert.equal((await load(sent.id)).sentAt, sent.sentAt);
  assert.match(sent.auditTrail.at(-1).action, /review in SPLIT/);
  report.checks.push("Delivery: in-app sends still persist and notify only the invited account, without external queue entries or false delivery metadata");
  await rejectsWithoutWrites("Delivery: repeated in-app sends cannot duplicate notifications",
    () => save(sent, "send"), "55000", /Messages/);

  for (const method of ["username", "email"]) {
    await login(creator);
    const recipient = randomUUID();
    const username = `delivery_late_${method}`;
    const email = `${username}@example.test`;
    const input = fixture();
    input.data.parties[1].inviteMethod = method;
    input.data.parties[1].inviteValue = method === "username" ? `@${username}` : email;
    const pending = await save(input, "send");
    const notifications = async () => (await admin(
      "select recipient_user_id from public.split_notifications where split_sheet_id=$1 and event_type='split_invite'", [pending.id])).rows;
    assert.deepEqual(await notifications(), []);
    await admin("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [recipient, email, { username, legal_name: "Late Recipient" }]);
    if (method === "email") {
      assert.deepEqual(await notifications(), []);
      await login(recipient);
      assert.equal(await load(pending.id), undefined);
      await admin("update auth.users set email_confirmed_at=now() where id=$1", [recipient]);
    }
    assert.deepEqual(await notifications(), [{ recipient_user_id: recipient }]);
    await login(recipient);
    assert.equal((await load(pending.id)).id, pending.id);
    await admin("update public.profiles set display_name='Updated Recipient' where user_id=$1", [recipient]);
    assert.deepEqual(await notifications(), [{ recipient_user_id: recipient }]);
    assert.equal((await admin("select id from public.split_sheet_contract_deliveries where split_sheet_id=$1", [pending.id])).rows.length, 0);
    report.checks.push(`Delivery: late ${method} binding creates exactly one in-app invite; unverified email cannot claim it`);
  }
}
