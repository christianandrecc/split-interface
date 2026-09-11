import { normalizeSplitSheetParticipantId } from "@/lib/splitSheetParticipantState";
import type { NegotiationDeal, SplitVersion } from "@/lib/splitSheetNegotiation";

export type SummaryParticipantState = "Signed" | "Accepted" | "Pending" | "Invited" | "Invite declined" | "Changes requested";

export function dealSummaryParticipants(deal: NegotiationDeal, version: SplitVersion) {
  return version.allocations.map((allocation) => {
    const id = normalizeSplitSheetParticipantId(deal.document, allocation.participantId) ?? allocation.participantId;
    const participant = deal.participants.find((item) => item.id === id);
    const invite = deal.document.collaboratorInvites.find((item) => item.id === id);
    const accepted = deal.acceptedBy.includes(id);
    const signed = deal.signedBy.includes(id);
    const rejected = deal.document.splitApprovals.some((item) => item.proposalVersionId === version.id
      && normalizeSplitSheetParticipantId(deal.document, item.collaboratorId) === id && item.status === "Rejected");
    const state: SummaryParticipantState = invite?.status === "Declined" ? "Invite declined"
      : invite?.status === "Pending" ? "Invited" : signed ? "Signed" : rejected ? "Changes requested" : accepted ? "Accepted" : "Pending";
    return { ...allocation, id, handle: participant?.handle || "", state, accepted: accepted && invite?.status !== "Pending" && invite?.status !== "Declined", signed };
  });
}

export function compareSplitVersions(previous: SplitVersion, next: SplitVersion) {
  const before = new Map(previous.allocations.map((item) => [item.participantId, item]));
  const after = new Map(next.allocations.map((item) => [item.participantId, item]));
  return [...new Set([...after.keys(), ...before.keys()])].flatMap((id) => {
    const oldShare = before.get(id), newShare = after.get(id);
    if (oldShare?.percent === newShare?.percent) return [];
    return [{ id, name: newShare?.name || oldShare?.name || "Collaborator", before: oldShare?.percent ?? null, after: newShare?.percent ?? null }];
  });
}
