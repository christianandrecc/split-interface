import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import type { UserProfile } from "@/lib/userProfile";

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

describe("ContractBuilder", () => {
  it("opens the create split sheet flow with sparse Supabase profile data", () => {
    render(
      <ContractBuilder
        userProfile={makeSparseProfile()}
        onBack={vi.fn()}
        onStoreDocument={async () => true}
        onSendDocument={async () => true}
      />,
    );

    expect(screen.getByRole("heading", { name: "Create a New Work" })).toBeInTheDocument();
    expect(screen.getByText("Chori")).toBeInTheDocument();
  });

  it("opens the builder from the dashboard new split sheet button", async () => {
    render(
      <Dashboard
        userProfile={makeSparseProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /new split sheet/i })[0]);

    expect(screen.getByRole("heading", { name: "Create a New Work" })).toBeInTheDocument();
  });
});
