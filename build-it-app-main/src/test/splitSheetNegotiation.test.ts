import { describe, expect, it } from "vitest";
import { appendSplitSheetChatMessage } from "@/lib/splitSheetMessages";
import {
  buildNegotiationMessages,
  dealReadyToSign,
  documentToNegotiationDeal,
  participantIdentityForProfile,
  proposalResponsePermissions,
  proposalAuthorParticipantId,
} from "@/lib/splitSheetNegotiation";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import { makeCounterDocument, makeDocument } from "@/test/fixtures/splitSheet";

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createEmptyProfile(),
    username: "mayarios",
    displayName: "Maya Rios",
    emailAddress: "maya@example.com",
    ...overrides,
  };
}

describe("split sheet negotiation mapping", () => {
  it("hides draft, unsent, and unrelated split sheets from Messages", () => {
    const document = makeDocument();
    const collaborator = profile();

    document.status = "Draft";
    document.sentAt = undefined;
    expect(documentToNegotiationDeal(document, collaborator)).toBeNull();

    document.status = "Pending Split Approval";
    document.sentAt = document.createdAt;
    expect(documentToNegotiationDeal(document, profile({ username: "outsider", emailAddress: "outsider@example.com" }))).toBeNull();
  });

  it("maps a visible collaborator split sheet into a negotiation room with action counts", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.splitApprovals = document.splitApprovals.map((approval) =>
      approval.collaboratorId === "maya-invite"
        ? { ...approval, status: "Pending" as const, respondedAt: undefined }
        : approval,
    );

    const deal = documentToNegotiationDeal(document, profile());

    expect(deal).toMatchObject({
      id: document.id,
      title: "Night Swim",
      status: "negotiating",
      unreadCount: 1,
      currentVersionId: "proposal-1",
    });
    expect(deal?.viewerParticipantIds.has("maya-invite")).toBe(true);
    expect(deal?.participants.map((participant) => participant.name)).toEqual(["Chori", "Maya Rios"]);
  });

  it("prioritizes invite identity when creator metadata and invited user metadata overlap", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.creatorProfile.displayName = "El Hijo del Viento";
    document.creatorProfile.username = "chori";
    document.creatorProfile.emailAddress = "chori@example.com";
    document.collaboratorInvites[0].inviteValue = "@chori";
    document.collaboratorInvites[0].profileSnapshot = {
      username: "chori",
      displayName: "Chori",
      email: "chori@example.com",
    };
    document.data.parties[1].inviteValue = "@chori";

    const identity = participantIdentityForProfile(document, profile({
      username: "chori",
      displayName: "Chori",
      emailAddress: "chori@example.com",
    }));
    const deal = documentToNegotiationDeal(document, profile({
      username: "chori",
      displayName: "Chori",
      emailAddress: "chori@example.com",
    }));

    expect(identity).toEqual({ id: "maya-invite", name: "Chori" });
    expect(deal?.viewerParticipantIds.has("maya-invite")).toBe(true);
    expect(deal?.viewerParticipantIds.has("creator")).toBe(false);
  });

  it("marks the room ready to sign once required parties have accepted", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.splitApprovals = document.splitApprovals.map((approval) => ({
      ...approval,
      status: "Approved" as const,
      respondedAt: approval.respondedAt || document.updatedAt,
    }));

    const deal = documentToNegotiationDeal(document, profile());

    expect(deal?.status).toBe("ready_to_sign");
    expect(deal && dealReadyToSign(deal)).toBe(true);
  });

  it("only counts signatures from the current proposal version", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Ready to Sign";
    document.currentProposalId = "proposal-2";
    document.version = 2;
    document.splitProposalVersions = [
      ...document.splitProposalVersions,
      {
        id: "proposal-2",
        versionNumber: 2,
        proposedBy: "Maya Rios",
        notes: "Counter-offer from Messages",
        createdAt: "2026-08-12T12:10:00.000Z",
        allocations: [
          { partyId: "creator-party", name: "Chori", role: "Songwriter", percentage: 50 },
          { partyId: "maya-party", name: "Maya Rios", role: "Producer", percentage: 50 },
        ],
      },
    ];
    document.splitApprovals = [
      {
        id: "proposal-2-creator",
        proposalVersionId: "proposal-2",
        collaboratorId: "creator",
        collaboratorName: "Chori",
        status: "Approved",
        respondedAt: "2026-08-12T12:11:00.000Z",
      },
      {
        id: "proposal-2-maya",
        proposalVersionId: "proposal-2",
        collaboratorId: "maya-invite",
        collaboratorName: "Maya Rios",
        status: "Approved",
        respondedAt: "2026-08-12T12:11:00.000Z",
      },
    ];
    document.splitSignatures = [
      {
        id: "old-maya-signature",
        proposalVersionId: "proposal-1",
        collaboratorId: "maya-invite",
        collaboratorName: "Maya Rios",
        status: "Signed",
        signedAt: "2026-08-12T12:06:00.000Z",
      },
    ];

    const deal = documentToNegotiationDeal(document, profile());

    expect(deal?.signedBy).toEqual([]);
    expect(deal && dealReadyToSign(deal)).toBe(true);
  });

  it("builds ordered structured and plain chat messages from the stored document", () => {
    const document = appendSplitSheetChatMessage(makeDocument(), {
      id: "chat-1",
      senderId: "maya-invite",
      senderName: "Maya Rios",
      body: "Can we review the producer share?",
      createdAt: "2026-08-12T12:03:00.000Z",
    });
    document.sentAt = document.createdAt;

    const messages = buildNegotiationMessages(document, document.currentProposalId);

    expect(messages.map((message) => message.type)).toEqual(["proposal", "accept", "text"]);
    expect(messages.at(-1)).toMatchObject({
      id: "chat-1",
      senderId: "maya-invite",
      body: "Can we review the producer share?",
    });
  });

  it("maps legal-name counters by authenticated account and records only one author message", () => {
    const document = makeCounterDocument();
    const deal = documentToNegotiationDeal(document, profile())!;
    expect(deal.splitVersions.at(-1)?.createdByParticipantId).toBe("maya-invite");
    expect(deal.messages.filter((message) => message.proposedSplitId === "proposal-2")).toEqual([
      expect.objectContaining({ type: "counter", senderId: "maya-invite" }),
    ]);
    expect(deal.acceptedBy).toEqual(["maya-invite"]);
    expect(proposalResponsePermissions(deal, "proposal-2")).toEqual({ accept: false, counter: false, dispute: false });
  });

  it("allows only accepted recipients to respond to the latest proposal", () => {
    const document = makeCounterDocument();
    const deal = documentToNegotiationDeal(document, document.creatorProfile)!;
    expect(proposalResponsePermissions(deal, "proposal-2")).toEqual({ accept: true, counter: true, dispute: true });
    expect(proposalResponsePermissions(deal, "proposal-1")).toEqual({ accept: false, counter: false, dispute: false });
    document.collaboratorInvites[0].status = "Pending";
    const invitee = documentToNegotiationDeal(document, profile())!;
    expect(proposalResponsePermissions(invitee, "proposal-1").counter).toBe(false);
  });

  it("retains real recipient responses with canonical attribution", () => {
    const document = makeCounterDocument();
    document.splitApprovals.find((approval) => approval.id === "v2-creator")!.status = "Approved";
    document.splitApprovals.find((approval) => approval.id === "v2-creator")!.respondedAt = "2026-09-11T12:40:00Z";
    const messages = buildNegotiationMessages(document, "proposal-2").filter((message) => message.proposedSplitId === "proposal-2");
    expect(messages.map((message) => [message.type, message.senderId])).toEqual([["counter", "maya-invite"], ["accept", "creator"]]);
  });

  it("fails closed on unknown or ambiguous authors instead of assigning the creator", () => {
    const document = makeCounterDocument();
    const proposal = document.splitProposalVersions.at(-1)!;
    proposal.proposedByUserId = "unknown-account";
    proposal.proposedBy = "Chori";
    expect(proposalAuthorParticipantId(document, proposal)).toBeUndefined();
    expect(buildNegotiationMessages(document, proposal.id).find((message) => message.type === "counter")?.senderId).toBe("unknown");
    expect(proposalResponsePermissions(documentToNegotiationDeal(document, profile())!, proposal.id).counter).toBe(false);
    delete proposal.proposedByUserId;
    document.data.parties[1].professionalName = "Chori";
    expect(proposalAuthorParticipantId(document, proposal)).toBeUndefined();
  });

  it("keeps signing independent while preventing acceptance changes after a signature", () => {
    const document = makeCounterDocument();
    document.splitSignatures.push({ id: "signed", proposalVersionId: "proposal-2", collaboratorId: "maya-party", collaboratorName: "Maya", status: "Signed", signedAt: document.updatedAt });
    expect(proposalResponsePermissions(documentToNegotiationDeal(document, document.creatorProfile)!, "proposal-2")).toEqual({ accept: false, dispute: false, counter: true });
    document.status = "Verified and Stored";
    expect(proposalResponsePermissions(documentToNegotiationDeal(document, document.creatorProfile)!, "proposal-2").counter).toBe(false);
  });
});
