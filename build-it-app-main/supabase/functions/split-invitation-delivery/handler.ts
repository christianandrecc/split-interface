import { Webhook } from "svix";

type Dependencies = { secret?: string; record: (event: { id: string; providerId: string; type: string; at: string }) => Promise<void> };
const eventTypes = new Set(["email.delivered", "email.delivery_delayed", "email.bounced", "email.complained", "email.failed", "email.suppressed"]);
const reply = (status: number, body: object) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function createDeliveryWebhook(deps: Dependencies) {
  return async (request: Request) => {
    if (request.method !== "POST") return reply(405, { error: "method_not_allowed" });
    if (!deps.secret) return reply(503, { error: "webhook_not_configured" });
    const id = request.headers.get("svix-id") || "";
    const timestamp = request.headers.get("svix-timestamp") || "";
    const signature = request.headers.get("svix-signature") || "";
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id) || !timestamp || !signature) return reply(401, { error: "invalid_signature" });
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: "invalid_event" });
    let raw = "";
    try {
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 65536) { await reader.cancel(); return reply(413, { error: "event_too_large" }); }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch { return reply(400, { error: "invalid_event" }); }
    let event: { type?: string; created_at?: string; data?: { email_id?: string } };
    try {
      new Webhook(deps.secret).verify(raw, { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": signature });
      event = JSON.parse(raw) as typeof event;
    } catch { return reply(401, { error: "invalid_signature" }); }
    if (!event || !eventTypes.has(event.type ?? "")) return reply(200, { ignored: true });
    if (typeof event.data?.email_id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(event.data.email_id)
      || typeof event.created_at !== "string" || !Number.isFinite(Date.parse(event.created_at))) return reply(400, { error: "invalid_event" });
    try {
      await deps.record({ id, providerId: event.data.email_id, type: event.type!.slice(6), at: new Date(event.created_at).toISOString() });
      return reply(200, { received: true });
    } catch {
      // A non-2xx response asks the provider to retry. Never log payloads or addresses.
      return reply(503, { error: "delivery_event_not_stored" });
    }
  };
}
