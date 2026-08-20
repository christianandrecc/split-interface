import { describe, expect, it } from "vitest";
import {
  buildSplitSheetSignatureRecords,
  ensureSplitSheetCreatorApproval,
  getSplitSheetAcceptedParticipantIds,
  normalizeSplitSheetParticipantId,
} from "@/lib/splitSheetParticipantState";
import { makeDocument } from "@/test/fixtures/splitSheet";

describe("split sheet participant state", () => {
  it("adds the creator approval back when an initial creator proposal is missing it", () => {
    const document = makeDocument();
    document.splitApprovals = document.splitApprovals.filter((approval) => approval.collaboratorId !== "creator");
    const proposal = document.splitProposalVersions[0];

    const approvals = ensureSplitSheetCreatorApproval(document, document.splitApprovals, proposal, document.createdAt);

    expect(approvals.find((approval) => approval.collaboratorId === "creator")).toMatchObject({
      proposalVersionId: proposal.id,
      status: "Approved",
    });
    expect(getSplitSheetAcceptedParticipantIds({ ...document, splitApprovals: approvals }, proposal.id)).toContain("creator");
  });

  it("normalizes party ids and collaborator ids to one signer identity", () => {
    const document = makeDocument();

    expect(normalizeSplitSheetParticipantId(document, "creator-party")).toBe("creator");
    expect(normalizeSplitSheetParticipantId(document, "maya-party")).toBe("maya-invite");

    const signatures = buildSplitSheetSignatureRecords(
      {
        ...document,
        splitSignatures: [
          {
            id: "existing-maya-signature",
            proposalVersionId: "proposal-1",
            collaboratorId: "maya-party",
            collaboratorName: "Maya Rios",
            status: "Pending",
          },
        ],
      },
      "proposal-1",
    );

    expect(signatures.filter((signature) => signature.collaboratorId === "maya-invite")).toHaveLength(0);
    expect(signatures.map((signature) => signature.collaboratorId)).toEqual(expect.arrayContaining(["creator", "maya-party"]));
  });
});
