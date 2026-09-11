import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { makeDocument } from "@/test/fixtures/splitSheet";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { SplitSheetSaveResult } from "@/lib/splitSheetStorage";

function setup(initial = true) {
  const draft = makeDocument();
  draft.status = "Draft";
  draft.serverRevision = 7;
  const onStoreDocument = vi.fn(async (document: StoredSplitSheetDocument): Promise<SplitSheetSaveResult> => ({ document, persisted: true }));
  const onSendDocument = vi.fn(async (document: StoredSplitSheetDocument): Promise<SplitSheetSaveResult> => ({ document: { ...document, serverRevision: 8 }, persisted: true }));
  const onComplete = vi.fn();
  render(<ContractBuilder initialDocument={initial ? draft : undefined} userProfile={draft.creatorProfile} onBack={vi.fn()}
    onStoreDocument={onStoreDocument} onSendDocument={onSendDocument} onComplete={onComplete} />);
  if (!initial) {
    fireEvent.change(screen.getByPlaceholderText("e.g. Work title"), { target: { value: "New session" } });
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
  }
  return { draft, onStoreDocument, onSendDocument, onComplete };
}

function confirm() {
  fireEvent.click(screen.getByRole("button", { name: "Send Split Invite" }));
  const dialog = screen.getByRole("alertdialog", { name: "Ready to send?" });
  return { dialog, send: within(dialog).getByRole("button", { name: "Send Split Invite" }) };
}

describe("split creation completion", () => {
  it("uses the saved artist name for work metadata even with an old truncated display name", async () => {
    const profile = { ...makeDocument().creatorProfile, pkaNames: "Aurora Music", displayName: "A" };
    const onStoreDocument = vi.fn(async (document: StoredSplitSheetDocument) => ({ document, persisted: true }));
    render(<ContractBuilder userProfile={profile} onBack={vi.fn()}
      onStoreDocument={onStoreDocument} onSendDocument={vi.fn()} />);
    expect(screen.getByText("Aurora Music")).toBeInTheDocument();
    expect(screen.queryByText("A", { exact: true })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("e.g. Work title"), { target: { value: "First Light" } });
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(onStoreDocument).toHaveBeenCalledOnce());
    expect(onStoreDocument.mock.calls[0][0].data).toMatchObject({
      artistProjectName: "Aurora Music", recordingArtist: "Aurora Music",
      parties: [expect.objectContaining({ professionalName: "Aurora Music" })],
    });
    expect(profile.displayName).toBe("A");
  });

  it("ends the new-work wizard at review with separate draft and invite actions, not a preview", () => {
    const { onStoreDocument, onSendDocument } = setup(false);
    expect(screen.getByRole("heading", { name: "Review Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save To Drafts" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send Split Invite" })).toBeEnabled();
    expect(screen.queryByText("SPLIT Draft Preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create SPLIT Sheet" })).not.toBeInTheDocument();
    expect(onStoreDocument).not.toHaveBeenCalled();
    expect(onSendDocument).not.toHaveBeenCalled();
  });

  it("requires confirmation and lets the user return to review without writing anything", async () => {
    const { onStoreDocument, onSendDocument } = setup();
    const trigger = screen.getByRole("button", { name: "Send Split Invite" });
    expect(screen.getByText("@mayarios")).toBeInTheDocument();
    trigger.focus();
    const { dialog } = confirm();
    expect(within(dialog).getByText(/all details, split percentages, and collaborator usernames/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Review Details" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onStoreDocument).not.toHaveBeenCalled();
    expect(onSendDocument).not.toHaveBeenCalled();
  });

  it("sends the assigned invitations directly and completes with the confirmed server record", async () => {
    const { draft, onStoreDocument, onSendDocument, onComplete } = setup();
    const { send } = confirm();
    fireEvent.click(send);
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(onStoreDocument).not.toHaveBeenCalled();
    expect(onSendDocument).toHaveBeenCalledOnce();
    expect(onSendDocument.mock.calls[0][0]).toMatchObject({
      id: draft.id, serverRevision: 7, status: "Pending Collaborator Acceptance",
      collaboratorInvites: [expect.objectContaining({ inviteMethod: "username", inviteValue: "@mayarios", status: "Pending" })],
      splitSignatures: [],
    });
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ id: draft.id, serverRevision: 8 }), "send");
    expect(screen.queryByText("SPLIT Draft Preview")).not.toBeInTheDocument();
  });

  it("saves a private draft without calling the send action", async () => {
    const { draft, onStoreDocument, onSendDocument, onComplete } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    const saved = onStoreDocument.mock.calls[0][0];
    expect(saved).toMatchObject({ id: draft.id, serverRevision: 7, status: "Draft", data: draft.data });
    expect(saved.sentAt).toBeUndefined();
    expect(onSendDocument).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(saved, "draft");
  });

  it("prevents duplicate sends, preserves failed entries, and retries the same document ID", async () => {
    const { onSendDocument, onComplete } = setup(false);
    let fail!: (error: Error) => void;
    onSendDocument.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    const { dialog, send } = confirm();
    fireEvent.click(send); fireEvent.click(send);
    expect(onSendDocument).toHaveBeenCalledOnce();
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute("aria-busy", "true");
    expect(within(dialog).getByRole("button", { name: "Review Details" })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog).toBeInTheDocument();
    await act(async () => { fail(new Error("Connection interrupted")); });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Connection interrupted");
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(send);
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(onSendDocument.mock.calls[1][0].id).toBe(onSendDocument.mock.calls[0][0].id);
    expect(onSendDocument.mock.calls[1][0].data.songTitle).toBe("New session");
    expect(onSendDocument.mock.calls[1][0].status).toBe("Ready to Sign");
  });

  it("does not claim invitations were sent when only a local save was returned", async () => {
    const { onSendDocument, onComplete } = setup();
    onSendDocument.mockImplementationOnce(async (document) => ({ document, persisted: false }));
    const { dialog, send } = confirm();
    fireEvent.click(send);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("not confirmed by the server");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("retains the review screen and offers retry when saving a draft fails", async () => {
    const { onStoreDocument, onComplete } = setup();
    onStoreDocument.mockRejectedValueOnce(new Error("Draft is unavailable"));
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Draft is unavailable");
    expect(screen.getByRole("heading", { name: "Review Draft" })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save To Drafts" })).toBeEnabled();
  });
});
