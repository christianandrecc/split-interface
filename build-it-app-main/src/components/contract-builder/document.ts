import type { UserProfile } from "@/lib/userProfile";
import type { ContractData } from "./types";
import { partyDisplayName } from "./types";

export type StoredSplitSheetStatus =
  | "Draft"
  | "Pending Collaborator Acceptance"
  | "Pending Split Approval"
  | "Revision Requested"
  | "Ready to Sign"
  | "Pending Signatures"
  | "Fully Signed"
  | "Verified and Stored"
  | "Executed"
  | "Amended"
  | "Disputed"
  | "Archived";

export type StoredSplitSheetDocument = {
  id: string;
  title: string;
  status: StoredSplitSheetStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  storedAt?: string;
  sentAt?: string;
  verifiedAt?: string;
  documentNumber: string;
  data: ContractData;
  creatorProfile: UserProfile;
  collaborators: string[];
  collaboratorInvites: {
    id: string;
    partyId: string;
    name: string;
    inviteMethod: string;
    inviteValue: string;
    status: "Pending" | "Accepted" | "Declined";
    respondedAt?: string;
    profileSnapshot?: {
      username?: string;
      displayName?: string;
      role?: string;
      email?: string;
      phoneNumber?: string;
      splitId?: string;
    };
  }[];
  currentProposalId?: string;
  splitProposalVersions: {
    id: string;
    versionNumber: number;
    proposedBy: string;
    notes: string;
    createdAt: string;
    allocations: {
      partyId: string;
      name: string;
      role: string;
      percentage: number;
      notes?: string;
    }[];
  }[];
  splitApprovals: {
    id: string;
    proposalVersionId: string;
    collaboratorId: string;
    collaboratorName: string;
    status: "Pending" | "Approved" | "Rejected";
    notes?: string;
    respondedAt?: string;
  }[];
  splitSignatures: {
    id: string;
    proposalVersionId: string;
    collaboratorId: string;
    collaboratorName: string;
    status: "Pending" | "Signed";
    signedAt?: string;
    signatureMethod?: string;
  }[];
  auditTrail: {
    timestamp: string;
    actor: string;
    action: string;
  }[];
};

export function isStoredSplitSheetDocument(value: unknown): value is StoredSplitSheetDocument {
  if (!value || typeof value !== "object") return false;

  const candidate = value as StoredSplitSheetDocument;
  return Boolean(
    candidate.id &&
      candidate.data &&
      Array.isArray(candidate.data.parties) &&
      Array.isArray(candidate.auditTrail),
  );
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "split_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function actorName(profile: UserProfile) {
  return profile.legalName || profile.emailAddress || profile.splitId || "SPLIT user";
}

export function createSplitSheetDocument(data: ContractData, creatorProfile: UserProfile): StoredSplitSheetDocument {
  const now = new Date().toISOString();
  const id = makeId();
  const compactId = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  const title = (data.songTitle || "Untitled Song") + " SPLIT Sheet";
  const collaborators = data.parties
    .filter((party) => !party.isCurrentUser)
    .map((party) => partyDisplayName(party));
  const collaboratorInvites = data.parties
    .filter((party) => !party.isCurrentUser)
    .map((party) => ({
      id: makeId(),
      partyId: party.id,
      name: partyDisplayName(party),
      inviteMethod: party.inviteMethod,
      inviteValue: party.inviteValue || party.email || party.phoneNumber || party.splitId,
      status: "Pending" as const,
      profileSnapshot: {
        displayName: party.professionalName || party.legalName || party.inviteValue,
        role: party.role,
        email: party.email,
        phoneNumber: party.phoneNumber,
        splitId: party.splitId,
      },
    }));
  const proposalId = makeId();

  return {
    id,
    title,
    status: "Draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
    documentNumber: "SPLIT-" + now.slice(0, 10).replace(/-/g, "") + "-" + compactId,
    data,
    creatorProfile,
    collaborators,
    collaboratorInvites,
    currentProposalId: proposalId,
    splitProposalVersions: [
      {
        id: proposalId,
        versionNumber: 1,
        proposedBy: actorName(creatorProfile),
        notes: "Initial split proposal",
        createdAt: now,
        allocations: data.parties.map((party) => ({
          partyId: party.id,
          name: partyDisplayName(party),
          role: party.role || "Collaborator",
          percentage: Number(party.percent) || 0,
          notes: party.contributionDescription,
        })),
      },
    ],
    splitApprovals: [
      {
        id: makeId(),
        proposalVersionId: proposalId,
        collaboratorId: "creator",
        collaboratorName: actorName(creatorProfile),
        status: "Approved",
        respondedAt: now,
      },
    ],
    splitSignatures: [],
    auditTrail: [
      {
        timestamp: now,
        actor: actorName(creatorProfile),
        action: "SPLIT Sheet preview generated",
      },
    ],
  };
}

export function addDocumentAuditTrail(
  document: StoredSplitSheetDocument,
  actor: string,
  action: string,
): StoredSplitSheetDocument {
  const now = new Date().toISOString();

  return {
    ...document,
    updatedAt: now,
    auditTrail: [
      ...document.auditTrail,
      {
        timestamp: now,
        actor,
        action,
      },
    ],
  };
}
