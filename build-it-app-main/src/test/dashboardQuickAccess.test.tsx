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

describe("dashboard quick access", () => {
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

    expect(screen.getByRole("heading", { name: "Quick access" })).toBeInTheDocument();
    expect(await screen.findByText("Continue negotiation")).toBeInTheDocument();
    expect(screen.getAllByText("Night Swim").length).toBeGreaterThan(0);
    expect(screen.getByText(/Maya Rios has a split proposal waiting/i)).toBeInTheDocument();

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

    fireEvent.click(await screen.findByRole("button", { name: /^View split$/i }));

    expect(screen.getAllByRole("heading", { name: "Night Swim" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Current proposal v1")).toBeInTheDocument();
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

    expect(await screen.findByText("Continue negotiation")).toBeInTheDocument();

    rerender(
      <Dashboard
        userProfile={makeOtherProfile()}
        activeAuthUserId="fresh-auth-user"
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    expect(screen.queryByText("Continue negotiation")).not.toBeInTheDocument();
    expect(screen.queryByText("Night Swim")).not.toBeInTheDocument();
  });
});
