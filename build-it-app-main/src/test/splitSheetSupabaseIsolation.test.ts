import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/fixtures/splitSheet";

describe("split sheet Supabase isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
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
      /Could not send this split sheet through Supabase/,
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

    const { saveSplitSheetDocument } = await import("@/lib/splitSheetStorage");
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
  });

  it("routes creator Messages updates through the server-owned document RPC", async () => {
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

    await expect(saveSplitSheetParticipantAction(document, { action: "creator_update" }, profile)).resolves.toMatchObject({
      document: expect.objectContaining({ id: document.id }),
      persisted: true,
    });
    expect(rpc).toHaveBeenCalledWith("upsert_split_sheet_document", {
      p_document_payload: expect.objectContaining({ id: document.id }),
      p_mode: "update",
      p_actor_label: "Chori",
    });
    expect(rpc).not.toHaveBeenCalledWith("apply_split_sheet_participant_update", expect.anything());
  });

  it("routes generic sent split-sheet updates through the server-owned document RPC", async () => {
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

    await expect(saveSplitSheetParticipantAction(document, {}, profile)).resolves.toMatchObject({
      document: expect.objectContaining({ id: document.id }),
      persisted: true,
    });
    expect(rpc).toHaveBeenCalledWith("upsert_split_sheet_document", {
      p_document_payload: expect.objectContaining({ id: document.id }),
      p_mode: "update",
      p_actor_label: "Chori",
    });
    expect(rpc).not.toHaveBeenCalledWith("apply_split_sheet_participant_update", expect.anything());
  });
});
