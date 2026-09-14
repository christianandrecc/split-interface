import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "@/components/ProfilePage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createEmptyProfile } from "@/lib/userProfile";

vi.mock("@/components/AccountEmailControl", () => ({ default: ({ userId }: { userId: string }) => <div>Account email for {userId}</div> }));

const makeProfile = () => ({ ...createEmptyProfile(), authUserId: "account-a", username: "chori", displayName: "Chori", legalFirstName: "Christian", legalLastName: "Carrera", roleTags: "Producer, Writer", emailAddress: "chori@example.test", phoneNumber: "305-555-0100", addressLine: "123 Test Street", city: "Miami", state: "Florida", country: "United States", socialInstagram: "samehandle", socialTikTok: "samehandle", proAffiliation: "BMI", ipiNumber: "00123456789" });
const openCategory = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
const selectOption = (label: string, name: string | RegExp) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name }));
};
function setup(onUpdateProfile = vi.fn().mockResolvedValue(undefined), onBackToPublicProfile = vi.fn()) {
  const profile = makeProfile();
  return { profile, onUpdateProfile, onBackToPublicProfile, ...render(<TooltipProvider><ProfilePage userProfile={profile} onUpdateProfile={onUpdateProfile} onBackToPublicProfile={onBackToPublicProfile} /></TooltipProvider>) };
}

describe("compact profile editor", () => {
  it("starts with one category and a single inactive save action", () => {
    setup();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Public profile" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("Legal First Name")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Producer" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    expect(screen.queryByText(/ready for beta use/)).not.toBeInTheDocument();
  });

  it("does not invent unsaved changes when a legacy profile has no split ID", () => {
    const profile = { ...makeProfile(), splitId: "" };
    const save = vi.fn();
    const { rerender } = render(<TooltipProvider><ProfilePage userProfile={profile} onUpdateProfile={save} /></TooltipProvider>);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    rerender(<TooltipProvider><ProfilePage userProfile={{ ...profile }} onUpdateProfile={save} /></TooltipProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("No changes");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("saves edits from all categories through the original profile callback", async () => {
    const { onUpdateProfile } = setup();
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "  Aurora Music  " } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Artist" }));
    selectOption("Visibility", "Private");
    openCategory("Personal details");
    fireEvent.change(screen.getByLabelText("Artist Name"), { target: { value: "Aurora Music" } });
    fireEvent.change(screen.getByLabelText("Legal First Name"), { target: { value: "Alex" } });
    openCategory("Registration");
    selectOption("PRO Affiliation", "Other");
    fireEvent.change(screen.getByLabelText("PRO Name"), { target: { value: "SOCAN" } });
    fireEvent.change(screen.getByLabelText("IPI / CAE Number"), { target: { value: "00987654321" } });
    expect(screen.getByRole("tab", { name: "Public profile" })).toHaveAttribute("aria-description", "Unsaved changes");
    openCategory("Account");
    expect(screen.getByText("Account email for account-a")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
    expect(onUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
      displayName: "Aurora Music", pkaNames: "Aurora Music", legalName: "Alex Carrera", roleTags: "Producer, Writer, Artist", profileVisibility: "Private",
      proAffiliation: "Other", customProName: "SOCAN", ipiNumber: "00987654321", emailAddress: "chori@example.test", legalAddress: "123 Test Street, Miami, Florida, United States",
    }));
    openCategory("Public profile");
    expect(screen.getByLabelText("Display Name")).toHaveValue("Aurora Music");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("shows only public details in an on-demand preview, including unsaved edits", async () => {
    const { onUpdateProfile } = setup();
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "New public name" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview profile" }));
    const dialog = screen.getByRole("dialog", { name: "Profile preview" });
    expect(within(dialog).getByText("New public name")).toBeInTheDocument();
    expect(within(dialog).getByText("Instagram")).toBeInTheDocument();
    expect(within(dialog).getByText("TikTok")).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent("123 Test Street");
    expect(dialog).not.toHaveTextContent("305-555-0100");
    expect(dialog).not.toHaveTextContent("chori@example.test");
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it("retains failed edits and prevents duplicate saves", async () => {
    let reject!: (reason: Error) => void;
    const save = vi.fn().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValueOnce(undefined);
    setup(save);
    const input = screen.getByLabelText("Display Name");
    fireEvent.change(input, { target: { value: "Pending name" } });
    const button = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(button); fireEvent.click(button);
    expect(save).toHaveBeenCalledOnce();
    expect(button).toBeDisabled(); expect(input).toBeDisabled();
    await act(async () => reject(new Error("Connection lost. Try again.")));
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost");
    expect(input).toHaveValue("Pending name");
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
  });

  it("confirms discard and Back to Profile without discarding on cancel", () => {
    const { onUpdateProfile, onBackToPublicProfile } = setup();
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to Profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Display Name")).toHaveValue("Unsaved");
    expect(onBackToPublicProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));
    expect(screen.getByLabelText("Display Name")).toHaveValue("Chori");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Back to Profile" }));
    expect(onBackToPublicProfile).toHaveBeenCalledOnce();
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it("preserves dependent country and PRO field rules", () => {
    setup(); openCategory("Personal details");
    selectOption("Country", /Canada/);
    expect(screen.getByLabelText("Province / Region")).toHaveValue("");
    expect(screen.queryByRole("combobox", { name: "State" })).not.toBeInTheDocument();
    openCategory("Registration"); selectOption("PRO Affiliation", "Skip PRO Registration");
    expect(screen.getByLabelText("IPI / CAE Number")).toHaveValue("");
    expect(screen.getByLabelText("IPI / CAE Number")).toBeDisabled();
    expect(screen.queryByLabelText("PRO Name")).not.toBeInTheDocument();
  });

  it("does not apply an old account's save result after an account switch", async () => {
    let finish!: () => void;
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { profile, rerender } = setup(save);
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Account A draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    rerender(<TooltipProvider><ProfilePage userProfile={{ ...profile, authUserId: "account-b", displayName: "Account B" }} onUpdateProfile={save} /></TooltipProvider>);
    await act(async () => finish());
    expect(screen.getByLabelText("Display Name")).toHaveValue("Account B");
    expect(screen.getByRole("status")).toHaveTextContent("No changes");
  });

  it("keeps a confirmed Auth email when it arrives during a profile save", async () => {
    let finish!: () => void;
    const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const { profile, rerender } = setup(save);
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Edited name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    rerender(<TooltipProvider><ProfilePage userProfile={{ ...profile, emailAddress: "confirmed@example.test" }} onUpdateProfile={save} /></TooltipProvider>);
    expect(screen.getByLabelText("Display Name")).toHaveValue("Edited name");
    await act(async () => finish());
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Second edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ displayName: "Second edit", emailAddress: "confirmed@example.test" }));
    await act(async () => finish());
  });
});
