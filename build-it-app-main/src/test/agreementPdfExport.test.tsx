import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AgreementDetail from "@/components/AgreementDetail";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";
const mocks = vi.hoisted(() => ({ download: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/splitSheetDownload", () => ({ downloadSplitSheetRecord: mocks.download }));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("PDF export button", () => {
  it("uses the unmodified source and stays disabled while exporting", async () => {
    const doc = makeDocument(); doc.status = "Verified and Stored";
    let finish: () => void;
    mocks.download.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} />);
    const button = screen.getByRole("button", { name: "Download SPLIT" });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.download).toHaveBeenCalledOnce(); expect(mocks.download).toHaveBeenCalledWith(doc, doc.creatorProfile);
    expect(button).toBeDisabled(); expect(button).toHaveAttribute("aria-busy", "true");
    finish(); await waitFor(() => expect(button).toBeEnabled());
  });
  it("shows export failures and allows a retry", async () => {
    const doc = makeDocument(); doc.status = "Draft";
    mocks.download.mockRejectedValue(new Error("Refresh this record"));
    render(<AgreementDetail agreement={documentToAgreement(doc)} viewerProfile={doc.creatorProfile} />);
    const button = screen.getByRole("button", { name: "Download draft" });
    fireEvent.click(button);
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Refresh this record"));
    expect(button).toBeEnabled();
  });
});
