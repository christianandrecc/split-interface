import { describe, expect, it } from "vitest";
import {
  formatSplitSheetAuditTrail,
  splitSheetAllocationDisplayName,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import { makeDocument } from "@/test/fixtures/splitSheet";

describe("split sheet display helpers", () => {
  it("uses accepted profile snapshots instead of invited-writer placeholders", () => {
    const document = makeDocument();
    document.creatorProfile.displayName = "El Hijo";
    document.creatorProfile.username = "elhijo";
    document.data.parties[1] = {
      ...document.data.parties[1],
      professionalName: "",
      legalName: "",
      email: "",
      phoneNumber: "",
      inviteValue: "@chori",
      percent: 50,
    };
    document.collaboratorInvites[0] = {
      ...document.collaboratorInvites[0],
      name: "Invited writer",
      profileSnapshot: {
        username: "chori",
        displayName: "Chori",
        email: "chori@example.com",
      },
    };
    document.splitProposalVersions[0].allocations[1].name = "Invited writer";

    expect(splitSheetPartyDisplayName(document, document.data.parties[1])).toBe("Chori");
    expect(splitSheetParticipantDisplayName(document, "maya-invite", "Invited writer")).toBe("Chori");
    expect(splitSheetAllocationDisplayName(document, document.splitProposalVersions[0].allocations[1])).toBe("Chori");
  });

  it("hides internal chat storage entries from signed-record audit display", () => {
    const document = makeDocument();
    document.auditTrail = [
      {
        timestamp: document.createdAt,
        actor: "Chori",
        action: "Chori accepted the collaboration invite",
      },
      {
        timestamp: document.createdAt,
        actor: "Chori",
        action: "__splitChatMessages:{\"body\":\"hola\"}",
      },
      {
        timestamp: document.createdAt,
        actor: "Chori",
        action: "Sent a negotiation message",
      },
      {
        timestamp: document.createdAt,
        actor: "Chori",
        action: "Signed and verified the split sheet",
      },
    ];

    const events = formatSplitSheetAuditTrail(document).map((entry) => entry.event);

    expect(events).toEqual([
      "Chori accepted the collaboration invite",
      "Signed and verified the split sheet",
    ]);
  });
});
