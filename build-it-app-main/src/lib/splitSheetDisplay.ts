import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { Party } from "@/components/contract-builder/types";
import { isSplitSheetChatAuditAction } from "@/lib/splitSheetMessages";

const PLACEHOLDER_LABELS = new Set([
  "collaborator",
  "contributor",
  "invited collaborator",
  "invited writer",
  "pending",
]);

type AuditDisplayItem = {
  timestamp: string;
  date: string;
  actor: string;
  event: string;
};

function text(value?: string | null) {
  return (value ?? "").trim();
}

function cleanDisplayLabel(value?: string | null) {
  const label = text(value);
  if (!label || PLACEHOLDER_LABELS.has(label.toLowerCase())) return "";
  return label;
}

function usernameLabel(value?: string | null) {
  const username = text(value).replace(/^@+/, "");
  return username ? `@${username}` : "";
}

function creatorDisplayName(document: StoredSplitSheetDocument) {
  const profile = document.creatorProfile;
  return (
    cleanDisplayLabel(profile.displayName) ||
    cleanDisplayLabel(profile.pkaNames) ||
    cleanDisplayLabel(profile.legalName) ||
    cleanDisplayLabel(profile.emailAddress) ||
    usernameLabel(profile.username) ||
    "SPLIT user"
  );
}

function inviteSnapshotName(invite?: StoredSplitSheetDocument["collaboratorInvites"][number]) {
  return (
    cleanDisplayLabel(invite?.profileSnapshot?.displayName) ||
    cleanDisplayLabel(invite?.profileSnapshot?.email) ||
    usernameLabel(invite?.profileSnapshot?.username) ||
    cleanDisplayLabel(invite?.profileSnapshot?.phoneNumber) ||
    cleanDisplayLabel(invite?.profileSnapshot?.splitId)
  );
}

export function splitSheetPartyDisplayName(
  document: StoredSplitSheetDocument,
  party?: Party,
  fallback = "Invited writer",
) {
  if (!party) return cleanDisplayLabel(fallback) || fallback;

  const invite = document.collaboratorInvites.find((item) => item.partyId === party.id);

  if (party.isCurrentUser) {
    return (
      cleanDisplayLabel(party.professionalName) ||
      creatorDisplayName(document) ||
      cleanDisplayLabel(party.legalName) ||
      cleanDisplayLabel(party.email) ||
      usernameLabel(party.inviteValue) ||
      fallback
    );
  }

  return (
    inviteSnapshotName(invite) ||
    cleanDisplayLabel(party.professionalName) ||
    cleanDisplayLabel(party.legalName) ||
    cleanDisplayLabel(invite?.name) ||
    usernameLabel(party.inviteMethod === "username" ? party.inviteValue : undefined) ||
    cleanDisplayLabel(party.email) ||
    cleanDisplayLabel(party.phoneNumber) ||
    cleanDisplayLabel(party.splitId) ||
    usernameLabel(invite?.inviteMethod === "username" ? invite.inviteValue : undefined) ||
    cleanDisplayLabel(invite?.inviteValue) ||
    fallback
  );
}

export function splitSheetParticipantDisplayName(
  document: StoredSplitSheetDocument,
  participantId?: string,
  fallback?: string,
) {
  const creatorParty = document.data.parties.find((party) => party.isCurrentUser);
  if (!participantId || participantId === "creator" || participantId === creatorParty?.id) {
    return creatorDisplayName(document);
  }

  const invite = document.collaboratorInvites.find((item) => item.id === participantId || item.partyId === participantId);
  const party = invite ? document.data.parties.find((item) => item.id === invite.partyId) : document.data.parties.find((item) => item.id === participantId);

  return splitSheetPartyDisplayName(document, party, cleanDisplayLabel(fallback) || fallback || "SPLIT user");
}

export function splitSheetAllocationDisplayName(
  document: StoredSplitSheetDocument,
  allocation: { partyId?: string; name?: string },
) {
  const party = document.data.parties.find((item) => item.id === allocation.partyId);
  return splitSheetPartyDisplayName(document, party, cleanDisplayLabel(allocation.name) || "Invited writer");
}

export function splitSheetDisplayInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SP";
}

function formatDisplayDateTime(value: string | undefined) {
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

function cleanAuditEvent(action: string) {
  if (isInternalSplitSheetAuditAction(action)) return "";
  return action;
}

export function formatSplitSheetAuditTrail(document: StoredSplitSheetDocument): AuditDisplayItem[] {
  return document.auditTrail.flatMap((entry) => {
    const event = cleanAuditEvent(entry.action);
    if (!event) return [];

    return [{
      timestamp: entry.timestamp,
      date: formatDisplayDateTime(entry.timestamp),
      actor: cleanDisplayLabel(entry.actor) || creatorDisplayName(document),
      event,
    }];
  });
}

export function isInternalSplitSheetAuditAction(action: string) {
  return isSplitSheetChatAuditAction(action);
}
