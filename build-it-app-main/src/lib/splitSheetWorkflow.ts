import { addDocumentAuditTrail, type StoredSplitSheetDocument } from "@/components/contract-builder/document";

export const SPLIT_PERCENT_EPSILON = 0.01;

export type SplitSheetValidationResult = {
  valid: boolean;
  total: number;
  missing: number;
  overage: number;
  errors: string[];
};

export function roundSplitPercent(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function splitPercentTotal(percentages: Array<number | string>) {
  return roundSplitPercent(percentages.reduce((sum, value) => sum + (Number(value) || 0), 0));
}

export function validateSplitPercentages(percentages: Array<number | string>): SplitSheetValidationResult {
  const total = splitPercentTotal(percentages);
  const missing = roundSplitPercent(Math.max(0, 100 - total));
  const overage = roundSplitPercent(Math.max(0, total - 100));
  const errors: string[] = [];

  if (percentages.length === 0) errors.push("Add at least one collaborator.");
  if (percentages.some((value) => Number(value) < 0)) errors.push("Ownership percentages cannot be negative.");
  if (percentages.some((value) => Number(value) > 100)) errors.push("A collaborator cannot own more than 100%.");
  if (Math.abs(total - 100) > SPLIT_PERCENT_EPSILON) {
    errors.push(total > 100 ? `Ownership is over by ${overage}%.` : `Ownership is missing ${missing}%.`);
  }

  return {
    valid: errors.length === 0,
    total,
    missing,
    overage,
    errors,
  };
}

export function validateDocumentSplit(document: StoredSplitSheetDocument) {
  return validateSplitPercentages(document.data.parties.map((party) => party.percent));
}

export function getCollaboratorStatusSummary(document: StoredSplitSheetDocument) {
  const currentProposalId = document.currentProposalId || document.splitProposalVersions.at(-1)?.id;

  return document.data.parties.map((party) => {
    const invite = document.collaboratorInvites.find((item) => item.partyId === party.id);
    const approval = document.splitApprovals.find(
      (item) =>
        item.proposalVersionId === currentProposalId &&
        (item.collaboratorId === invite?.id || (party.isCurrentUser && item.collaboratorId === "creator")),
    );
    const signature = document.splitSignatures.find(
      (item) =>
        item.proposalVersionId === currentProposalId &&
        (item.collaboratorId === invite?.id || (party.isCurrentUser && item.collaboratorId === "creator")),
    );

    return {
      partyId: party.id,
      inviteStatus: party.isCurrentUser ? "Accepted" : invite?.status ?? "Pending",
      approvalStatus: approval?.status ?? (party.isCurrentUser ? "Approved" : "Pending"),
      signatureStatus: signature?.status ?? "Pending",
    };
  });
}

export function queueContractDelivery(document: StoredSplitSheetDocument, actor: string): StoredSplitSheetDocument {
  return addDocumentAuditTrail(
    {
      ...document,
      status: document.status === "Draft" ? "Pending Collaborator Acceptance" : document.status,
      sentAt: document.sentAt || new Date().toISOString(),
    },
    actor,
    "Queued contract delivery through Supabase server-side services",
  );
}
