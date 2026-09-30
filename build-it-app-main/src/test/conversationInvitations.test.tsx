import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConversationInvitations from "@/components/ConversationInvitations";
import CollaborationView from "@/components/CollaborationView";
import { loadInvitationDelivery, retryInvitationEmail, deliveryPresentation, type InvitationDelivery } from "@/lib/invitationDelivery";
import { documentToNegotiationDeal } from "@/lib/splitSheetNegotiation";
import { makeDocument } from "@/test/fixtures/splitSheet";

vi.mock("@/lib/invitationDelivery", async original => ({ ...await original<typeof import("@/lib/invitationDelivery")>(), loadInvitationDelivery: vi.fn(), retryInvitationEmail: vi.fn() }));
const row: InvitationDelivery = { id: "job", partyId: "maya-party", name: "Old name", status: "failed", updatedAt: null, canRetry: true, reason: null };
function fixture() {
  const document = makeDocument();
  document.sentAt = document.createdAt;
  document.collaboratorInvites[0].status = "Pending";
  return documentToNegotiationDeal(document, document.creatorProfile)!;
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(loadInvitationDelivery).mockResolvedValue([row]); vi.mocked(retryInvitationEmail).mockResolvedValue(undefined); });

describe("conversation invitations", () => {
  it("integrates the creator's warning into the conversation start", async () => {
    const deal = fixture();
    deal.document.creatorProfile.authUserId = "owner";
    render(<CollaborationView documents={[deal.document]} userProfile={deal.document.creatorProfile} onUpdateDocument={vi.fn()} />);
    const issue = await screen.findByRole("button", { name: "Email issue for Maya Rios" });
    expect(screen.getByRole("region", { name: "Conversation start" })).toContainElement(issue);
    expect(loadInvitationDelivery).toHaveBeenCalledWith("owner", deal.id);
    expect(screen.queryByText("Invitation emails")).not.toBeInTheDocument();
  });
  it("never passes creator delivery access to another authenticated collaborator", async () => {
    const deal = fixture();
    deal.document.creatorProfile.authUserId = "owner";
    const collaborator = { ...deal.document.creatorProfile, authUserId: "maya-account", username: "mayarios", emailAddress: "maya@example.com" };
    render(<CollaborationView documents={[deal.document]} userProfile={collaborator} onUpdateDocument={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByRole("region", { name: "Conversation start" })).toBeInTheDocument();
    expect(loadInvitationDelivery).not.toHaveBeenCalled();
  });
  it("distinguishes provider acceptance, delivery and uncertain failures", () => {
    expect(deliveryPresentation({ ...row, status: "sent" }).detail).toMatch(/not been confirmed/);
    expect(deliveryPresentation({ ...row, status: "delivered" }).detail).toMatch(/does not confirm.*read/);
    expect(deliveryPresentation({ ...row, reason: "review" }).label).toBe("Needs review");
  });
  it.each(["queued", "processing", "sent", "delivered", "delivery_delayed", "waiting_address", null])("keeps %s delivery quiet and does not mistake it for joining", async status => {
    vi.mocked(loadInvitationDelivery).mockResolvedValue([{ ...row, status, canRetry: false }]);
    const { container } = render(<ConversationInvitations deal={fixture()} userId="owner" />);
    await act(async () => {});
    expect(screen.getByRole("list", { name: "Invitation status" })).toHaveTextContent("Maya Rios invite pending");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Invitation emails")).not.toBeInTheDocument();
    expect(container.querySelector("details")).toBeNull();
    expect(container.textContent).not.toMatch(/Delivered|Sent|recipients|joined/);
  });
  it.each(["Accepted", "Declined"] as const)("does not load delivery for an %s invite", async status => {
    const deal = fixture(); deal.document.collaboratorInvites[0].status = status;
    render(<ConversationInvitations deal={deal} userId="owner" />);
    await act(async () => {});
    expect(screen.getByRole("list")).toHaveTextContent(`Maya Rios ${status === "Accepted" ? "joined" : "declined"}`);
    expect(loadInvitationDelivery).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("does not request or expose email status to a collaborator", async () => {
    render(<ConversationInvitations deal={fixture()} />);
    await act(async () => {});
    expect(loadInvitationDelivery).not.toHaveBeenCalled();
    expect(screen.getByRole("list")).toHaveTextContent("invite pending");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("places a known problem beside the correct pending invite, not in another panel", async () => {
    const deal = fixture();
    deal.document.collaboratorInvites.push({ ...deal.document.collaboratorInvites[0], id: "another", partyId: "another-party", status: "Accepted" });
    render(<ConversationInvitations deal={deal} userId="owner" />);
    const issue = await screen.findByRole("button", { name: "Email issue for Maya Rios" });
    expect(issue.closest("li")).toHaveTextContent("invite pending");
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(issue);
    const details = screen.getByRole("dialog", { name: "Invitation for Maya Rios" });
    expect(details).toHaveTextContent("@mayarios");
    expect(details).not.toHaveTextContent("Old name");
    expect(within(details).getByRole("link", { name: "Contact SPLIT" })).toHaveAttribute("href", expect.stringContaining("mailto:"));
  });
  it("requires confirmation before retry and removes the warning when the server queues it", async () => {
    vi.mocked(loadInvitationDelivery).mockResolvedValueOnce([row]).mockResolvedValue([{ ...row, status: "queued", canRetry: false }]);
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    fireEvent.click(await screen.findByRole("button", { name: "Email issue for Maya Rios" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry email" }));
    expect(retryInvitationEmail).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retry email" }));
    await waitFor(() => expect(loadInvitationDelivery).toHaveBeenCalledTimes(2));
    expect(retryInvitationEmail).toHaveBeenCalledExactlyOnceWith("owner", "job");
    expect(screen.queryByRole("button", { name: /Email issue/ })).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("invite pending");
  });
  it("does not send when retry is cancelled", async () => {
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    fireEvent.click(await screen.findByRole("button", { name: /Email issue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Retry email" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(retryInvitationEmail).not.toHaveBeenCalled();
  });
  it.each(["bounced", "complained", "suppressed"])("does not allow retry for %s even with an inconsistent retry flag", async status => {
    vi.mocked(loadInvitationDelivery).mockResolvedValue([{ ...row, status }]);
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    fireEvent.click(await screen.findByRole("button", { name: /Email issue/ }));
    expect(screen.queryByRole("button", { name: "Retry email" })).not.toBeInTheDocument();
    if (status === "bounced") expect(screen.getByRole("dialog")).toHaveTextContent("Check the address");
  });
  it("does not retry a send whose outcome is uncertain", async () => {
    vi.mocked(loadInvitationDelivery).mockResolvedValue([{ ...row, reason: "review" }]);
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    fireEvent.click(await screen.findByRole("button", { name: /Email issue/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Delivery is uncertain");
    expect(screen.queryByRole("button", { name: "Retry email" })).not.toBeInTheDocument();
  });
  it("does not show an undeployed tracker as an email failure or keep polling it", async () => {
    vi.mocked(loadInvitationDelivery).mockResolvedValue(null);
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    await act(async () => {});
    fireEvent.focus(window);
    expect(loadInvitationDelivery).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("list")).toHaveTextContent("invite pending");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("keeps pending neutral when the initial status request fails", async () => {
    vi.mocked(loadInvitationDelivery).mockRejectedValue(new Error("Network down"));
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    await act(async () => {});
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("invite pending");
  });
  it("retains known problems but disables retry after a refresh fails", async () => {
    vi.mocked(loadInvitationDelivery).mockResolvedValueOnce([row]).mockRejectedValue(new Error("Network down"));
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    fireEvent.click(await screen.findByRole("button", { name: /Email issue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh invitation status" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Status could not be refreshed");
    expect(screen.getByRole("button", { name: "Retry email" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Email issue/ })).toBeInTheDocument();
  });
  it("keeps a rejected retry visible and prevents duplicate requests", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(retryInvitationEmail).mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    render(<ConversationInvitations deal={fixture()} userId="owner" />);
    fireEvent.click(await screen.findByRole("button", { name: /Email issue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Retry email" }));
    const confirm = within(screen.getByRole("alertdialog")).getByRole("button", { name: "Retry email" });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(retryInvitationEmail).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error("Retry rejected. Contact SPLIT.")));
    expect(screen.getByRole("alert")).toHaveTextContent("Retry rejected");
  });
  it("removes the warning immediately when the collaborator joins", async () => {
    const deal = fixture();
    const view = render(<ConversationInvitations deal={deal} userId="owner" />);
    await screen.findByRole("button", { name: /Email issue/ });
    const joined = structuredClone(deal); joined.document.collaboratorInvites[0].status = "Accepted";
    view.rerender(<ConversationInvitations deal={joined} userId="owner" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("Maya Rios joined");
  });
  it("discards late responses when the selected split or account changes", async () => {
    let resolve!: (rows: InvitationDelivery[]) => void;
    vi.mocked(loadInvitationDelivery).mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValue([]);
    const deal = fixture();
    const view = render(<ConversationInvitations deal={deal} userId="owner" />);
    view.rerender(<ConversationInvitations deal={{ ...deal, id: "another-split" }} userId="another-owner" />);
    await act(async () => resolve([row]));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(loadInvitationDelivery).toHaveBeenLastCalledWith("another-owner", "another-split");
  });
});
