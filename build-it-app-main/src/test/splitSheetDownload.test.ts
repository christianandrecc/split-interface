import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSplitSheetDownloadFilename, buildSplitSheetRecordPdf, downloadSplitSheetRecord } from "@/lib/splitSheetDownload";
import { makeDocument } from "@/test/fixtures/splitSheet";
const mocks = vi.hoisted(() => ({ load: vi.fn(), render: vi.fn() }));
vi.mock("@/lib/splitSheetStorage", () => ({ loadSplitSheetDocumentForExport: mocks.load }));
vi.mock("@/lib/splitSheetPdfAssets", () => ({ renderSplitSheetRecord: mocks.render }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("split sheet download integration", () => {
  it("uses a readable PDF filename", () => {
    const doc = makeDocument(); doc.data.songTitle = "Soy El Niño";
    expect(buildSplitSheetDownloadFilename(doc)).toBe("soy-el-nino-split-sheet.pdf");
  });
  it("returns a PDF blob from the selected renderer", async () => {
    const doc = makeDocument(); mocks.render.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const blob = await buildSplitSheetRecordPdf(doc, doc.creatorProfile);
    expect(blob.type).toBe("application/pdf"); expect(blob.size).toBeGreaterThan(0);
    expect(mocks.render).toHaveBeenCalledWith(doc, doc.creatorProfile);
  });
  it("exports the refreshed record, downloads once and releases its URL", async () => {
    vi.useFakeTimers();
    const doc = makeDocument(), fresh = { ...doc, version: 9 };
    mocks.load.mockResolvedValue(fresh); mocks.render.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const createObjectURL = vi.fn(() => "blob:test"), revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await downloadSplitSheetRecord(doc, doc.creatorProfile);
    expect(mocks.render).toHaveBeenCalledWith(fresh, doc.creatorProfile);
    expect(click).toHaveBeenCalledOnce(); expect(document.querySelector("a[download]")).toBeNull();
    vi.runAllTimers(); expect(revokeObjectURL).toHaveBeenCalledWith("blob:test"); vi.useRealTimers();
  });
  it("does not download stale data after a failed server read", async () => {
    const doc = makeDocument(); vi.stubGlobal("URL", { createObjectURL: vi.fn() });
    mocks.load.mockRejectedValue(new Error("Unavailable"));
    await expect(downloadSplitSheetRecord(doc, doc.creatorProfile)).rejects.toThrow("Unavailable");
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
