import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CollaborationView from "@/components/CollaborationView";
import { makeCounterDocument, makeDocument } from "@/test/fixtures/splitSheet";
import { buildSplitSheetSignatureRecords } from "@/lib/splitSheetParticipantState";

function sentDocument(title = "Glasshouse") {
  const document = makeDocument();
  document.sentAt = document.createdAt;
  document.id = title;
  document.data.songTitle = title;
  return document;
}

describe("compact collaboration layout", () => {
  it("labels each proposal once as a take without changing the stored revision", () => {
    const document = makeCounterDocument();
    const original = structuredClone(document);
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(screen.getAllByText("First take", { exact: true })).toHaveLength(1);
    expect(screen.getAllByText("Take 2", { exact: true })).toHaveLength(1);
    expect(screen.getByText("Take 2", { exact: true })).toHaveAttribute("title", "Revision 2");
    expect(screen.queryByText(/^v\d+$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Counter" }));
    expect(within(screen.getByRole("dialog", { name: "Counter offer" })).getByText("Based on take 2")).toBeVisible();
    expect(document).toEqual(original);
  });

  it("does not invent a first take when the proposal record is missing", () => {
    const document = sentDocument();
    document.splitProposalVersions = [];
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(screen.getByLabelText("Split proposal unavailable")).toBeInTheDocument();
    expect(screen.queryByText("First take", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("presents a proposal note as an author-labeled message outside the split card", () => {
    const document = makeCounterDocument();
    document.splitProposalVersions.at(-1)!.notes = "These shares reflect our work.\nWhat do you think?";
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const card = screen.getByLabelText("Split proposal: Take 2");
    const note = within(card.parentElement!).getByText(/These shares reflect our work/).closest("p")!;
    expect(note).toHaveClass("split-chat-bubble", "split-proposal-note");
    expect(note).not.toHaveClass("outgoing");
    expect(note).toHaveTextContent("Maya Rios: These shares reflect our work.");
    expect(card).not.toContainElement(note);
  });

  it("keeps one author-labeled note when another collaborator accepts", () => {
    const document = makeCounterDocument();
    document.splitApprovals.find(approval => approval.id === "v2-creator")!.status = "Approved";
    document.splitApprovals.find(approval => approval.id === "v2-creator")!.respondedAt = "2026-09-12T12:00:00Z";
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(screen.getAllByText("Revised shares")).toHaveLength(1);
    expect(screen.getByText("Revised shares").closest("p")).toHaveTextContent("Maya Rios: Revised shares");
    expect(screen.getByRole("img", { name: "Chori: Accepted (Take 2)" })).toHaveAttribute("data-state", "accepted");
    expect(document.splitApprovals.find(approval => approval.id === "v2-creator")!.respondedAt).toBe("2026-09-12T12:00:00Z");
  });

  it("labels the viewer's own proposal note with their name, not You", () => {
    const document = sentDocument();
    document.splitProposalVersions[0].notes = "My opening proposal.";
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const note = screen.getByText("My opening proposal.").closest("p")!;
    expect(note).toHaveClass("outgoing");
    expect(note).toHaveTextContent("Chori: My opening proposal.");
  });

  it("uses the artist name on a legal-name proposal note and in take history", () => {
    const document = makeCounterDocument();
    const proposal = document.splitProposalVersions.at(-1)!;
    proposal.proposedBy = "Christian Andre Carrera";
    proposal.proposedByParticipantId = "creator";
    delete proposal.proposedByUserId;
    proposal.notes = "These shares reflect our work.";
    document.splitApprovals = document.splitApprovals.map(approval => approval.proposalVersionId === proposal.id
      ? { ...approval, status: approval.collaboratorId === "creator" ? "Approved" : "Pending", respondedAt: approval.collaboratorId === "creator" ? proposal.createdAt : undefined }
      : approval);
    const original = structuredClone(document);
    const { container } = render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const note = screen.getByText("These shares reflect our work.").closest("p")!;
    expect(note).toHaveTextContent("Chori: These shares reflect our work.");
    expect(note).toHaveClass("outgoing");
    expect(screen.getByText("Chori shared take 2.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View split" }));
    fireEvent.click(screen.getByRole("button", { name: /Split history/ }));
    expect(screen.getByRole("list", { name: "Split history" })).toHaveTextContent("Chori");
    expect(container).not.toHaveTextContent("Christian Andre Carrera");
    expect(document).toEqual(original);
  });

  it.each(["", "   ", "Initial split proposal", "Counter-offer from Messages"])("does not turn default or empty notes into chat messages (%s)", note => {
    const document = makeCounterDocument();
    document.splitProposalVersions.at(-1)!.notes = note;
    const { container } = render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(container.querySelector(".split-proposal-note")).toBeNull();
  });

  it("shows one current proposal with viewer identity, shares, and only the two response actions", () => {
    const document = makeCounterDocument();
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const card = screen.getByLabelText("Split proposal: Take 2");
    expect(screen.getAllByRole("heading", { name: "Proposed split" })).toHaveLength(1);
    const people = within(card).getAllByRole("listitem");
    expect(people).toHaveLength(2);
    expect(people[0]).toHaveTextContent("Chori (you)");
    expect(people[1]).toHaveTextContent("Maya Rios");
    expect(people[1]).not.toHaveTextContent("(you)");
    expect(within(card).getAllByRole("button").map((button) => button.textContent)).toEqual(["Accept", "Counter"]);
    expect(screen.getAllByRole("button", { name: "Counter" })).toHaveLength(1);
    expect(screen.queryByRole("complementary", { name: "Deal summary" })).not.toBeInTheDocument();
  });

  it("opens ownership and history on demand, including the agreement route", () => {
    const document = makeCounterDocument();
    const onOpenAgreement = vi.fn();
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} onOpenAgreement={onOpenAgreement} />);
    fireEvent.click(screen.getByRole("button", { name: "View split" }));
    const details = screen.getByRole("complementary", { name: "Deal summary" });
    expect(details).toHaveAttribute("data-expanded", "true");
    fireEvent.click(within(details).getByRole("button", { name: /Split history/ }));
    expect(within(details).getByText("Initial split proposal")).toBeInTheDocument();
    fireEvent.click(within(details).getByRole("button", { name: "View full split sheet" }));
    expect(onOpenAgreement).toHaveBeenCalledWith(document.id);
    fireEvent.click(screen.getByRole("button", { name: "Hide split" }));
    expect(screen.queryByRole("complementary", { name: "Deal summary" })).not.toBeInTheDocument();
  });

  it("filters by the viewer's pending actions and by signed status, without clearing drafts", () => {
    const incoming = makeCounterDocument();
    const outgoing = sentDocument();
    const signed = { ...sentDocument("Golden Hour"), status: "Verified and Stored" as const };
    render(<CollaborationView documents={[incoming, outgoing, signed]} userProfile={incoming.creatorProfile} onUpdateDocument={vi.fn()} />);
    const list = within(screen.getByRole("complementary", { name: "Split conversations" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Message the collaborators" }), { target: { value: "Unsent draft" } });
    fireEvent.click(list.getByRole("button", { name: "Your turn" }));
    expect(list.getByRole("button", { name: /Night Swim/ })).toBeInTheDocument();
    expect(list.queryByRole("button", { name: /Glasshouse|Golden Hour/ })).not.toBeInTheDocument();
    fireEvent.click(list.getByRole("button", { name: "Signed" }));
    expect(list.getByRole("button", { name: /Golden Hour/ })).toBeInTheDocument();
    expect(list.queryByRole("button", { name: /Night Swim|Glasshouse/ })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message the collaborators" })).toHaveValue("Unsent draft");
  });

  it("searches titles and collaborators, and recovers from an empty result", () => {
    const document = makeCounterDocument();
    render(<CollaborationView documents={[document, sentDocument()]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const list = within(screen.getByRole("complementary", { name: "Split conversations" }));
    const search = list.getByRole("searchbox", { name: "Search splits" });
    fireEvent.change(search, { target: { value: "  GLASS  " } });
    expect(list.getByRole("button", { name: /Glasshouse/ })).toBeInTheDocument();
    expect(list.queryByRole("button", { name: /Night Swim/ })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "maya" } });
    expect(list.getByRole("button", { name: /Night Swim/ })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "No such collaborator" } });
    expect(list.getByText("No matching splits")).toBeInTheDocument();
    fireEvent.click(list.getByRole("button", { name: "Clear filters" }));
    expect(search).toHaveValue("");
    expect(list.getByRole("button", { name: /Night Swim/ })).toBeInTheDocument();
  });

  it("keeps older proposals visible, with their exact shares and no response actions", () => {
    const document = makeCounterDocument();
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const old = screen.getByLabelText("Split proposal: First take");
    expect(within(old).getByRole("heading", { name: "Initial split" })).toBeVisible();
    expect(old.closest("details")).toBeNull();
    expect(within(old).queryByRole("button")).not.toBeInTheDocument();
    expect(within(old).getByText("60", { exact: true })).toHaveTextContent("60%");
    expect(within(old).getByText("40", { exact: true })).toHaveTextContent("40%");
  });

  it("puts the starter and invitation state at the top without repeated join events", () => {
    const document = makeCounterDocument();
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const start = screen.getByRole("region", { name: "Conversation start" });
    expect(start.parentElement!.firstElementChild).toBe(start);
    expect(start).toHaveTextContent("Started by Chori");
    expect(within(start).getByRole("list", { name: "Invitation status" })).toHaveTextContent("Maya Rios joined");
    expect(start.parentElement!.textContent).not.toMatch(/accepted the collaboration invite|accepted this split version|sent the initial split proposal/);
    expect(screen.getByRole("img", { name: "Chori: Awaiting response (Take 2)" })).toHaveAttribute("data-state", "pending");
  });

  it.each(["Pending", "Declined"] as const)("keeps %s invitations distinct from split approval", status => {
    const document = makeCounterDocument();
    document.collaboratorInvites[0].status = status;
    document.splitApprovals = document.splitApprovals.filter(approval => approval.id !== "v2-maya");
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Conversation start" })).toHaveTextContent(`Maya Rios ${status === "Pending" ? "invite pending" : "declined"}`);
    expect(screen.getByRole("img", { name: "Maya Rios: Awaiting response (Take 2)" })).toHaveAttribute("data-state", "pending");
  });

  it("matches approval to its version and canonical participant, never just the name", () => {
    const document = makeCounterDocument();
    document.splitApprovals.find(approval => approval.id === "maya-approval")!.status = "Rejected";
    document.splitApprovals.find(approval => approval.id === "maya-approval")!.respondedAt = document.createdAt;
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Maya Rios: Not accepted (First take)" })).toHaveAttribute("data-state", "rejected");
    expect(screen.getByRole("img", { name: "Maya Rios: Accepted (Take 2)" })).toHaveAttribute("data-state", "accepted");
    expect(screen.getByRole("img", { name: "Chori: Accepted (First take)" })).toHaveAttribute("data-state", "accepted");
    expect(screen.getByRole("img", { name: "Chori: Awaiting response (Take 2)" })).toHaveAttribute("data-state", "pending");
  });

  it("updates the check from saved responses and preserves the response date in its tooltip", () => {
    const document = makeCounterDocument();
    const view = render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const updated = structuredClone(document);
    const approval = updated.splitApprovals.find(item => item.id === "v2-creator")!;
    approval.status = "Approved";
    approval.respondedAt = "2026-09-29T12:30:00Z";
    view.rerender(<CollaborationView documents={[updated]} userProfile={updated.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(screen.queryByRole("img", { name: "Chori: Awaiting response (Take 2)" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Chori: Accepted (Take 2)" })).toHaveAttribute("title", expect.stringContaining("Sep 29"));
    expect(document.splitApprovals.find(item => item.id === "v2-creator")!.status).toBe("Pending");
  });

  it("shows signatures as visible lines without repeated split dropdowns", () => {
    const document = makeCounterDocument();
    document.status = "Verified and Stored";
    document.splitSignatures = buildSplitSheetSignatureRecords(document, document.currentProposalId)
      .map(signature => ({ ...signature, status: "Signed", signedAt: "2026-09-29T12:30:00Z" }));
    const { container } = render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(container.querySelectorAll(".split-chat-timeline details")).toHaveLength(0);
    expect(container.querySelectorAll(".split-chat-event.sign")).toHaveLength(2);
    for (const event of container.querySelectorAll(".split-chat-event.sign")) {
      expect(event.querySelector(".split-chat-event-body")).toHaveAttribute("title", expect.stringContaining("Take 2"));
      expect(event.querySelector(".sr-only")).toHaveTextContent("Take 2.");
      expect(event.querySelector(".split-chat-event-line")!.children).toHaveLength(3); // Icon, message with accessible take, timestamp.
    }
    expect(container.querySelectorAll(".split-proposal-heading > span")).toHaveLength(2);
    expect(screen.getAllByRole("heading", { name: "Final split" })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Initial split" })).toBeVisible();
  });

  it("renders all allocations, including a third collaborator and a zero share", () => {
    const document = makeCounterDocument();
    document.splitProposalVersions.at(-1)!.allocations.push({ ...document.splitProposalVersions[0].allocations[0], partyId: "third-party", name: "A Collaborator With A Long Professional Name", percentage: 0 });
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const card = screen.getByLabelText("Split proposal: Take 2");
    expect(within(card).getAllByRole("listitem")).toHaveLength(3);
    expect(within(card).getByText("A Collaborator With A Long Professional Name")).toBeInTheDocument();
    expect(within(card).getByText("0", { exact: true })).toHaveTextContent("0%");
  });

  it("does not offer to sign again while the viewer is waiting for the other signatures", () => {
    const document = makeCounterDocument();
    document.status = "Pending Signatures";
    document.splitApprovals = document.splitApprovals.map((approval) => ({ ...approval, status: "Approved" }));
    document.splitSignatures = buildSplitSheetSignatureRecords(document, document.currentProposalId)
      .map((signature) => ({ ...signature, status: signature.collaboratorId === "creator" ? "Signed" : "Pending" }));
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} />);
    expect(screen.getByText("Your signature is saved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign" })).not.toBeInTheDocument();
  });

  it.each(["Fully Signed", "Verified and Stored", "Executed", "Archived"] as const)("replaces disabled composer clutter with an agreement link on %s records", (status) => {
    const document = { ...makeCounterDocument(), status };
    const onOpenAgreement = vi.fn();
    render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={vi.fn()} onOpenAgreement={onOpenAgreement} />);
    expect(screen.queryByRole("button", { name: /^(Accept|Counter|Sign|Send message)$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Signed split. Conversation closed.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View split sheet" }));
    expect(onOpenAgreement).toHaveBeenCalledWith(document.id);
  });
});
