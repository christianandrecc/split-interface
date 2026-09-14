import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CollaborationView from "@/components/CollaborationView";
import { appendSplitSheetChatMessage } from "@/lib/splitSheetMessages";
import { buildSplitSheetSignatureRecords } from "@/lib/splitSheetParticipantState";
import { documentToNegotiationDeal } from "@/lib/splitSheetNegotiation";
import { createEmptyProfile } from "@/lib/userProfile";
import { makeCounterDocument, makeDocument } from "@/test/fixtures/splitSheet";

const collaborator = { ...createEmptyProfile(), username: "mayarios", displayName: "Maya Rios", emailAddress: "maya@example.com" };

function initialDocument() {
  const document = makeDocument();
  document.sentAt = document.createdAt;
  document.serverRevision = 1;
  document.splitSignatures = buildSplitSheetSignatureRecords(document, document.currentProposalId);
  return document;
}

function badges(document: ReturnType<typeof makeDocument>) {
  return {
    creator: documentToNegotiationDeal(document, document.creatorProfile)?.pendingActionCount,
    collaborator: documentToNegotiationDeal(document, collaborator)?.pendingActionCount,
  };
}

describe("viewer-specific negotiation action badges", () => {
  it("counts one current invitation, not future approvals and signatures", () => {
    const document = initialDocument();
    document.collaboratorInvites[0].status = "Pending";
    expect(badges(document)).toEqual({ creator: 0, collaborator: 1 });
  });

  it("counts only the incoming proposal while signatures are not yet available", () => {
    expect(badges(initialDocument())).toEqual({ creator: 0, collaborator: 1 });
  });

  it("moves the badge to the creator after the collaborator counters", () => {
    const document = makeCounterDocument();
    document.splitSignatures = buildSplitSheetSignatureRecords(document, document.currentProposalId);
    expect(badges(document)).toEqual({ creator: 1, collaborator: 0 });
  });

  it("does not count the author's proposal even if an old approval row says Pending", () => {
    const document = makeCounterDocument();
    document.splitApprovals.forEach((approval) => { approval.status = "Pending"; });
    expect(badges(document)).toEqual({ creator: 1, collaborator: 0 });
  });

  it("does not turn historical rejection or signature placeholders into a new action", () => {
    const document = initialDocument();
    document.status = "Disputed";
    document.splitApprovals[1].status = "Rejected";
    expect(badges(document)).toEqual({ creator: 0, collaborator: 0 });
  });

  it("waits for everyone's approval even if the document has a stale ready status", () => {
    const document = makeCounterDocument();
    document.status = "Ready to Sign";
    document.splitSignatures = buildSplitSheetSignatureRecords(document, document.currentProposalId);
    expect(badges(document)).toEqual({ creator: 1, collaborator: 0 });
  });

  it("does not offer signing while another person's invitation is pending", () => {
    const document = initialDocument();
    document.collaboratorInvites[0].status = "Pending";
    document.splitApprovals.forEach((approval) => { approval.status = "Approved"; });
    expect(badges(document)).toEqual({ creator: 0, collaborator: 1 });
  });

  it("does not count approval after signing starts or when the proposal author is unknown", () => {
    const document = initialDocument();
    document.splitSignatures[0].status = "Signed";
    expect(badges(document)).toEqual({ creator: 0, collaborator: 0 });
    document.splitSignatures = [];
    document.splitProposalVersions[0].proposedBy = "Unknown author";
    expect(badges(document)).toEqual({ creator: 0, collaborator: 0 });
  });

  it("counts signing for each person only once everyone has accepted", () => {
    const document = initialDocument();
    document.splitApprovals.forEach((approval) => { approval.status = "Approved"; });
    expect(badges(document)).toEqual({ creator: 1, collaborator: 1 });
    document.splitSignatures.find((signature) => signature.collaboratorId === "maya-invite")!.status = "Signed";
    expect(badges(document)).toEqual({ creator: 1, collaborator: 0 });
    document.splitSignatures.forEach((signature) => { signature.status = "Signed"; });
    expect(badges(document)).toEqual({ creator: 0, collaborator: 0 });
  });

  it("recognizes pending signing even when the signature rows have not been created yet", () => {
    const document = initialDocument();
    document.splitSignatures = [];
    document.splitApprovals.forEach((approval) => { approval.status = "Approved"; });
    expect(badges(document)).toEqual({ creator: 1, collaborator: 1 });
  });

  it.each(["Fully Signed", "Verified and Stored", "Executed", "Archived"] as const)("ignores stale pending rows on a %s record", (status) => {
    const document = initialDocument();
    document.status = status;
    expect(badges(document)).toEqual({ creator: 0, collaborator: 0 });
  });

  it("does not count a declined invitation or actions blocked by it", () => {
    const document = initialDocument();
    document.collaboratorInvites[0].status = "Declined";
    document.splitApprovals.forEach((approval) => { approval.status = "Approved"; });
    expect(badges(document)).toEqual({ creator: 0, collaborator: 0 });
  });

  it("normalizes party IDs and ignores signature rows from previous versions", () => {
    const document = makeCounterDocument();
    document.splitSignatures = buildSplitSheetSignatureRecords(document, "proposal-1")
      .map((signature) => ({ ...signature, status: "Signed" as const }));
    document.splitApprovals.forEach((approval) => {
      if (approval.collaboratorId === "creator") approval.collaboratorId = "creator-party";
      if (approval.collaboratorId === "maya-invite") approval.collaboratorId = "maya-party";
    });
    expect(badges(document)).toEqual({ creator: 1, collaborator: 0 });
  });

  it("does not infer another action from one's own chat messages", () => {
    const document = makeCounterDocument();
    expect(badges(document)).toEqual({ creator: 1, collaborator: 0 });
    const updated = appendSplitSheetChatMessage(document, {
      id: "own-message", senderId: "maya-invite", senderName: "Maya Rios",
      body: "Please review my counter", createdAt: new Date().toISOString(),
    });
    expect(badges(updated)).toEqual({ creator: 1, collaborator: 0 });
  });

  it("uses linked account IDs even when both users have the same display name", () => {
    const document = makeCounterDocument();
    document.creatorUserId = "creator-account";
    document.creatorProfile.authUserId = "creator-account";
    document.creatorProfile.displayName = "Maya Rios";
    document.collaboratorInvites[0].collaboratorUserId = "maya-account";
    expect(documentToNegotiationDeal(document, document.creatorProfile)?.pendingActionCount).toBe(1);
    expect(documentToNegotiationDeal(document, { ...collaborator, authUserId: "maya-account" })?.pendingActionCount).toBe(0);
  });

  it("rerenders the badge for the correct viewer when switching accounts", () => {
    const document = makeCounterDocument();
    const props = { documents: [document], onUpdateDocument: vi.fn() };
    const view = render(<CollaborationView {...props} userProfile={document.creatorProfile} />);
    expect(screen.getByLabelText("Action needed from you")).toHaveTextContent("1");
    view.rerender(<CollaborationView {...props} userProfile={collaborator} />);
    expect(screen.queryByLabelText("Action needed from you")).not.toBeInTheDocument();
    view.rerender(<CollaborationView {...props} userProfile={document.creatorProfile} />);
    expect(screen.getByLabelText("Action needed from you")).toHaveTextContent("1");
  });

  it("clears the sender's badge after a confirmed counter and shows it to the recipient", async () => {
    const document = initialDocument();
    const onUpdateDocument = vi.fn().mockImplementation(async (updated) => updated);
    const view = render(<CollaborationView documents={[document]} userProfile={collaborator} onUpdateDocument={onUpdateDocument} />);
    expect(screen.getByLabelText("Action needed from you")).toHaveTextContent("1");
    fireEvent.click(screen.getAllByRole("button", { name: "Counter" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Split equally" }));
    fireEvent.click(screen.getByRole("button", { name: "Send counter" }));
    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledOnce());
    const updated = onUpdateDocument.mock.calls[0][0];
    view.rerender(<CollaborationView documents={[updated]} userProfile={collaborator} onUpdateDocument={onUpdateDocument} />);
    expect(screen.queryByLabelText("Action needed from you")).not.toBeInTheDocument();
    view.rerender(<CollaborationView documents={[updated]} userProfile={document.creatorProfile} onUpdateDocument={onUpdateDocument} />);
    expect(screen.getByLabelText("Action needed from you")).toHaveTextContent("1");
  });
});
