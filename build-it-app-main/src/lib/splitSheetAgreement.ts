import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import {
  splitSheetAllocationDisplayName,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import {
  buildSplitSheetSignatureRecords,
  ensureSplitSheetCreatorApproval,
} from "@/lib/splitSheetParticipantState";

export type Agreement = {
  id: string;
  title: string;
  type: "Split Sheet";
  status: StoredSplitSheetDocument["status"];
  parties: string[];
  version: number;
  created: string;
  updated: string;
  splits: { name: string; role: string; percent: number }[];
  document?: StoredSplitSheetDocument;
};

function documentPartyName(document: StoredSplitSheetDocument, party: StoredSplitSheetDocument["data"]["parties"][number]) {
  return splitSheetPartyDisplayName(document, party);
}

function isPlaceholderName(value?: string) {
  return /^(invited writer|invited collaborator|collaborator|contributor|pending)$/i.test((value ?? "").trim());
}

function documentCollaboratorInvites(document: StoredSplitSheetDocument) {
  if (Array.isArray(document.collaboratorInvites) && document.collaboratorInvites.length > 0) {
    return document.collaboratorInvites.map((invite) => {
      const party = document.data.parties.find((item) => item.id === invite.partyId);
      const name = splitSheetPartyDisplayName(document, party, invite.name || "Invited writer");
      const snapshotDisplayName = invite.profileSnapshot?.displayName;

      return {
        ...invite,
        name,
        profileSnapshot: {
          ...invite.profileSnapshot,
          displayName: snapshotDisplayName && !isPlaceholderName(snapshotDisplayName) ? snapshotDisplayName : name,
        },
      };
    });
  }

  return document.data.parties
    .filter((party) => !party.isCurrentUser)
    .map((party) => ({
      id: party.id,
      partyId: party.id,
      name: documentPartyName(document, party),
      inviteMethod: party.inviteMethod,
      inviteValue: party.inviteValue || party.email || party.phoneNumber || party.splitId,
      status: "Pending" as const,
      profileSnapshot: {
        displayName: documentPartyName(document, party),
        role: party.role,
        email: party.email,
        phoneNumber: party.phoneNumber,
        splitId: party.splitId,
      },
    }));
}

function documentSplitProposals(document: StoredSplitSheetDocument) {
  if (Array.isArray(document.splitProposalVersions) && document.splitProposalVersions.length > 0) {
    return document.splitProposalVersions.map((proposal) => ({
      ...proposal,
      allocations: proposal.allocations.map((allocation) => ({
        ...allocation,
        name: splitSheetAllocationDisplayName(document, allocation),
      })),
    }));
  }

  const proposalId = document.currentProposalId || `${document.id}-proposal-1`;
  return [
    {
      id: proposalId,
      versionNumber: document.version || 1,
      proposedBy: document.creatorProfile.displayName || document.creatorProfile.legalName || document.creatorProfile.emailAddress || "SPLIT user",
      notes: "Initial split proposal",
      createdAt: document.createdAt || new Date().toISOString(),
      allocations: document.data.parties.map((party) => ({
        partyId: party.id,
        name: documentPartyName(document, party),
        role: party.role || "Collaborator",
        percentage: Number(party.percent) || 0,
        notes: party.contributionDescription,
      })),
    },
  ];
}

function documentSplitApprovals(
  document: StoredSplitSheetDocument,
  proposalId: string,
  invites: ReturnType<typeof documentCollaboratorInvites>,
) {
  const currentProposal = document.splitProposalVersions.find((proposal) => proposal.id === proposalId);

  if (Array.isArray(document.splitApprovals) && document.splitApprovals.length > 0) {
    return ensureSplitSheetCreatorApproval(document, document.splitApprovals, currentProposal, currentProposal?.createdAt || document.createdAt).map((approval) => ({
      ...approval,
      collaboratorName: splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName),
    }));
  }

  const creatorName = document.creatorProfile.displayName || document.creatorProfile.legalName || document.creatorProfile.emailAddress || "SPLIT user";
  return [
    {
      id: `${document.id}-creator-approval`,
      proposalVersionId: proposalId,
      collaboratorId: "creator",
      collaboratorName: creatorName,
      status: "Approved" as const,
      respondedAt: document.createdAt,
    },
    ...invites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({
        id: `${document.id}-${invite.id}-approval`,
        proposalVersionId: proposalId,
        collaboratorId: invite.id,
        collaboratorName: splitSheetParticipantDisplayName(document, invite.id, invite.name),
        status: "Pending" as const,
      })),
  ];
}

function documentSplitSignatures(
  document: StoredSplitSheetDocument,
  proposalId: string,
  invites: ReturnType<typeof documentCollaboratorInvites>,
) {
  const documentWithInvites = {
    ...document,
    collaboratorInvites: invites,
  };

  if (Array.isArray(document.splitSignatures) && document.splitSignatures.length > 0) {
    return buildSplitSheetSignatureRecords(documentWithInvites, proposalId).map((signature) => ({
      ...signature,
      collaboratorName: splitSheetParticipantDisplayName(document, signature.collaboratorId, signature.collaboratorName),
    }));
  }

  const signatureStatuses = ["Pending Signatures", "Fully Signed", "Verified and Stored", "Executed"];
  const isSignedRecord = ["Fully Signed", "Verified and Stored", "Executed"].includes(document.status);
  const signedAt = isSignedRecord ? document.verifiedAt || document.updatedAt || document.createdAt : undefined;

  if (!signatureStatuses.includes(document.status) && document.status !== "Ready to Sign") {
    return [];
  }

  return buildSplitSheetSignatureRecords(documentWithInvites, proposalId, {
    signed: isSignedRecord,
    signedAt,
    signatureMethod: isSignedRecord ? "SPLIT beta acknowledgement" : undefined,
  }).filter((signature) => signature.proposalVersionId === proposalId);
}

export function documentToAgreement(document: StoredSplitSheetDocument): Agreement {
  const parties = Array.isArray(document.data.parties) ? document.data.parties : [];
  const created = document.createdAt || new Date().toISOString();
  const updated = document.updatedAt || created;
  const collaboratorInvites = documentCollaboratorInvites(document);
  const splitProposalVersions = documentSplitProposals(document);
  const currentProposalId = document.currentProposalId || splitProposalVersions[splitProposalVersions.length - 1]?.id;
  const normalizedDocument = {
    ...document,
    currentProposalId,
    collaboratorInvites,
    splitProposalVersions,
    splitApprovals: documentSplitApprovals(document, currentProposalId, collaboratorInvites),
    splitSignatures: documentSplitSignatures(document, currentProposalId, collaboratorInvites),
  };

  return {
    id: document.id,
    title: document.data.songTitle || document.title || "Untitled SPLIT Sheet",
    type: "Split Sheet",
    status: document.status || "Draft",
    parties: parties.map((party) => documentPartyName(document, party)),
    version: document.version || 1,
    created: created.slice(0, 10),
    updated: updated.slice(0, 10),
    splits: parties.map((party) => ({
      name: documentPartyName(document, party),
      role: party.role || "Songwriter",
      percent: Number(party.percent) || 0,
    })),
    document: normalizedDocument,
  };
}
