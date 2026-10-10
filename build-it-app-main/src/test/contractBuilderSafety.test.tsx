import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { makeDocument } from "@/test/fixtures/splitSheet";

vi.mock("@/lib/globalSearch", async (original) => ({
  ...(await original<typeof import("@/lib/globalSearch")>()), searchPublicProfiles: vi.fn(async () => []),
}));

function setup(editing = false, threePeople = false) {
  const doc = makeDocument(); doc.status = "Draft";
  if (threePeople) doc.data.parties.push({ ...doc.data.parties[1], id: "third", professionalName: "Third Artist", inviteValue: "@third" });
  const onBack = vi.fn(); const onHome = vi.fn();
  const onStoreDocument = vi.fn(async (document) => ({ document, persisted: true }));
  const onSendDocument = vi.fn();
  const view = render(<ContractBuilder userProfile={doc.creatorProfile} initialDocument={editing ? doc : undefined}
    onBack={onBack} onHome={onHome} onStoreDocument={onStoreDocument} onSendDocument={onSendDocument} />);
  return { ...view, doc, onBack, onHome, onStoreDocument, onSendDocument };
}

function reloadEvent() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("creation loss and precision guards", () => {
  it.each([
    ["33.333", "33.333", "33.334"],
    ["-0.01", "50", "50.01"],
    ["100.01", "0", "0"],
    ["", "60", "40"],
  ])("retains editable shares %s/%s/%s across step unmounts while rejecting submission", (...values) => {
    const { onStoreDocument, onSendDocument } = setup(true, true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Collaborators & Initial Split" }));
    const nav = within(screen.getByRole("navigation", { name: "Split creation steps" }));
    values.forEach((value, index) => fireEvent.change(screen.getAllByRole("spinbutton")[index], { target: { value } }));
    fireEvent.click(screen.getAllByRole("button", { name: /^Back$/ }).at(-1)!);
    expect(screen.getByRole("heading", { name: "Sample Disclosure" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    fireEvent.click(nav.getByRole("button", { name: "Collaborators" }));
    expect(screen.getAllByRole("spinbutton").map(input => (input as HTMLInputElement).value)).toEqual(values);
    fireEvent.click(nav.getByRole("button", { name: "Work" }));
    fireEvent.click(nav.getByRole("button", { name: "Collaborators" }));
    expect(screen.getAllByRole("spinbutton").map(input => (input as HTMLInputElement).value)).toEqual(values);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(nav.getByRole("button", { name: "Review" })).toBeDisabled();
    expect(onStoreDocument).not.toHaveBeenCalled(); expect(onSendDocument).not.toHaveBeenCalled();
    ["33.33", "33.33", "33.34"].forEach((value, index) => fireEvent.change(screen.getAllByRole("spinbutton")[index], { target: { value } }));
    fireEvent.click(nav.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("button", { name: "Save To Drafts" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send Split Invite" })).toBeEnabled();
  });

  it.each(["Back", "Go to Dashboard", "Cancel"].flatMap(opener => ["Keep editing", "Escape"].map(dismiss => [opener, dismiss])))(
    "restores focus to %s after %s without leaving the builder", async (name, dismiss) => {
      const { onBack, onHome } = setup();
      fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Keyboard session" } });
      const opener = screen.getByRole("button", { name });
      opener.focus(); fireEvent.click(opener);
      const cancel = screen.getByRole("button", { name: "Keep editing" });
      await waitFor(() => expect(cancel).toHaveFocus());
      if (dismiss === "Escape") fireEvent.keyDown(cancel, { key: "Escape" });
      else fireEvent.click(cancel);
      await waitFor(() => expect(opener).toHaveFocus());
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Work Title")).toHaveValue("Keyboard session");
      expect(reloadEvent().defaultPrevented).toBe(true);
      expect(onBack).not.toHaveBeenCalled(); expect(onHome).not.toHaveBeenCalled();
    });

  it("does not resurrect invalid text after equal splitting and removal", () => {
    setup(true, true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Collaborators & Initial Split" }));
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "33.333" } });
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    fireEvent.click(screen.getAllByRole("button", { name: /^Back$/ }).at(-1)!);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Split creation steps" })).getByRole("button", { name: "Collaborators" }));
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    expect(screen.getAllByRole("spinbutton").map(input => (input as HTMLInputElement).value)).toEqual(["33.34", "33.33", "33.33"]);
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "100.01" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove Third Artist" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Maya Rios" }));
    expect(screen.getByRole("spinbutton")).toHaveDisplayValue("100");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("leaves destination focus alone when discard is confirmed", async () => {
    const { onBack, rerender } = setup();
    onBack.mockImplementation(() => rerender(<button type="button" autoFocus>Destination</button>));
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Discarded session" } });
    const opener = screen.getByRole("button", { name: "Back" });
    opener.focus(); fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Leave without saving" }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(screen.getByRole("button", { name: "Destination" })).toHaveFocus();
    expect(opener).not.toBeInTheDocument();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it.each(["Back", "Go to Dashboard", "Cancel"])("confirms dirty %s exits, cancels without losing edits, then follows the intended destination", (button) => {
    const { onBack, onHome } = setup();
    expect(reloadEvent().defaultPrevented).toBe(false);
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Unsaved Session" } });
    expect(reloadEvent().defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(onBack).not.toHaveBeenCalled(); expect(onHome).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Work Title")).toHaveValue("Unsaved Session");
    fireEvent.click(screen.getByRole("button", { name: button }));
    fireEvent.click(screen.getByRole("button", { name: "Leave without saving" }));
    expect(button === "Go to Dashboard" ? onHome : onBack).toHaveBeenCalledOnce();
  });

  it("does not warn on untouched drafts or reverted edits and removes the unload handler", () => {
    const { unmount, onHome, doc } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Work" }));
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Changed" } });
    expect(reloadEvent().defaultPrevented).toBe(true);
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: doc.data.songTitle } });
    expect(reloadEvent().defaultPrevented).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Go to Dashboard" }));
    expect(onHome).toHaveBeenCalledOnce();
    unmount(); expect(reloadEvent().defaultPrevented).toBe(false);
  });

  it("keeps invalid shares editable but blocks Continue, Review, and submission", () => {
    const { onStoreDocument } = setup(true, true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Collaborators & Initial Split" }));
    const nav = within(screen.getByRole("navigation", { name: "Split creation steps" }));
    const shares = screen.getAllByRole("spinbutton");
    ["33.333", "33.333", "33.334"].forEach((value, index) => fireEvent.change(shares[index], { target: { value } }));
    expect(shares[0]).toHaveValue(33.333);
    fireEvent.blur(shares[0]); expect(shares[0]).toHaveValue(33.333);
    expect(shares[0]).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText(/up to 2 decimal places/)).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(nav.getByRole("button", { name: "Review" })).toBeDisabled();
    expect(onStoreDocument).not.toHaveBeenCalled();
    ["33.33", "33.33", "33.34"].forEach((value, index) => fireEvent.change(shares[index], { target: { value } }));
    expect(nav.getByRole("button", { name: "Review" })).toBeEnabled();
    expect(screen.getByText("Ready to continue")).toBeInTheDocument();
    fireEvent.change(shares[0], { target: { value: "" } });
    fireEvent.blur(shares[0]); expect(shares[0]).toHaveDisplayValue("");
    expect(nav.getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("resumes an owned draft, preserves its ID after failed saving, and clears warning only on success", async () => {
    const { doc, onStoreDocument, onBack } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Work" }));
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Resumed Work" } });
    fireEvent.click(within(screen.getByRole("navigation", { name: "Split creation steps" })).getByRole("button", { name: "Review" }));
    onStoreDocument.mockRejectedValueOnce(new Error("Offline"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" })));
    expect(reloadEvent().defaultPrevented).toBe(true); expect(onBack).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" })));
    expect(onStoreDocument.mock.calls.map(([document]) => document.id)).toEqual([doc.id, doc.id]);
    expect(onStoreDocument.mock.calls[1][0].data.songTitle).toBe("Resumed Work");
    expect(reloadEvent().defaultPrevented).toBe(false); expect(onBack).toHaveBeenCalledOnce();
  });
});
