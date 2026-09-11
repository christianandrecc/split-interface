import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/components/SettingsPage";
import { CREATOR_ROLE_OPTIONS } from "@/lib/creatorRoles";
import { createEmptyProfile } from "@/lib/userProfile";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function openCategory(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}

describe("SettingsPage", () => {
  it("offers only Equal and Custom split defaults, starting at Custom", () => {
    render(<form><SettingsPage userProfile={createEmptyProfile()} /></form>);
    const splitMethod = screen.getByRole("group", { name: "Split method" });
    expect(within(splitMethod).getByRole("radio", { name: "Custom" })).toBeChecked();
    expect(within(splitMethod).getAllByRole("radio").map((option) => option.textContent)).toEqual(["Equal", "Custom"]);
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
  });

  it("uses the first signup role as the default role and matches signup role options", () => {
    render(
      <SettingsPage
        userProfile={{
          ...createEmptyProfile(),
          roleTags: "Engineer, Producer",
        }}
      />,
    );

    const defaultRoleSelect = screen.getByRole("combobox", { name: "Default role" });
    expect(defaultRoleSelect).toHaveTextContent("Engineer");
    expect(CREATOR_ROLE_OPTIONS).toEqual(["Producer", "Writer", "Artist", "Engineer", "Topliner"]);
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Songwriter");
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Composer");
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Lyricist");
    expect(CREATOR_ROLE_OPTIONS).not.toContain("Contributor");
  });

  it("shows one category at a time and retains changes across categories", () => {
    render(<SettingsPage userProfile={createEmptyProfile()} />);
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    openCategory("Notifications");
    expect(screen.queryByRole("combobox", { name: "Default role" })).not.toBeInTheDocument();
    const signature = screen.getByRole("switch", { name: "Signature emails" });
    fireEvent.click(signature);
    expect(signature).not.toBeChecked();
    openCategory("Privacy & sharing");
    expect(screen.getByRole("switch", { name: "Hide contact details" })).toBeChecked();
    openCategory("Documents");
    expect(screen.getByRole("switch", { name: "Include signature audit trail" })).toBeChecked();
    openCategory("Split defaults");
    expect(screen.getByRole("radio", { name: "Equal" })).toBeChecked();
    openCategory("Notifications");
    expect(screen.getByRole("switch", { name: "Signature emails" })).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("2 preview changes");
  });

  it("disables timing when reminders are off without losing the cadence", () => {
    render(<SettingsPage userProfile={createEmptyProfile()} />);
    openCategory("Notifications");
    const timing = screen.getByRole("combobox", { name: "Reminder timing" });
    expect(timing).toBeEnabled();
    fireEvent.click(screen.getByRole("switch", { name: "Remind unsigned parties" }));
    expect(timing).toBeDisabled();
    expect(timing).toHaveTextContent("Every 3 days");
    fireEvent.click(screen.getByRole("switch", { name: "Remind unsigned parties" }));
    expect(timing).toBeEnabled();
    expect(timing).toHaveTextContent("Every 3 days");
  });

  it("applies and discards only preview changes without storage or form submission", () => {
    const save = vi.spyOn(Storage.prototype, "setItem");
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><SettingsPage userProfile={createEmptyProfile()} /></form>);
    const apply = screen.getByRole("button", { name: "Apply preview" });
    const discard = screen.getByRole("button", { name: "Discard preview changes" });
    expect(apply).toBeDisabled(); expect(discard).toBeDisabled();
    expect(screen.queryByText("Design preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save Settings/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    expect(apply).toBeEnabled();
    fireEvent.click(discard);
    expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    fireEvent.click(apply);
    expect(screen.getByRole("status")).toHaveTextContent("Preview applied");
    expect(apply).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.click(discard);
    expect(screen.getByRole("radio", { name: "Equal" })).toBeChecked();
    expect(save).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
  });

  it("labels switches and exposes their descriptions", () => {
    render(<SettingsPage userProfile={createEmptyProfile()} />);
    openCategory("Notifications");
    const signature = screen.getByRole("switch", { name: "Signature emails" });
    expect(signature).toHaveAccessibleDescription("When a collaborator signs");
    fireEvent.click(screen.getByText("Signature emails"));
    expect(signature).not.toBeChecked();
    fireEvent.focus(screen.getByRole("tab", { name: "Documents" }));
    expect(screen.getByRole("tabpanel", { name: "Documents" })).toBeVisible();
  });

  it("resets previews between accounts and does not persist on remount", () => {
    const profile = { ...createEmptyProfile(), authUserId: "account-a", roleTags: "Engineer" };
    const { rerender, unmount } = render(<SettingsPage userProfile={profile} />);
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply preview" }));
    rerender(<SettingsPage userProfile={{ ...profile, authUserId: "account-b", roleTags: "Artist" }} />);
    expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Default role" })).toHaveTextContent("Artist");
    expect(screen.getByRole("status")).toHaveTextContent("No preview changes");
    unmount();
    render(<SettingsPage userProfile={profile} />);
    expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
  });
});
