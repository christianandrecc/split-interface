import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import { loadLocalSplitSheetDocuments, saveLocalSplitSheetDocuments } from "@/lib/splitSheetStorage";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/fixtures/splitSheet";

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

function makeProfile(): UserProfile {
  return {
    ...createEmptyProfile(),
    username: "chori",
    displayName: "Chori",
    emailAddress: "chori@example.com",
  };
}

function makeOtherProfile(): UserProfile {
  return {
    ...createEmptyProfile(),
    username: "freshuser",
    displayName: "Fresh User",
    emailAddress: "fresh@example.com",
  };
}

describe("dashboard workspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("offers sign out in the profile dropdown and disables account actions while it runs", async () => {
    const profile = makeProfile();
    const signOut = vi.fn().mockResolvedValue(undefined);
    const props = { userProfile: profile, onUpdateProfile: vi.fn(), onOpenAccountCreation: vi.fn(), onSignOut: signOut };
    const { rerender } = render(<Dashboard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalledOnce();
    rerender(<Dashboard {...props} signingOut />);
    expect(screen.getByRole("button", { name: "Signing out..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Your Profile" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Account Setup" })).toBeDisabled();
    rerender(<Dashboard {...props} />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("deletes a confirmed draft from the preview, list, counts, and local storage", async () => {
    const document = makeDocument();
    document.status = "Draft";
    saveLocalSplitSheetDocuments([document]);
    render(<Dashboard userProfile={makeProfile()} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "View draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Draft" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete Draft" }));
    await waitFor(() => expect(screen.queryByText("Edit Draft")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Open Night Swim preview" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No split sheets yet" })).toBeInTheDocument();
    expect(loadLocalSplitSheetDocuments()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(screen.getByRole("button", { name: /0 drafts/i })).toBeInTheDocument();
  });

  it("opens a draft preview first, edits only on request, and returns saved changes to the preview", async () => {
    const document = makeDocument();
    document.status = "Draft";
    saveLocalSplitSheetDocuments([document]);
    render(<Dashboard userProfile={makeProfile()} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "View draft" }));
    expect(screen.getByRole("heading", { name: "Night Swim" })).toBeInTheDocument();
    expect(screen.getByText("Invitations not sent")).toBeInTheDocument();
    expect(screen.getByText("Proposed Split")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Review Draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send Split Invite" })).not.toBeInTheDocument();
    expect(loadLocalSplitSheetDocuments()).toEqual([document]);
    fireEvent.click(screen.getByRole("button", { name: "Edit Draft" }));
    expect(screen.getByRole("heading", { name: "Review Draft" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Work$/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Work title"), { target: { value: "Night Swim Revised" } });
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Review Draft" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Night Swim Revised" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Draft" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Split sheet library" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to split sheets" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Night Swim Revised preview" }));
    expect(screen.getByRole("heading", { name: "Night Swim Revised" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send Split Invite" })).not.toBeInTheDocument();
    expect(loadLocalSplitSheetDocuments()[0]).toMatchObject({ id: document.id, status: "Draft" });
    expect(loadLocalSplitSheetDocuments()[0].sentAt).toBeUndefined();
  });

  it("surfaces recent split moments without cover art and opens messages", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    saveLocalSplitSheetDocuments([document]);

    render(
      <Dashboard
        userProfile={makeProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Open messages" })).toBeInTheDocument();
    expect(screen.getAllByText("Night Swim").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^Open messages$/i }));

    expect(screen.getByPlaceholderText(/message the collaborators/i)).toBeInTheDocument();
  });

  it("opens the split detail from quick access", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    saveLocalSplitSheetDocuments([document]);

    render(
      <Dashboard
        userProfile={makeProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /^Night Swim$/i }));

    expect(screen.getAllByRole("heading", { name: "Night Swim" }).length).toBeGreaterThan(0);
    expect(screen.getByText("SPLIT Total")).toBeInTheDocument();
    expect(screen.getByText("Signatures")).toBeInTheDocument();
  });

  it("clears stale quick-access split sheets when the active account changes", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    saveLocalSplitSheetDocuments([document]);

    const { rerender } = render(
      <Dashboard
        userProfile={makeProfile()}
        activeAuthUserId="old-auth-user"
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: "Open messages" })).toBeInTheDocument();

    rerender(
      <Dashboard
        userProfile={makeOtherProfile()}
        activeAuthUserId="fresh-auth-user"
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Open messages" })).not.toBeInTheDocument();
    expect(screen.queryByText("Night Swim")).not.toBeInTheDocument();
  });

  it("preserves the library's search, filter, page, and focus across draft previews", async () => {
    const documents = Array.from({ length: 27 }, (_, index) => {
      const document = makeDocument();
      document.id = `draft-${index}`;
      document.status = "Draft";
      document.data.songTitle = `Night Swim ${String(index + 1).padStart(2, "0")}`;
      return document;
    });
    saveLocalSplitSheetDocuments(documents);
    render(<Dashboard userProfile={makeProfile()} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Split Sheets" }));
    await screen.findByRole("button", { name: "Open Night Swim 01 preview" });
    expect(screen.queryByRole("region", { name: "Draft details" })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Drafts" }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByRole("textbox", { name: "Search your split sheets" }), { target: { value: "night" } });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Night Swim 26 preview" }));
    expect(screen.getByRole("region", { name: "Draft details" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Split sheets" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to split sheets" }));
    expect(screen.getByRole("textbox", { name: "Search your split sheets" })).toHaveValue("night");
    expect(screen.getByRole("tab", { name: "Drafts" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Night Swim 26 preview" })).toHaveFocus();
  });
});
