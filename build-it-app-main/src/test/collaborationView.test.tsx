import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CollaborationView from "@/components/CollaborationView";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import { makeDocument } from "@/test/fixtures/splitSheet";

function makeCollaboratorProfile(): UserProfile {
  return {
    ...createEmptyProfile(),
    username: "mayarios",
    displayName: "Maya Rios",
    emailAddress: "maya@example.com",
  };
}

function makeCreatorProfile(): UserProfile {
  return {
    ...createEmptyProfile(),
    username: "chori",
    displayName: "Chori",
    emailAddress: "chori@example.com",
  };
}

function makeSecondDocument() {
  const document = makeDocument();
  document.id = "22222222-2222-4222-8222-222222222222";
  document.title = "Glasshouse SPLIT Sheet";
  document.data.songTitle = "Glasshouse";
  document.data.artistProjectName = "Arlo Parks";
  document.documentNumber = "SPLIT-20260812-GLASS";
  document.updatedAt = "2026-08-12T12:05:00.000Z";
  return document;
}

describe("CollaborationView document-backed negotiation", () => {
  it("lets an invited collaborator accept the invite from Messages before reviewing", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Pending Collaborator Acceptance";
    document.collaboratorInvites = document.collaboratorInvites.map((invite) => ({
      ...invite,
      status: "Pending",
      respondedAt: undefined,
    }));
    document.splitApprovals = document.splitApprovals.filter((approval) => approval.collaboratorId === "creator");
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCollaboratorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));

    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledTimes(1));
    const [updatedDocument, context] = onUpdateDocument.mock.calls[0];

    expect(context).toMatchObject({ action: "invite_accept", responseType: "invite_accept" });
    expect(updatedDocument.collaboratorInvites.find((invite) => invite.id === "maya-invite")?.status).toBe("Accepted");
    expect(updatedDocument.splitApprovals.find((approval) => approval.collaboratorId === "maya-invite")?.status).toBe("Pending");
    expect(updatedDocument.status).toBe("Pending Split Approval");
  });

  it("lets an invited collaborator accept the proposal inside Messages", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCollaboratorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "Night Swim" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledTimes(1));
    const [updatedDocument, context] = onUpdateDocument.mock.calls[0];

    expect(context).toMatchObject({ action: "split_accept", responseType: "split_accept" });
    expect(updatedDocument.splitApprovals.find((approval) => approval.id === "maya-approval")?.status).toBe("Approved");
    expect(updatedDocument.status).toBe("Ready to Sign");
    expect(updatedDocument.splitSignatures.length).toBeGreaterThan(0);
  });

  it("counts the creator's initial proposal as creator-approved before signing", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.splitApprovals = document.splitApprovals.filter((approval) => approval.collaboratorId !== "creator");
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCollaboratorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledTimes(1));
    const [updatedDocument] = onUpdateDocument.mock.calls[0];

    expect(updatedDocument.status).toBe("Ready to Sign");
    expect(updatedDocument.splitApprovals.find((approval) => approval.collaboratorId === "creator")?.status).toBe("Approved");
    expect(updatedDocument.splitSignatures.map((signature) => signature.collaboratorId)).toEqual(
      expect.arrayContaining(["creator", "maya-invite"]),
    );
  });

  it("keeps the sign CTA visible when the collaborator already accepted and creator approval is implicit", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.splitApprovals = document.splitApprovals
      .filter((approval) => approval.collaboratorId !== "creator")
      .map((approval) => ({
        ...approval,
        status: "Approved" as const,
        respondedAt: document.updatedAt,
      }));
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCollaboratorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    expect(screen.getAllByText(/2\/2 accepted/).length).toBeGreaterThan(0);
    expect(screen.getByText("Ready to sign")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sign" }).length).toBeGreaterThan(0);
  });

  it("sends chat messages as the invited collaborator when creator data also matches the account", async () => {
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
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCreatorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    const composer = screen.getByPlaceholderText("Message the collaborators...");
    fireEvent.change(composer, {
      target: { value: "hola el hijo" },
    });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });

    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledTimes(1));
    const [updatedDocument] = onUpdateDocument.mock.calls[0];
    const chatEntry = updatedDocument.auditTrail.find((entry: { action: string }) => entry.action.startsWith("__splitChatMessages:"));
    expect(chatEntry).toBeTruthy();
    if (!chatEntry) throw new Error("Expected stored chat message");
    const message = JSON.parse(chatEntry.action.replace("__splitChatMessages:", ""));

    expect(message.senderId).toBe("maya-invite");
    expect(message.senderName).toBe("Chori");
  });

  it("lets a collaborator sign a ready split inside Messages", async () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    document.status = "Ready to Sign";
    document.splitApprovals = document.splitApprovals.map((approval) => ({
      ...approval,
      status: "Approved",
      respondedAt: approval.respondedAt || document.updatedAt,
    }));
    document.splitSignatures = [
      {
        id: "creator-signature",
        proposalVersionId: "proposal-1",
        collaboratorId: "creator",
        collaboratorName: "Chori",
        status: "Signed",
        signedAt: document.updatedAt,
      },
      {
        id: "maya-signature",
        proposalVersionId: "proposal-1",
        collaboratorId: "maya-invite",
        collaboratorName: "Maya Rios",
        status: "Pending",
      },
    ];
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCollaboratorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Sign" })[0]);

    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledTimes(1));
    const [updatedDocument, context] = onUpdateDocument.mock.calls[0];

    expect(context).toMatchObject({ action: "sign", responseType: "signature" });
    expect(updatedDocument.status).toBe("Verified and Stored");
    expect(updatedDocument.splitSignatures.find((signature) => signature.id === "maya-signature")?.status).toBe("Signed");
  });

  it("signs the current proposal version when older signature records still exist", async () => {
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
        id: "stale-maya-signature",
        proposalVersionId: "proposal-1",
        collaboratorId: "maya-invite",
        collaboratorName: "Maya Rios",
        status: "Pending",
      },
      {
        id: "current-creator-signature",
        proposalVersionId: "proposal-2",
        collaboratorId: "creator",
        collaboratorName: "Chori",
        status: "Signed",
        signedAt: "2026-08-12T12:12:00.000Z",
      },
    ];
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCollaboratorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Sign" })[0]);

    await waitFor(() => expect(onUpdateDocument).toHaveBeenCalledTimes(1));
    const [updatedDocument] = onUpdateDocument.mock.calls[0];
    const staleSignature = updatedDocument.splitSignatures.find((signature) => signature.id === "stale-maya-signature");
    const currentMayaSignature = updatedDocument.splitSignatures.find(
      (signature) => signature.proposalVersionId === "proposal-2" && signature.collaboratorId === "maya-invite",
    );

    expect(staleSignature?.status).toBe("Pending");
    expect(currentMayaSignature?.status).toBe("Signed");
    expect(updatedDocument.status).toBe("Verified and Stored");
  });

  it("shows only split sheets visible to the signed-in account", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCreatorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "Night Swim" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("No deal chats yet")).not.toBeInTheDocument();
  });

  it("keeps the manually selected deal open when parent data refreshes", () => {
    const initialDocument = makeDocument();
    initialDocument.sentAt = initialDocument.createdAt;
    const secondDocument = makeSecondDocument();
    secondDocument.sentAt = secondDocument.createdAt;
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <CollaborationView
        documents={[initialDocument, secondDocument]}
        userProfile={makeCreatorProfile()}
        initialDealId={initialDocument.id}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    fireEvent.click(screen.getByText("Glasshouse"));
    expect(screen.getAllByRole("heading", { name: "Glasshouse" }).length).toBeGreaterThan(0);

    rerender(
      <CollaborationView
        documents={[
          { ...initialDocument, updatedAt: "2026-08-12T12:10:00.000Z" },
          { ...secondDocument, updatedAt: "2026-08-12T12:11:00.000Z" },
        ]}
        userProfile={makeCreatorProfile()}
        initialDealId={initialDocument.id}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "Glasshouse" }).length).toBeGreaterThan(0);
  });

  it("renders a counter-offer message when a split has multiple proposal versions", () => {
    const document = makeDocument();
    document.sentAt = document.createdAt;
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
    const onUpdateDocument = vi.fn().mockResolvedValue(undefined);

    render(
      <CollaborationView
        documents={[document]}
        userProfile={makeCreatorProfile()}
        onUpdateDocument={onUpdateDocument}
      />,
    );

    expect(screen.getAllByText("Maya Rios proposed split version 2.").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "Night Swim" }).length).toBeGreaterThan(0);
  });
});
