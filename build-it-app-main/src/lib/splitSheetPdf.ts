import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { buildSplitSheetPdfModel, recordDate, recordText, supportingFields, validRecordDate, type PdfPerson, type SplitSheetPdfModel } from "@/lib/splitSheetPdfModel";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { UserProfile } from "@/lib/userProfile";

export type SplitPdfAssets = { regular: Uint8Array; bold: Uint8Array; signature: Uint8Array; verifiedBadge: Uint8Array; logo: Uint8Array };
export type PdfLayoutItem = { page: number; kind: "text" | "pill" | "row"; text: string; x: number; y: number; width: number; height: number };
const C = { navy: "#0C2945", ink: "#162E45", amber: "#FAA510", muted: "#607187", line: "#DCE3EB", pale: "#F5F7FA", mint: "#EDF8F2", green: "#167348", white: "#FFFFFF", sand: "#FCEBD5" };
type Color = string;
const W = 612, H = 792, L = 44, R = 568, CW = R - L, END = 688;
const color = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const NOTICE = "This export reproduces signing activity recorded in SPLIT, not proof of copyright ownership or the accuracy of contributor-supplied information. Contributors remain responsible for their identities, shares and rights. Contains personal information; share only with authorized recipients.";
type Face = ReturnType<typeof fontkit.create>;

class RecordPdf {
  page: PDFPage;
  layout: PdfLayoutItem[] = [];
  fonts: Record<string, PDFFont> = {};
  faces: Record<string, Face> = {};
  badgeImage: Awaited<ReturnType<PDFDocument["embedPng"]>>;
  logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>>;
  summaryPages: number[] = [];
  historyPage = 0;

  constructor(readonly pdf: PDFDocument, readonly model: SplitSheetPdfModel) {}

  async init(assets: SplitPdfAssets) {
    this.pdf.registerFontkit(fontkit);
    for (const key of ["regular", "bold", "signature"] as const) {
      this.faces[key] = fontkit.create(assets[key]);
      // Keep composite glyph outlines intact in the static Arimo instances.
      this.fonts[key] = await this.pdf.embedFont(assets[key], { subset: key === "signature" });
    }
    this.badgeImage = await this.pdf.embedPng(assets.verifiedBadge);
    this.logoImage = await this.pdf.embedPng(assets.logo);
  }

  width(text: string, size = 10, font = "regular") { return this.fonts[font].widthOfTextAtSize(text, size); }

  ink(text: string, size: number, font: string) {
    const run = this.faces[font].layout(text);
    let cursor = 0, left = Infinity, right = -Infinity, low = Infinity, high = -Infinity;
    run.glyphs.forEach((glyph, index) => {
      if (glyph.id === 0 && recordText(text)) throw new Error("A character in this record is not supported by the PDF fonts. Please contact SPLIT support; the record has not been altered.");
      const pos = run.positions[index], b = glyph.bbox;
      if (b.maxX > b.minX) {
        left = Math.min(left, cursor + pos.xOffset + b.minX); right = Math.max(right, cursor + pos.xOffset + b.maxX);
        low = Math.min(low, pos.yOffset + b.minY); high = Math.max(high, pos.yOffset + b.maxY);
      }
      cursor += pos.xAdvance;
    });
    const k = size / this.faces[font].unitsPerEm;
    return Number.isFinite(left) ? { left: left * k, right: right * k, low: low * k, high: high * k } : { left: 0, right: 0, low: 0, high: 0 };
  }

  text(value: string, x: number, y: number, size = 10, font = "regular", fill: Color = C.ink, align: "left" | "center" | "right" = "left") {
    const text = recordText(value);
    if (!text) return;
    const b = this.ink(text, size, font);
    const origin = x - (align === "center" ? (b.left + b.right) / 2 : align === "right" ? b.right : b.left);
    const baseline = H - y - (b.low + b.high) / 2;
    this.page.drawText(text, { x: origin, y: baseline, size, font: this.fonts[font], color: color(fill) });
    this.layout.push({ page: this.pdf.getPages().indexOf(this.page) + 1, kind: "text", text, x: origin + b.left, y: H - baseline - b.high, width: b.right - b.left, height: b.high - b.low });
  }

