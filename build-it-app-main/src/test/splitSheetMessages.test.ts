import { describe, expect, it } from "vitest";
import {
  SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX,
  appendSplitSheetChatMessage,
  isSplitSheetChatAuditAction,
  readSplitSheetChatMessages,
} from "@/lib/splitSheetMessages";
import { makeDocument } from "@/test/splitSheetWorkflow.test";

describe("split sheet message storage", () => {
  it("stores and reads Messages chat entries through one audit-safe boundary", () => {
    const document = makeDocument();
    const message = {
      id: "chat-1",
      senderId: "maya-invite",
      senderName: "Maya Rios",
      body: "Can we move this to 55/45?",
      createdAt: "2026-08-20T12:00:00.000Z",
    };

    const updatedDocument = appendSplitSheetChatMessage(document, message);

    expect(updatedDocument.auditTrail.at(-1)).toMatchObject({
      actor: "Maya Rios",
      action: expect.stringContaining(SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX),
    });
    expect(readSplitSheetChatMessages(updatedDocument)).toEqual([message]);
  });

  it("recognizes hidden chat audit actions without hiding real legal events", () => {
    expect(isSplitSheetChatAuditAction(`${SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX}{"body":"hola"}`)).toBe(true);
    expect(isSplitSheetChatAuditAction("Sent a negotiation message")).toBe(true);
    expect(isSplitSheetChatAuditAction("Signed and verified the split sheet")).toBe(false);
  });

  it("ignores malformed hidden chat payloads", () => {
    const document = makeDocument();
    document.auditTrail.push({
      timestamp: document.updatedAt,
      actor: "SPLIT",
      action: `${SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX}{bad-json`,
    });

    expect(readSplitSheetChatMessages(document)).toEqual([]);
  });
});
