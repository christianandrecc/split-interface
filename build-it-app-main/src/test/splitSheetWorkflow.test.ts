import { describe, expect, it } from "vitest";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import {
  getCollaboratorStatusSummary,
  queueContractDelivery,
  splitPercentTotal,
  validateDocumentSplit,
  validateSplitPercentages,
} from "@/lib/splitSheetWorkflow";

export function makeDocument(): StoredSplitSheetDocument {
  const now = "2026-08-12T12:00:00.000Z";

  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Night Swim SPLIT Sheet",
    status: "Pending Split Approval",
    version: 1,
    createdAt: now,
    updatedAt: now,
    documentNumber: "SPLIT-20260812-ABC123",
    creatorProfile: {
      splitId: "",
      username: "chori",
      emailAddress: "chori@example.com",
      displayName: "Chori",
      roleTags: "",
      profileImageUrl: "",
      socialInstagram: "",
      socialTikTok: "",
      socialX: "",
      socialWebsite: "",
      profileLocation: "",
      profileVisibility: "public",
      legalName: "Christian Carrera",
      legalFirstName: "Christian",
      legalMiddleName: "",
      legalLastName: "Carrera",
      pkaNames: "Chori",
      phoneCountryCode: "+1",
      phoneNumber: "",
      legalAddress: "",
      addressLine: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      mlcNumber: "",
      proAffiliation: "",
      ipiNumber: "",
      customProName: "",
      publishingStatus: "",
      publisherName: "",
      publisherIpi: "",
      publisherPro: "",
      publishingShare: "",
      adminCompanyName: "",
      adminIpi: "",
      adminCollectionShare: "",
      publisherContact: "",
    },
    data: {
      songTitle: "Night Swim",
      alternateTitles: "",
      artistProjectName: "Chori",
      creationDate: "2026-08-12",
      creationLocation: "",
      studioName: "",
      workNotes: "",
      lyricLanguage: "English",
      compositionType: "Original Song",
      iswc: "",
      relatedIsrc: "",
      splitType: "Custom",
      agreementStatus: "Draft",
      recordingArtist: "Chori",
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
      sampleNotes: "",
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
      parties: [
        {
          id: "creator-party",
          splitId: "",
          phoneNumber: "",
          inviteMethod: "creator",
          inviteValue: "@chori",
          accountLinked: true,
          isCurrentUser: true,
          legalName: "Christian Carrera",
          professionalName: "Chori",
          email: "chori@example.com",
          country: "United States",
          role: "Songwriter",
          percent: 60,
          proAffiliation: "",
          customProName: "",
          ipiNumber: "",
          proMemberNumber: "",
          societyTerritory: "Worldwide",
          contributionCategories: ["Lyrics"],
          contributionDescription: "",
          publishingStatus: "",
          publisherName: "",
          publisherIpi: "",
          publisherPro: "",
          publisherContact: "",
          registrationNotes: "",
          isSigner: true,
          signingOrder: 1,
        },
        {
          id: "maya-party",
          splitId: "",
          phoneNumber: "",
          inviteMethod: "username",
          inviteValue: "@mayarios",
          accountLinked: true,
          isCurrentUser: false,
          legalName: "",
          professionalName: "Maya Rios",
          email: "",
          country: "United States",
          role: "Producer",
          percent: 40,
          proAffiliation: "",
          customProName: "",
          ipiNumber: "",
          proMemberNumber: "",
          societyTerritory: "Worldwide",
          contributionCategories: ["Composition / Music"],
          contributionDescription: "",
          publishingStatus: "",
          publisherName: "",
          publisherIpi: "",
          publisherPro: "",
          publisherContact: "",
          registrationNotes: "",
          isSigner: true,
          signingOrder: 2,
        },
      ],
    },
    collaborators: ["Maya Rios"],
    collaboratorInvites: [
      {
        id: "maya-invite",
        partyId: "maya-party",
        name: "Maya Rios",
        inviteMethod: "username",
        inviteValue: "@mayarios",
        status: "Accepted",
        respondedAt: now,
      },
    ],
    currentProposalId: "proposal-1",
    splitProposalVersions: [
      {
        id: "proposal-1",
        versionNumber: 1,
        proposedBy: "Chori",
        notes: "Initial split proposal",
        createdAt: now,
        allocations: [
          { partyId: "creator-party", name: "Chori", role: "Songwriter", percentage: 60 },
          { partyId: "maya-party", name: "Maya Rios", role: "Producer", percentage: 40 },
        ],
      },
    ],
    splitApprovals: [
      {
        id: "creator-approval",
        proposalVersionId: "proposal-1",
        collaboratorId: "creator",
        collaboratorName: "Chori",
        status: "Approved",
        respondedAt: now,
      },
      {
        id: "maya-approval",
        proposalVersionId: "proposal-1",
        collaboratorId: "maya-invite",
        collaboratorName: "Maya Rios",
        status: "Pending",
      },
    ],
    splitSignatures: [],
    auditTrail: [{ timestamp: now, actor: "Chori", action: "SPLIT Sheet preview generated" }],
  };
}

describe("split sheet workflow validation", () => {
  it("requires ownership percentages to total exactly 100", () => {
    expect(validateSplitPercentages([50, 25, 25])).toMatchObject({ valid: true, total: 100 });
    expect(validateSplitPercentages([50, 25])).toMatchObject({ valid: false, missing: 25 });
    expect(validateSplitPercentages([80, 30])).toMatchObject({ valid: false, overage: 10 });
  });

  it("rounds fractional percentages safely", () => {
    expect(splitPercentTotal([33.333, 33.333, 33.334])).toBe(100);
  });

  it("validates stored split documents through their collaborators", () => {
    const document = makeDocument();
    expect(validateDocumentSplit(document)).toMatchObject({ valid: true, total: 100 });

    document.data.parties[1].percent = 25;
    expect(validateDocumentSplit(document)).toMatchObject({ valid: false, missing: 15 });
  });

  it("summarizes collaborator review and signature status", () => {
    const summary = getCollaboratorStatusSummary(makeDocument());

    expect(summary).toEqual([
      {
        partyId: "creator-party",
        inviteStatus: "Accepted",
        approvalStatus: "Approved",
        signatureStatus: "Pending",
      },
      {
        partyId: "maya-party",
        inviteStatus: "Accepted",
        approvalStatus: "Pending",
        signatureStatus: "Pending",
      },
    ]);
  });

  it("records contract delivery as a server-side queue action", () => {
    const queued = queueContractDelivery(makeDocument(), "Chori");

    expect(queued.sentAt).toBeTruthy();
    expect(queued.auditTrail.at(-1)?.action).toContain("server-side services");
  });
});
