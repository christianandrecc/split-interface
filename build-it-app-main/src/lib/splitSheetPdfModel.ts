import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { Party } from "@/components/contract-builder/types";
import type { UserProfile } from "@/lib/userProfile";
import { formatSplitSheetAuditTrail, splitSheetPartyDisplayName } from "@/lib/splitSheetDisplay";
import { normalizeSplitSheetParticipantId } from "@/lib/splitSheetParticipantState";
import { VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";

export const recordText = (value: unknown) => String(value ?? "").normalize("NFC").replace(/\p{Cc}/gu, " ").trim();
export const validRecordDate = (value?: string) => Boolean(value && Number.isFinite(Date.parse(value)));

export function recordDate(value?: string, time = false) {
  if (!validRecordDate(value)) return "Not recorded";
  // Date-only work metadata is a calendar date, not an instant in the viewer's timezone.
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
    ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export function recordProfileName(profile: UserProfile) {
  const legal = recordText(profile.legalName);
  const artist = recordText(profile.pkaNames || profile.displayName);
  return legal ? legal + (artist && artist !== legal ? ` (${artist})` : "") : artist || profile.username || "Name not recorded";
}

export function buildSplitSheetPdfModel(document: StoredSplitSheetDocument, viewer: UserProfile, exportedAt = new Date().toISOString()) {
  const proposal = document.currentProposalId
    ? document.splitProposalVersions.find((item) => item.id === document.currentProposalId)
    : document.splitProposalVersions.at(-1);
  const allocationIds = new Set(proposal?.allocations.map((item) => item.partyId));
  const validAllocationSet = Boolean(proposal && allocationIds.size === document.data.parties.length &&
    proposal.allocations.length === allocationIds.size && document.data.parties.every((party) => allocationIds.has(party.id)));
  const people = document.data.parties.map((party) => {
    const invite = document.collaboratorInvites.find((item) => item.partyId === party.id);
    const id = normalizeSplitSheetParticipantId(document, party.isCurrentUser ? "creator" : invite?.id || party.id);
    const signatures = document.splitSignatures.filter((item) => item.proposalVersionId === proposal?.id &&
      normalizeSplitSheetParticipantId(document, item.collaboratorId) === id);
    const signature = signatures.find((item) => item.status === "Signed" && validRecordDate(item.signedAt) && item.signatureMethod !== "SPLIT beta acknowledgement");
    const legal = recordText(signature?.signerLegalName || party.legalName || (party.isCurrentUser ? document.creatorProfile.legalName : ""));
    const artist = recordText(signature?.signerArtistName || party.professionalName || splitSheetPartyDisplayName(document, party));
    const name = legal ? legal + (artist && artist !== legal ? ` (${artist})` : "") : `${artist} (legal name not recorded)`;
    const allocation = proposal?.allocations.find((item) => item.partyId === party.id);
    const share = allocation ? Number(allocation.percentage) : Number(party.percent);
    if (!Number.isFinite(share) || share < 0 || share > 100) throw new Error("The split has an invalid percentage. Reopen the record before exporting.");
    const approved = document.splitApprovals.some((item) => item.proposalVersionId === proposal?.id &&
      normalizeSplitSheetParticipantId(document, item.collaboratorId) === id && item.status === "Approved");
    return { id, party, legal, artist: artist === legal ? "" : artist, name, share, role: allocation?.role || party.role || "Collaborator", signature, approved };
  });
  const total = Math.round(people.reduce((sum, person) => sum + person.share, 0) * 100) / 100;
  const signedCount = people.filter((person) => person.signature).length;
  const signed = people.length > 0 && signedCount === people.length && total === 100 && validAllocationSet && VERIFIED_SPLIT_STATUSES.includes(document.status);
  const verified = signed && validRecordDate(document.verifiedAt);
  const signedDates = people.map((person) => person.signature?.signedAt).filter(validRecordDate).sort();
  const finalizedAt = signed ? document.verifiedAt || signedDates.at(-1) : undefined;
  const resolveActor = (actor: string) => {
    const key = recordText(actor).replace(/^@/, "").toLowerCase();
    const matches = people.filter((person) => {
      const aliases = [person.legal, person.artist, person.party.email, person.party.inviteValue,
        ...(person.party.isCurrentUser ? [document.creatorProfile.emailAddress, document.creatorProfile.username, document.creatorProfile.displayName] : [])];
      return aliases.some((alias) => alias && recordText(alias).replace(/^@/, "").toLowerCase() === key);
    });
    return matches.length === 1 ? matches[0].name : recordText(actor) || "Actor not recorded";
  };
  return {
    document, proposal, people, total, signedCount, signed, verified, finalizedAt, exportedAt,
    title: recordText(document.data.songTitle || document.title || "Untitled work"),
    documentId: recordText(document.documentNumber) || "ID not recorded",
    creator: people.find((person) => person.party.isCurrentUser)?.name || recordProfileName(document.creatorProfile), viewer: recordProfileName(viewer), resolveActor,
    events: formatSplitSheetAuditTrail(document).map((event, index) => ({ ...event, actor: resolveActor(event.actor), index }))
      .sort((a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0) || a.index - b.index),
  };
}

export type SplitSheetPdfModel = ReturnType<typeof buildSplitSheetPdfModel>;
export type PdfPerson = SplitSheetPdfModel["people"][number];
export type PdfField = [label: string, value: string];

export function supportingFields(model: SplitSheetPdfModel): Array<{ title: string; fields: PdfField[] }> {
  const d = model.document.data;
  const fields = (items: Array<[string, unknown]>): PdfField[] => items.filter(([, value]) => recordText(value)).map(([key, value]) => [key, recordText(value)]);
  const yesNo = (value: boolean) => value === true ? "Yes" : value === false ? "No" : "Not recorded";
  const partyFields = (p: Party) => fields([
    ["Role", p.role], ["Contribution", [p.contributionCategories?.join(", "), p.contributionDescription].filter(Boolean).join(" / ")],
    ["Country", p.country], ["PRO", p.proAffiliation === "Other" ? p.customProName : p.proAffiliation],
    ["IPI / CAE", p.ipiNumber], ["PRO member number", p.proMemberNumber], ["Society territory", p.societyTerritory],
    ["Publishing status", p.publishingStatus], ["Publisher", p.publisherName], ["Publisher IPI", p.publisherIpi],
    ["Publisher PRO", p.publisherPro], ["Publisher contact", p.publisherContact], ["Registration notes", p.registrationNotes],
  ]);
  return [
    { title: "Work metadata", fields: fields([
      ["Work title", model.title], ["Work creation date", recordDate(d.creationDate)],
      ["Artist / project", model.resolveActor(d.artistProjectName || d.recordingArtist || "Not recorded")], ["Record created", `${recordDate(model.document.createdAt, true)} UTC`],
      ["Alternate titles", d.alternateTitles], ["Composition type", d.compositionType], ["Language", d.lyricLanguage],
      ["Creation location", d.creationLocation], ["Studio", d.studioName], ["Work notes", d.workNotes], ["ISWC", d.iswc], ["Related ISRC", d.relatedIsrc],
    ]) },
    ...model.people.map((p) => ({ title: p.name, fields: partyFields(p.party) })),
    { title: "Registration & release", fields: fields([
      ["Recording artist", d.recordingArtist ? model.resolveActor(d.recordingArtist) : ""], ["Recording title", d.recordingTitle], ["Release status", d.releaseStatus],
      ["Release date", d.releaseDate], ["Expected release date", d.expectedReleaseDate], ["Distributor", d.distributor], ["Label", d.label], ["UPC", d.upc],
      ["Registration contact", d.registrationContactType], ["Designated contact", d.designatedContactName], ["Contact role", d.designatedContactRole],
      ["Contact email", d.designatedContactEmail], ["Contact authority", d.designatedContactAuthority], ["Registration deadline", d.registrationDeadline],
    ]) },
    { title: "Clearance & disclosures", fields: fields([
      ["Sample status", d.sampleStatus], ["Clearance status", d.sampleClearanceStatus], ["Sample notes", d.sampleNotes], ["Original work", d.sampleOriginalWork],
      ["Original artist", d.sampleOriginalArtist], ["Original writers", d.sampleOriginalWriters], ["Original publishers", d.sampleOriginalPublishers],
      ["Master owner", d.sampleMasterOwner], ["Portion used", d.samplePortion], ["Agreed sample share", d.sampleAgreedShare],
      ["Public domain status", d.publicDomainStatus], ["Source", d.publicDomainSource], ["Jurisdiction", d.publicDomainJurisdiction], ["Claim", d.publicDomainClaim],
      ["Dispute status", d.disputeStatus], ["Disputed contributor", d.disputeContributor], ["Disputed share", d.disputePercent], ["Reason", d.disputeReason], ["Evidence", d.disputeEvidence],
      ["Freeze registration", yesNo(d.freezeRegistration)], ["Export undisputed shares", yesNo(d.exportUndisputedShares)],
    ]) },
    { title: "Recorded authorizations", fields: fields([
      ["Split percentages", yesNo(d.authorizeSplitPercent)], ["Personal metadata", yesNo(d.authorizePersonalMetadata)],
      ["Contribution descriptions", yesNo(d.authorizeContributionDescription)], ["PRO / IPI", yesNo(d.authorizeProIpi)],
      ["Publisher / administrator", yesNo(d.authorizePublisherAdmin)], ["Registration use", yesNo(d.authorizeRegistrationUse)],
      ["Export packet", yesNo(d.exportPacket)], ["Send to PRO", yesNo(d.sendToPRO)], ["Send to MLC", yesNo(d.sendToMLC)],
      ["Send to publisher / administrator", yesNo(d.sendToPublisherAdmin)], ["Approval before submission", yesNo(d.requireApprovalBeforeSubmission)],
      ["Designated submitter allowed", yesNo(d.allowDesignatedSubmitter)], ["All signatures required", yesNo(d.requireAllSignatures)],
      ["Signing order", yesNo(d.signingOrderEnabled)], ["Conditional signatures", yesNo(d.conditionalSignatures)], ["Audit trail requested", yesNo(d.includeAuditTrail)],
    ]) },
  ].filter((group) => group.fields.length);
}
