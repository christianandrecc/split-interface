import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeleteDraftButton from "@/components/DeleteDraftButton";
import AgreementDetail from "@/components/AgreementDetail";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";

function draft() {
  const document = makeDocument();
  document.status = "Draft";
  return document;
}

describe("delete draft confirmation", () => {
  it("names the draft and cancels without deleting, restoring focus", async () => {
    const document = draft();
    const onDelete = vi.fn();
    render(<DeleteDraftButton document={document} profile={document.creatorProfile} onDelete={onDelete} />);
    const trigger = screen.getByRole("button", { name: "Delete Draft" });
    trigger.focus(); fireEvent.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "Delete this draft?" });
    expect(within(dialog).getByText(/Are you sure.*Night Swim.*cannot be undone/)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("blocks duplicate clicks and dismissal while deleting, retains errors, and retries", async () => {
    const document = draft();
    let fail!: (error: Error) => void;
    const onDelete = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; })).mockResolvedValue(undefined);
    const onPendingChange = vi.fn();
    render(<DeleteDraftButton document={document} profile={document.creatorProfile} onDelete={onDelete} onPendingChange={onPendingChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Draft" }));
    const dialog = screen.getByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Delete Draft" });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(document);
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog).toBeInTheDocument();
    await act(async () => { fail(new Error("Network unavailable")); });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Network unavailable");
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete Draft" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it.each(["sent", "final", "other owner", "signature"])("hides deletion for %s records", (kind) => {
    const document = draft();
    const profile = { ...document.creatorProfile };
    if (kind === "sent") document.sentAt = document.createdAt;
    if (kind === "final") document.status = "Verified and Stored";
    if (kind === "other owner") document.creatorUserId = "another-account";
    if (kind === "signature") document.splitSignatures = [{ id: "signature", proposalVersionId: "v1", collaboratorId: "creator", collaboratorName: "Chori", status: "Signed" }];
    render(<DeleteDraftButton document={document} profile={profile} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Delete Draft" })).not.toBeInTheDocument();
  });

  it("exposes deletion in the existing draft detail beside download", () => {
    const document = draft();
    render(<AgreementDetail agreement={documentToAgreement(document)} viewerProfile={document.creatorProfile} onDeleteDraft={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download draft" })).toBeInTheDocument();
  });

  it("locks draft editing and sending during deletion", async () => {
    const document = draft();
    let finish!: () => void;
    render(<ContractBuilder initialDocument={document} userProfile={document.creatorProfile} onBack={vi.fn()}
      onStoreDocument={vi.fn()} onSendDocument={vi.fn()} onDeleteDocument={() => new Promise(resolve => { finish = resolve; })} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Draft" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete Draft" }));
    expect(screen.getByRole("button", { name: "Send Split Invite", hidden: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save To Drafts", hidden: true })).toBeDisabled();
    await act(async () => { finish(); });
  });
});
