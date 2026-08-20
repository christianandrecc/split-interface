import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";

export const SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX = "__splitChatMessages:";

const CHAT_AUDIT_ACTIONS = new Set(["Sent a negotiation message", "Sent a message in Messages"]);

export type StoredSplitSheetChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

type SplitSheetAuditEntry = StoredSplitSheetDocument["auditTrail"][number];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isStoredSplitSheetChatMessage(value: unknown): value is StoredSplitSheetChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<StoredSplitSheetChatMessage>;
  return Boolean(
    clean(message.id) &&
      clean(message.senderId) &&
      clean(message.senderName) &&
      clean(message.body) &&
      clean(message.createdAt),
  );
}

export function isSplitSheetChatAuditAction(action: string) {
  return action.startsWith(SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX) || CHAT_AUDIT_ACTIONS.has(action);
}

export function createSplitSheetChatAuditEntry(message: StoredSplitSheetChatMessage): SplitSheetAuditEntry {
  return {
    timestamp: message.createdAt,
    actor: message.senderName,
    action: `${SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX}${JSON.stringify(message)}`,
  };
}

export function appendSplitSheetChatMessage(
  document: StoredSplitSheetDocument,
  message: StoredSplitSheetChatMessage,
): StoredSplitSheetDocument {
  return {
    ...document,
    auditTrail: [
      ...document.auditTrail,
      createSplitSheetChatAuditEntry(message),
    ],
  };
}

export function readSplitSheetChatMessages(document: StoredSplitSheetDocument): StoredSplitSheetChatMessage[] {
  return document.auditTrail.flatMap((entry) => {
    if (!entry.action.startsWith(SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX)) return [];

    try {
      const parsed = JSON.parse(entry.action.slice(SPLIT_SHEET_CHAT_MESSAGES_AUDIT_PREFIX.length));
      return isStoredSplitSheetChatMessage(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  });
}
