import type { Agreement } from "@/lib/splitSheetAgreement";
import type { UserProfile } from "@/lib/userProfile";
import type { SplitNotification } from "@/lib/notificationStorage";
import { documentParticipantIdsForProfile, findInviteForProfile } from "@/lib/splitSheetStorage";
import { formatSplitSheetAuditTrail, splitSheetAllocationDisplayName } from "@/lib/splitSheetDisplay";
import { normalizeSplitSheetParticipantId } from "@/lib/splitSheetParticipantState";
import { getSplitWorkflowLabel, PENDING_SPLIT_STATUSES, VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";

export type WorkspaceFilter = "all" | "attention" | "signed" | "drafts" | "archived";
export type WorkspaceSort = "recent" | "oldest" | "title";

export function workspaceInitials(name: string) {
  const words = name.replace(/^@+/, "").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join("") : words[0]?.slice(0, 2) || "SP").toUpperCase();
}

export function workspaceRecord(agreement: Agreement, viewer: UserProfile) {
  const document = agreement.document;
  const signed = VERIFIED_SPLIT_STATUSES.includes(agreement.status);
  const pending = PENDING_SPLIT_STATUSES.includes(agreement.status);
  const invite = document && findInviteForProfile(document, viewer);
  const reviewInvite = pending && invite?.status === "Pending";
  const messagesAvailable = Boolean(document?.sentAt) && pending;
  const proposal = document?.splitProposalVersions.find((item) => item.id === document.currentProposalId)
    ?? document?.splitProposalVersions.at(-1);
  const viewerIds = document ? documentParticipantIdsForProfile(document, viewer) : new Set<string>();
  const viewerNeedsSignature = document?.splitSignatures.some((signature) => signature.proposalVersionId === proposal?.id
    && signature.status === "Pending"
    && viewerIds.has(normalizeSplitSheetParticipantId(document, signature.collaboratorId) || signature.collaboratorId));
  const readyToSign = ["Ready to Sign", "Pending Signatures"].includes(agreement.status)
    && !document?.collaboratorInvites.some((item) => item.status === "Pending");
  // The table reflects the current proposal, not the original party percentages.
  const allocations = proposal && document
    ? proposal.allocations.map((allocation) => ({
      name: splitSheetAllocationDisplayName(document, allocation),
      percent: Number(allocation.percentage) || 0,
    }))
    : agreement.splits;
  return {
    agreement,
    signed,
    pending,
    reviewInvite,
    allocations,
    artist: document?.data.artistProjectName || document?.creatorProfile.displayName || agreement.parties[0] || "",
    label: signed ? "Signed" : getSplitWorkflowLabel(agreement.status),
    action: messagesAvailable ? "messages" as const : "agreement" as const,
    actionLabel: messagesAvailable
      ? reviewInvite ? "Review invite" : viewerNeedsSignature && readyToSign ? "Review & sign" : "Open messages"
      : agreement.status === "Draft" ? "View draft" : "View record",
    updatedAt: document?.updatedAt || agreement.updated,
  };
}

export type WorkspaceRecord = ReturnType<typeof workspaceRecord>;

export function filterWorkspaceRecords(records: WorkspaceRecord[], filter: WorkspaceFilter, query: string, sort: WorkspaceSort) {
  const needle = query.trim().toLocaleLowerCase();
  const filtered = records.filter((record) => {
    const matchesFilter = filter === "all"
      || filter === "attention" && record.pending
      || filter === "signed" && record.signed
      || filter === "drafts" && record.agreement.status === "Draft"
      || filter === "archived" && record.agreement.status === "Archived";
    const haystack = [record.agreement.title, record.artist, record.agreement.document?.documentNumber,
      ...record.agreement.parties, ...record.allocations.map((item) => item.name)].join(" ").toLocaleLowerCase();
    return matchesFilter && (!needle || haystack.includes(needle));
  });
  return filtered.sort((a, b) => sort === "title"
    ? a.agreement.title.localeCompare(b.agreement.title)
    : (workspaceTime(a.updatedAt) - workspaceTime(b.updatedAt)) * (sort === "oldest" ? 1 : -1));
}

function workspaceTime(value: string) {
  return Date.parse(value) || 0;
}

export function workspaceDate(value: string, full = false) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", ...(full ? { weekday: "short" as const } : {}),
  });
}

export function workspaceActivity(agreements: Agreement[], notifications: SplitNotification[]) {
  const availableIds = new Set(agreements.map((agreement) => agreement.id));
  const events = notifications.filter((item) => item.splitSheetId && availableIds.has(item.splitSheetId));
  const notificationItems = events.map((item) => ({
    id: item.id, agreementId: item.splitSheetId!, text: item.body || item.title,
    createdAt: item.createdAt, signed: /sign|verified|executed/i.test(item.eventType), notification: item,
  }));
  // Include the latest audit when notifications lag behind it; prefer the notification at the same timestamp.
  const auditItems = agreements.flatMap((agreement) => {
    const event = agreement.document && formatSplitSheetAuditTrail(agreement.document).sort((a, b) => workspaceTime(b.timestamp) - workspaceTime(a.timestamp))[0];
    if (event && events.some((item) => item.splitSheetId === agreement.id && workspaceTime(item.createdAt) >= workspaceTime(event.timestamp))) return [];
    return event ? [{ id: `${agreement.id}-${event.timestamp}`, agreementId: agreement.id,
      text: `${event.actor}: ${event.event} - ${agreement.title}`, createdAt: event.timestamp,
      signed: /signed|verified/i.test(event.event), notification: undefined as SplitNotification | undefined }] : [];
  });
  return [...notificationItems, ...auditItems].sort((a, b) => workspaceTime(b.createdAt) - workspaceTime(a.createdAt)).slice(0, 3);
}
