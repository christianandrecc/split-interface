import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DealSummary from "@/components/DealSummary";
import { compareSplitVersions, dealSummaryParticipants } from "@/lib/dealSummary";
import { documentToNegotiationDeal } from "@/lib/splitSheetNegotiation";
import { makeDocument } from "@/test/fixtures/splitSheet";

function fixture() {
  const document = makeDocument();
  document.serverRevision = 7;
  document.sentAt = document.createdAt;
  const deal = documentToNegotiationDeal(document, document.creatorProfile)!;
  return { document, deal, version: deal.splitVersions[0] };
}

describe("deal summary data", () => {
  it("maps party allocations to canonical creator and invite approvals", () => {
    const { deal, version } = fixture();
    const people = dealSummaryParticipants(deal, version);
    expect(people.map((person) => [person.id, person.state, person.percent])).toEqual([["creator", "Accepted", 60], ["maya-invite", "Pending", 40]]);
  });
  it("does not mistake pending or declined invitations for approval", () => {
    const { deal, version } = fixture();
    deal.acceptedBy.push("maya-invite");
    deal.document.collaboratorInvites[0].status = "Pending";
    expect(dealSummaryParticipants(deal, version)[1]).toMatchObject({ state: "Invited", accepted: false });
    deal.document.collaboratorInvites[0].status = "Declined";
    expect(dealSummaryParticipants(deal, version)[1]).toMatchObject({ state: "Invite declined", accepted: false });
  });
  it("separates approval, signatures and requested changes", () => {
    const { deal, version } = fixture();
    deal.signedBy.push("creator");
    deal.document.splitApprovals[1].status = "Rejected";
    expect(dealSummaryParticipants(deal, version).map((person) => person.state)).toEqual(["Signed", "Changes requested"]);
  });
  it("does not count old signatures or approvals on a new proposal", () => {
    const { document } = fixture();
    document.splitSignatures.push({ id: "signed-old", proposalVersionId: "proposal-1", collaboratorId: "creator", collaboratorName: "Chori", status: "Signed" });
    document.currentProposalId = "proposal-2";
    document.splitProposalVersions.push({ ...document.splitProposalVersions[0], id: "proposal-2", versionNumber: 2 });
    const deal = documentToNegotiationDeal(document, document.creatorProfile)!;
    expect(dealSummaryParticipants(deal, deal.splitVersions[1]).map((person) => person.state)).toEqual(["Pending", "Pending"]);
  });
  it("compares shares by participant id rather than position", () => {
    const { version } = fixture();
    const next = { ...version, allocations: version.allocations.slice().reverse().map((allocation) => ({ ...allocation, percent: 50 })) };
    expect(compareSplitVersions(version, next).map((change) => [change.before, change.after])).toEqual([[40, 50], [60, 50]]);
    expect(compareSplitVersions(version, { ...version, note: "A new note" })).toEqual([]);
  });
  it("preserves zero shares and distinguishes added and removed people", () => {
    const { version } = fixture();
    const next = { ...version, allocations: [{ ...version.allocations[0], percent: 0 }, { ...version.allocations[1], participantId: "new-person", percent: 100 }] };
    expect(compareSplitVersions(version, next).map((change) => [change.before, change.after])).toEqual([[60, 0], [null, 100], [40, null]]);
  });
});

describe("deal summary interface", () => {
  it("merges collaborator details and ownership, with history closed initially", () => {
    const { deal, version } = fixture();
    render(<DealSummary deal={deal} currentVersion={version} />);
    const summary = screen.getByRole("complementary", { name: "Deal summary" });
    expect(within(summary).getAllByText("Chori")).toHaveLength(2); // Proposal author and one ownership row.
    expect(within(summary).getAllByText("Maya Rios")).toHaveLength(1);
    expect(within(summary).getAllByText("v1")).toHaveLength(1);
    expect(within(summary).queryByText("Agreement version")).not.toBeInTheDocument();
    expect(within(summary).queryByText("Revenue streams")).not.toBeInTheDocument();
    expect(within(summary).getByText("1 of 2 accepted")).toBeInTheDocument();
    expect(within(summary).getByText("0 of 2 signed")).toBeInTheDocument();
    expect(within(summary).getByRole("button", { name: /Version history/ })).toHaveAttribute("aria-expanded", "false");
    expect(within(summary).queryByText("Initial split proposal")).not.toBeInTheDocument();
  });
  it("reveals the stored contact details on demand", () => {
    const { deal, version } = fixture();
    render(<DealSummary deal={deal} currentVersion={version} />);
    fireEvent.click(screen.getByRole("button", { name: "View Maya Rios's details" }));
    expect(screen.getByText("@mayarios")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Maya Rios's details" })).toBeInTheDocument();
  });
  it("keeps invitation counts honest before all collaborators join", () => {
    const { deal, version } = fixture();
    deal.document.collaboratorInvites[0].status = "Pending";
    render(<DealSummary deal={deal} currentVersion={version} />);
    expect(screen.getByText("Awaiting invites")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 accepted")).toBeInTheDocument();
    expect(screen.getByText("Invited")).toBeInTheDocument();
  });
  it("shows readable version dates and expandable share comparisons", () => {
    const { deal, version } = fixture();
    const next = { ...version, id: "proposal-2", version: 2, note: "An equal split", allocations: version.allocations.map((allocation) => ({ ...allocation, percent: 50 })) };
    deal.splitVersions.push(next); deal.currentVersionId = next.id;
    render(<DealSummary deal={deal} currentVersion={next} />);
    fireEvent.click(screen.getByRole("button", { name: /Version history/ }));
    expect(screen.getByText("An equal split")).toBeInTheDocument();
    expect(screen.queryByText(version.createdAt)).not.toBeInTheDocument();
    const compare = screen.getByRole("button", { name: "Compare with v1" });
    fireEvent.click(compare);
    expect(compare).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("60%")).toBeInTheDocument();
    fireEvent.click(compare);
    expect(screen.queryByText("60%")).not.toBeInTheDocument();
  });
  it("reports note-only revisions without inventing share changes", () => {
    const { deal, version } = fixture();
    const next = { ...version, id: "proposal-2", version: 2, note: "Clarification" };
    deal.splitVersions.push(next);
    render(<DealSummary deal={deal} currentVersion={next} />);
    fireEvent.click(screen.getByRole("button", { name: /Version history/ }));
    fireEvent.click(screen.getByRole("button", { name: "Compare with v1" }));
    expect(screen.getByText("No share changes.")).toBeInTheDocument();
  });
  it("navigates to the correct full record", () => {
    const { deal, version } = fixture(); const open = vi.fn();
    render(<DealSummary deal={deal} currentVersion={version} onOpenAgreement={open} />);
    fireEvent.click(screen.getByRole("button", { name: "View full split sheet" }));
    expect(open).toHaveBeenCalledExactlyOnceWith(deal.id);
  });
  it("exposes the compact mobile disclosure without losing the desktop content", () => {
    const { deal, version } = fixture();
    render(<DealSummary deal={deal} currentVersion={version} />);
    const toggle = screen.getByRole("button", { name: "Deal summary" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
  it("handles missing proposals and dates without raw invalid timestamps", () => {
    const { deal, version } = fixture();
    version.createdAt = "bad-date";
    render(<DealSummary deal={deal} />);
    expect(screen.getByText("No proposal recorded yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Version history/ }));
    expect(screen.getByText("Date unavailable")).toBeInTheDocument();
  });
});
