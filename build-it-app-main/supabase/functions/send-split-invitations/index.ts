import { createInvitationWorker } from "./worker.ts";

const url = Deno.env.get("SUPABASE_URL");
const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const worker = createInvitationWorker({
  resendKey: Deno.env.get("RESEND_API_KEY"),
  rpc: async (name, args) => {
    if (!url || !key) throw new Error("backend_not_configured");
    const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!result.ok) throw new Error("invitation_rpc_failed");
    return result.json();
  },
});
Deno.serve(worker);
