import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { PublicProfileSearchResult } from "@/lib/globalSearch";
import type { UserProfile } from "@/lib/userProfile";

export type CollaboratorSuggestion = PublicProfileSearchResult & {
  email?: string;
  phoneNumber?: string;
  source: "recent" | "worked-with";
  lastInteractedAt?: string;
  interactionCount: number;
};

type CandidateInput = {
  userId?: string;
  username?: string;
  displayName?: string;
  roleTags?: string;
  profileImageUrl?: string;
  profileLocation?: string;
  email?: string;
  phoneNumber?: string;
  interactedAt?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLookup(value?: string | null) {
  return cleanText(value).replace(/^@+/, "").toLowerCase();
}

function phoneDigits(value?: string | null) {
  return cleanText(value).replace(/\D/g, "");
}

function firstKnownRole(value?: string | null) {
  return cleanText(value).split(",")[0]?.trim() || "";
}

function profileDisplayName(profile: UserProfile) {
  return (
    cleanText(profile.displayName) ||
    cleanText(profile.pkaNames).split(",")[0]?.trim() ||
    cleanText(profile.legalName) ||
    cleanText(profile.username) ||
    cleanText(profile.emailAddress) ||
    "SPLIT user"
  );
}

function candidateIsCurrentUser(candidate: CandidateInput, currentProfile: UserProfile) {
  const currentUserId = normalizeLookup(currentProfile.authUserId);
  const currentUsername = normalizeLookup(currentProfile.username);
  const currentEmail = normalizeLookup(currentProfile.emailAddress);
  const currentPhone = phoneDigits(`${currentProfile.phoneCountryCode ?? ""} ${currentProfile.phoneNumber ?? ""}`);

  if (currentUserId && normalizeLookup(candidate.userId) === currentUserId) return true;
  if (currentUsername && normalizeLookup(candidate.username) === currentUsername) return true;
  if (currentEmail && normalizeLookup(candidate.email) === currentEmail) return true;

  const candidatePhone = phoneDigits(candidate.phoneNumber);
  return Boolean(
    currentPhone &&
      candidatePhone &&
      currentPhone.endsWith(candidatePhone.slice(-10)),
  );
}

function candidateKey(candidate: CandidateInput) {
  return (
    normalizeLookup(candidate.userId) ||
    normalizeLookup(candidate.username) ||
    normalizeLookup(candidate.email) ||
    phoneDigits(candidate.phoneNumber) ||
    normalizeLookup(candidate.displayName)
  );
}

function candidateMatchesQuery(candidate: CollaboratorSuggestion, query: string) {
  const normalizedQuery = normalizeLookup(query);
  if (normalizedQuery.length < 2) return true;

  const searchable = [
    candidate.displayName,
    candidate.username,
    candidate.roleTags,
    candidate.profileLocation,
    candidate.email,
    candidate.phoneNumber,
  ].join(" ").toLowerCase();

  return searchable.includes(normalizedQuery);
}

function candidateFromProfile(profile: UserProfile, interactedAt?: string): CandidateInput {
  return {
    userId: profile.authUserId,
    username: profile.username,
    displayName: profileDisplayName(profile),
    roleTags: profile.roleTags,
    profileImageUrl: profile.profileImageUrl,
    profileLocation: profile.profileLocation || profile.country,
    email: profile.emailAddress,
    phoneNumber: [profile.phoneCountryCode, profile.phoneNumber].map(cleanText).filter(Boolean).join(" "),
    interactedAt,
  };
}

export function buildRecentCollaboratorSuggestions(
  documents: StoredSplitSheetDocument[],
  currentProfile: UserProfile,
  limit = 8,
): CollaboratorSuggestion[] {
  const suggestions = new Map<string, CollaboratorSuggestion>();

  const addCandidate = (candidate: CandidateInput) => {
    const key = candidateKey(candidate);
    if (!key || candidateIsCurrentUser(candidate, currentProfile)) return;

    const displayName = cleanText(candidate.displayName) || cleanText(candidate.username) || "SPLIT user";
    const existing = suggestions.get(key);
    const interactedAt = cleanText(candidate.interactedAt);

    if (existing) {
      const existingTime = existing.lastInteractedAt ? new Date(existing.lastInteractedAt).getTime() : 0;
      const candidateTime = interactedAt ? new Date(interactedAt).getTime() : 0;
      suggestions.set(key, {
        ...existing,
        displayName: existing.displayName || displayName,
        username: existing.username || cleanText(candidate.username),
        roleTags: existing.roleTags || cleanText(candidate.roleTags),
        profileImageUrl: existing.profileImageUrl || cleanText(candidate.profileImageUrl),
        profileLocation: existing.profileLocation || cleanText(candidate.profileLocation),
        email: existing.email || cleanText(candidate.email),
        phoneNumber: existing.phoneNumber || cleanText(candidate.phoneNumber),
        source: "worked-with",
        interactionCount: existing.interactionCount + 1,
        lastInteractedAt: candidateTime > existingTime ? interactedAt : existing.lastInteractedAt,
      });
      return;
    }

    suggestions.set(key, {
      type: "profile",
      userId: cleanText(candidate.userId),
      username: cleanText(candidate.username),
      displayName,
      roleTags: cleanText(candidate.roleTags),
      profileImageUrl: cleanText(candidate.profileImageUrl),
      profileLocation: cleanText(candidate.profileLocation),
      email: cleanText(candidate.email),
      phoneNumber: cleanText(candidate.phoneNumber),
      source: "recent",
      lastInteractedAt: interactedAt,
      interactionCount: 1,
    });
  };

  documents.forEach((document) => {
    const interactedAt = document.updatedAt || document.sentAt || document.createdAt;

    addCandidate(candidateFromProfile(document.creatorProfile, interactedAt));

    document.collaboratorInvites.forEach((invite) => {
      const snapshot = invite.profileSnapshot;
      addCandidate({
        username: snapshot?.username,
        displayName: snapshot?.displayName || invite.name,
        roleTags: snapshot?.role,
        email: snapshot?.email,
        phoneNumber: snapshot?.phoneNumber,
        interactedAt: invite.respondedAt || interactedAt,
      });
    });

    document.data.parties.forEach((party) => {
      addCandidate({
        username: party.inviteMethod === "username" ? party.inviteValue : party.splitId,
        displayName: party.professionalName || party.legalName || party.inviteValue,
        roleTags: party.role,
        email: party.email || (party.inviteMethod === "email" ? party.inviteValue : ""),
        phoneNumber: party.phoneNumber || (party.inviteMethod === "phone" ? party.inviteValue : ""),
        interactedAt,
      });
    });
  });

  return Array.from(suggestions.values())
    .sort((a, b) => {
      const recentDelta =
        new Date(b.lastInteractedAt || 0).getTime() - new Date(a.lastInteractedAt || 0).getTime();
      return recentDelta || b.interactionCount - a.interactionCount || a.displayName.localeCompare(b.displayName);
    })
    .slice(0, limit);
}

export function filterCollaboratorSuggestions(
  suggestions: CollaboratorSuggestion[],
  query: string,
  limit = 5,
) {
  return suggestions
    .filter((suggestion) => candidateMatchesQuery(suggestion, query))
    .slice(0, limit);
}
