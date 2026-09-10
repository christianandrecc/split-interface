import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import StepParties from "@/components/contract-builder/StepParties";
import { DEFAULT_CONTRACT, makeParty, type ContractData } from "@/components/contract-builder/types";
import type { CollaboratorSuggestion } from "@/lib/collaboratorSuggestions";
import type { UserProfile } from "@/lib/userProfile";

vi.mock("@/lib/globalSearch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/globalSearch")>()),
  searchPublicProfiles: vi.fn(async () => []),
}));

function makeSparseProfile() {
  return {
    username: "chori",
    displayName: "Chori",
    emailAddress: "chori@example.com",
    pkaNames: undefined,
    phoneCountryCode: "+1",
    phoneNumber: "",
    publishingStatus: undefined,
  } as unknown as UserProfile;
}

function StepPartiesHarness() {
  const [data, setData] = useState<ContractData>({
    ...DEFAULT_CONTRACT,
    splitType: "Custom",
    parties: [
      makeParty({
        id: "creator-party",
        isCurrentUser: true,
        professionalName: "Chori",
        percent: 55,
      }),
      makeParty({
        id: "collaborator-party",
        inviteValue: "@adriano",
        inviteMethod: "username",
        role: "Contributor",
        percent: 0,
      }),
    ],
  });

  return <StepParties data={data} onChange={(patch) => setData((current) => ({ ...current, ...patch }))} />;
}

function StepPartiesSearchHarness() {
  const [data, setData] = useState<ContractData>({
    ...DEFAULT_CONTRACT,
    splitType: "Custom",
    parties: [
      makeParty({
        id: "creator-party",
        isCurrentUser: true,
        professionalName: "Chori",
        percent: 50,
      }),
      makeParty({
        id: "collaborator-party",
        inviteMethod: "username",
        role: "Contributor",
        percent: 50,
      }),
    ],
  });
  const recentCollaborators: CollaboratorSuggestion[] = [
    {
      type: "profile",
      userId: "user-adriano",
      username: "adriano",
      displayName: "Adriano Rivera",
      roleTags: "Producer, Writer",
      profileImageUrl: "",
      profileLocation: "New York, NY",
      source: "worked-with",
      interactionCount: 3,
      lastInteractedAt: "2026-08-20T17:11:00.000Z",
    },
  ];

  return (
    <StepParties
      data={data}
      onChange={(patch) => setData((current) => ({ ...current, ...patch }))}
      recentCollaborators={recentCollaborators}
    />
  );
}

describe("ContractBuilder", () => {
  it("opens the create split sheet flow with sparse Supabase profile data", () => {
    render(
      <ContractBuilder
        userProfile={makeSparseProfile()}
        onBack={vi.fn()}
        onStoreDocument={async (document) => ({ document, persisted: true })}
        onSendDocument={async (document) => ({ document, persisted: true })}
      />,
    );

    expect(screen.getByRole("heading", { name: "Create a New Work" })).toBeInTheDocument();
    expect(screen.getByText("Chori")).toBeInTheDocument();
  });

  it("shows the private Elephant assistant in the create split flow", () => {
    render(
      <ContractBuilder
        userProfile={makeSparseProfile()}
        onBack={vi.fn()}
        onStoreDocument={async (document) => ({ document, persisted: true })}
        onSendDocument={async (document) => ({ document, persisted: true })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Elephant creation assistant" }));

    expect(screen.getByText("Only you can see this")).toBeInTheDocument();
    expect(screen.getByText("Help me fill this")).toBeInTheDocument();
  });

  it("opens the builder from the dashboard new split sheet button", async () => {
    render(
      <Dashboard
        userProfile={makeSparseProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /new split/i })[0]);

    expect(screen.getByRole("heading", { name: "Create a New Work" })).toBeInTheDocument();
  });

  it("returns to the dashboard when the SPLIT logo is clicked", () => {
    render(
      <Dashboard
        userProfile={makeSparseProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(screen.getByRole("heading", { name: "No messages yet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go to Dashboard" }));
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });

  it("lets split share inputs stay blank while editing before entering a new value", () => {
    render(<StepPartiesHarness />);

    expect(screen.queryByText("Contribution *")).not.toBeInTheDocument();
    expect(screen.queryByText(/contribution selection/i)).not.toBeInTheDocument();

    const collaboratorShare = screen.getByRole("spinbutton", { name: "Split Share for @adriano" }) as HTMLInputElement;

    expect(collaboratorShare.value).toBe("0");

    fireEvent.change(collaboratorShare, { target: { value: "" } });
    expect(collaboratorShare.value).toBe("");

    fireEvent.change(collaboratorShare, { target: { value: "45" } });
    expect(collaboratorShare.value).toBe("45");
    expect(screen.getByText("Ready to continue")).toBeInTheDocument();
  });

  it("suggests recent collaborators and fills the invite with their username", () => {
    render(<StepPartiesSearchHarness />);

    const inviteInput = screen.getByPlaceholderText("Search @username, email, or phone") as HTMLInputElement;

    fireEvent.focus(inviteInput);
    expect(screen.getByText("Recent collaborators")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("option", { name: /Adriano Rivera/i }));

    expect(inviteInput.value).toBe("@adriano");
    expect(screen.getByText("Ready to continue")).toBeInTheDocument();
  });
});
