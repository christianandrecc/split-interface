import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import {
  documentBelongsToProfile,
  documentParticipantIdsForProfile,
  findInviteForProfile,
} from "@/lib/splitSheetStorage";
import {
  splitSheetAllocationDisplayName,
  splitSheetDisplayInitials,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import {
  buildSplitSheetSignatureRecords,
  getSplitSheetAcceptedParticipantIds,
  getSplitSheetRequiredParticipantIds,
  normalizeSplitSheetParticipantId,
} from "@/lib/splitSheetParticipantState";
import { readSplitSheetChatMessages } from "@/lib/splitSheetMessages";
import type { UserProfile } from "@/lib/userProfile";

export type NegotiationStatus = "negotiating" | "ready_to_sign" | "signed";
export type NegotiationMessageType = "text" | "proposal" | "counter" | "accept" | "reject" | "sign" | "system";

export type DealParticipant = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  role: string;
};

export type SplitAllocation = {
  participantId: string;
  name: string;
  role: string;
  percent: number;
};

export type SplitVersion = {
  id: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy: string;
  note: string;
  allocations: SplitAllocation[];
  revenueStreams: {
    id: string;
    label: string;
    status: string;
  }[];
};

export type NegotiationMessage = {
  id: string;
  type: NegotiationMessageType;
  senderId: string;
  createdAt: string;
  body: string;
  proposedSplitId?: string;
};

export type NegotiationDeal = {
  id: string;
  title: string;
  artist: string;
  status: NegotiationStatus;
  updatedAt: string;
  unreadCount: number;
  document: StoredSplitSheetDocument;
  participants: DealParticipant[];
  requiredSignerIds: string[];
  viewerParticipantIds: Set<string>;
  acceptedBy: string[];
  signedBy: string[];
  currentVersionId: string;
  splitVersions: SplitVersion[];
  messages: NegotiationMessage[];
};

export const FINAL_NEGOTIATION_DOCUMENT_STATUSES = new Set<StoredSplitSheetDocument["status"]>([
  "Fully Signed",
  "Verified and Stored",
  "Executed",
  "Archived",
]);

export function documentToNegotiationDeal(document: StoredSplitSheetDocument, userProfile: UserProfile): NegotiationDeal | null {
  if (document.status === "Draft" || !document.sentAt) return null;
  if (!documentBelongsToProfile(document, userProfile) && !findInviteForProfile(document, userProfile)) return null;

  const viewerParticipantIds = documentParticipantIdsForProfile(document, userProfile);
  const participants = document.data.parties.map((party) => {
    const invite = document.collaboratorInvites.find((item) => item.partyId === party.id);
    const id = party.isCurrentUser ? "creator" : invite?.id ?? party.id;
    const name = splitSheetPartyDisplayName(document, party, invite?.name || "Collaborator");
    const username = party.inviteMethod === "username" ? party.inviteValue.replace(/^@+/, "") : invite?.profileSnapshot?.username;

    return {
      id,
      name,
      handle: username ? `@${username}` : party.email || invite?.inviteValue || party.phoneNumber || "SPLIT user",
      initials: splitSheetDisplayInitials(name),
      role: party.role || "Collaborator",
    };
  });
  const currentProposalId = document.currentProposalId || document.splitProposalVersions.at(-1)?.id || "";
  const splitVersions = document.splitProposalVersions.map((proposal) => ({
    id: proposal.id,
    version: proposal.versionNumber,
    title: proposal.proposedBy,
    createdAt: proposal.createdAt,
    createdBy: proposal.proposedBy,
    note: proposal.notes || "Split proposal",
    allocations: proposal.allocations.map((allocation) => ({
      participantId: allocation.partyId,
      name: splitSheetAllocationDisplayName(document, allocation),
      role: allocation.role,
      percent: Number(allocation.percentage) || 0,
    })),
    revenueStreams: [
      { id: "composition", label: "Composition / publishing", status: document.status },
      { id: "audit", label: "Agreement version", status: `v${proposal.versionNumber}` },
    ],
  }));
  const acceptedBy = getSplitSheetAcceptedParticipantIds(document, currentProposalId);
  const signatures = buildSplitSheetSignatureRecords(document, currentProposalId);
  const signedBy = signatures
    .filter((signature) => signature.proposalVersionId === currentProposalId && signature.status === "Signed")
    .map((signature) => normalizeSplitSheetParticipantId(document, signature.collaboratorId) ?? signature.collaboratorId);
  const requiredSignerIds = getSplitSheetRequiredParticipantIds(document);
  const everyRequiredSignerAccepted = requiredSignerIds.length > 0 && requiredSignerIds.every((participantId) => acceptedBy.includes(participantId));
  const hasPendingInvites = document.collaboratorInvites.some((invite) => invite.status === "Pending");
  const status: NegotiationStatus = FINAL_NEGOTIATION_DOCUMENT_STATUSES.has(document.status)
    ? "signed"
    : ["Ready to Sign", "Pending Signatures"].includes(document.status) || (!hasPendingInvites && everyRequiredSignerAccepted)
      ? "ready_to_sign"
      : "negotiating";

  return {
    id: document.id,
    title: document.data.songTitle || document.title || "Untitled SPLIT Sheet",
    artist: document.data.artistProjectName || document.creatorProfile.displayName || "SPLIT",
    status,
    updatedAt: relativeTime(document.updatedAt || document.createdAt),
    unreadCount: documentBelongsToProfile(document, userProfile) ? 0 : actionableCount(document, viewerParticipantIds),
    document,
    participants,
    requiredSignerIds,
    viewerParticipantIds,
    acceptedBy,
    signedBy,
    currentVersionId: currentProposalId,
    splitVersions,
    messages: buildNegotiationMessages(document, currentProposalId),
  };
}

