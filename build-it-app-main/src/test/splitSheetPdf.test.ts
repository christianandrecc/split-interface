import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderSplitSheetPdf, type SplitPdfAssets, type PdfLayoutItem } from "@/lib/splitSheetPdf";
import { buildSplitSheetPdfModel, recordDate } from "@/lib/splitSheetPdfModel";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { makeDocument } from "@/test/fixtures/splitSheet";

const read = (path: string) => new Uint8Array(readFileSync(resolve(path)));
const assets: SplitPdfAssets = {
  regular: read("src/assets/pdf/Arimo-Regular.ttf"), bold: read("src/assets/pdf/Arimo-Bold.ttf"),
  signature: read("src/assets/pdf/NothingYouCouldDo.ttf"), verifiedBadge: read("src/assets/pdf/split-verified-badge.png"), logo: read("src/assets/split-logo.png"),
};
function signedDocument() {
  const doc = makeDocument();
  doc.status = "Verified and Stored"; doc.verifiedAt = doc.updatedAt;
  doc.data.parties[1].legalName = "Maya Rios";
  doc.splitApprovals.forEach((item) => { item.status = "Approved"; });
  doc.splitSignatures = ["creator", "maya-invite"].map((id, index) => ({ id: `sig-${index}`, collaboratorId: id,
    collaboratorName: index ? "Maya" : "Chori", proposalVersionId: doc.currentProposalId, status: "Signed", signedAt: doc.updatedAt, signatureMethod: "SPLIT in-app acknowledgement" }));
  return doc;
}
const text = (items: PdfLayoutItem[]) => items.filter((item) => item.kind === "text").map((item) => item.text).join("\n");

