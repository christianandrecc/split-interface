import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { saveLocalSplitSheetDocuments } from "@/lib/splitSheetStorage";
import * as splitSheetStorage from "@/lib/splitSheetStorage";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/fixtures/splitSheet";

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));
afterEach(() => vi.restoreAllMocks());

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
    legalName: "Maya Rios",
    emailAddress: "maya@example.com",
  };
}

async function openNightSwimFromSearch() {
  const searchInput = screen.getByRole("textbox", { name: /search split sheets or users/i });
  fireEvent.focus(searchInput);
  fireEvent.change(searchInput, {
    target: { value: "night" },
  });
  const searchResults = screen.getByRole("listbox", { name: /search results/i });
  const result = await within(searchResults).findByText("Night Swim");
  fireEvent.click(result.closest("button")!);
}

describe("dashboard global search", () => {
  it("returns to signing only after saving supplied identity details", async () => {
    const document = makeDocument(); document.sentAt = document.createdAt;
    document.status = "Ready to Sign";
    document.splitApprovals.forEach(approval => { approval.status = "Approved"; });
    vi.spyOn(splitSheetStorage, "loadSplitSheetDocuments").mockResolvedValue([{ document, persisted: true }]);
    const save = vi.fn().mockResolvedValue(undefined);
    function ProfileHarness() {
      const [profile, setProfile] = useState(makeProfile);
      return <Dashboard userProfile={profile} onOpenAccountCreation={vi.fn()}
        onUpdateProfile={async next => { await save(next); setProfile(next); }} />;
    }
    render(<TooltipProvider><ProfileHarness /></TooltipProvider>);
    await openNightSwimFromSearch();
    fireEvent.click(screen.getByRole("button", { name: "Open in Messages" }));
    expect(screen.queryByRole("button", { name: "Sign" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete signing details" }));
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Personal details" }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText("Legal First Name"), { target: { value: "Synthetic" } });
    fireEvent.change(screen.getByLabelText("Legal Last Name"), { target: { value: "Signer" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ legalName: "Synthetic Signer" })));
    fireEvent.click(screen.getByRole("button", { name: /^Messages$/ }));
    expect(await screen.findByRole("button", { name: "Sign" })).toBeEnabled();
    expect(document.splitSignatures).toEqual([]);
  });

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

    const searchInput = screen.getByRole("textbox", { name: /search split sheets or users/i });
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "night" } });
    const searchResults = screen.getByRole("listbox", { name: /search results/i });
    expect(searchResults).toBeInTheDocument();
    const result = await within(searchResults).findByText("Night Swim");
    fireEvent.click(result.closest("button")!);

    expect(screen.getAllByRole("heading", { name: "Night Swim" }).length).toBeGreaterThan(0);
    expect(screen.getByText("SPLIT Total")).toBeInTheDocument();
    expect(screen.getByText("Signatures")).toBeInTheDocument();
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
    expect(screen.getAllByRole("button", { name: "Counter" }).every(button => !button.hasAttribute("disabled"))).toBe(true);
    expect(screen.queryByRole("button", { name: "Dispute" })).not.toBeInTheDocument();
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
    expect(signButtons).toHaveLength(1);
    signButtons.forEach((button) => expect(button).not.toBeDisabled());
  });
});
