import { afterEach, describe, expect, it, vi } from "vitest";
import { makeDocument } from "@/test/fixtures/splitSheet";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabase: { auth: { getUser: mocks.getUser }, rpc: mocks.rpc } }));
import { loadSplitSheetDocumentForExport } from "@/lib/splitSheetStorage";
afterEach(() => vi.clearAllMocks());
describe("export source isolation", () => {
  it("loads the latest participant-scoped record from Supabase", async () => {
    const snapshot = makeDocument(); snapshot.sentAt = snapshot.createdAt;
    const fresh = { ...snapshot, version: 5 };
    mocks.getUser.mockResolvedValue({ data: { user: { id: "viewer" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: [{ id: fresh.id, creator_user_id: "creator-auth", document_payload: fresh }], error: null });
    const result = await loadSplitSheetDocumentForExport(snapshot);
    expect(result.version).toBe(5); expect(result.creatorUserId).toBe("creator-auth");
    expect(mocks.rpc).toHaveBeenCalledWith("load_my_split_sheets");
  });
  it.each(["unavailable", "inaccessible", "signed-out"])("does not fall back to a stale signed record when %s", async (mode) => {
    const snapshot = makeDocument(); snapshot.sentAt = snapshot.createdAt; snapshot.status = "Verified and Stored";
    mocks.getUser.mockResolvedValue({ data: { user: mode === "signed-out" ? null : { id: "viewer" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: [], error: mode === "unavailable" ? { message: "Network error" } : null });
    await expect(loadSplitSheetDocumentForExport(snapshot)).rejects.toThrow();
  });
  it("keeps unsent draft exports local", async () => {
    const doc = makeDocument(); doc.status = "Draft"; doc.sentAt = undefined;
    expect(await loadSplitSheetDocumentForExport(doc)).toBe(doc); expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
