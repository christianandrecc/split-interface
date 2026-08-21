import {
  isStoredSplitSheetDocument,
  type StoredSplitSheetDocument,
} from "@/components/contract-builder/document";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { validateDocumentSplit } from "@/lib/splitSheetWorkflow";
import type { UserProfile } from "@/lib/userProfile";

const LOCAL_DOCUMENTS_KEY = "split.generatedDocuments.v3";
const LOCAL_DOCUMENTS_BY_OWNER_KEY = "split.generatedDocuments.byOwner.v1";

type SplitSheetRpcRow = {
  id: string;
  updated_at: string | null;
  document_payload: Json;
};

export type SplitSheetSaveMode = "draft" | "send" | "update" | "contract_delivery";
export type SplitSheetParticipantAction =
  | "invite_accept"
  | "invite_decline"
  | "split_accept"
  | "split_reject"
  | "counter_offer"
  | "sign"
  | "local_chat";

export type SplitSheetUpdateContext = {
  action?: SplitSheetParticipantAction | "creator_update" | "local_chat";
  responseType?: "invite_accept" | "invite_reject" | "split_accept" | "split_reject" | "signature";
  notes?: string;
};

export type SplitSheetSaveResult = {
  document: StoredSplitSheetDocument;
  persisted: boolean;
};

function ensureBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function splitSheetLocalStorageOwnerForAuthUser(userId?: string | null) {
  const cleanedUserId = (userId ?? "").trim();
  return cleanedUserId ? `auth:${cleanedUserId}` : undefined;
}

