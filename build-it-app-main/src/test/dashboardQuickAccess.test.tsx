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

  it("deletes a confirmed draft from the preview, list, counts, and local storage", async () => {
    const document = makeDocument();
    document.status = "Draft";
    saveLocalSplitSheetDocuments([document]);
    render(<Dashboard userProfile={makeProfile()} onUpdateProfile={async () => undefined} onOpenAccountCreation={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "View draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Draft" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete Draft" }));
    await waitFor(() => expect(screen.queryByText("Edit Draft")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Night Swim.*Draft/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Draft" })).toHaveClass("bg-primary");
    fireEvent.click(screen.getByRole("button", { name: /Night Swim.*Draft/i }));
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
});