export function buildNegotiationMessages(document: StoredSplitSheetDocument, currentProposalId: string) {
  const creatorName = getProfileDisplayName(document.creatorProfile);
  const messages: NegotiationMessage[] = [
    {
      id: `${document.id}-sent`,
      type: "proposal",
      senderId: "creator",
      createdAt: document.sentAt || document.createdAt,
      body: `${creatorName} sent the initial split proposal.`,
      proposedSplitId: document.splitProposalVersions[0]?.id || currentProposalId,
    },
  ];

  document.collaboratorInvites.forEach((invite) => {
    if (invite.status === "Accepted") {
      messages.push({
        id: `${invite.id}-accepted`,
        type: "accept",
        senderId: invite.id,
        createdAt: invite.respondedAt || document.updatedAt,
        body: `${splitSheetParticipantDisplayName(document, invite.id, invite.name)} accepted the collaboration invite.`,
      });
    }

    if (invite.status === "Declined") {
      messages.push({
        id: `${invite.id}-declined`,
        type: "reject",
        senderId: invite.id,
        createdAt: invite.respondedAt || document.updatedAt,
        body: `${splitSheetParticipantDisplayName(document, invite.id, invite.name)} declined the collaboration invite.`,
      });
    }
  });

  document.splitProposalVersions.slice(1).forEach((proposal) => {
    messages.push({
      id: `${proposal.id}-message`,
      type: "counter",
      senderId: participantIdForActor(document, proposal.proposedBy),
      createdAt: proposal.createdAt,
      body: `${proposal.proposedBy} proposed split version ${proposal.versionNumber}.`,
      proposedSplitId: proposal.id,
    });
  });

  document.splitApprovals.forEach((approval) => {
    if (!approval.respondedAt) return;

    messages.push({
      id: `${approval.id}-response`,
      type: approval.status === "Approved" ? "accept" : "reject",
      senderId: approval.collaboratorId,
      createdAt: approval.respondedAt,
      body: approval.status === "Approved"
        ? `${splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName)} accepted this split version.`
        : `${splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName)} disputed this split version.`,
      proposedSplitId: approval.proposalVersionId,
    });
  });

  document.splitSignatures.forEach((signature) => {
    if (signature.status !== "Signed" || !signature.signedAt) return;

    messages.push({
      id: `${signature.id}-signed`,
      type: "sign",
      senderId: signature.collaboratorId,
      createdAt: signature.signedAt,
      body: `${splitSheetParticipantDisplayName(document, signature.collaboratorId, signature.collaboratorName)} signed the split sheet.`,
      proposedSplitId: signature.proposalVersionId,
    });
  });

  readSplitSheetChatMessages(document).forEach((message) => {
    messages.push({
      id: message.id,
      type: "text",
      senderId: message.senderId,
      createdAt: message.createdAt,
      body: message.body,
    });
  });

  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function dealReadyToSign(deal: NegotiationDeal) {
  if (FINAL_NEGOTIATION_DOCUMENT_STATUSES.has(deal.document.status)) return false;
  if (deal.document.collaboratorInvites.some((invite) => invite.status === "Pending")) return false;
  if (deal.status === "ready_to_sign") return true;

  const acceptedParticipants = new Set(deal.acceptedBy);
  return deal.requiredSignerIds.length > 0 && deal.requiredSignerIds.every((participantId) => acceptedParticipants.has(participantId));
}

export function participantMatchesViewer(deal: NegotiationDeal, participantId?: string) {
  const canonicalId = normalizeSplitSheetParticipantId(deal.document, participantId);
  return Boolean(participantId && deal.viewerParticipantIds.has(canonicalId ?? participantId));
}

export function firstViewerParticipantId(deal: NegotiationDeal) {
  return deal.participants.find((participant) => deal.viewerParticipantIds.has(participant.id))?.id || [...deal.viewerParticipantIds][0] || "";
}

export function participantIdentityForProfile(document: StoredSplitSheetDocument, profile: UserProfile) {
  const invite = findInviteForProfile(document, profile);
  const inviteParty = invite ? document.data.parties.find((party) => party.id === invite.partyId) : undefined;
  if (invite && !inviteParty?.isCurrentUser) {
    return {
      id: invite.id,
      name: getInviteDisplayName(invite, inviteParty, profile),
    };
  }

  if (documentBelongsToProfile(document, profile)) {
    return {
      id: "creator",
      name: getProfileDisplayName(profile),
    };
  }

  return null;
}

export function getProfileDisplayName(profile: UserProfile) {
  return profile.displayName || profile.pkaNames || profile.legalName || profile.emailAddress || profile.username || "SPLIT user";
}

export function formatNegotiationDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getInviteDisplayName(
  invite: StoredSplitSheetDocument["collaboratorInvites"][number],
  party: StoredSplitSheetDocument["data"]["parties"][number] | undefined,
  profile: UserProfile,
) {
  return (
    profile.displayName ||
    profile.pkaNames ||
    cleanParticipantLabel(party?.professionalName) ||
    cleanParticipantLabel(invite.profileSnapshot?.displayName) ||
    cleanParticipantLabel(invite.name) ||
    profile.username ||
    profile.emailAddress ||
    "SPLIT user"
  );
}

function cleanParticipantLabel(value?: string) {
  const label = (value ?? "").trim();
  if (!label || /^(invited writer|invited collaborator|collaborator|contributor|pending)$/i.test(label)) return "";
  return label;
}

function normalizeParticipantLabel(value?: string) {
  return (value ?? "").trim().replace(/^@+/, "").toLowerCase();
}

function participantIdForActor(document: StoredSplitSheetDocument, actor: string) {
  const normalizedActor = normalizeParticipantLabel(actor);
  if (normalizedActor === getProfileDisplayName(document.creatorProfile).trim().toLowerCase()) return "creator";

  const invite = document.collaboratorInvites.find((item) =>
    [
      item.name,
      item.profileSnapshot?.displayName,
      item.profileSnapshot?.username,
      item.inviteValue,
    ]
      .map(normalizeParticipantLabel)
      .includes(normalizedActor),
  );
  return invite?.id || "creator";
}

function actionableCount(document: StoredSplitSheetDocument, viewerParticipantIds: Set<string>) {
  const currentProposalId = document.currentProposalId || document.splitProposalVersions.at(-1)?.id || "";
  const pendingApproval = document.splitApprovals.some(
    (approval) =>
      approval.proposalVersionId === currentProposalId &&
      approval.status === "Pending" &&
      viewerParticipantIds.has(normalizeSplitSheetParticipantId(document, approval.collaboratorId) ?? approval.collaboratorId),
  );
  const pendingInvite = document.collaboratorInvites.some((invite) => invite.status === "Pending" && viewerParticipantIds.has(invite.id));
  const pendingSignature = document.splitSignatures.some(
    (signature) =>
      signature.proposalVersionId === currentProposalId &&
      signature.status === "Pending" &&
      viewerParticipantIds.has(normalizeSplitSheetParticipantId(document, signature.collaboratorId) ?? signature.collaboratorId),
  );

  return [pendingInvite, pendingApproval, pendingSignature].filter(Boolean).length;
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
