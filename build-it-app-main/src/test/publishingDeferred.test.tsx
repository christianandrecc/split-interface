import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "@/components/ProfilePage";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import { TooltipProvider } from "@/components/ui/tooltip";
import { makeDocument } from "@/test/fixtures/splitSheet";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";

describe("publishing deferred", () => {
  it.each(["Self-published", "Co-published", "Unknown"])("hides publishing setup while preserving legacy %s data on profile saves", async publishingStatus => {
    const publishing = { publishingStatus, publisherName: "Existing Publisher", publisherIpi: "00123", publisherPro: "BMI", publishingShare: "50", adminCompanyName: "Existing Admin", adminIpi: "00456", adminCollectionShare: "10", publisherContact: "publisher@example.test" };
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);
    render(<TooltipProvider><ProfilePage userProfile={{ ...makeDocument().creatorProfile, ...publishing }} onUpdateProfile={onUpdateProfile} /></TooltipProvider>);
    expect(screen.queryByText("Private Publishing Routing")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Publishing|Publisher|Admin Company|Admin Collection/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/PRO Affiliation/)).toBeInTheDocument();
    expect(screen.getByLabelText(/IPI \/ CAE Number/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Updated Artist" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(onUpdateProfile).toHaveBeenCalledOnce());
    expect(onUpdateProfile.mock.calls[0][0]).toMatchObject({ ...publishing, displayName: "Updated Artist" });
  });

  it("creates a composition-only draft even when the account has publishing metadata", async () => {
    const onStoreDocument = vi.fn(async (document: StoredSplitSheetDocument) => ({ document, persisted: true }));
    render(<ContractBuilder userProfile={{ ...makeDocument().creatorProfile, publishingStatus: "Co-published", publisherName: "Existing Publisher", publishingShare: "50", adminCompanyName: "Existing Admin", adminCollectionShare: "10" }} onBack={vi.fn()} onSendDocument={vi.fn()} onStoreDocument={onStoreDocument} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Work title"), { target: { value: "Composition only" } });
    for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(screen.queryByText("Existing Publisher")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save To Drafts" }));
    await waitFor(() => expect(onStoreDocument).toHaveBeenCalledOnce());
    const data = onStoreDocument.mock.calls[0][0].data;
    expect(data.parties[0]).toMatchObject({ percent: 100, publisherName: "", publisherIpi: "", publisherPro: "", publisherContact: "" });
    expect(data.authorizePublisherAdmin).toBe(false);
    expect(data.sendToPublisherAdmin).toBe(false);
  });
});
