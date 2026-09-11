import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CollaborationView from "@/components/CollaborationView";
import { makeCounterDocument } from "@/test/fixtures/splitSheet";

function setup() {
  const document = makeCounterDocument();
  document.sentAt = document.createdAt;
  document.serverRevision = 7;
  const onUpdateDocument = vi.fn().mockResolvedValue(undefined);
  const view = render(<CollaborationView documents={[document]} userProfile={document.creatorProfile} onUpdateDocument={onUpdateDocument} />);
  const trigger = screen.getAllByRole("button", { name: "Counter" })[0];
  trigger.focus(); fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Counter offer" });
  const fields = within(dialog).getAllByRole("spinbutton");
  const submit = within(dialog).getByRole("button", { name: "Send counter" });
  return { document, onUpdateDocument, view, trigger, dialog, fields, submit };
}

describe("counter offer editor", () => {
  it("starts compact, focuses the first share, and requires a meaningful change", () => {
    const { fields, submit, dialog } = setup();
    expect(fields[0]).toHaveFocus();
    expect(submit).toBeDisabled();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Split equally" }));
    expect(fields[0]).toHaveValue(50); expect(fields[1]).toHaveValue(50);
    expect(submit).toBeEnabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset shares" }));
    expect(submit).toBeDisabled();
  });
  it("shows the outstanding total and disallows invalid values, even on direct submission", () => {
    const { fields, submit, dialog, onUpdateDocument } = setup();
    fireEvent.change(fields[0], { target: { value: "50" } });
    expect(within(dialog).getByText(/remaining/)).toBeInTheDocument();
    expect(submit).toBeDisabled();
    fireEvent.change(fields[0], { target: { value: "-5" } });
    expect(fields[0]).toHaveAttribute("aria-invalid", "true");
    fireEvent.submit(dialog.querySelector("form")!);
    expect(onUpdateDocument).not.toHaveBeenCalled();
  });
  it("keeps edits on failure, prevents duplicate sends, and closes only after a successful retry", async () => {
    const { fields, submit, dialog, onUpdateDocument } = setup();
    fireEvent.click(within(dialog).getByRole("button", { name: /Add a note/ }));
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "An equal share for this session." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Split equally" }));
    let reject!: (error: Error) => void;
    onUpdateDocument.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    fireEvent.click(submit); fireEvent.click(submit); fireEvent.submit(dialog.querySelector("form")!);
    expect(onUpdateDocument).toHaveBeenCalledOnce();
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    await act(async () => { reject(new Error("Connection interrupted. Try again.")); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fields[0]).toHaveValue(50);
    expect(within(dialog).getByRole("textbox")).toHaveValue("An equal share for this session.");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Connection interrupted");
    fireEvent.click(submit);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onUpdateDocument).toHaveBeenCalledTimes(2);
    const [payload, context] = onUpdateDocument.mock.calls[1];
    expect(payload.serverRevision).toBe(7);
    expect(payload.data.parties.map((party: { percent: number }) => party.percent)).toEqual([50, 50]);
    expect(context).toMatchObject({ action: "counter_offer", responseType: "split_reject", notes: "An equal share for this session." });
  });
  it("blocks an outdated proposal and reloads current shares without discarding the note", () => {
    const { document, view, fields, submit, dialog, onUpdateDocument } = setup();
    fireEvent.click(within(dialog).getByRole("button", { name: /Add a note/ }));
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Keep this explanation" } });
    const version = { ...document.splitProposalVersions.at(-1)!, proposedByParticipantId: "maya-invite", id: "new-proposal", versionNumber: 3, allocations: document.splitProposalVersions[0].allocations.map((allocation, index) => ({ ...allocation, percentage: index ? 45 : 55 })) };
    const updated = { ...document, currentProposalId: version.id, splitProposalVersions: [...document.splitProposalVersions, version] };
    view.rerender(<CollaborationView documents={[updated]} userProfile={document.creatorProfile} onUpdateDocument={onUpdateDocument} />);
    expect(submit).toBeDisabled();
    expect(within(dialog).getByRole("alert")).toHaveTextContent("newer proposal");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reload proposal" }));
    expect(fields[0]).toHaveValue(55); expect(fields[1]).toHaveValue(45);
    expect(within(dialog).getByRole("textbox")).toHaveValue("Keep this explanation");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });
  it("blocks sending if the record is finalized while editing", () => {
    const { document, view, dialog, submit, onUpdateDocument } = setup();
    fireEvent.click(within(dialog).getByRole("button", { name: "Split equally" }));
    view.rerender(<CollaborationView documents={[{ ...document, status: "Verified and Stored" }]} userProfile={document.creatorProfile} onUpdateDocument={onUpdateDocument} />);
    expect(submit).toBeDisabled();
    expect(within(dialog).getByRole("alert")).toHaveTextContent("This SPLIT is signed");
    fireEvent.submit(dialog.querySelector("form")!);
    expect(onUpdateDocument).not.toHaveBeenCalled();
  });
  it("cancels without persisting and restores keyboard focus", async () => {
    const { dialog, trigger, onUpdateDocument } = setup();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onUpdateDocument).not.toHaveBeenCalled();
  });
});
