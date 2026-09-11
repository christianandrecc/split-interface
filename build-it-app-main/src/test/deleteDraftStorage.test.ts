import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDocument } from "@/test/fixtures/splitSheet";

async function setup({ configured = true, userId = "owner", data = "11111111-1111-4111-8111-111111111111", error = null as { message: string } | null } = {}) {
  const rpc = vi.fn(async () => ({ data, error }));
  vi.doMock("@/integrations/supabase/client", () => ({
    isSupabaseConfigured: configured,
    supabase: { rpc, auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) } },
  }));
  const storage = await import("@/lib/splitSheetStorage");
  const document = makeDocument();
  document.status = "Draft";
  document.creatorUserId = "owner";
  document.creatorProfile.authUserId = "owner";
  document.serverRevision = 3;
  const ownerKey = storage.splitSheetLocalStorageOwnerForAuthUser("owner");
  storage.saveLocalSplitSheetDocuments([document], ownerKey);
  storage.saveLocalSplitSheetDocuments([document], "auth:other");
  return { storage, document, ownerKey, rpc };
}

describe("draft deletion persistence", () => {
  beforeEach(() => { vi.resetModules(); localStorage.clear(); });

  it("confirms the exact record/revision before removing only the current account's cache", async () => {
    const { storage, document, ownerKey, rpc } = await setup();
    storage.saveLocalSplitSheetDocuments([document]);
    await storage.deleteSplitSheetDraft(document, document.creatorProfile);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("delete_split_sheet_draft", { p_split_sheet_id: document.id, p_expected_revision: 3 });
    expect(storage.loadLocalSplitSheetDocuments(undefined, ownerKey)).toEqual([]);
    expect(storage.loadLocalSplitSheetDocuments()).toEqual([]);
    expect(storage.loadLocalSplitSheetDocuments(undefined, "auth:other")).toEqual([document]);
  });

  it.each(["Network unavailable", "This draft changed. Refresh before deleting it.", "Could not find the function in the schema cache"])("retains the draft after %s", async message => {
    const { storage, document, ownerKey } = await setup({ error: { message } });
    await expect(storage.deleteSplitSheetDraft(document, document.creatorProfile)).rejects.toThrow();
    expect(storage.loadLocalSplitSheetDocuments(undefined, ownerKey)).toEqual([document]);
  });

  it("rejects an unconfirmed response without clearing the draft", async () => {
    const { storage, document, ownerKey } = await setup({ data: "another-id" });
    await expect(storage.deleteSplitSheetDraft(document, document.creatorProfile)).rejects.toThrow(/not confirmed/);
    expect(storage.loadLocalSplitSheetDocuments(undefined, ownerKey)).toEqual([document]);
  });

  it.each(["", "other"])("rejects signed-out or switched account %s before RPC", async userId => {
    const { storage, document, rpc, ownerKey } = await setup({ userId });
    await expect(storage.deleteSplitSheetDraft(document, document.creatorProfile)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    expect(storage.loadLocalSplitSheetDocuments(undefined, ownerKey)).toEqual([document]);
  });

  it("rejects sent records before RPC even if their status says Draft", async () => {
    const { storage, document, rpc } = await setup();
    document.sentAt = document.createdAt;
    await expect(storage.deleteSplitSheetDraft(document, document.creatorProfile)).rejects.toThrow(/unsent drafts/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not pretend a stored draft was deleted when Supabase is unconfigured", async () => {
    const { storage, document } = await setup({ configured: false });
    await expect(storage.deleteSplitSheetDraft(document, document.creatorProfile)).rejects.toThrow(/Connect to Supabase/);
  });
});
