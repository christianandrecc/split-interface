import { describe, expect, it } from "vitest";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";

describe("split sheet agreement mapping", () => {
  it("normalizes a stored split sheet into the shared dashboard agreement shape", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Ready to Sign";
    document.collaboratorInvites[0] = {
      ...document.collaboratorInvites[0],
      name: "Invited writer",
      profileSnapshot: {
        username: "chori",
        displayName: "Chori",
        email: "chori@example.com",
      },
    };
    document.data.parties[1] = {
      ...document.data.parties[1],
      professionalName: "",
      legalName: "",
      inviteValue: "@chori",
    };

    const agreement = documentToAgreement(document);

    expect(agreement).toMatchObject({
      id: document.id,
      title: "Night Swim",
      type: "Split Sheet",
      status: "Ready to Sign",
      version: 1,
      created: "2026-08-12",
      updated: "2026-08-12",
      parties: ["Chori", "Chori"],
      splits: [
        expect.objectContaining({ name: "Chori", percent: 60 }),
        expect.objectContaining({ name: "Chori", percent: 40 }),
      ],
    });
    expect(agreement.document?.collaboratorInvites[0].name).toBe("Chori");
    expect(agreement.document?.splitProposalVersions[0].allocations[1].name).toBe("Chori");
  });

  it("hydrates signature records for ready split sheets even when none are stored yet", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Ready to Sign";
    document.splitSignatures = [];

    const agreement = documentToAgreement(document);

    expect(agreement.document?.splitSignatures.map((signature) => signature.collaboratorId)).toEqual(
      expect.arrayContaining(["creator", "maya-invite"]),
    );
  });
});
