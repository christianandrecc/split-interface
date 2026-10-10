import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import { normalizeSplitSheetParticipantId } from "./splitSheetParticipantState";
import { splitShareState } from "./splitShare";
import { VERIFIED_SPLIT_STATUSES } from "./splitWorkflow";
import { hasRenderableRecordText } from "./splitRecordText";

export type SigningEvidenceSource = "server" | "local";
const hasText = (value?: string | null) => Boolean(value?.trim());
const hasDate = (value?: string) => Boolean(value && Number.isFinite(Date.parse(value)));

// A source/status/name alone is not signature evidence. Callers must identify
// server reads explicitly; local snapshots default to unconfirmed evidence.
export function splitSigningEvidence(document: StoredSplitSheetDocument, source: SigningEvidenceSource = "local") {
  const currentProposals = document.splitProposalVersions.filter((item) => item.id === document.currentProposalId);
  const proposal = currentProposals.length === 1 ? currentProposals[0] : undefined;
  const parties = document.data.parties;
  const partyIds = new Set(parties.map((party) => party.id));
  const allocations = proposal?.allocations ?? [];
  const validParties = parties.length > 0 && partyIds.size === parties.length && parties.every((party) => hasText(party.id)) &&
    parties.filter((party) => party.isCurrentUser).length === 1 &&
    new Set(document.collaboratorInvites.map((invite) => invite.id)).size === document.collaboratorInvites.length &&
    document.collaboratorInvites.every((invite) => hasText(invite.id) && invite.id !== "creator") &&
    parties.filter((party) => !party.isCurrentUser).every((party) => document.collaboratorInvites.filter((invite) => invite.partyId === party.id).length === 1) &&
    document.collaboratorInvites.every((invite) => parties.some((party) => !party.isCurrentUser && party.id === invite.partyId));
  const validAllocation = validParties && allocations.length === parties.length &&
    new Set(allocations.map((allocation) => allocation.partyId)).size === parties.length &&
    allocations.every((allocation) => partyIds.has(allocation.partyId)) &&
    splitShareState(allocations.map((allocation) => allocation.percentage)).valid;
  const serverRecord = source === "server" && hasText(document.creatorUserId) &&
    Number.isInteger(document.serverRevision) && document.serverRevision! > 0 && validParties;
  const expectedUsers = parties.map((party) => party.isCurrentUser ? document.creatorUserId :
    document.collaboratorInvites.find((invite) => invite.partyId === party.id)?.collaboratorUserId);
  const distinctUsers = expectedUsers.every(hasText) && new Set(expectedUsers).size === parties.length;
  const participantIds = parties.map((party) => normalizeSplitSheetParticipantId(document, party.id));
  const distinctParticipants = new Set(participantIds).size === parties.length;
  const people = parties.map((party, index) => {
    const invite = document.collaboratorInvites.find((item) => item.partyId === party.id);
    const id = normalizeSplitSheetParticipantId(document, party.isCurrentUser ? "creator" : invite?.id || party.id);
    const signatures = document.splitSignatures.filter((signature) => proposal && signature.proposalVersionId === proposal.id &&
      normalizeSplitSheetParticipantId(document, signature.collaboratorId) === id && signature.status === "Signed");
    const recordedSignature = signatures[0];
    const confirmed = Boolean(serverRecord && distinctUsers && distinctParticipants && proposal && signatures.length === 1 && recordedSignature &&
      recordedSignature.signerUserId === expectedUsers[index] && hasRenderableRecordText(recordedSignature.signerLegalName) &&
      hasDate(recordedSignature.signedAt) && recordedSignature.signatureMethod === "SPLIT in-app acknowledgement");
    const approvals = document.splitApprovals.filter((item) => proposal && item.proposalVersionId === proposal.id &&
      normalizeSplitSheetParticipantId(document, item.collaboratorId) === id);
    const approval = approvals.length === 1 ? approvals[0] : undefined;
    return { partyId: party.id, id, recordedSignature, confirmed, approval };
  });
  const signedCount = people.filter((person) => person.confirmed).length;
  const signed = serverRecord && validAllocation && signedCount === people.length &&
    people.every((person) => person.approval?.status === "Approved") &&
    document.collaboratorInvites.every((invite) => invite.status === "Accepted") && VERIFIED_SPLIT_STATUSES.includes(document.status);
  return { people, signedCount, signed, verified: signed && hasDate(document.verifiedAt), source };
}
