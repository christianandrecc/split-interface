import { describe, expect, it } from "vitest";
import {
  buildSplitSheetDownloadFilename,
  buildSplitSheetRecordPdf,
} from "@/lib/splitSheetDownload";
import { makeDocument } from "@/test/splitSheetWorkflow.test";

async function blobText(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(blob);
  });
}

describe("split sheet downloads", () => {
  it("builds a downloadable PDF record with clean collaborator and audit text", async () => {
    const document = makeDocument();
    document.data.songTitle = "Soy El Nino";
    document.collaboratorInvites[0] = {
      ...document.collaboratorInvites[0],
      name: "Invited writer",
      profileSnapshot: {
        username: "chori",
        displayName: "Chori",
        email: "chori@example.com",
      },
    };
    document.data.parties[1] = {
      ...document.data.parties[1],
      professionalName: "",
      legalName: "",
      inviteValue: "@chori",
    };
    document.auditTrail = [
      {
        timestamp: document.createdAt,
        actor: "Chori",
        action: "__splitChatMessages:{\"body\":\"hola\"}",
      },
      {
        timestamp: document.createdAt,
        actor: "Chori",
        action: "Signed and verified the split sheet",
      },
    ];

    const pdf = buildSplitSheetRecordPdf(document, document.creatorProfile);
    const text = await blobText(pdf);

    expect(pdf.type).toBe("application/pdf");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Soy El Nino");
    expect(text).toContain("Chori");
    expect(text).toContain("Signed and verified the split sheet");
    expect(text).not.toContain("__splitChatMessages");
    expect(text).not.toContain("Invited writer");
  });

  it("uses a readable pdf filename from the work title", () => {
    const document = makeDocument();
    document.data.songTitle = "Soy El Niño";

    expect(buildSplitSheetDownloadFilename(document)).toBe("soy-el-nino-split-sheet.pdf");
  });
});
