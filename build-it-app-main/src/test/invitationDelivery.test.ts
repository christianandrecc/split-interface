import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), report: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc } }));
vi.mock("@/lib/monitoring", () => ({ reportFailure: mocks.report }));
import { loadInvitationDelivery, retryInvitationEmail } from "@/lib/invitationDelivery";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});
describe("invitation delivery requests", () => {
  it("treats only a missing RPC as unavailable, not as successful delivery", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    expect(await loadInvitationDelivery("owner", "split")).toBeNull();
    expect(mocks.report).not.toHaveBeenCalled();
  });
  it("reports a real failure through privacy-filtered monitoring", async () => {
    const error = { code: "42501", message: "Private server details" };
    mocks.rpc.mockResolvedValue({ data: null, error });
    await expect(loadInvitationDelivery("owner", "split")).rejects.toThrow("Email status could not be refreshed.");
    expect(mocks.report).toHaveBeenCalledWith("invitation_status_failure", error);
  });
  it("does not release rows after an account switch during a request", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "owner" } }, error: null }).mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    await expect(loadInvitationDelivery("owner", "split")).rejects.toThrow("Email status could not be refreshed.");
  });
  it("rejects malformed successful responses", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "delivered" }, error: null });
    await expect(loadInvitationDelivery("owner", "split")).rejects.toThrow();
    expect(mocks.report).toHaveBeenCalled();
  });
  it("does not request a retry for another account", async () => {
    await expect(retryInvitationEmail("other", "job")).rejects.toThrow("could not be safely retried");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reports a rejected retry and only accepts a true server acknowledgement", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(retryInvitationEmail("owner", "job")).rejects.toThrow("could not be safely retried");
    expect(mocks.report).toHaveBeenCalledWith("invitation_retry_failure", expect.any(Error));
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(retryInvitationEmail("owner", "job")).resolves.toBeUndefined();
  });
});
