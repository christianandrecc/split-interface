import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { makeDocument } from "@/test/fixtures/splitSheet";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { SplitSheetSaveResult } from "@/lib/splitSheetStorage";

vi.mock("@/lib/globalSearch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/globalSearch")>()),
  searchPublicProfiles: vi.fn(async () => []),
}));

function setup(editing = false) {
  const draft = makeDocument();
  draft.status = "Draft";
  const onStoreDocument = vi.fn(async (document: StoredSplitSheetDocument): Promise<SplitSheetSaveResult> => ({ document, persisted: true }));
  const onSendDocument = vi.fn(async (document: StoredSplitSheetDocument): Promise<SplitSheetSaveResult> => ({ document, persisted: true }));
  render(<ContractBuilder userProfile={draft.creatorProfile} initialDocument={editing ? draft : undefined}
    onBack={vi.fn()} onStoreDocument={onStoreDocument} onSendDocument={onSendDocument} />);
  const nav = within(screen.getByRole("navigation", { name: "Split creation steps" }));
  return { nav, onStoreDocument, onSendDocument };
}

describe("creation step navigation", () => {
  it("shows named steps, gates unvisited steps, and preserves work details when going back", () => {
    const { nav } = setup();
    expect(nav.getByRole("button", { name: "Work" })).toHaveAttribute("aria-current", "step");
    expect(nav.getByRole("button", { name: "Review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Late Session" } });
    fireEvent.click(screen.getByRole("button", { name: "Optional details" }));
    fireEvent.change(screen.getByLabelText("Session Notes"), { target: { value: "Keep these notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Sample Disclosure" })).toHaveFocus();
    fireEvent.click(nav.getByRole("button", { name: "Work" }));
    expect(screen.getByLabelText("Work Title")).toHaveValue("Late Session");
    fireEvent.click(screen.getByRole("button", { name: "Optional details" }));
    expect(screen.getByLabelText("Session Notes")).toHaveValue("Keep these notes");
    expect(nav.getByRole("button", { name: "Sample" })).toBeEnabled();
  });

  it("edits each review section and returns directly to review without writing anything", () => {
    const { nav, onStoreDocument, onSendDocument } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Work" }));
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Night Swim (Reprise)" } });
    fireEvent.click(nav.getByRole("button", { name: "Review" }));
    expect(screen.getByText("Night Swim (Reprise)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Sample Disclosure" }));
    fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
    fireEvent.change(screen.getByLabelText("Sample Artist"), { target: { value: "Original artist" } });
    fireEvent.change(screen.getByLabelText("Sample Title"), { target: { value: "Original work" } });
    fireEvent.change(screen.getByLabelText("Seconds Used"), { target: { value: "0-15 sec" } });
    fireEvent.click(nav.getByRole("button", { name: "Review" }));
    expect(screen.getByText("Original artist")).toBeInTheDocument();
    expect(screen.getByText("Original work")).toBeInTheDocument();
    expect(screen.getByText("0-15 sec")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Collaborators & Initial Split" }));
    expect(screen.getByRole("heading", { name: "Invite Collaborators" })).toHaveFocus();
    expect(screen.getByRole("combobox", { name: "Role on Composition for Maya Rios" })).toHaveValue("Producer");
    fireEvent.click(nav.getByRole("button", { name: "Review" }));
    expect(screen.getByText("@mayarios")).toBeInTheDocument();
    expect(onStoreDocument).not.toHaveBeenCalled();
    expect(onSendDocument).not.toHaveBeenCalled();
  });

  it("does not let review shortcuts bypass invalid work or ownership", () => {
    const { nav } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Edit Work" }));
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "" } });
    expect(nav.getByRole("button", { name: "Review" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Work Title"), { target: { value: "Night Swim" } });
    fireEvent.click(nav.getByRole("button", { name: "Collaborators" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Split Share for Chori" }), { target: { value: "70" } });
    expect(screen.getByText("Over by 10.00%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(nav.getByRole("button", { name: "Review" })).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Split Share for Chori" }), { target: { value: "60" } });
    expect(nav.getByRole("button", { name: "Review" })).toBeEnabled();
  });

  it("keeps equal shares exact through adding and removing collaborators", () => {
    const { nav } = setup(true);
    fireEvent.click(nav.getByRole("button", { name: "Collaborators" }));
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    fireEvent.click(screen.getByRole("button", { name: "Invite another collaborator" }));
    const shares = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(shares.map((input) => input.value)).toEqual(["33.34", "33.33", "33.33"]);
    expect(shares.every((input) => input.disabled)).toBe(true);
    expect(within(screen.getByRole("region", { name: "Collaborator 3" })).getByText(/Required:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Invited collaborator" }));
    expect((screen.getAllByRole("spinbutton") as HTMLInputElement[]).map((input) => input.value)).toEqual(["50", "50"]);
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    expect(screen.getByRole("spinbutton", { name: "Split Share for Chori" })).toBeEnabled();
    expect(nav.getByRole("button", { name: "Review" })).toBeEnabled();
  });

  it("locks step navigation and review edits while saving", async () => {
    const { nav, onStoreDocument } = setup(true);
    let fail!: (error: Error) => void;
    onStoreDocument.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    expect(nav.getByRole("button", { name: "Work" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit Work" })).toBeDisabled();
    await act(async () => fail(new Error("Offline")));
    expect(nav.getByRole("button", { name: "Work" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit Work" })).toBeEnabled();
  });
});
