import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/components/SettingsPage";
import { DEFAULT_APP_SETTINGS, type SavedSettings } from "@/lib/accountSettings";
import { createEmptyProfile } from "@/lib/userProfile";

const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/accountSettings", async (original) => ({ ...await original<typeof import("@/lib/accountSettings")>(), loadAccountSettings: mocks.load, saveAccountSettings: mocks.save }));
const profile = { ...createEmptyProfile(), authUserId: "account-a", roleTags: "Engineer, Producer" };
let stored: SavedSettings;
beforeEach(() => {
  stored = { settings: { ...DEFAULT_APP_SETTINGS }, revision: null };
  mocks.load.mockImplementation(async () => structuredClone(stored));
  mocks.save.mockImplementation(async (_id, settings) => {
    stored = { settings, revision: (stored.revision ?? 0) + 1 };
    return structuredClone(stored);
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function openCategory(name: string) { fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false }); }
async function setup() {
  const result = render(<SettingsPage userProfile={profile} />);
  await waitFor(() => expect(screen.getByRole("radio", { name: "Equal" })).toBeEnabled());
  return result;
}

describe("account Settings", () => {
  it("keeps manual closure requests available if preferences fail to load", async () => {
    mocks.load.mockRejectedValueOnce(new Error("Offline"));
    render(<SettingsPage userProfile={profile} />);
    await screen.findByRole("alert");
    openCategory("Privacy & sharing");
    fireEvent.click(screen.getByRole("button", { name: "Request account closure" }));
    expect(screen.getByRole("link", { name: "Open email" })).toHaveAttribute("href", expect.stringContaining("mailto:xtiancarrera@gmail.com?"));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("replays onboarding from Settings without saving preferences", async () => {
    const onViewOnboardingAgain = vi.fn();
    render(<SettingsPage userProfile={profile} onViewOnboardingAgain={onViewOnboardingAgain} />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Equal" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "View onboarding again" }));
    expect(onViewOnboardingAgain).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("requires saving or discarding edits before replaying onboarding", async () => {
    const onViewOnboardingAgain = vi.fn();
    render(<SettingsPage userProfile={profile} onViewOnboardingAgain={onViewOnboardingAgain} />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Equal" })).toBeEnabled());
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    const replay = screen.getByRole("button", { name: "View onboarding again" });
    expect(replay).toBeDisabled();
    expect(replay).toHaveAccessibleDescription("Save or discard your changes first.");
    fireEvent.click(replay);
    expect(onViewOnboardingAgain).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(replay).toBeEnabled();
    fireEvent.click(replay);
    expect(onViewOnboardingAgain).toHaveBeenCalledOnce();
  });
  it("can replay onboarding even if account settings fail to load", async () => {
    const onViewOnboardingAgain = vi.fn();
    mocks.load.mockRejectedValueOnce(new Error("Offline"));
    render(<SettingsPage userProfile={profile} onViewOnboardingAgain={onViewOnboardingAgain} />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "View onboarding again" }));
    expect(onViewOnboardingAgain).toHaveBeenCalledOnce();
  });
  it("loads composition defaults, not general signup roles, with only Equal and Custom", async () => {
    await setup();
    expect(mocks.load).toHaveBeenCalledWith("account-a");
    expect(screen.getByRole("combobox", { name: "Default composition role" })).toHaveTextContent("Songwriter");
    expect(within(screen.getByRole("group", { name: "Split method" })).getAllByRole("radio").map(el => el.textContent)).toEqual(["Equal", "Custom"]);
    expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
  it("saves across categories and remounts without local storage", async () => {
    const localSave = vi.spyOn(Storage.prototype, "setItem");
    const { unmount } = await setup();
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    openCategory("Documents");
    fireEvent.click(screen.getByRole("switch", { name: "Include signature audit trail" }));
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
    expect(mocks.save).toHaveBeenCalledWith("account-a", { ...DEFAULT_APP_SETTINGS, defaultSplitMethod: "Equal", includeAuditTrail: false }, null);
    unmount(); await setup();
    expect(screen.getByRole("radio", { name: "Equal" })).toBeChecked();
    openCategory("Documents");
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(localSave).not.toHaveBeenCalled(); localSave.mockRestore();
  });
  it("keeps contact details private and unsupported delivery controls unavailable", async () => {
    await setup(); openCategory("Notifications");
    for (const el of screen.getAllByRole("switch")) { expect(el).toBeDisabled(); expect(el).not.toBeChecked(); }
    expect(screen.getByRole("switch", { name: "Signature emails" })).toHaveAccessibleDescription(/not connected/);
    openCategory("Privacy & sharing");
    expect(screen.getByRole("switch", { name: "Hide contact details" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Hide contact details" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Approve external sharing" })).toBeDisabled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("preserves failed edits, prevents duplicate writes, and discards to the last confirmed save", async () => {
    await setup();
    let reject!: (error: Error) => void;
    mocks.save.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    const save = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(save); fireEvent.click(save);
    expect(save).toBeDisabled(); expect(mocks.save).toHaveBeenCalledOnce();
    expect(screen.getByRole("radio", { name: "Custom" })).toBeDisabled();
    await act(async () => reject(new Error("Connection lost")));
    expect(screen.getByRole("alert")).toHaveTextContent("Connection lost");
    expect(screen.getByRole("radio", { name: "Equal" })).toBeChecked();
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByRole("radio", { name: "Equal" })).toBeChecked();
  });
  it("does not enable settings after a failed load, and supports retry", async () => {
    mocks.load.mockRejectedValueOnce(new Error("Migration unavailable"));
    render(<SettingsPage userProfile={profile} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Migration unavailable");
    expect(screen.getByRole("radio", { name: "Equal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading settings" }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "Equal" })).toBeEnabled());
  });
  it("reloads a conflicting revision without overwriting another tab", async () => {
    await setup();
    fireEvent.click(screen.getByRole("radio", { name: "Equal" }));
    mocks.save.mockRejectedValueOnce(new Error("Settings changed in another tab"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("alert");
    stored = { settings: { ...DEFAULT_APP_SETTINGS, defaultUserRole: "Composer" }, revision: 5 };
    fireEvent.click(screen.getByRole("button", { name: "Reload saved settings" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Default composition role" })).toHaveTextContent("Composer"));
    expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
  });
  it("ignores an old account's late response", async () => {
    let resolve!: (value: SavedSettings) => void;
    mocks.load.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const { rerender } = render(<SettingsPage userProfile={profile} />);
    rerender(<SettingsPage userProfile={{ ...profile, authUserId: "account-b" }} />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Equal" })).toBeEnabled());
    await act(async () => resolve({ settings: { ...DEFAULT_APP_SETTINGS, defaultUserRole: "Lyricist" }, revision: 99 }));
    expect(screen.getByRole("combobox", { name: "Default composition role" })).toHaveTextContent("Songwriter");
  });
});
