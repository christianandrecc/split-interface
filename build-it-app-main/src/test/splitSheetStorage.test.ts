import { describe, expect, it } from "vitest";
import {
  findInviteForProfile,
  documentBelongsToProfile,
  documentParticipantIdsForProfile,
  explainSplitSheetPersistenceError,
  loadLocalSplitSheetDocuments,
  saveLocalSplitSheetDocuments,
} from "@/lib/splitSheetStorage";
import { makeDocument } from "@/test/fixtures/splitSheet";
import { createEmptyProfile } from "@/lib/userProfile";

describe("split sheet profile matching", () => {
  it("detects the creator profile for a stored split sheet", () => {
    const document = makeDocument();
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
    };

    expect(documentBelongsToProfile(document, profile)).toBe(true);
  });

  it("prefers Supabase auth ids over reused creator usernames and emails", () => {
    const document = makeDocument();
    document.creatorUserId = "old-auth-user";
    document.creatorProfile.authUserId = "old-auth-user";

    const freshProfileWithSameHandle = {
      ...createEmptyProfile(),
      authUserId: "fresh-auth-user",
      username: "chori",
      emailAddress: "chori@example.com",
    };

    expect(documentBelongsToProfile(document, freshProfileWithSameHandle)).toBe(false);
    expect([...documentParticipantIdsForProfile(document, freshProfileWithSameHandle)]).toEqual([]);
  });

  it("keeps creator ownership when the Supabase auth id matches even if the username changes", () => {
    const document = makeDocument();
    document.creatorUserId = "creator-auth-user";
    document.creatorProfile.authUserId = "creator-auth-user";
    document.creatorProfile.username = "old-chori";
    document.creatorProfile.emailAddress = "old@example.com";

    const renamedCreatorProfile = {
      ...createEmptyProfile(),
      authUserId: "creator-auth-user",
      username: "new-chori",
      emailAddress: "new@example.com",
    };

    expect(documentBelongsToProfile(document, renamedCreatorProfile)).toBe(true);
    expect([...documentParticipantIdsForProfile(document, renamedCreatorProfile)].sort()).toEqual([
      "creator",
      "creator-party",
    ]);
  });

  it("explains backend persistence failures without exposing raw database language", () => {
    expect(explainSplitSheetPersistenceError(new Error("violates row-level security policy"))).toContain(
      "not allowed to update this split",
    );
    expect(explainSplitSheetPersistenceError(new Error("Network unavailable"))).toContain(
      "could not reach the backend",
    );
    expect(explainSplitSheetPersistenceError(new Error("function public.upsert_split_sheet_document does not exist"))).toContain(
      "missing the latest split-sheet migration",
    );
  });

  it("matches collaborator invites by username and email", () => {
    const usernameDocument = makeDocument();
    const usernameProfile = {
      ...createEmptyProfile(),
      username: "mayarios",
      emailAddress: "maya@example.com",
    };

    expect(findInviteForProfile(usernameDocument, usernameProfile)?.id).toBe("maya-invite");

    const emailDocument = makeDocument();
    emailDocument.collaboratorInvites[0].inviteMethod = "email";
    emailDocument.collaboratorInvites[0].inviteValue = "maya@example.com";

    expect(findInviteForProfile(emailDocument, usernameProfile)?.id).toBe("maya-invite");
  });

  it("matches collaborator invites by phone digits", () => {
    const document = makeDocument();
    document.collaboratorInvites[0].inviteMethod = "phone";
    document.collaboratorInvites[0].inviteValue = "+1 216-555-1212";

    const profile = {
      ...createEmptyProfile(),
      phoneCountryCode: "+1",
      phoneNumber: "216-555-1212",
    };

    expect(findInviteForProfile(document, profile)?.id).toBe("maya-invite");
  });

  it("resolves every participant id a collaborator can use for approval and signatures", () => {
    const document = makeDocument();
    document.splitApprovals[1].collaboratorId = "maya-party";
    document.splitSignatures = [
      {
        id: "maya-signature",
        proposalVersionId: "proposal-1",
        collaboratorId: "maya-party",
        collaboratorName: "Maya Rios",
        status: "Pending",
      },
    ];

    const profile = {
      ...createEmptyProfile(),
      username: "mayarios",
      emailAddress: "maya@example.com",
    };

    expect([...documentParticipantIdsForProfile(document, profile)].sort()).toEqual([
      "maya-invite",
      "maya-party",
    ]);
  });

  it("prefers a collaborator invite over a stale creator profile match", () => {
    const document = makeDocument();
    document.creatorUserId = "creator-auth-user";
    document.creatorProfile.authUserId = "creator-auth-user";
    document.creatorProfile.username = "chori";
    document.creatorProfile.emailAddress = "chori@example.com";
    document.collaboratorInvites[0].inviteValue = "@chori";
    document.collaboratorInvites[0].profileSnapshot = {
      username: "chori",
      displayName: "Chori",
      email: "chori@example.com",
    };
    document.data.parties[1].inviteValue = "@chori";

    const profile = {
      ...createEmptyProfile(),
      authUserId: "collaborator-auth-user",
      username: "chori",
      displayName: "Chori",
      emailAddress: "chori@example.com",
    };

    expect([...documentParticipantIdsForProfile(document, profile)].sort()).toEqual([
      "maya-invite",
      "maya-party",
    ]);
  });

  it("filters local fallback split sheets to the signed-in profile", () => {
    const document = makeDocument();
    document.status = "Pending Collaborator Acceptance";
    document.sentAt = document.createdAt;
    saveLocalSplitSheetDocuments([document]);

    const unrelatedProfile = {
      ...createEmptyProfile(),
      username: "someoneelse",
      emailAddress: "someone@example.com",
    };
    const invitedProfile = {
      ...createEmptyProfile(),
      username: "mayarios",
      emailAddress: "maya@example.com",
    };

    expect(loadLocalSplitSheetDocuments(unrelatedProfile)).toEqual([]);
    expect(loadLocalSplitSheetDocuments(invitedProfile)).toHaveLength(1);
  });

  it("keeps unsent drafts visible only to their creator", () => {
    const document = makeDocument();
    document.status = "Draft";
    document.sentAt = undefined;
    saveLocalSplitSheetDocuments([document]);

    const creatorProfile = {
      ...createEmptyProfile(),
      username: "chori",
      emailAddress: "chori@example.com",
    };
    const invitedProfile = {
      ...createEmptyProfile(),
      username: "mayarios",
      emailAddress: "maya@example.com",
    };

    expect(loadLocalSplitSheetDocuments(creatorProfile)).toHaveLength(1);
    expect(loadLocalSplitSheetDocuments(invitedProfile)).toEqual([]);
  });
});
