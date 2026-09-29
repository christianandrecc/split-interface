import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import CreatorProfileView from "@/components/CreatorProfileView";
import { createEmptyProfile } from "@/lib/userProfile";
import { creatorSocialLinks, mergeCreatorProfile } from "@/lib/creatorProfileView";
import type { CreatorProfile } from "@/types/creatorProfile";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/use-toast", () => ({ toast }));
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor);
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
});
afterEach(() => { vi.restoreAllMocks(); toast.mockClear(); });

const profile = { ...createEmptyProfile(), authUserId: "chori-id", username: "chori", displayName: "Chori", roleTags: "Producer, Writer", profileLocation: "Miami, USA", socialInstagram: "@chori" };
const creator: CreatorProfile = {
  ...mergeCreatorProfile(undefined, profile), verified: true, verifiedCredits: 999,
  credits: [
    { id: "one", title: "Night Swim", artist: "Maya", year: "2026", releaseType: "Single", contribution: "Writer", image: "", verifiedAt: "Sep 15, 2026", collaborators: ["Maya", "Chori"], notes: "Original composition.", collaboratedTracks: [{ trackNumber: 1, title: "Night Swim", contribution: "Writer" }] },
    { id: "two", title: "Daylight", artist: "Alex", year: "2025", releaseType: "Album", contribution: "Producer", image: "", verifiedAt: "", collaborators: [], notes: "" },
  ],
};
const selectTab = (name: string) => fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });

describe("compact creator profile", () => {
  it("keeps the empty state compact, hides disconnected controls, and routes useful actions", () => {
    const edit = vi.fn(), sheets = vi.fn();
    render(<CreatorProfileView userProfile={profile} onEditProfile={edit} onViewSplitSheets={sheets} />);
    expect(screen.getByRole("tab", { name: "Credits 0" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Spotlight" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /follow|share profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Search credits" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.click(screen.getByRole("button", { name: "View split sheets" }));
    expect(edit).toHaveBeenCalledOnce(); expect(sheets).toHaveBeenCalledOnce();
  });

  it("shows only public identity and safe social links in About", () => {
    render(<CreatorProfileView userProfile={{ ...profile, legalName: "Private Legal Name", emailAddress: "private@example.test", phoneNumber: "55501234", city: "Private City", addressLine: "Private Address", proAffiliation: "Private PRO" }} />);
    selectTab("About");
    const panel = screen.getByRole("tabpanel", { name: "About" });
    expect(within(panel).getByText("Miami, USA")).toBeInTheDocument();
    expect(panel.textContent).not.toMatch(/Private|private@example|55501234/);
    const link = within(panel).getByRole("link", { name: "Instagram profile (opens in a new tab)" });
    expect(link).toHaveAttribute("href", "https://instagram.com/chori");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not fall back to private identity or address data", () => {
    const merged = mergeCreatorProfile(undefined, { ...createEmptyProfile(), legalName: "Secret Name", legalFirstName: "Secret", city: "Private City", state: "Private State", emailAddress: "secret@example.test" });
    expect(merged.displayName).toBe(""); expect(merged.location).toBe("");
  });

  it("filters credits and opens actual credit details with focus restored", async () => {
    render(<CreatorProfileView creatorProfile={creator} />);
    expect(screen.getByRole("tab", { name: "Credits 2" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search credits" }), { target: { value: "maya" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 of 2 credits");
    fireEvent.click(screen.getByRole("button", { name: "Clear credit search" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Release type" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Single" }));
    expect(screen.queryByRole("button", { name: "View credit: Daylight" })).not.toBeInTheDocument();
    const row = screen.getByRole("button", { name: "View credit: Night Swim" });
    fireEvent.click(row);
    const dialog = screen.getByRole("dialog", { name: "Night Swim" });
    expect(within(dialog).getByText("Maya, Chori")).toBeInTheDocument();
    expect(within(dialog).getByText("Collaborated tracks")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(row).toHaveFocus());
    fireEvent.change(screen.getByRole("textbox", { name: "Search credits" }), { target: { value: "absent" } });
    expect(screen.getByText("No matching credits")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("status")).toHaveTextContent("2 of 2 credits");
  });

  it("copies the username only after a successful clipboard write, and reports failures", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    try {
      render(<CreatorProfileView userProfile={profile} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy username" }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Username copied" })));
      expect(writeText).toHaveBeenCalledWith("@chori");
      toast.mockClear(); writeText.mockRejectedValueOnce(new Error("denied"));
      fireEvent.click(screen.getByRole("button", { name: "Copy username" }));
      await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't copy username", variant: "destructive" })));
      expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Username copied" }));
    } finally { vi.unstubAllGlobals(); }
  });

  it("hides own-profile controls from collaborators and resets details when identity changes", () => {
    const message = vi.fn();
    const { rerender } = render(<CreatorProfileView creatorProfile={creator} mode="collaborator" onMessage={message} onEditProfile={vi.fn()} onViewSplitSheets={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Edit profile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Split sheets" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Messages" })); expect(message).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "View credit: Night Swim" }));
    rerender(<CreatorProfileView userProfile={{ ...profile, authUserId: "another", username: "another", displayName: "Another" }} mode="collaborator" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Credits 0" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows provided Spotlight content without invented stories or engagement counts", () => {
    render(<CreatorProfileView creatorProfile={{ ...creator, spotlight: [{ id: "story", title: "In the studio", description: "A session with Maya.", image: "", duration: "" }] }} />);
    selectTab("Spotlight");
    fireEvent.click(screen.getByRole("button", { name: /In the studio/ }));
    expect(screen.getByRole("dialog", { name: "In the studio" })).toHaveTextContent("A session with Maya.");
    expect(screen.queryByText(/Invited collaborator|1.2k|3 min read/)).not.toBeInTheDocument();
  });
});

describe("creator social links", () => {
  it("normalizes handles and platform URLs", () => {
    expect(creatorSocialLinks({ instagram: "@chori", tiktok: "tiktok.com/@chori?lang=en", x: "http://www.twitter.com/chori#profile" })).toEqual([
      { platform: "Instagram", url: "https://instagram.com/chori" },
      { platform: "TikTok", url: "https://tiktok.com/@chori" },
      { platform: "X / Twitter", url: "https://www.twitter.com/chori" },
    ]);
  });
  it.each(["javascript:alert(1)", "https://evil.test/chori", "https://instagram.com.evil.test/chori", "https://user:secret@instagram.com/chori", "https://instagram.com/", "not a handle"])("rejects invalid social value %s", value => {
    expect(creatorSocialLinks({ instagram: value })).toEqual([]);
  });
});
