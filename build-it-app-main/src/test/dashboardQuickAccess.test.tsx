import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import { saveLocalSplitSheetDocuments } from "@/lib/splitSheetStorage";
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
