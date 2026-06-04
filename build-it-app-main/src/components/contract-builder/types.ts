export const STEPS = [
  { id: "metadata", label: "Song", num: 1 },
  { id: "parties", label: "Writers", num: 2 },
  { id: "rights", label: "Registration", num: 3 },
  { id: "clauses", label: "Clearance", num: 4 },
  { id: "signatures", label: "Authorization", num: 5 },
  { id: "review", label: "Review", num: 6 },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const COMPOSITION_TYPES = [
  "Original Song",
  "Instrumental Composition",
  "Topline",
  "Adaptation / Translation",
  "Public Domain Arrangement",
  "Other",
] as const;

export const LANGUAGE_OPTIONS = ["English", "Spanish", "Bilingual", "Instrumental", "Other"] as const;

export const ROLE_OPTIONS = [
  "Songwriter",
  "Composer",
  "Lyricist",
  "Topliner",
  "Beatmaker (Composition)",
  "Producer (Composition Only)",
  "Arranger",
  "Translator / Adapter",
  "Contributor",
  "Other",
] as const;

export const COUNTRY_OPTIONS = [
  "United States",
  "Puerto Rico",
  "Mexico",
  "Colombia",
  "Dominican Republic",
  "Spain",
  "Canada",
  "United Kingdom",
  "Australia",
  "Other",
] as const;

export const PRO_OPTIONS = [
  "ASCAP",
  "BMI",
  "SESAC",
  "GMR",
  "PRS",
  "SOCAN",
  "SACM",
  "SGAE",
  "SAYCO",
  "APRA AMCOS",
  "Other",
  "None",
  "Unknown",
] as const;

export const CONTRIBUTION_OPTIONS = [
  "Lyrics",
  "Melody",
  "Topline",
  "Composition / Music",
  "Hook",
  "Arrangement",
  "Beat / instrumental composition",
  "Sample or interpolation contribution",
  "Other",
] as const;

export const PUBLISHING_STATUS_OPTIONS = [
  "Self-published",
  "Unpublished",
  "Signed to publisher",
  "Admin by third party",
  "Co-published",
  "Unknown",
] as const;

export const SPLIT_TYPE_OPTIONS = ["Equal", "Custom"] as const;

export const RELEASE_STATUS_OPTIONS = ["Unreleased", "Released", "Scheduled release"] as const;

export const REGISTRATION_CONTACT_OPTIONS = [
  "All collaborators individually",
  "One collaborator",
  "Publisher",
  "Administrator",
  "Manager",
  "Label",
  "SPLIT-assisted export only",
  "Not decided",
] as const;

export const SAMPLE_STATUS_OPTIONS = [
  "No sample or interpolation",
  "Sample",
  "Interpolation",
  "Replay",
  "Lyric reference",
  "Unsure",
] as const;

export const CLEARANCE_STATUS_OPTIONS = ["Not needed", "Pending", "Cleared", "Denied", "Unsure"] as const;

export const PUBLIC_DOMAIN_STATUS_OPTIONS = ["No", "Yes", "Unsure"] as const;

export const PUBLIC_DOMAIN_CLAIM_OPTIONS = [
  "New lyrics only",
  "New melody only",
  "New arrangement only",
  "Arrangement and new lyrics",
  "Claim only new material",
] as const;

export const DISPUTE_STATUS_OPTIONS = [
  "All collaborators included",
  "Pending responses",
  "Someone not responded",
  "Contributor missing",
  "Disputed",
] as const;

export interface Party {
  id: string;
  splitId: string;
  phoneNumber: string;
  inviteMethod: string;
  inviteValue: string;
  accountLinked: boolean;
  isCurrentUser: boolean;
  legalName: string;
  professionalName: string;
  email: string;
  country: string;
  role: string;
  percent: number;
  proAffiliation: string;
  customProName: string;
  ipiNumber: string;
  proMemberNumber: string;
  societyTerritory: string;
  contributionCategories: string[];
  contributionDescription: string;
  publishingStatus: string;
  publisherName: string;
  publisherIpi: string;
  publisherPro: string;
  publisherContact: string;
  registrationNotes: string;
  isSigner: boolean;
  signingOrder: number;
}

export interface ContractData {
  // Song identification
  songTitle: string;
  alternateTitles: string;
  creationDate: string;
  creationLocation: string;
  studioName: string;
  lyricLanguage: string;
  compositionType: string;
  iswc: string;
  relatedIsrc: string;

  // Writers and ownership
  parties: Party[];
  splitType: string;
  agreementStatus: string;

  // PRO / MLC registration metadata
  recordingArtist: string;
  recordingTitle: string;
  releaseStatus: string;
  releaseDate: string;
  expectedReleaseDate: string;
  distributor: string;
  label: string;
  upc: string;
  registrationContactType: string;
  designatedContactName: string;
  designatedContactRole: string;
  designatedContactEmail: string;
  designatedContactAuthority: string;
  registrationDeadline: string;

  // Clearance checks
  sampleStatus: string;
  sampleOriginalWork: string;
  sampleOriginalArtist: string;
  sampleOriginalWriters: string;
  sampleOriginalPublishers: string;
  sampleMasterOwner: string;
  samplePortion: string;
  sampleClearanceStatus: string;
  sampleAgreedShare: string;
  publicDomainStatus: string;
  publicDomainSource: string;
  publicDomainJurisdiction: string;
  publicDomainClaim: string;
  disputeStatus: string;
  disputeContributor: string;
  disputePercent: string;
  disputeReason: string;
  disputeEvidence: string;
  freezeRegistration: boolean;
  exportUndisputedShares: boolean;

  // Authorization and signatures
  authorizeSplitPercent: boolean;
  authorizePersonalMetadata: boolean;
  authorizeContributionDescription: boolean;
  authorizeProIpi: boolean;
  authorizePublisherAdmin: boolean;
  authorizeRegistrationUse: boolean;
  exportPacket: boolean;
  sendToPRO: boolean;
  sendToMLC: boolean;
  sendToPublisherAdmin: boolean;
  requireApprovalBeforeSubmission: boolean;
  allowDesignatedSubmitter: boolean;
  requireAllSignatures: boolean;
  signingOrderEnabled: boolean;
  conditionalSignatures: boolean;
  includeAuditTrail: boolean;
}

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function sumPercents(parties: Party[]) {
  return Math.round(parties.reduce((s, p) => s + (Number(p.percent) || 0), 0) * 100) / 100;
}

export function partyDisplayName(party: Party) {
  return party.professionalName || party.legalName || party.email || party.phoneNumber || party.splitId || party.inviteValue || "Invited writer";
}

export function hasWriterIdentity(party: Party) {
  return Boolean(
    party.isCurrentUser ||
      party.splitId.trim() ||
      party.email.trim() ||
      party.phoneNumber.trim() ||
      party.inviteValue.trim()
  );
}

export function isWriterReady(party: Party) {
  return hasWriterIdentity(party) && party.contributionCategories.length > 0 && Number(party.percent) > 0;
}

export function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: uid(),
    splitId: "",
    phoneNumber: "",
    inviteMethod: "email",
    inviteValue: "",
    accountLinked: false,
    isCurrentUser: false,
    legalName: "",
    professionalName: "",
    email: "",
    country: "United States",
    role: "Songwriter",
    percent: 0,
    proAffiliation: "Unknown",
    customProName: "",
    ipiNumber: "",
    proMemberNumber: "",
    societyTerritory: "Worldwide",
    contributionCategories: [],
    contributionDescription: "",
    publishingStatus: "Unknown",
    publisherName: "",
    publisherIpi: "",
    publisherPro: "",
    publisherContact: "",
    registrationNotes: "",
    isSigner: true,
    signingOrder: 1,
    ...overrides,
  };
}

