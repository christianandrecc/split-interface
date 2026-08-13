import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import { sumPercents } from "@/components/contract-builder/types";
import type { UserProfile } from "@/lib/userProfile";
import {
  formatSplitSheetAuditTrail,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import { getSplitWorkflowLabel } from "@/lib/splitWorkflow";

type PdfLine = {
  text: string;
  size?: number;
  bold?: boolean;
  gapAfter?: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function cleanText(value: string | number | undefined | null) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function valueOrPending(value: string | number | undefined | null) {
  return cleanText(value) || "Not provided";
}

function formatDate(value: string | undefined) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string | undefined) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function profileName(profile: UserProfile) {
  return valueOrPending(profile.displayName || profile.legalName || profile.emailAddress || profile.username);
}

function escapePdfText(value: string) {
  return cleanText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, size: number) {
  const maxChars = Math.max(24, Math.floor(CONTENT_WIDTH / (size * 0.52)));
  const words = cleanText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function pushSection(lines: PdfLine[], title: string) {
  lines.push({ text: title.toUpperCase(), size: 12, bold: true, gapAfter: 4 });
}

function pushField(lines: PdfLine[], label: string, value: string | number | undefined | null) {
  lines.push({ text: `${label}: ${valueOrPending(value)}`, size: 10 });
}

function buildPdfLines(splitDocument: StoredSplitSheetDocument, viewerProfile: UserProfile): PdfLine[] {
  const data = splitDocument.data;
  const auditItems = formatSplitSheetAuditTrail(splitDocument);
  const total = sumPercents(data.parties);
  const lines: PdfLine[] = [
    { text: "SPLIT SHEET", size: 18, bold: true },
    { text: valueOrPending(data.songTitle || splitDocument.title), size: 24, bold: true, gapAfter: 8 },
    { text: `Document ${valueOrPending(splitDocument.documentNumber)} | ${getSplitWorkflowLabel(splitDocument.status)} | Version ${splitDocument.version}`, size: 10 },
    { text: `Created ${formatDate(splitDocument.createdAt)} | Downloaded ${formatDateTime(new Date().toISOString())}`, size: 10, gapAfter: 14 },
  ];

  pushSection(lines, "Record Summary");
  pushField(lines, "Creator", profileName(splitDocument.creatorProfile));
  pushField(lines, "Downloaded by", profileName(viewerProfile));
  pushField(lines, "Verified", splitDocument.verifiedAt ? formatDateTime(splitDocument.verifiedAt) : "");
  pushField(lines, "Stored", splitDocument.storedAt ? formatDateTime(splitDocument.storedAt) : "");
  lines.push({ text: "", gapAfter: 8 });

  pushSection(lines, "Work Info");
  pushField(lines, "Title", data.songTitle);
  pushField(lines, "Alternate title", data.alternateTitles);
  pushField(lines, "Artist / project", data.artistProjectName || data.recordingArtist);
  pushField(lines, "Creation date", formatDate(data.creationDate));
  pushField(lines, "Notes", data.workNotes);
  lines.push({ text: "", gapAfter: 8 });

  pushSection(lines, "Ownership Splits");
  pushField(lines, "Total", `${total}%`);
  data.parties.forEach((party) => {
    const name = splitSheetPartyDisplayName(splitDocument, party);
    const role = party.role || "Collaborator";
    const contributions = party.contributionCategories.length ? party.contributionCategories.join(", ") : "Pending";
    lines.push({ text: `${name} | ${role} | ${party.percent}% | ${contributions}`, size: 10 });
  });
  lines.push({ text: "", gapAfter: 8 });

  if (splitDocument.splitSignatures.length > 0) {
    pushSection(lines, "Signatures");
    splitDocument.splitSignatures.forEach((signature) => {
      const name = splitSheetParticipantDisplayName(splitDocument, signature.collaboratorId, signature.collaboratorName);
      lines.push({
        text: `${name} | ${signature.status} | ${formatDateTime(signature.signedAt)} | ${valueOrPending(signature.signatureMethod || "SPLIT in-app signature")}`,
        size: 10,
      });
    });
    lines.push({ text: "", gapAfter: 8 });
  }

  pushSection(lines, "Audit Trail");
  if (auditItems.length === 0) {
    lines.push({ text: "No public audit events recorded.", size: 10 });
  } else {
    auditItems.forEach((item) => {
      lines.push({ text: `${item.date} | ${item.actor} | ${item.event}`, size: 10 });
    });
  }

  return lines;
}

function paginateLines(lines: PdfLine[]) {
  const pages: PdfLine[][] = [];
  let page: PdfLine[] = [];
  let y = PAGE_HEIGHT - MARGIN;

  for (const line of lines) {
    const size = line.size ?? 10;
    const wrapped = wrapText(line.text, size);

    for (const [index, text] of wrapped.entries()) {
      const item: PdfLine = { ...line, text };
      const lineHeight = size + 5 + (index === wrapped.length - 1 ? line.gapAfter ?? 0 : 0);

      if (y - lineHeight < MARGIN) {
        pages.push(page);
        page = [];
        y = PAGE_HEIGHT - MARGIN;
      }

      page.push(item);
      y -= lineHeight;
    }
  }

  if (page.length > 0) pages.push(page);
  return pages;
}

function buildPdfString(pages: PdfLine[][]) {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let nextObjectId = 5;

  pages.forEach((page) => {
    const pageObjectId = nextObjectId++;
    const streamObjectId = nextObjectId++;
    pageObjectIds.push(pageObjectId);

    let y = PAGE_HEIGHT - MARGIN;
    const streamLines = ["BT"];

    page.forEach((line) => {
      const size = line.size ?? 10;
      const font = line.bold ? "F2" : "F1";
      streamLines.push(`/${font} ${size} Tf`);
      streamLines.push(`1 0 0 1 ${MARGIN} ${y} Tm (${escapePdfText(line.text)}) Tj`);
      y -= size + 5 + (line.gapAfter ?? 0);
    });

    streamLines.push("ET");
    const stream = streamLines.join("\n");
    objects[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjectId} 0 R >>`;
    objects[streamObjectId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function buildSplitSheetDownloadFilename(splitDocument: StoredSplitSheetDocument) {
  const title = cleanText(splitDocument.data.songTitle || splitDocument.title || "split-sheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "split-sheet";

  return `${title}-split-sheet.pdf`;
}

export function buildSplitSheetRecordPdf(splitDocument: StoredSplitSheetDocument, viewerProfile: UserProfile) {
  const pages = paginateLines(buildPdfLines(splitDocument, viewerProfile));
  return new Blob([buildPdfString(pages)], { type: "application/pdf" });
}

export function downloadSplitSheetRecord(splitDocument: StoredSplitSheetDocument, viewerProfile: UserProfile) {
  const browserDocument = globalThis.document;
  const browserUrl = globalThis.URL;

  if (!browserDocument || !browserUrl?.createObjectURL) return;

  const url = browserUrl.createObjectURL(buildSplitSheetRecordPdf(splitDocument, viewerProfile));
  const anchor = browserDocument.createElement("a");
  anchor.href = url;
  anchor.download = buildSplitSheetDownloadFilename(splitDocument);
  anchor.rel = "noopener";
  browserDocument.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => browserUrl.revokeObjectURL(url), 1000);
}
