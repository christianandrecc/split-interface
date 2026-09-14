import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import CollaborationView from "@/components/CollaborationView";
import AgreementDetail from "@/components/AgreementDetail";
import { createEmptyProfile } from "@/lib/userProfile";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";

afterEach(() => vi.restoreAllMocks());
const viewer = { ...createEmptyProfile(), username: "mayarios", displayName: "Maya Rios", emailAddress: "maya@example.com" };
function pendingInvite() {
  const doc = makeDocument();
  doc.sentAt = doc.createdAt;
  doc.serverRevision = 4;
  doc.status = "Pending Collaborator Acceptance";
  doc.collaboratorInvites[0].status = "Pending";
  delete doc.collaboratorInvites[0].respondedAt;
  return doc;
}
function openDecline() {
  fireEvent.click(screen.getByRole("button", { name: "Decline invite" }));
  return screen.getByRole("alertdialog", { name: "Decline this invitation?" });
}

describe("invitation responses", () => {
  it("offers both choices to the pending invitee and cancel writes nothing", async () => {
    const onUpdateDocument = vi.fn();
    render(<CollaborationView documents={[pendingInvite()]} userProfile={viewer} onUpdateDocument={onUpdateDocument} />);
    expect(screen.getByRole("button", { name: "Accept invite" })).toBeEnabled();
    expect(screen.getByText(/1\/2 accepted/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Decline invite" });
    trigger.focus();
    const dialog = openDecline();
    expect(dialog).toHaveTextContent("You will not join Night Swim.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep invitation" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onUpdateDocument).not.toHaveBeenCalled();
  });

  it("routes only the viewer's decline and renders persisted read-only history", async () => {
    const doc = pendingInvite();
    const original = structuredClone(doc);
    const onUpdateDocument = vi.fn().mockImplementation(async updated => ({ ...updated, serverRevision: 5 }));
    const view = render(<CollaborationView documents={[doc]} userProfile={viewer} onUpdateDocument={onUpdateDocument} />);
    fireEvent.click(within(openDecline()).getByRole("button", { name: "Decline invite" }));
    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledOnce());
    const [updated, context] = onUpdateDocument.mock.calls[0];
    expect(context).toMatchObject({ action: "invite_decline", responseType: "invite_reject" });
    expect(updated.serverRevision).toBe(4);
    expect(updated.status).toBe("Disputed");
    expect(updated.collaboratorInvites[0]).toMatchObject({ id: "maya-invite", status: "Declined" });
    expect(updated.splitApprovals).toEqual(original.splitApprovals);
    expect(updated.splitSignatures).toEqual(original.splitSignatures);
    expect(updated.data).toEqual(original.data);
    expect(doc).toEqual(original);
    view.rerender(<CollaborationView documents={[{ ...updated, serverRevision: 5 }]} userProfile={viewer} onUpdateDocument={onUpdateDocument} />);
    expect(screen.getByText("You declined this invitation")).toBeInTheDocument();
    expect(screen.queryByText("Negotiating")).not.toBeInTheDocument();
    expect(screen.getAllByText("Invite declined").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: /Accept invite|Decline invite|^Sign$/ })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("This conversation is read-only")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Counter" })).toBeDisabled();
    expect(screen.queryByText("Consensus reached")).not.toBeInTheDocument();
  });

  it("prevents accept/decline races and only confirms success after persistence", async () => {
    let finish: (value: undefined) => void;
    const onUpdateDocument = vi.fn(() => new Promise<undefined>(resolve => { finish = resolve; }));
    const success = vi.spyOn(toast, "success");
    render(<CollaborationView documents={[pendingInvite()]} userProfile={viewer} onUpdateDocument={onUpdateDocument} />);
    const accept = screen.getByRole("button", { name: "Accept invite" });
    const dialog = openDecline();
    const confirm = within(dialog).getByRole("button", { name: "Decline invite" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(accept);
    expect(onUpdateDocument).toHaveBeenCalledOnce();
    expect(accept).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Keep invitation" })).toBeDisabled();
    expect(success).not.toHaveBeenCalled();
    await act(async () => finish(undefined));
    expect(success).toHaveBeenCalledWith("Invite declined");
  });

  it("keeps the invitation pending on a failed decline and supports retry", async () => {
    const doc = pendingInvite();
    const onUpdateDocument = vi.fn().mockRejectedValueOnce(new Error("Connection interrupted")).mockResolvedValueOnce(undefined);
    const success = vi.spyOn(toast, "success");
    render(<CollaborationView documents={[doc]} userProfile={viewer} onUpdateDocument={onUpdateDocument} />);
    const dialog = openDecline();
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline invite" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Connection interrupted");
    expect(doc.collaboratorInvites[0].status).toBe("Pending");
    expect(success).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline invite" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onUpdateDocument).toHaveBeenCalledTimes(2);
  });

  it("closes the old confirmation when switching to a different invitation", () => {
    const doc = pendingInvite(), other = pendingInvite();
    other.id = "22222222-2222-4222-8222-222222222222";
    const onUpdateDocument = vi.fn();
    const view = render(<CollaborationView documents={[doc, other]} initialDealId={doc.id} userProfile={viewer} onUpdateDocument={onUpdateDocument} />);
    openDecline();
    view.rerender(<CollaborationView documents={[doc, other]} initialDealId={other.id} userProfile={viewer} onUpdateDocument={onUpdateDocument} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onUpdateDocument).not.toHaveBeenCalled();
  });

  it.each(["creator", "accepted", "declined", "final", "unrelated"])("does not offer a decline action to %s", mode => {
    const doc = pendingInvite();
    if (mode === "accepted") doc.collaboratorInvites[0].status = "Accepted";
    if (mode === "declined") doc.collaboratorInvites[0].status = "Declined";
    if (mode === "final") doc.status = "Verified and Stored";
    const user = mode === "creator" ? doc.creatorProfile : mode === "unrelated" ? { ...viewer, username: "unrelated", emailAddress: "unrelated@example.test" } : viewer;
    render(<CollaborationView documents={[doc]} userProfile={user} onUpdateDocument={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Decline invite" })).not.toBeInTheDocument();
  });

  it("shows the creator an accurate decline notice and preserves the existing preview", () => {
    const doc = pendingInvite();
    doc.status = "Disputed";
    doc.collaboratorInvites[0].status = "Declined";
    const onOpenMessages = vi.fn();
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} onOpenMessages={onOpenMessages} />);
    expect(screen.getAllByText("Invite declined")).toHaveLength(2);
    expect(screen.getByText(/cannot be finalized with a declined invitation/)).toBeInTheDocument();
    expect(screen.queryByText(/Send a revised split to restart review/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open in Messages" }));
    expect(onOpenMessages).toHaveBeenCalledWith(doc.id);
  });
});
