import { createDeliveryWebhook } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL");
const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
Deno.serve(createDeliveryWebhook({
  secret: Deno.env.get("RESEND_WEBHOOK_SECRET"),
  record: async event => {
    if (!url || !key) throw new Error("backend_not_configured");
    const result = await fetch(`${url}/rest/v1/rpc/record_split_invitation_delivery`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify({ p_event_id: event.id, p_provider_id: event.providerId, p_event_type: event.type, p_event_at: event.at }),
    });
    if (!result.ok || await result.json() !== true) throw new Error("delivery_event_not_stored");
  },
}));