describe("Studio Record PDF", () => {
  it("omits deferred publishing setup from exports without altering composition shares or stored data", async () => {
    const doc = signedDocument();
    Object.assign(doc.data.parties[0], { publishingStatus: "Co-published", publisherName: "Private Publisher", publisherIpi: "00111222333", publisherContact: "publisher@example.test" });
    const before = JSON.stringify(doc);
    const result = await renderSplitSheetPdf(doc, { ...doc.creatorProfile, publisherName: "Live Account Publisher", publishingShare: "50", adminCollectionShare: "10" }, assets);
    expect(text(result.layout)).not.toMatch(/Private Publisher|Live Account Publisher|00111222333|publisher@example.test|PUBLISHING STATUS|PUBLISHING SHARE|ADMIN COLLECTION SHARE/);
    expect(result.model.people.map(person => person.share)).toEqual([60, 40]);
    expect(JSON.stringify(doc)).toBe(before);
  });
  it("can omit export history without removing signatures, shares or changing the signed record", async () => {
    const doc = signedDocument();
    doc.splitSignatures[0].signerLegalName = "Name At Signing";
    const before = JSON.stringify(doc);
    const reduced = await renderSplitSheetPdf(doc, doc.creatorProfile, assets, undefined, { includeAuditTrail: false });
    const full = await renderSplitSheetPdf(doc, doc.creatorProfile, assets);
    expect(reduced.pageCount).toBeLessThan(full.pageCount);
    expect(text(reduced.layout)).not.toMatch(/Document History|Document history on page 0|Version History/);
    expect(text(reduced.layout)).toContain("History omitted from this export");
    expect(text(reduced.layout)).toContain("FINAL VERSION");
    expect(text(reduced.layout)).toContain("Name At Signing");
    expect(text(reduced.layout)).toContain("60%");
    expect(reduced.model.people).toEqual(full.model.people);
    expect(JSON.stringify(doc)).toBe(before);
  });
  it("renders the selected font, actual legal names, metadata, signed state and history", async () => {
    const doc = signedDocument();
    doc.data.songTitle = "SAMPLE - Night Swim";
    doc.data.parties[0].legalName = "Christian Andre Carrera";
    doc.splitSignatures[0].signerLegalName = "Christian Andre Carrera";
    doc.auditTrail.push({ timestamp: doc.verifiedAt, actor: "Maya Rios", action: "Signed and verified the split sheet" });
    doc.auditTrail.push({ timestamp: doc.verifiedAt, actor: "Chori", action: '__splitChatMessages:{"body":"private test message"}' });
    const before = JSON.stringify(doc);
    const result = await renderSplitSheetPdf(doc, doc.creatorProfile, assets, "2026-09-09T22:00:00Z");
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getPageCount()).toBe(result.pageCount);
    expect(text(result.layout)).toContain("FINAL VERSION");
    expect(text(result.layout)).toContain("Christian Andre Carrera (Chori)");
    expect(text(result.layout)).toContain("Work & Record Details");
    expect(text(result.layout)).toContain("Document History");
    expect(text(result.layout)).not.toMatch(/Fully Signed|Locked|private test message|__splitChatMessages|Illustrative/);
    expect(JSON.stringify(doc)).toBe(before);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    for (const pill of result.layout.filter((item) => item.kind === "pill")) {
      const label = result.layout.find((item) => item.kind === "text" && item.page === pill.page && item.text === pill.text && Math.abs(item.y+item.height/2-pill.y-pill.height/2)<1);
      expect(label, pill.text).toBeDefined();
      expect(label.x+label.width/2).toBeCloseTo(pill.x+pill.width/2, 3);
    }
    if (process.env.SPLIT_PDF_QA_OUTPUT) writeFileSync(process.env.SPLIT_PDF_QA_OUTPUT, result.bytes);
  });

  it("does not certify drafts, incomplete signatures, stale signatures or synthetic legacy signatures", async () => {
    const doc = signedDocument();
    doc.status = "Draft";
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile).signed).toBe(false);
    doc.status = "Verified and Stored";
    doc.splitSignatures[1].proposalVersionId = "old-proposal";
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile).signed).toBe(false);
    doc.splitSignatures = [];
    const agreement = documentToAgreement(doc);
    expect(agreement.exportDocument.splitSignatures).toEqual([]);
    expect(buildSplitSheetPdfModel(agreement.document, doc.creatorProfile).signed).toBe(false);
    const result = await renderSplitSheetPdf(doc, doc.creatorProfile, assets);
    expect(result.model.verified).toBe(false);
    expect(text(result.layout)).not.toContain("FINAL VERSION");
    expect(text(result.layout)).not.toContain("Signed. Verified by SPLIT.");
  });

  it("exports stored collaborator PRO/IPI and preserves leading zeroes", async () => {
    const doc = signedDocument();
    Object.assign(doc.data.parties[0], { proAffiliation: "ASCAP", ipiNumber: "00123456789" });
    Object.assign(doc.data.parties[1], { proAffiliation: "Other", customProName: "Independent Writers Society", ipiNumber: "00012345678" });
    const result = await renderSplitSheetPdf(doc, { ...doc.creatorProfile, proAffiliation: "Unrelated current PRO", ipiNumber: "99999999999" }, assets);
    expect(text(result.layout)).toContain("ASCAP");
    expect(text(result.layout)).toContain("00123456789");
    expect(text(result.layout)).toContain("Independent Writers Society");
    expect(text(result.layout)).toContain("00012345678");
    expect(text(result.layout)).not.toContain("Unrelated current PRO");
    expect(text(result.layout)).not.toContain("99999999999");
  });

  it("keeps signing snapshots and does not guess missing legal names", () => {
    const doc = signedDocument();
    doc.splitSignatures[0].signerLegalName = "Name At Signing";
    doc.data.parties[0].legalName = "Changed Later";
    doc.data.parties[1].legalName = "";
    const model = buildSplitSheetPdfModel(doc, doc.creatorProfile);
    expect(model.people[0].legal).toBe("Name At Signing");
    expect(model.people[1].name).toContain("legal name not recorded");
    expect(model.people[1].legal).toBe("");
  });

  it("uses current proposal shares and rejects missing allocations as final", () => {
    const doc = signedDocument();
    doc.data.parties[0].percent = 1;
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile).people[0].share).toBe(60);
    doc.splitProposalVersions[0].allocations.pop();
    expect(buildSplitSheetPdfModel(doc, doc.creatorProfile).signed).toBe(false);
  });

  it("preserves accented names and calendar dates", async () => {
    const doc = signedDocument(); doc.data.songTitle = "Canción del Niño"; doc.data.parties[1].legalName = "María José Núñez";
    const result = await renderSplitSheetPdf(doc, doc.creatorProfile, assets);
    expect(text(result.layout)).toContain("María José Núñez");
    expect(text(result.layout)).toContain("Canción del Niño");
    expect(recordDate("2026-08-19")).toBe("Aug 19, 2026");
  });

  it("paginates many people, proposals, multi-day history and oversized entries without losing text", async () => {
    const doc = signedDocument();
    doc.data.parties = Array.from({ length: 12 }, (_, i) => ({ ...doc.data.parties[1], id: `party-${i}`, legalName: `Collaborator ${i} With A Long Legal Name`, percent: i === 11 ? 8.37 : 8.33, isCurrentUser: i === 0 }));
    doc.data.workNotes = "Detailed work notes and provenance. ".repeat(100);
    doc.splitProposalVersions = Array.from({ length: 8 }, (_, i) => ({ ...doc.splitProposalVersions[0], id: `proposal-${i}`, versionNumber: i+1 }));
    doc.currentProposalId = "proposal-7";
    doc.auditTrail = Array.from({ length: 55 }, (_, i) => ({ timestamp: `2026-08-${i<25 ? "20" : "21"}T13:12:00Z`, actor: "Maya Rios", action: `Event ${i}: ` + (i === 10 ? "Extremely long audit entry. ".repeat(180) : "Created a counter proposal") }));
    const result = await renderSplitSheetPdf(doc, doc.creatorProfile, assets);
    expect(result.pageCount).toBeGreaterThan(8);
    expect(text(result.layout)).toContain("Event 54:");
    expect(text(result.layout)).toContain("Aug 21, 2026");
    const activityText = result.layout.filter((item) => item.kind === "text" && item.text !== "ACTIVITY" && Math.abs(item.x - 124) < .01).map((item) => item.text).join(" ");
    expect(activityText.match(/Extremely long audit entry\./g)?.length).toBe(180);
    expect(text(result.layout)).toContain("Collaborator 11 With A Long Legal Name");
    for (const row of result.layout.filter((item) => item.kind === "row")) {
      const pill = result.layout.find((item) => item.kind === "pill" && item.page === row.page && item.x === 492 && item.y >= row.y && item.y < row.y+row.height);
      expect(pill).toBeDefined();
      expect(pill.y-row.y).toBeCloseTo(row.y+row.height-pill.y-pill.height, 5);
    }
    if (process.env.SPLIT_PDF_QA_STRESS) writeFileSync(process.env.SPLIT_PDF_QA_STRESS, result.bytes);
  }, 20000);
});
