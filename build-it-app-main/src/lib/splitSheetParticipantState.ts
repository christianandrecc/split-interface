import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import { splitSheetParticipantDisplayName } from "@/lib/splitSheetDisplay";

type ProposalVersionRecord = StoredSplitSheetDocument["splitProposalVersions"][number];
type ApprovalRecord = StoredSplitSheetDocument["splitApprovals"][number];

type SignatureBuildOptions = {
  signed?: boolean;
  signedAt?: string;
  signatureMethod?: string;
};

export function normalizeSplitSheetParticipantId(document: StoredSplitSheetDocument, participantId?: string) {
  if (!participantId) return undefined;

  const creatorPartyId = document.data.parties.find((party) => party.isCurrentUser)?.id;
  if (participantId === "creator" || participantId === creatorPartyId) return "creator";

  const invite = document.collaboratorInvites.find((item) => item.id === participantId || item.partyId === participantId);
  return invite?.id || participantId;
}

export function getSplitSheetRequiredParticipantIds(document: StoredSplitSheetDocument) {
  return uniqueParticipantIds([
    "creator",
    ...document.collaboratorInvites.filter((invite) => invite.status === "Accepted").map((invite) => invite.id),
  ]);
}

export function ensureSplitSheetCreatorApproval(
  document: StoredSplitSheetDocument,
  approvals: ApprovalRecord[],
  proposal?: ProposalVersionRecord,
  approvedAt?: string,
) {
  if (!proposal || !proposalWasCreatedByCreator(document, proposal)) return approvals;

  let hasCreatorApproval = false;
  const nextApprovals = approvals.map((approval) => {
    if (approval.proposalVersionId !== proposal.id || normalizeSplitSheetParticipantId(document, approval.collaboratorId) !== "creator") {
      return approval;
    }

    hasCreatorApproval = true;
    return {
      ...approval,
      collaboratorId: "creator",
      collaboratorName: splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName),
      status: "Approved" as const,
      respondedAt: approval.respondedAt || approvedAt || proposal.createdAt,
    };
  });

  if (hasCreatorApproval) return nextApprovals;

  return [
    ...nextApprovals,
    {
      id: `${proposal.id}-creator-approval`,
      proposalVersionId: proposal.id,
      collaboratorId: "creator",
      collaboratorName: splitSheetParticipantDisplayName(document, "creator"),
      status: "Approved" as const,
      respondedAt: approvedAt || proposal.createdAt,
    },
  ];
}

export function getSplitSheetAcceptedParticipantIds(
  document: StoredSplitSheetDocument,
  proposalId: string,
  approvals = document.splitApprovals,
) {
  if (!proposalId) return [];

  const proposal = document.splitProposalVersions.find((item) => item.id === proposalId);
  const normalizedApprovals = ensureSplitSheetCreatorApproval(
    document,
    approvals,
    proposal,
    proposal?.createdAt || document.createdAt,
  );
  const acceptedIds = normalizedApprovals
    .filter((approval) => approval.proposalVersionId === proposalId && approval.status === "Approved")
    .map((approval) => normalizeSplitSheetParticipantId(document, approval.collaboratorId))
    .filter(Boolean) as string[];

  return uniqueParticipantIds(acceptedIds);
}

export function allSplitSheetRequiredParticipantsAccepted(document: StoredSplitSheetDocument, proposalId: string) {
  const acceptedParticipants = new Set(getSplitSheetAcceptedParticipantIds(document, proposalId));
  const requiredSigners = getSplitSheetRequiredParticipantIds(document);

  return requiredSigners.length > 0 && requiredSigners.every((participantId) => acceptedParticipants.has(participantId));
}

export function buildSplitSheetSignatureRecords(
  document: StoredSplitSheetDocument,
  proposalId: string,
  options: SignatureBuildOptions = {},
) {
  const existingSignatures = Array.isArray(document.splitSignatures) ? document.splitSignatures : [];
  const currentSignatures = existingSignatures.filter((signature) => signature.proposalVersionId === proposalId);
  const creatorPartyId = document.data.parties.find((party) => party.isCurrentUser)?.id;
  const signers = [
    { id: "creator", aliases: ["creator", creatorPartyId].filter(Boolean) as string[], name: splitSheetParticipantDisplayName(document, "creator") },
    ...document.collaboratorInvites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({
        id: invite.id,
        aliases: [invite.id, invite.partyId].filter(Boolean) as string[],
        name: splitSheetParticipantDisplayName(document, invite.id, invite.name),
      })),
  ];
  const missingSignatures = signers
    .filter((signer) => !currentSignatures.some((signature) => signer.aliases.includes(signature.collaboratorId)))
    .map((signer) => ({
      id: `${document.id}-${proposalId}-${signer.id}-signature`,
      proposalVersionId: proposalId,
      collaboratorId: signer.id,
      collaboratorName: signer.name,
      status: options.signed ? "Signed" as const : "Pending" as const,
      signedAt: options.signed ? options.signedAt : undefined,
      signatureMethod: options.signed ? options.signatureMethod : undefined,
    }));

  return [...existingSignatures, ...missingSignatures];
}

function proposalWasCreatedByCreator(document: StoredSplitSheetDocument, proposal: ProposalVersionRecord) {
  if (proposal.id === document.splitProposalVersions[0]?.id) return true;

  const creatorProfile = document.creatorProfile;
  const creatorNames = [
    splitSheetParticipantDisplayName(document, "creator"),
    creatorProfile.displayName,
    creatorProfile.pkaNames,
    creatorProfile.legalName,
    creatorProfile.emailAddress,
    creatorProfile.username,
  ].map(normalizeParticipantLabel);

  return creatorNames.includes(normalizeParticipantLabel(proposal.proposedBy));
}

function uniqueParticipantIds(participantIds: string[]) {
  return Array.from(new Set(participantIds));
}

function normalizeParticipantLabel(value?: string) {
  return (value ?? "").trim().replace(/^@+/, "").toLowerCase();
}
