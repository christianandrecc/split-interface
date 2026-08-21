import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

function makeCollaboratorProfile(): UserProfile {
  return {
    ...createEmptyProfile(),
    username: "mayarios",
    displayName: "Maya Rios",
    emailAddress: "maya@example.com",
  };
}

async function openNightSwimFromSearch() {
  const searchInput = screen.getByPlaceholderText(/search split sheets or users/i);
  fireEvent.focus(searchInput);
  fireEvent.change(searchInput, {
    target: { value: "night" },
  });
  const searchResults = screen.getByRole("listbox", { name: /search results/i });
  const result = await within(searchResults).findByText("Night Swim");
  fireEvent.mouseDown(result.closest("button")!);
}

describe("dashboard global search", () => {
  it("finds and opens a split sheet from the top search bar", async () => {
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

    const searchInput = screen.getByPlaceholderText(/search split sheets or users/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "night" } });
    const searchResults = screen.getByRole("listbox", { name: /search results/i });
    expect(searchResults).toBeInTheDocument();
    const result = await within(searchResults).findByText("Night Swim");
    fireEvent.mouseDown(result.closest("button")!);

    expect(screen.getAllByRole("heading", { name: "Night Swim" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Current proposal v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open in Messages" })).toBeInTheDocument();
  });

  it("lets a collaborator approve a split when Supabase records point at their party id", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.splitApprovals[1].collaboratorId = "maya-party";
    saveLocalSplitSheetDocuments([document]);

    render(
      <Dashboard
        userProfile={makeCollaboratorProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    await openNightSwimFromSearch();
    fireEvent.click(screen.getByRole("button", { name: "Open in Messages" }));

    expect(screen.getByRole("button", { name: "Accept" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Dispute" })).not.toBeDisabled();
  });

  it("lets a collaborator sign a ready split when Supabase records point at their party id", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Ready to Sign";
    document.splitApprovals = document.splitApprovals.map((approval) => ({
      ...approval,
      status: "Approved",
      respondedAt: approval.respondedAt || document.updatedAt,
    }));
    document.splitSignatures = [
      {
        id: "creator-signature",
        proposalVersionId: "proposal-1",
        collaboratorId: "creator",
        collaboratorName: "Chori",
        status: "Signed",
        signedAt: document.updatedAt,
      },
      {
        id: "maya-signature",
        proposalVersionId: "proposal-1",
        collaboratorId: "maya-party",
        collaboratorName: "Maya Rios",
        status: "Pending",
      },
    ];
    saveLocalSplitSheetDocuments([document]);

    render(
      <Dashboard
        userProfile={makeCollaboratorProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    await openNightSwimFromSearch();
    fireEvent.click(screen.getByRole("button", { name: "Open in Messages" }));

    const signButtons = screen.getAllByRole("button", { name: /^Sign$/ });
    expect(signButtons).toHaveLength(2);
    signButtons.forEach((button) => expect(button).not.toBeDisabled());
  });
});
