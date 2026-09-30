import { describe, expect, it, vi } from "vitest";
import { Webhook } from "svix";
import { createDeliveryWebhook } from "../../supabase/functions/split-invitation-delivery/handler";
const secret = `whsec_${Buffer.from("test-only-secret-not-a-credential").toString("base64")}`;
function request(payload: object, age = 0) {
  const body = JSON.stringify(payload), at = new Date(Date.now() - age), id = "msg_test1";
  return new Request("https://example.test/webhook", { method: "POST", body, headers: {
    "svix-id": id, "svix-timestamp": String(Math.floor(at.getTime() / 1000)), "svix-signature": new Webhook(secret).sign(id, at, body),
  } });
}
const event = { type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: "email_123", to: ["private@example.test"], subject: "private song" } };
describe("signed invitation delivery webhooks", () => {
  it.each(["delivered", "delivery_delayed", "bounced", "complained", "failed", "suppressed"])("records only minimal fields for %s", async type => {
    const record = vi.fn();
    const response = await createDeliveryWebhook({ secret, record })(request({ ...event, type: `email.${type}` }));
    expect(response.status).toBe(200);
    expect(record).toHaveBeenCalledWith({ id: "msg_test1", providerId: "email_123", type, at: event.created_at });
    expect(JSON.stringify(record.mock.calls)).not.toContain("private");
  });
  it("rejects forged, modified and expired signatures without writing", async () => {
    const record = vi.fn(), handler = createDeliveryWebhook({ secret, record });
    expect((await handler(new Request("https://example.test", { method: "POST", body: JSON.stringify(event) }))).status).toBe(401);
    const signed = request(event);
    expect((await handler(new Request(signed.url, { method: "POST", headers: signed.headers, body: JSON.stringify({ ...event, type: "email.bounced" }) }))).status).toBe(401);
    expect((await handler(request(event, 600_000))).status).toBe(401);
    expect(record).not.toHaveBeenCalled();
  });
  it("fails closed without the secret, asks Resend to retry storage failures", async () => {
    expect((await createDeliveryWebhook({ record: vi.fn() })(request(event))).status).toBe(503);
    const response = await createDeliveryWebhook({ secret, record: vi.fn().mockRejectedValue(new Error("private database detail")) })(request(event));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database detail");
  });
  it("bounds body size and ignores unsupported events without writing", async () => {
    const record = vi.fn(), handler = createDeliveryWebhook({ secret, record });
    expect((await handler(request({ ...event, extra: "x".repeat(70_000) }))).status).toBe(413);
    expect((await handler(request({ ...event, type: "email.opened" }))).status).toBe(200);
    expect((await handler(request({ ...event, data: {} }))).status).toBe(400);
    expect(record).not.toHaveBeenCalled();
  });
});
