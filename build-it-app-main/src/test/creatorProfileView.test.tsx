import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "@/components/Dashboard";
import type { UserProfile } from "@/lib/userProfile";

function makeSupabaseProfile(): UserProfile {
  return {
    splitId: "",
    username: "chori",
    displayName: "Chori",
    profileImageUrl: "",
    roleTags: "Artist, Producer",
    socialInstagram: "",
    socialTikTok: "",
    socialX: "",
    socialWebsite: "",
    profileLocation: "",
    profileVisibility: "Collaborators only",
    legalName: "Christian Carrera",
    legalFirstName: "Christian",
    legalMiddleName: "",
    legalLastName: "Carrera",
    pkaNames: "Chori",
    phoneCountryCode: "+1",
    phoneNumber: "216-857-8164",
    emailAddress: "chori@example.com",
    legalAddress: "",
    addressLine: "123 Music Row",
    zipCode: "10001",
    city: "New York",
    state: "NY",
    country: "United States",
    mlcNumber: "",
    proAffiliation: "ASCAP",
    ipiNumber: "123456789",
    customProName: "",
    publishingStatus: "Self-published",
    publisherName: "",
    publisherIpi: "",
    publisherPro: "",
    publishingShare: "100",
    adminCompanyName: "",
    adminIpi: "",
    adminCollectionShare: "",
    publisherContact: "",
    termsAcceptedAt: "2026-08-13T14:00:00.000Z",
    termsVersion: "split-terms-2026-08-12",
    privacyAcknowledgedAt: "2026-08-13T14:00:00.000Z",
    privacyPolicyVersion: "split-privacy-2026-08-12",
  };
}

describe("CreatorProfileView", () => {
  it("shows the signed-in Supabase profile from the dashboard profile shortcut", () => {
    render(
      <Dashboard
        userProfile={makeSupabaseProfile()}
        onUpdateProfile={async () => undefined}
        onOpenAccountCreation={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /your profile/i }));

    expect(screen.getByRole("heading", { name: "Chori" })).toBeInTheDocument();
    expect(screen.getAllByText("@chori").length).toBeGreaterThan(0);
    expect(screen.getByText("Artist")).toBeInTheDocument();
    expect(screen.getByText("Producer")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Account details" })).not.toBeInTheDocument();
    expect(screen.queryByText("chori@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+1 216-857-8164")).not.toBeInTheDocument();
    expect(screen.queryByText("Christian Carrera")).not.toBeInTheDocument();
    expect(screen.queryByText("ASCAP")).not.toBeInTheDocument();
    expect(screen.getByText("Credits")).toBeInTheDocument();
    expect(screen.getByText("No verified credits yet")).toBeInTheDocument();
  });
});
