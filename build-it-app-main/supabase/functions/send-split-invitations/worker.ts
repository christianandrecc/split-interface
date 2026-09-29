import { invitationEmail, type InvitationEmail } from "./email.ts";

type Dependencies = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  resendKey?: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};
type Lease = { id: string; leaseId: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function createInvitationWorker(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    const token = request.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) return response({ error: "unauthorized" }, 401);
    try {
      // Custom authentication is mandatory: this endpoint does not accept user JWTs.
      if (await deps.rpc("verify_split_invitation_worker", { p_token: token }) !== true) return response({ error: "unauthorized" }, 401);
      if (!deps.resendKey) return response({ error: "email_service_not_configured" }, 503);
      if (new URL(request.url).searchParams.get("health") === "1") return response({ configured: true });
      const leases = await deps.rpc("claim_split_invitation_emails", { p_token: token }) as Lease[];
      if (!Array.isArray(leases) || leases.length > 5) throw new Error("invalid_queue_result");
      let sent = 0;
      let skipped = 0;
      let failed = 0;
      const startedAt = Date.now();
      for (const lease of leases) {
        // Leave unused leases to recover if slow upstream requests approach the runtime limit.
        if (Date.now() - startedAt > 65000) break;
        if (!UUID.test(lease.id) || !UUID.test(lease.leaseId)) throw new Error("invalid_lease");
        const job = await deps.rpc("prepare_split_invitation_email", { p_token: token, p_job: lease.id, p_lease: lease.leaseId }) as InvitationEmail | null;
        if (!job) { skipped++; continue; }
        if (job.id !== lease.id || !UUID.test(job.splitId) || typeof job.to !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(job.to)
          || typeof job.workTitle !== "string" || typeof job.inviterName !== "string") throw new Error("invalid_email_job");
        let outcome = "retry";
        let providerId: string | null = null;
        let errorCode: string | null = "network_error";
        try {
          const result = await (deps.fetch ?? fetch)("https://api.resend.com/emails", {
            method: "POST", redirect: "error", signal: AbortSignal.timeout(12000),
            headers: { Authorization: `Bearer ${deps.resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `split-invitation-v1/${job.id}` },
            body: JSON.stringify(invitationEmail(job)),
          });
          if (result.ok) {
            const body = await result.json();
            if (typeof body.id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(body.id)) {
              outcome = "sent"; providerId = body.id; errorCode = null;
            } else errorCode = "invalid_provider_response";
          } else {
            outcome = result.status === 429 || result.status >= 500 ? "retry" : "failed";
            errorCode = `resend_${result.status}`;
          }
        } catch { /* A stable idempotency key makes ambiguous network retries safe for the bounded retry window. */ }
        const stored = await deps.rpc("finish_split_invitation_email", {
          p_token: token, p_job: job.id, p_lease: lease.leaseId, p_outcome: outcome, p_provider_id: providerId, p_error_code: errorCode,
        });
        if (stored !== true) throw new Error("delivery_result_not_stored");
        if (outcome === "sent") sent++; else failed++;
        await (deps.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms))))(600);
      }
      return response({ sent, skipped, failed });
    } catch {
      // Never return or log provider bodies, recipients, credentials, or Auth data.
      return response({ error: "invitation_worker_failed" }, 503);
    }
  };
}
