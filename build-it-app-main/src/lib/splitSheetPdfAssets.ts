import regularUrl from "@/assets/pdf/Arimo-Regular.ttf?url";
import boldUrl from "@/assets/pdf/Arimo-Bold.ttf?url";
import signatureUrl from "@/assets/pdf/NothingYouCouldDo.ttf?url";
import badgeUrl from "@/assets/pdf/split-verified-badge.png";
import logoUrl from "@/assets/split-logo.png";
import { renderSplitSheetPdf, type SplitPdfAssets, type SplitPdfOptions } from "@/lib/splitSheetPdf";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { UserProfile } from "@/lib/userProfile";

let assetsPromise: Promise<SplitPdfAssets> | undefined;
async function asset(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The PDF font or logo could not load. Please try the export again.");
  return new Uint8Array(await response.arrayBuffer());
}
function assets() {
  if (!assetsPromise) assetsPromise = (async () => ({
    regular: await asset(regularUrl), bold: await asset(boldUrl), signature: await asset(signatureUrl),
    verifiedBadge: await asset(badgeUrl), logo: await asset(logoUrl),
  }))().catch((error) => { assetsPromise = undefined; throw error; });
  return assetsPromise;
}
export async function renderSplitSheetRecord(document: StoredSplitSheetDocument, viewer: UserProfile, options: SplitPdfOptions = {}) {
  return (await renderSplitSheetPdf(document, viewer, await assets(), undefined, options)).bytes;
}