export const DEFAULT_CONTRACT: ContractData = {
  songTitle: "",
  alternateTitles: "",
  creationDate: "",
  creationLocation: "",
  studioName: "",
  lyricLanguage: "English",
  compositionType: "Original Song",
  iswc: "",
  relatedIsrc: "",
  parties: [
    makeParty({ percent: 50, signingOrder: 1 }),
    makeParty({ percent: 50, signingOrder: 2 }),
  ],
  splitType: "Custom",
  agreementStatus: "Draft",
  recordingArtist: "",
  recordingTitle: "",
  releaseStatus: "Unreleased",
  releaseDate: "",
  expectedReleaseDate: "",
  distributor: "",
  label: "",
  upc: "",
  registrationContactType: "Not decided",
  designatedContactName: "",
  designatedContactRole: "",
  designatedContactEmail: "",
  designatedContactAuthority: "",
  registrationDeadline: "",
  sampleStatus: "No sample or interpolation",
  sampleOriginalWork: "",
  sampleOriginalArtist: "",
  sampleOriginalWriters: "",
  sampleOriginalPublishers: "",
  sampleMasterOwner: "",
  samplePortion: "",
  sampleClearanceStatus: "Not needed",
  sampleAgreedShare: "",
  publicDomainStatus: "No",
  publicDomainSource: "",
  publicDomainJurisdiction: "",
  publicDomainClaim: "Claim only new material",
  disputeStatus: "All collaborators included",
  disputeContributor: "",
  disputePercent: "",
  disputeReason: "",
  disputeEvidence: "",
  freezeRegistration: false,
  exportUndisputedShares: false,
  authorizeSplitPercent: true,
  authorizePersonalMetadata: true,
  authorizeContributionDescription: true,
  authorizeProIpi: true,
  authorizePublisherAdmin: true,
  authorizeRegistrationUse: true,
  exportPacket: true,
  sendToPRO: false,
  sendToMLC: false,
  sendToPublisherAdmin: false,
  requireApprovalBeforeSubmission: true,
  allowDesignatedSubmitter: false,
  requireAllSignatures: true,
  signingOrderEnabled: true,
  conditionalSignatures: false,
  includeAuditTrail: true,
};
