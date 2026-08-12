import { describe, expect, it } from "vitest";
import {
  findInviteForProfile,
  documentBelongsToProfile,
  loadLocalSplitSheetDocuments,
  saveLocalSplitSheetDocuments,
} from "@/lib/splitSheetStorage";
import { makeDocument } from "@/test/splitSheetWorkflow.test";
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

  it("filters local fallback split sheets to the signed-in profile", () => {
    const document = makeDocument();
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
});
