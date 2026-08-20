import { describe, expect, it } from "vitest";
import { makeDocument } from "@/test/fixtures/splitSheet";
import {
  getCollaboratorStatusSummary,
  queueContractDelivery,
  splitPercentTotal,
  validateDocumentSplit,
  validateSplitPercentages,
} from "@/lib/splitSheetWorkflow";

describe("split sheet workflow validation", () => {
  it("requires ownership percentages to total exactly 100", () => {
    expect(validateSplitPercentages([50, 25, 25])).toMatchObject({ valid: true, total: 100 });
    expect(validateSplitPercentages([50, 25])).toMatchObject({ valid: false, missing: 25 });
    expect(validateSplitPercentages([80, 30])).toMatchObject({ valid: false, overage: 10 });
  });

  it("rounds fractional percentages safely", () => {
    expect(splitPercentTotal([33.333, 33.333, 33.334])).toBe(100);
  });

  it("validates stored split documents through their collaborators", () => {
    const document = makeDocument();
    expect(validateDocumentSplit(document)).toMatchObject({ valid: true, total: 100 });

    document.data.parties[1].percent = 25;
    expect(validateDocumentSplit(document)).toMatchObject({ valid: false, missing: 15 });
  });

  it("summarizes collaborator review and signature status", () => {
    const summary = getCollaboratorStatusSummary(makeDocument());

    expect(summary).toEqual([
      {
        partyId: "creator-party",
        inviteStatus: "Accepted",
        approvalStatus: "Approved",
        signatureStatus: "Pending",
      },
      {
        partyId: "maya-party",
        inviteStatus: "Accepted",
        approvalStatus: "Pending",
        signatureStatus: "Pending",
      },
    ]);
  });

  it("records contract delivery as a server-side queue action", () => {
    const queued = queueContractDelivery(makeDocument(), "Chori");

    expect(queued.sentAt).toBeTruthy();
    expect(queued.auditTrail.at(-1)?.action).toContain("server-side services");
  });
});
