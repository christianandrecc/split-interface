import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/fixtures/splitSheet";

describe("split sheet Supabase isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it("uses canonical server state after signing instead of optimistic document fields", async () => {
    const proposed = makeDocument();
    proposed.serverRevision = 4;
    proposed.status = "Verified and Stored";
    const confirmed = { ...proposed, serverRevision: 5, status: "Pending Signatures", splitSignatures: [] };
    const rpc = vi.fn(async () => ({ data: confirmed, error: null }));
    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: { auth: { getUser: async () => ({ data: { user: { id: "current-auth-user" } }, error: null }) }, rpc },
    }));
    const { saveSplitSheetParticipantAction } = await import("@/lib/splitSheetStorage");
    const result = await saveSplitSheetParticipantAction(proposed, { action: "sign" }, createEmptyProfile());
    expect(result.document).toEqual(confirmed);
    expect(rpc).toHaveBeenCalledWith("apply_split_sheet_participant_update", expect.objectContaining({
      p_document_payload: expect.objectContaining({ serverRevision: 4 }), p_action: "sign",
    }));
  });

  it.each([null, { id: "different-record" }])("does not treat an invalid RPC response as a confirmed signature: %s", async data => {
    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser: async () => ({ data: { user: { id: "current-auth-user" } }, error: null }) },
        rpc: async () => ({ data, error: null }),
      },
    }));
    const { saveSplitSheetParticipantAction } = await import("@/lib/splitSheetStorage");
    await expect(saveSplitSheetParticipantAction(makeDocument(), { action: "sign" }, createEmptyProfile()))
      .rejects.toThrow(/server did not return a confirmed split sheet/);
  });

  it("surfaces stale revisions without confirming or caching a participant update", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser: async () => ({ data: { user: { id: "current-auth-user" } }, error: null }) },
        rpc: async () => ({ data: null, error: { code: "40001", message: "This split sheet changed. Refresh it before trying again." } }),
      },
    }));
    const { saveSplitSheetParticipantAction } = await import("@/lib/splitSheetStorage");
    await expect(saveSplitSheetParticipantAction(makeDocument(), { action: "sign" }, createEmptyProfile()))
      .rejects.toThrow(/Refresh it before trying again/);
    expect(window.localStorage.length).toBe(0);
  });

  it("does not merge stale local split sheets after an authenticated Supabase load", async () => {
    const getUser = vi.fn(async () => ({
      data: { user: { id: "fresh-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: [],
      error: null,
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const {
      loadLocalSplitSheetDocuments,
      loadSplitSheetDocuments,
      saveLocalSplitSheetDocuments,
      splitSheetLocalStorageOwnerForAuthUser,
    } = await import("@/lib/splitSheetStorage");

    const staleDocument = makeDocument();
    staleDocument.sentAt = staleDocument.createdAt;
    saveLocalSplitSheetDocuments([staleDocument]);

    const freshProfile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
    };

    await expect(loadSplitSheetDocuments(freshProfile)).resolves.toEqual([]);
    expect(loadLocalSplitSheetDocuments(freshProfile)).toEqual([]);
    expect(loadLocalSplitSheetDocuments(freshProfile, splitSheetLocalStorageOwnerForAuthUser("fresh-auth-user"))).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("load_my_split_sheets");
  });

  it("keeps only unsent local drafts when Supabase cannot load split sheets", async () => {
    const getUser = vi.fn(async () => ({
      data: { user: { id: "offline-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Network unavailable" },
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const {
      loadSplitSheetDocuments,
      saveLocalSplitSheetDocuments,
      splitSheetLocalStorageOwnerForAuthUser,
    } = await import("@/lib/splitSheetStorage");

    const sentLocalDocument = makeDocument();
    sentLocalDocument.sentAt = sentLocalDocument.createdAt;
    const draftLocalDocument = makeDocument();
    draftLocalDocument.id = "22222222-2222-4222-8222-222222222222";
    draftLocalDocument.status = "Draft";
    draftLocalDocument.sentAt = undefined;
    saveLocalSplitSheetDocuments(
      [sentLocalDocument, draftLocalDocument],
      splitSheetLocalStorageOwnerForAuthUser("offline-auth-user"),
    );

    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
    };

    const results = await loadSplitSheetDocuments(profile);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      document: expect.objectContaining({ id: draftLocalDocument.id }),
      persisted: false,
    });
  });

  it("keeps only current account local drafts during an empty Supabase refresh", async () => {
    const getUser = vi.fn(async () => ({
      data: { user: { id: "current-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: [],
      error: null,
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const {
      loadSplitSheetDocuments,
      saveLocalSplitSheetDocuments,
      splitSheetLocalStorageOwnerForAuthUser,
    } = await import("@/lib/splitSheetStorage");

    const sentLocalDocument = makeDocument();
    sentLocalDocument.sentAt = sentLocalDocument.createdAt;
    const draftLocalDocument = makeDocument();
    draftLocalDocument.id = "33333333-3333-4333-8333-333333333333";
    draftLocalDocument.status = "Draft";
    draftLocalDocument.sentAt = undefined;
    saveLocalSplitSheetDocuments(
      [sentLocalDocument, draftLocalDocument],
      splitSheetLocalStorageOwnerForAuthUser("current-auth-user"),
    );

    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
    };

    const results = await loadSplitSheetDocuments(profile);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      document: expect.objectContaining({ id: draftLocalDocument.id }),
      persisted: false,
    });
    expect(rpc).toHaveBeenCalledWith("load_my_split_sheets");
  });

  it("does not cache Supabase-loaded sent split sheets back into local storage", async () => {
    const remoteDocument = makeDocument();
    remoteDocument.sentAt = remoteDocument.createdAt;
    remoteDocument.status = "Pending Split Approval";
    const getUser = vi.fn(async () => ({
      data: { user: { id: "current-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: [{ id: remoteDocument.id, updated_at: remoteDocument.updatedAt, document_payload: remoteDocument }],
      error: null,
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const {
      loadLocalSplitSheetDocuments,
      loadSplitSheetDocuments,
      splitSheetLocalStorageOwnerForAuthUser,
    } = await import("@/lib/splitSheetStorage");
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
    };

    const results = await loadSplitSheetDocuments(profile);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      document: expect.objectContaining({ id: remoteDocument.id }),
      persisted: true,
    });
    expect(loadLocalSplitSheetDocuments(profile, splitSheetLocalStorageOwnerForAuthUser("current-auth-user"))).toEqual([]);
  });

  it("does not pretend a sent split sheet was delivered when Supabase rejects it", async () => {
    const getUser = vi.fn(async () => ({
      data: { user: { id: "current-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "violates row-level security policy" },
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const {
      loadLocalSplitSheetDocuments,
      saveSplitSheetDocument,
      splitSheetLocalStorageOwnerForAuthUser,
    } = await import("@/lib/splitSheetStorage");
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
      displayName: "Chori",
    };

    await expect(saveSplitSheetDocument(makeDocument(), "send", profile)).rejects.toThrow(
      /Could not send this split sheet\. Your account is not allowed to update this split yet/,
    );
    expect(loadLocalSplitSheetDocuments(profile, splitSheetLocalStorageOwnerForAuthUser("current-auth-user"))).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("upsert_split_sheet_document", {
      p_document_payload: expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111" }),
      p_mode: "send",
      p_actor_label: "Chori",
    });
  });

  it("saves creator-owned split sheets through the server-owned RPC", async () => {
    const document = makeDocument();
    const getUser = vi.fn(async () => ({
      data: { user: { id: "current-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: document,
      error: null,
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const {
      loadLocalSplitSheetDocuments,
      saveSplitSheetDocument,
      splitSheetLocalStorageOwnerForAuthUser,
    } = await import("@/lib/splitSheetStorage");
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
      displayName: "Chori",
    };

    await expect(saveSplitSheetDocument(document, "send", profile)).resolves.toMatchObject({
      document: expect.objectContaining({ id: document.id }),
      persisted: true,
    });
    expect(rpc).toHaveBeenCalledWith("upsert_split_sheet_document", {
      p_document_payload: expect.objectContaining({ id: document.id }),
      p_mode: "send",
      p_actor_label: "Chori",
    });
    expect(loadLocalSplitSheetDocuments(profile, splitSheetLocalStorageOwnerForAuthUser("current-auth-user"))).toEqual([]);
  });

  it("clears locally cached drafts after Supabase confirms the save", async () => {
    const document = makeDocument();
    document.status = "Draft";
    document.sentAt = undefined;
    const getUser = vi.fn(async () => ({
      data: { user: { id: "current-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: document,
      error: null,
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const {
      loadLocalSplitSheetDocuments,
      saveSplitSheetDocument,
      splitSheetLocalStorageOwnerForAuthUser,
    } = await import("@/lib/splitSheetStorage");
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
      displayName: "Chori",
    };

    await expect(saveSplitSheetDocument(document, "draft", profile)).resolves.toMatchObject({
      document: expect.objectContaining({ id: document.id }),
      persisted: true,
    });
    expect(loadLocalSplitSheetDocuments(profile, splitSheetLocalStorageOwnerForAuthUser("current-auth-user"))).toEqual([]);
  });

  it("routes creator counter-offers through the same action RPC as collaborators", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Pending Split Approval";

    const getUser = vi.fn(async () => ({
      data: { user: { id: "current-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: document,
      error: null,
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const { saveSplitSheetParticipantAction } = await import("@/lib/splitSheetStorage");
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
      displayName: "Chori",
    };

    await expect(saveSplitSheetParticipantAction(document, { action: "counter_offer" }, profile)).resolves.toMatchObject({
      document: expect.objectContaining({ id: document.id }),
      persisted: true,
    });
    expect(rpc).toHaveBeenCalledWith("apply_split_sheet_participant_update", {
      p_split_sheet_id: document.id,
      p_document_payload: expect.objectContaining({ id: document.id }),
      p_action: "counter_offer",
      p_actor_label: "Chori",
      p_response_type: null,
      p_notes: null,
    });
    expect(rpc).not.toHaveBeenCalledWith("upsert_split_sheet_document", expect.anything());
  });

  it("rejects generic sent updates without an explicit Messages action", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Pending Split Approval";

    const getUser = vi.fn(async () => ({
      data: { user: { id: "current-auth-user" } },
      error: null,
    }));
    const rpc = vi.fn(async () => ({
      data: document,
      error: null,
    }));

    vi.doMock("@/integrations/supabase/client", () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: { getUser },
        rpc,
      },
    }));

    const { saveSplitSheetParticipantAction } = await import("@/lib/splitSheetStorage");
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
      displayName: "Chori",
    };

    await expect(saveSplitSheetParticipantAction(document, {}, profile)).rejects.toThrow(/Use a Messages action/);
    expect(rpc).not.toHaveBeenCalled();
  });
});
