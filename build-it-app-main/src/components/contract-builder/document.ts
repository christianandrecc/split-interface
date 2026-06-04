import type { UserProfile } from "@/components/AccountAccess";
import type { ContractData } from "./types";
import { partyDisplayName } from "./types";

export type StoredSplitSheetStatus = "Draft" | "Pending Signatures" | "Executed";

export type StoredSplitSheetDocument = {
  id: string;
  title: string;
  status: StoredSplitSheetStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  storedAt?: string;
  sentAt?: string;
  documentNumber: string;
  data: ContractData;
  creatorProfile: UserProfile;
  collaborators: string[];
  auditTrail: {
    timestamp: string;
    actor: string;
    action: string;
  }[];
};

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