  lines(value: string, width: number, size = 10, font = "regular") {
    const lines: string[] = [];
    let line = "";
    for (const word of recordText(value).split(/\s+/).filter(Boolean)) {
      if (this.width(line ? `${line} ${word}` : word, size, font) <= width) { line = line ? `${line} ${word}` : word; continue; }
      if (line) { lines.push(line); line = ""; }
      for (const char of word) {
        if (this.width(line + char, size, font) > width && line) { lines.push(line); line = ""; }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ["Not recorded"];
  }

  paragraph(lines: string[], x: number, y: number, size = 10, font = "regular", fill: Color = C.ink, leading = size + 3, align: "left" | "center" = "left") {
    lines.forEach((line, i) => this.text(line, x, y + i * leading + leading / 2, size, font, fill, align));
    return y + lines.length * leading;
  }

  short(value: string, width: number, size = 10, font = "regular") {
    if (this.width(value, size, font) <= width) return value;
    let text = value;
    while (text && this.width(`${text}...`, size, font) > width) text = Array.from(text).slice(0, -1).join("");
    return `${text}...`;
  }

  rect(x: number, y: number, width: number, height: number, fill: Color = C.white, radius = 0, stroke?: string) {
    if (!radius) { this.page.drawRectangle({ x, y: H - y - height, width, height, color: color(fill), ...(stroke ? { borderColor: color(stroke), borderWidth: .7 } : {}) }); return; }
    const r = Math.min(radius, width / 2, height / 2);
    this.page.drawSvgPath(`M ${r} 0 H ${width-r} Q ${width} 0 ${width} ${r} V ${height-r} Q ${width} ${height} ${width-r} ${height} H ${r} Q 0 ${height} 0 ${height-r} V ${r} Q 0 0 ${r} 0 Z`, {
      x, y: H-y, color: color(fill), ...(stroke ? { borderColor: color(stroke), borderWidth: .7 } : {}),
    });
  }

  rule(y: number, x = L, width = CW, fill: Color = C.line, thickness = .7) {
    this.page.drawLine({ start: { x, y: H-y }, end: { x: x+width, y: H-y }, thickness, color: color(fill) });
  }

  pill(value: string, x: number, y: number, width: number, height = 18, fill: Color = C.pale, ink: Color = C.navy, size = 8, font = "bold") {
    this.rect(x, y, width, height, fill, height / 2);
    this.text(value, x + width / 2, y + height / 2, Math.min(size, size * (width-12) / Math.max(1, this.width(value, size, font))), font, ink, "center");
    this.layout.push({ page: this.pdf.getPages().indexOf(this.page) + 1, kind: "pill", text: value, x, y, width, height });
  }

  id(x: number, y: number, right = false) {
    const value = this.short(this.model.documentId, 254, 7.5), width = this.width(value, 7.5) + 14;
    this.pill(value, right ? x-width : x, y-7, width, 14, C.sand, C.navy, 7.5, "regular");
  }

  header(title: string, section: string, compact = false) {
    this.page = this.pdf.addPage([W, H]);
    if (compact) {
      this.text(title, L, 46, 19, "bold");
      this.text(section.toUpperCase(), L, 72, 7.5, "bold", C.muted);
      this.id(R, 72, true); this.rule(90, L, CW, C.amber, 2);
      return 110;
    }
    const image = this.model.verified ? this.badgeImage : this.logoImage;
    const dims = image.scaleToFit(74, 74);
    this.page.drawImage(image, { x: 38 + (74-dims.width)/2, y: H-17-dims.height, ...dims });
    if (section === "Finalized split sheet" || section === "Split sheet record") {
      this.pill(this.model.signed ? "Signed" : "Not signed", 478, 40, 90, 28, this.model.signed ? C.mint : C.pale, this.model.signed ? C.green : C.muted, 9);
    } else this.text(this.model.signed ? "FINAL VERSION" : "NOT FINAL", R, 54, 8, "bold", C.muted, "right");
    this.text(section.toUpperCase(), L, 98, 8, "bold", C.muted);
    const isSummary = section.toLowerCase().includes("split sheet");
    const size = isSummary ? 30 : 28;
    this.text(this.short(title, CW, size, "bold"), L, 131, size, "bold");
    if (isSummary) {
      this.id(L, 162); this.text(this.model.signed ? "FINAL VERSION" : "NOT FINAL", R, 162, 9, "bold", C.muted, "right");
    } else {
      this.text(this.short(this.model.title, 290, 11, "bold"), L, 162, 11, "bold"); this.id(R, 162, true);
    }
    this.rule(184, L, CW, C.amber, 2);
    return 204;
  }

  ownershipHeader(y: number) {
    this.rect(L, y, CW, 28, C.navy);
    this.text("COLLABORATOR", 74, y+14, 8, "bold", C.white);
    this.text("SHARE", 394, y+14, 8, "bold", C.white, "center");
    this.text("STATUS", 506, y+14, 8, "bold", C.white, "center");
  }

  summary() {
    this.header(this.model.title, this.model.signed ? "Finalized split sheet" : "Split sheet record");
    this.summaryPages.push(this.pdf.getPageCount()-1);
    this.rect(L, 202, CW, 80, C.white, 6, C.line);
    const col = CW/3;
    [1, 2].forEach((i) => this.page.drawLine({ start: { x: L+col*i, y: H-202 }, end: { x: L+col*i, y: H-282 }, color: color(C.line), thickness: .7 }));
    const metrics = [
      ["SPLIT TOTAL", `${this.model.total}%`, this.model.total === 100 ? "Complete allocation" : "Incomplete allocation", C.navy, 26],
      ["SIGNATURES", `${this.model.signedCount} / ${this.model.people.length}`, this.model.signed ? "All collaborators signed" : "Recorded acknowledgements", C.green, 26],
      [this.model.signed ? "FINALIZED" : "LAST UPDATED", recordDate(this.model.finalizedAt || this.model.document.updatedAt), this.model.signed ? "Signed record" : "Not a final signed record", C.navy, 17],
    ] as const;
    metrics.forEach(([label, value, caption, fill, size], i) => {
      const cx = L+col*(i+.5);
      this.text(label, cx, 218, 8, "bold", C.muted, "center"); this.text(value, cx, 245, size, "bold", fill, "center");
      this.text(caption, cx, 267, 8, "regular", C.muted, "center");
    });
    this.text("Ownership", L, 311, 17, "bold"); this.ownershipHeader(336);
    let y = 364;
    for (const [i, person] of this.model.people.entries()) {
      const name = this.lines(person.legal || "Legal name not recorded", 270, 11.5, "bold");
      const role = this.lines([person.artist && `(${person.artist})`, person.role].filter(Boolean).join(" / "), 270, 9);
      const chunks = [...name.map((text) => ({ text, bold: true })), ...role.map((text) => ({ text, bold: false }))];
      while (chunks.length) {
        if (y+60 > END) { y = this.header("Ownership", "Continued", true); this.ownershipHeader(y); y += 28; }
        const max = Math.floor((END-y-18)/14);
        const part = chunks.splice(0, Math.max(1, max));
        const height = Math.max(60, part.length*14+18), accent = i % 2 ? C.amber : C.navy;
        this.rect(L, y, CW, height, i % 2 ? C.pale : C.white);
        this.page.drawCircle({ x: 61, y: H-y-height/2, size: 3, color: color(accent) });
        part.forEach((line, j) => this.text(line.text, 74, y+height/2+(j-(part.length-1)/2)*14, line.bold ? 11.5 : 9, line.bold ? "bold" : "regular", line.bold ? C.ink : C.muted));
        this.text(`${person.share}%`, 394, y+height/2, 21, "bold", accent, "center");
        this.text(person.approved ? "Approved" : "Not recorded", 506, y+height/2-9, 8.5, "bold", person.approved ? C.green : C.muted, "center");
        this.text(person.signature ? "Signed" : "Not signed", 506, y+height/2+10, 9, "regular", person.signature ? C.green : C.muted, "center");
        this.rule(y+height); y += height;
      }
    }
    if (this.model.total > 0) {
      let x = L;
      this.model.people.forEach((person, i) => { const width = CW * person.share / this.model.total; this.rect(x, y, width, 5, i%2 ? C.amber : C.navy); x += width; });
    }
    y += 28;
    for (let i = 0; i < this.model.people.length; i += 2) {
      const pair = this.model.people.slice(i, i+2);
      const signatureSize = Math.min(24, ...pair.filter((p) => p.signature && p.legal).map((p) => 24*230 / this.width(p.legal, 24, "signature")));
      const height = Math.max(...pair.map((p) => this.lines(p.name, 246, 9.5, "bold").length))*12+135;
      if (y+height > 659) y = this.header("Signatures", "Recorded acknowledgements / Continued", true);
      pair.forEach((person, j) => this.signature(person, L+j*274, y, i+j+1, signatureSize));
      y += height+12;
    }
    this.summaryPages.push(this.pdf.getPageCount()-1);
  }

  signature(person: PdfPerson, x: number, y: number, index: number, signatureSize: number) {
    const cx = x+125;
    this.text(`SIGNATURE ${String(index).padStart(2, "0")}`, cx, y+12, 8, "bold", C.muted, "center");
    const useScript = Boolean(person.signature && person.legal);
    // Typeset a recorded acknowledgement only; never manufacture a signature from status.
    if (useScript) {
      const face = this.faces.signature;
      const supported = Array.from(person.legal).every((char) => face.hasGlyphForCodePoint(char.codePointAt(0)));
      const font = supported ? "signature" : "regular";
      const size = Math.min(signatureSize, 24*230 / this.width(person.legal, 24, font));
      if (size >= 11) this.text(person.legal, cx, y+59, size, font, C.navy, "center");
      else this.paragraph(this.lines(person.legal, 238, 11, font).slice(0, 3), cx, y+35, 11, font, C.navy, 14, "center");
    } else this.text(person.signature ? "Name not recorded at signing" : "Not signed", cx, y+59, 10, "regular", C.muted, "center");
    this.rule(y+91, x, 250);
    const end = this.paragraph(this.lines(person.name, 246, 9.5, "bold"), cx, y+101, 9.5, "bold", C.ink, 12, "center");
    this.text(person.signature ? `${recordDate(person.signature.signedAt, true)} UTC` : "No recorded signing time", cx, end+10, 8, "regular", C.muted, "center");
    this.text(this.short(person.signature?.signatureMethod || "Awaiting acknowledgement", 246, 7), cx, end+24, 7, "regular", C.muted, "center");
  }

  details() {
    let y = this.header("Work & Record Details", "Supporting record");
    let sectionLabel = "";
    const next = () => {
      y = this.header("Work & Record Details", "Supporting record / Continued", true);
      if (sectionLabel) y = this.paragraph(this.lines(`${sectionLabel} (continued)`, CW, 12, "bold"), L, y, 12, "bold", C.ink, 16)+12;
    };
    const heading = (title: string) => {
      sectionLabel = "";
      const lines = this.lines(title, CW, 14, "bold");
      if (y+lines.length*18+64 > END) next();
      y = this.paragraph(lines, L, y, 14, "bold", C.ink, 18)+14;
      sectionLabel = title;
    };
    const drawVersions = () => {
      heading("Version history");
      const versions = [...this.model.document.splitProposalVersions].sort((a,b) => a.versionNumber-b.versionNumber);
      for (const version of versions) {
        const active = version.id === this.model.proposal?.id;
        const lines = this.lines([
          this.model.resolveActor(version.proposedBy), `${recordDate(version.createdAt, true)} UTC`,
          version.notes || "No proposal notes recorded",
          ...version.allocations.map((allocation) => {
            const person = this.model.people.find((p) => p.party.id === allocation.partyId);
            return `${person?.name || allocation.name}: ${allocation.percentage}%${allocation.notes ? ` / ${allocation.notes}` : ""}`;
          }),
        ].join(" | "), 354, 9);
        let continued = false;
        while (lines.length) {
          if (y+58 > END) next();
          const part = lines.splice(0, Math.max(1, Math.floor((END-y-20)/12)));
          const height = Math.max(54, part.length*12+20);
          this.rect(L, y, CW, height, active ? C.mint : C.white, 6, C.line);
          this.pill(`v${version.versionNumber}`, 56, y+height/2-13, 34, 26, active ? C.green : C.navy, C.white, 9);
          this.paragraph(part, 104, y+10, 9, "regular", C.ink, 12);
          this.pill(continued ? "Continued" : active ? (this.model.signed ? "Final version" : "Current") : "Earlier", 474, y+height/2-9, 80, 18, active ? "#D8EEDF" : C.pale, active ? C.green : C.muted, 7.5);
          y += height+10; continued = true;
        }
      }
      if (!versions.length) { this.text("No proposal versions recorded.", L, y+8, 9, "regular", C.muted); y += 24; }
      y += 14;
    };
    for (const [groupIndex, group] of supportingFields(this.model).entries()) {
      heading(group.title);
      for (let i = 0; i < group.fields.length; i += 2) {
        const pair = group.fields.slice(i, i+2).map(([label, value]) => ({ label, lines: this.lines(value, 226, 10, "bold") }));
        while (pair.some((cell) => cell.lines.length)) {
          if (y+62 > END) next();
          const maxLines = Math.max(1, Math.floor((END-y-34)/13));
          const cells = pair.map((cell) => ({ ...cell, lines: cell.lines.splice(0, maxLines) }));
          const height = Math.max(56, Math.max(...cells.map((cell) => cell.lines.length))*13+34);
          cells.forEach((cell, column) => {
            if (!cell.lines.length) return;
            const x = L+column*270;
            this.rect(x, y, 254, height, groupIndex === 0 && i === 0 && column === 0 ? "#FFF8EE" : column ? C.pale : "#F2F8F5", 6, C.line);
            this.text(this.short(cell.label.toUpperCase(), 226, 7), x+14, y+14, 7, "bold", C.muted);
            this.paragraph(cell.lines, x+14, y+27, 10, "bold", C.ink, 13);
          });
          y += height+12;
        }
      }
      y += 10;
      if (groupIndex === 0) drawVersions();
    }
  }

  eventKind(event: string) {
    if (/signed and verified|verified the split/i.test(event)) return "Verified";
    if (/signed|signature/i.test(event)) return "Signed";
    if (/accepted.*invite/i.test(event)) return "Joined";
    if (/accepted.*proposal|approved/i.test(event)) return "Accepted";
    if (/proposal|counter/i.test(event)) return "Proposal";
    if (/delivery/i.test(event)) return "Delivery";
    if (/invitation|invited/i.test(event)) return "Invited";
    if (/stored/i.test(event)) return "Stored";
    if (/generated|created/i.test(event)) return "Created";
    return "Activity";
  }

  history() {
    this.historyPage = this.pdf.getPageCount()+1;
    let y = 334, rowIndex = 0, lastDate = "";
    const header = (first: boolean, day: string) => {
      this.header("Document History", first ? "Audit record" : "Audit record / Continued", !first);
      if (first) {
        const tiles = [["CREATED / STORED", recordDate(this.model.document.storedAt || this.model.document.createdAt, true)],
          ["VERIFIED", this.model.verified ? recordDate(this.model.document.verifiedAt, true) : "Not recorded"], ["CREATOR", this.model.creator]];
        tiles.forEach(([label, value], i) => {
          const x = L+i*180;
          this.rect(x, 201, 164, 60, i === 1 ? C.mint : C.pale, 6, C.line);
          this.text(label, x+12, 216, 7, "bold", C.muted);
          this.paragraph(this.lines(value, 140, 8.5, "bold").slice(0, 2), x+12, 230, 8.5, "bold", C.ink, 11);
        });
      }
      y = first ? 334 : 172;
      this.text("Audit trail", L, y-52, 14, "bold");
      this.pill(day, 125, y-61, 96, 18, C.sand);
      this.pill(`${this.model.events.length} events`, 482, y-61, 86);
      this.text("All event times UTC", R, y-33, 7.2, "regular", C.muted, "right");
      this.rect(L, y-20, CW, 20, C.navy);
      this.text("TIME", 94, y-10, 7, "bold", C.white, "right");
      this.text("ACTIVITY", 124, y-10, 7, "bold", C.white);
      this.text("EVENT", 524, y-10, 7, "bold", C.white, "center");
      lastDate = day;
    };
    header(true, recordDate(this.model.events[0]?.timestamp));
    for (const event of this.model.events) {
      const day = recordDate(event.timestamp);
      const lines = [...this.lines(event.actor, 354, 8.8, "bold").map((text) => ({ text, bold: true })), ...this.lines(event.event, 354, 8.2).map((text) => ({ text, bold: false }))];
      let continuation = false;
      while (lines.length) {
        if (y+34 > END) header(false, day);
        const fullHeight = Math.max(34, lines.length*11+12);
        if (fullHeight <= END-172 && y+fullHeight > END) header(false, day);
        if (day !== lastDate) {
          if (y+64 > END) header(false, day);
          else { this.pill(day, 124, y+5, 96, 18, C.sand); y += 28; lastDate = day; }
        }
        if (fullHeight <= END-172 && y+fullHeight > END) header(false, day);
        const part = lines.splice(0, Math.max(1, Math.floor((END-y-12)/11)));
        const height = Math.max(34, part.length*11+12), kind = this.eventKind(event.event);
        const green = ["Signed", "Verified", "Accepted", "Joined"].includes(kind), amber = ["Proposal", "Invited"].includes(kind);
        const accent = green ? C.green : amber ? C.amber : C.muted;
        this.rect(L, y, CW, height, kind === "Verified" ? C.mint : rowIndex%2 ? "#F8FAFC" : C.white);
        this.layout.push({ page: this.pdf.getPageCount(), kind: "row", text: kind, x: L, y, width: CW, height });
        this.page.drawLine({ start: { x: 110, y: H-y }, end: { x: 110, y: H-y-height }, color: color(C.line), thickness: .7 });
        this.page.drawCircle({ x: 110, y: H-y-height/2, size: 2.4, color: color(accent) });
        const time = validRecordDate(event.timestamp) ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(new Date(event.timestamp)) : "Unknown";
        this.text(time, 94, y+height/2, 8, "bold", green ? C.green : C.muted, "right");
        part.forEach((line, i) => this.text(line.text, 124, y+height/2+(i-(part.length-1)/2)*11, line.bold ? 8.8 : 8.2, line.bold ? "bold" : "regular", line.bold ? C.ink : C.muted));
        this.pill(continuation ? "Continued" : kind, 492, y+height/2-7, 64, 14, green ? C.mint : amber ? C.sand : C.pale, green ? C.green : C.navy, 7);
        this.rule(y+height, 124, 432, C.line, .4); y += height; rowIndex++; continuation = true;
      }
    }
    if (!this.model.events.length) this.text("No public audit events recorded.", 58, y+22, 9, "regular", C.muted);
    this.rule(697);
    this.text("End of recorded activity", L, 709, 7, "regular", C.muted);
  }

  finish() {
    const pages = this.pdf.getPages();
    this.page = pages[this.summaryPages.at(-1)];
    this.rect(L, 669, CW, 28, this.model.signed ? C.mint : C.pale, 4);
    this.text(this.model.verified ? "Signed. Verified by SPLIT." : this.model.signed ? "Signed. Signing activity recorded." : "Not a final signed record.", 58, 683, 9, "bold", this.model.signed ? C.green : C.muted);
    this.text(`Document history on page ${this.historyPage}`, 554, 683, 8, "regular", C.green, "right");
    pages.forEach((page, index) => {
      this.page = page;
      this.rule(729);
      this.text("RECORD & PRIVACY", L, 742, 7, "bold", C.muted);
      this.text(`${index+1} of ${pages.length}`, R, 742, 7, "regular", C.muted, "right");
      this.paragraph(this.lines(NOTICE, CW, 7.1), L, 752, 7.1, "regular", C.muted, 9.5);
      if (index >= this.historyPage-1) {
        this.text(`Exported ${recordDate(this.model.exportedAt, true)} UTC`, L, 720, 6.8, "regular", C.muted);
        this.text(this.short(`Downloaded by ${this.model.viewer}`, 252, 6.8), R, 720, 6.8, "regular", C.muted, "right");
      }
    });
    for (const item of this.layout) {
      if (item.x < L-1 || item.x+item.width > R+1 || item.y < 12 || item.y+item.height > H-12) throw new Error("This record exceeds the PDF layout. No incomplete PDF was downloaded.");
    }
  }
}

export async function renderSplitSheetPdf(document: StoredSplitSheetDocument, viewer: UserProfile, assets: SplitPdfAssets, exportedAt?: string) {
  const model = buildSplitSheetPdfModel(document, viewer, exportedAt);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${model.title} - SPLIT Sheet`); pdf.setAuthor("SPLIT"); pdf.setCreator("SPLIT Studio Record Export");
  pdf.setSubject(model.signed ? "Final version / recorded signing acknowledgements" : "Not a final signed record");
  const renderer = new RecordPdf(pdf, model);
  await renderer.init(assets);
  renderer.summary(); renderer.details(); renderer.history(); renderer.finish();
  return { bytes: await pdf.save(), layout: renderer.layout, pageCount: pdf.getPageCount(), model };
}