function readOwnedLocalDocuments(ownerKey: string) {
  const storage = ensureBrowserStorage();
  if (!storage) return [];

  try {
    const stored = storage.getItem(LOCAL_DOCUMENTS_BY_OWNER_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    const documents = parsed?.[ownerKey];
    return Array.isArray(documents)
      ? documents.filter(isStoredSplitSheetDocument)
      : [];
  } catch {
    return [];
  }
}

function writeOwnedLocalDocuments(ownerKey: string, documents: StoredSplitSheetDocument[]) {
  const storage = ensureBrowserStorage();
  if (!storage) return;

  try {
    const stored = storage.getItem(LOCAL_DOCUMENTS_BY_OWNER_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const next = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    next[ownerKey] = documents;
    storage.setItem(LOCAL_DOCUMENTS_BY_OWNER_KEY, JSON.stringify(next));
  } catch {
    storage.setItem(LOCAL_DOCUMENTS_BY_OWNER_KEY, JSON.stringify({ [ownerKey]: documents }));
  }
}

function documentVisibleToProfile(document: StoredSplitSheetDocument, profile?: UserProfile) {
  if (!profile) return true;
  if (documentBelongsToProfile(document, profile)) return true;
  if (document.status === "Draft" || !document.sentAt) return false;
  return Boolean(findInviteForProfile(document, profile));
}

export function loadLocalSplitSheetDocuments(profile?: UserProfile, ownerKey?: string): StoredSplitSheetDocument[] {
  if (ownerKey) {
    return readOwnedLocalDocuments(ownerKey).filter((document) => documentVisibleToProfile(document, profile));
  }

  const storage = ensureBrowserStorage();
  if (!storage) return [];

  try {
    const stored = storage.getItem(LOCAL_DOCUMENTS_KEY) || storage.getItem("split.generatedDocuments.v2");
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed
          .filter(isStoredSplitSheetDocument)
          .filter((document) => documentVisibleToProfile(document, profile))
      : [];
  } catch {
    return [];
  }
}

export function saveLocalSplitSheetDocuments(documents: StoredSplitSheetDocument[], ownerKey?: string) {
  if (ownerKey) {
    writeOwnedLocalDocuments(ownerKey, documents);
    return;
  }

  const storage = ensureBrowserStorage();
  if (!storage) return;

  storage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(documents));
}

function upsertLocalDocument(document: StoredSplitSheetDocument, ownerKey?: string) {
  const current = loadLocalSplitSheetDocuments(undefined, ownerKey);
  const next = current.some((item) => item.id === document.id)
    ? current.map((item) => (item.id === document.id ? document : item))
    : [document, ...current];

  saveLocalSplitSheetDocuments(next, ownerKey);
}

function removeLocalDocument(documentId: string, ownerKey?: string) {
  const next = loadLocalSplitSheetDocuments(undefined, ownerKey).filter((document) => document.id !== documentId);
  saveLocalSplitSheetDocuments(next, ownerKey);
}

export function splitSheetCanUseLocalDraftFallback(document: StoredSplitSheetDocument) {
  return document.status === "Draft" || !document.sentAt;
}

function localDraftResults(documents: StoredSplitSheetDocument[]): SplitSheetSaveResult[] {
  return documents
    .filter(splitSheetCanUseLocalDraftFallback)
    .map((document) => ({ document, persisted: false }));
}

function dedupeDocuments(documents: StoredSplitSheetDocument[]) {
  const byId = new Map<string, StoredSplitSheetDocument>();

  for (const document of documents) {
    const current = byId.get(document.id);
    if (!current || new Date(document.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
      byId.set(document.id, document);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function explainPersistenceError(error: unknown) {
  return error instanceof Error ? error.message : "Supabase did not save this split sheet.";
}

function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for split-sheet storage.");
  }
}

function inferCreatorName(profile: UserProfile) {
  return profile.displayName || profile.legalName || profile.emailAddress || profile.username || "SPLIT user";
}

async function getActiveUserId() {
  requireSupabaseConfig();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in before saving split sheets to Supabase.");
  return data.user.id;
}

function normalizeIdentifier(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/^@+/, "");
}

function phoneDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function partyMatchesProfile(
  party: StoredSplitSheetDocument["data"]["parties"][number] | undefined,
  profile: UserProfile,
) {
  if (!party) return false;

  const profileUsername = normalizeIdentifier(profile.username);
  const profileEmail = normalizeIdentifier(profile.emailAddress);
  const profilePhone = phoneDigits(`${profile.phoneCountryCode ?? ""} ${profile.phoneNumber ?? ""}`);
  const partyUsernameValues = [party.inviteValue, party.splitId]
    .map(normalizeIdentifier)
    .filter(Boolean);
  const partyEmailValues = [party.email, party.inviteMethod === "email" ? party.inviteValue : ""]
    .map(normalizeIdentifier)
    .filter(Boolean);
  const partyPhoneValues = [party.phoneNumber, party.inviteMethod === "phone" ? party.inviteValue : ""]
    .map(phoneDigits)
    .filter(Boolean);

  if (profileUsername && partyUsernameValues.includes(profileUsername)) return true;
  if (profileEmail && partyEmailValues.includes(profileEmail)) return true;

  return Boolean(
    profilePhone &&
      partyPhoneValues.some((value) => value && profilePhone.endsWith(value.slice(-10))),
  );
}

export function documentBelongsToProfile(document: StoredSplitSheetDocument, profile: UserProfile) {
  const creator = document.creatorProfile;

  return Boolean(
    (creator.username && normalizeIdentifier(creator.username) === normalizeIdentifier(profile.username)) ||
      (creator.emailAddress && normalizeIdentifier(creator.emailAddress) === normalizeIdentifier(profile.emailAddress)) ||
      (creator.splitId && normalizeIdentifier(creator.splitId) === normalizeIdentifier(profile.splitId))
  );
}

export function findInviteForProfile(document: StoredSplitSheetDocument, profile: UserProfile) {
  const profileUsername = normalizeIdentifier(profile.username);
  const profileEmail = normalizeIdentifier(profile.emailAddress);
  const profilePhone = phoneDigits(`${profile.phoneCountryCode ?? ""} ${profile.phoneNumber ?? ""}`);

  return document.collaboratorInvites.find((invite) => {
    const inviteValue = normalizeIdentifier(invite.inviteValue);
    const snapshot = invite.profileSnapshot;
    const party = document.data.parties.find((item) => item.id === invite.partyId);

    if (profileUsername && (
      inviteValue === profileUsername ||
      normalizeIdentifier(snapshot?.username) === profileUsername
    )) {
      return true;
    }

    if (profileEmail && (
      inviteValue === profileEmail ||
      normalizeIdentifier(snapshot?.email) === profileEmail
    )) {
      return true;
    }

    const invitePhone = phoneDigits(invite.inviteValue || snapshot?.phoneNumber);
    return Boolean(
      (profilePhone && invitePhone && profilePhone.endsWith(invitePhone.slice(-10))) ||
        partyMatchesProfile(party, profile)
    );
  });
}

export function documentParticipantIdsForProfile(document: StoredSplitSheetDocument, profile: UserProfile) {
  const ids = new Set<string>();
  const viewerInvite = findInviteForProfile(document, profile);
  const viewerInviteParty = viewerInvite
    ? document.data.parties.find((party) => party.id === viewerInvite.partyId)
    : undefined;
  const hasCollaboratorIdentity = Boolean(viewerInvite && !viewerInviteParty?.isCurrentUser);

  if (documentBelongsToProfile(document, profile) && !hasCollaboratorIdentity) {
    ids.add("creator");
    const creatorParty = document.data.parties.find((party) => party.isCurrentUser);
    if (creatorParty?.id) ids.add(creatorParty.id);
  }

  if (viewerInvite) {
    ids.add(viewerInvite.id);
    ids.add(viewerInvite.partyId);
  }

  document.data.parties.forEach((party) => {
    if (hasCollaboratorIdentity && party.isCurrentUser) return;
    if (!partyMatchesProfile(party, profile)) return;

    ids.add(party.id);
    const invite = document.collaboratorInvites.find((item) => item.partyId === party.id);
    if (invite) {
      ids.add(invite.id);
      ids.add(invite.partyId);
    }
  });

  return ids;
}

function rpcRowToDocument(row: SplitSheetRpcRow): StoredSplitSheetDocument | null {
  return isStoredSplitSheetDocument(row.document_payload) ? row.document_payload : null;
}

export async function loadSplitSheetDocuments(profile?: UserProfile): Promise<SplitSheetSaveResult[]> {
  const localDocuments = loadLocalSplitSheetDocuments(profile).map((document) => ({ document, persisted: false }));

  if (!isSupabaseConfigured) return localDocuments;

  const legacyLocalDrafts = localDraftResults(loadLocalSplitSheetDocuments(profile));
  let scopedLocalDrafts: SplitSheetSaveResult[] = [];
  let authenticatedUserLoaded = false;

  try {
    const userId = await getActiveUserId();
    authenticatedUserLoaded = true;
    const ownerKey = splitSheetLocalStorageOwnerForAuthUser(userId);
    scopedLocalDrafts = localDraftResults(loadLocalSplitSheetDocuments(profile, ownerKey));
    const { data, error } = await supabase.rpc("load_my_split_sheets");
    if (error) throw new Error(error.message);

    const remoteDocuments = ((data ?? []) as SplitSheetRpcRow[])
      .map(rpcRowToDocument)
      .filter((document): document is StoredSplitSheetDocument => Boolean(document));
    const remoteDocumentIds = new Set(remoteDocuments.map((document) => document.id));
    const scopedLocalOnlyDocuments = scopedLocalDrafts
      .map((result) => result.document)
      .filter((document) => !remoteDocumentIds.has(document.id));
    const mergedDocuments = dedupeDocuments([...remoteDocuments, ...scopedLocalOnlyDocuments]);

    saveLocalSplitSheetDocuments(scopedLocalOnlyDocuments, ownerKey);
    saveLocalSplitSheetDocuments([]);

    return mergedDocuments.map((document) => ({
      document,
      persisted: remoteDocumentIds.has(document.id),
    }));
  } catch (error) {
    console.warn("SPLIT could not load split sheets from Supabase.", error);
    return authenticatedUserLoaded ? scopedLocalDrafts : legacyLocalDrafts;
  }
}

export async function saveSplitSheetDocument(
  document: StoredSplitSheetDocument,
  mode: SplitSheetSaveMode,
  profile: UserProfile,
): Promise<SplitSheetSaveResult> {
  const actor = inferCreatorName(profile);
  const splitValidation = validateDocumentSplit(document);
  if (!splitValidation.valid) {
    throw new Error(splitValidation.errors.join(" "));
  }

  if (!isSupabaseConfigured) {
    upsertLocalDocument(document);
    return { document, persisted: false };
  }

  try {
    const userId = await getActiveUserId();
    const ownerKey = splitSheetLocalStorageOwnerForAuthUser(userId);
    const canUseLocalDraftFallback = splitSheetCanUseLocalDraftFallback(document);
    if (canUseLocalDraftFallback && mode !== "send" && mode !== "contract_delivery") {
      upsertLocalDocument(document, ownerKey);
    }

    const { data, error } = await supabase.rpc("upsert_split_sheet_document", {
      p_document_payload: document as unknown as Json,
      p_mode: mode,
      p_actor_label: actor,
    });

    if (error) throw new Error(error.message);

    const persistedDocument = isStoredSplitSheetDocument(data) ? data : document;
    removeLocalDocument(persistedDocument.id, ownerKey);

    return {
      document: persistedDocument,
      persisted: true,
    };
  } catch (error) {
    console.warn("SPLIT could not save this split sheet to Supabase.", error);
    if (mode === "send" || mode === "contract_delivery") {
      throw new Error(`Could not send this split sheet through Supabase. ${explainPersistenceError(error)}`);
    }
    if (!splitSheetCanUseLocalDraftFallback(document)) {
      throw new Error(`Could not save this split sheet through Supabase. ${explainPersistenceError(error)}`);
    }

    return {
      document,
      persisted: false,
    };
  }
}

export async function saveSplitSheetParticipantAction(
  document: StoredSplitSheetDocument,
  context: SplitSheetUpdateContext,
  profile: UserProfile,
): Promise<SplitSheetSaveResult> {
  const actor = inferCreatorName(profile);
  const splitValidation = validateDocumentSplit(document);
  if (!splitValidation.valid) {
    throw new Error(splitValidation.errors.join(" "));
  }

  if (!isSupabaseConfigured) {
    upsertLocalDocument(document);
    return { document, persisted: false };
  }

  if (!context.action || context.action === "creator_update") {
    return saveSplitSheetDocument(document, "update", profile);
  }

  try {
    const userId = await getActiveUserId();
    const ownerKey = splitSheetLocalStorageOwnerForAuthUser(userId);

    const { data, error } = await supabase.rpc("apply_split_sheet_participant_update", {
      p_split_sheet_id: document.id,
      p_document_payload: document as unknown as Json,
      p_action: context.action,
      p_actor_label: actor,
      p_response_type: context.responseType ?? null,
      p_notes: context.notes ?? null,
    });

    if (error) throw new Error(error.message);

    const persistedDocument = isStoredSplitSheetDocument(data) ? data : document;
    removeLocalDocument(persistedDocument.id, ownerKey);

    return {
      document: persistedDocument,
      persisted: true,
    };
  } catch (error) {
    console.warn("SPLIT could not save this participant action to Supabase.", error);
    throw new Error(`Could not save this Messages update through Supabase. ${explainPersistenceError(error)}`);
  }
}
