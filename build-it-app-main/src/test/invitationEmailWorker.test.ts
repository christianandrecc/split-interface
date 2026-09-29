import { describe, expect, it, vi } from "vitest";
import { createInvitationWorker } from "../../supabase/functions/send-split-invitations/worker";
import { invitationEmail } from "../../supabase/functions/send-split-invitations/email";

const token = "a".repeat(64);
const lease = { id: "11111111-1111-4111-8111-111111111111", leaseId: "22222222-2222-4222-8222-222222222222" };
const job = { id: lease.id, splitId: "33333333-3333-4333-8333-333333333333", to: "invitee@example.test", workTitle: "A <script> & Song", inviterName: "<Artist>" };
const request = (auth = `Bearer ${token}`, suffix = "") => new Request(`https://example.test/send${suffix}`, { method: "POST", headers: { authorization: auth } });
function setup(options: { allowed?: boolean; key?: string | null; job?: typeof job | null } = {}) {
  const rpc = vi.fn(async (name: string) => name === "verify_split_invitation_worker" ? options.allowed !== false
    : name === "claim_split_invitation_emails" ? [lease]
      : name === "prepare_split_invitation_email" ? ("job" in options ? options.job : job) : true);
  const fetch = vi.fn().mockResolvedValue(Response.json({ id: "resend-test-id" }));
  const worker = createInvitationWorker({ rpc, fetch, resendKey: options.key === null ? undefined : "test-private-key", sleep: async () => undefined });
  return { worker, rpc, fetch };
}
describe("invitation email worker", () => {
  it.each(["", "Bearer public-anon-key", "Bearer user-jwt"])("rejects %s before accessing the queue", async auth => {
    const { worker, rpc, fetch } = setup();
    expect((await worker(request(auth))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("requires server verification of the worker token", async () => {
    const { worker, rpc, fetch } = setup({ allowed: false });
    expect((await worker(request())).status).toBe(401);
    expect(rpc).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
  });
  it("never drains the queue without the Resend secret", async () => {
    const { worker, rpc } = setup({ key: null });
    expect((await worker(request())).status).toBe(503);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("health check authenticates but sends nothing", async () => {
    const { worker, rpc, fetch } = setup();
    expect(await (await worker(request(undefined, "?health=1"))).json()).toEqual({ configured: true });
    expect(rpc).toHaveBeenCalledTimes(1); expect(fetch).not.toHaveBeenCalled();
  });
  it("sends a single recipient with stable idempotency and records provider acceptance", async () => {
    const { worker, rpc, fetch } = setup();
    expect(await (await worker(request())).json()).toEqual({ sent: 1, skipped: 0, failed: 0 });
    expect(fetch.mock.calls[0][1].headers["Idempotency-Key"]).toBe(`split-invitation-v1/${job.id}`);
    expect(JSON.parse(fetch.mock.calls[0][1].body).to).toEqual([job.to]);
    expect(rpc).toHaveBeenLastCalledWith("finish_split_invitation_email", expect.objectContaining({ p_outcome: "sent", p_provider_id: "resend-test-id" }));
  });
  it("does not send an invitation accepted or declined after claim", async () => {
    const { worker, fetch } = setup({ job: null });
    expect(await (await worker(request())).json()).toEqual({ sent: 0, skipped: 1, failed: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[429,"retry"],[503,"retry"],[401,"failed"],[403,"failed"],[409,"failed"],[422,"failed"]])("handles HTTP %s without logging provider details", async (status, outcome) => {
    const { worker, rpc, fetch } = setup();
    fetch.mockResolvedValue(new Response("sensitive provider response", { status: Number(status) }));
    const result = await worker(request());
    expect(await result.text()).not.toContain("sensitive");
    expect(rpc).toHaveBeenLastCalledWith("finish_split_invitation_email", expect.objectContaining({ p_outcome: outcome, p_error_code: `resend_${status}` }));
  });
  it("records an ambiguous timeout for retry with the same key", async () => {
    const { worker, rpc, fetch } = setup(); fetch.mockRejectedValue(new Error("private token"));
    expect(await (await worker(request())).text()).not.toContain("private token");
    expect(rpc).toHaveBeenLastCalledWith("finish_split_invitation_email", expect.objectContaining({ p_outcome: "retry", p_error_code: "network_error" }));
  });
  it("does not claim success if the result cannot be persisted", async () => {
    const { worker, rpc } = setup();
    rpc.mockImplementation(async name => name === "verify_split_invitation_worker" ? true : name === "claim_split_invitation_emails" ? [lease] : name === "prepare_split_invitation_email" ? job : false);
    expect((await worker(request())).status).toBe(503);
  });
  it("escapes user content, uses the verified sender, and excludes agreement details", () => {
    const mail = invitationEmail(job);
    expect(mail.from).toBe("SPLIT <notifications@mail.mysplit.co>");
    expect(mail.reply_to).toBe("xtiancarrera@gmail.com");
    expect(mail.html).toContain("A &lt;script&gt; &amp; Song");
    expect(mail.html).not.toContain("<Artist>");
    expect(mail.html).toContain(`https://www.mysplit.co/?split=${job.splitId}`);
    expect(mail.text).toContain("does not accept");
    expect(mail).not.toHaveProperty("attachments"); expect(mail).not.toHaveProperty("cc");
  });
});
