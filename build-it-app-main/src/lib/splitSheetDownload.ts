import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { UserProfile } from "@/lib/userProfile";
import { loadSplitSheetDocumentForExport } from "@/lib/splitSheetStorage";

export function buildSplitSheetDownloadFilename(document: StoredSplitSheetDocument) {
  const title = (document.data.songTitle || document.title || "split-sheet")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "split-sheet";
  return `${title}-split-sheet.pdf`;
}

export async function buildSplitSheetRecordPdf(document: StoredSplitSheetDocument, viewer: UserProfile) {
  // Load the renderer and bundled assets only when an export is requested.
  const { renderSplitSheetRecord } = await import("@/lib/splitSheetPdfAssets");
  const bytes = await renderSplitSheetRecord(document, viewer);
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

export async function downloadSplitSheetRecord(document: StoredSplitSheetDocument, viewer: UserProfile) {
  if (!globalThis.document || !globalThis.URL?.createObjectURL) throw new Error("PDF downloads are not supported in this browser.");
  const source = await loadSplitSheetDocumentForExport(document);
  const blob = await buildSplitSheetRecordPdf(source, viewer);
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = buildSplitSheetDownloadFilename(source);
    anchor.rel = "noopener";
    globalThis.document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
