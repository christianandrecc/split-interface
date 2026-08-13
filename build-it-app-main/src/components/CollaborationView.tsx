import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSignature,
  GitBranch,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Send,
  Split,
  X,
} from "lucide-react";
import { addDocumentAuditTrail, type StoredSplitSheetDocument } from "@/components/contract-builder/document";
import {
  documentBelongsToProfile,
  documentParticipantIdsForProfile,
  findInviteForProfile,
  type SplitSheetUpdateContext,
} from "@/lib/splitSheetStorage";
import {
  splitSheetAllocationDisplayName,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import type { UserProfile } from "@/lib/userProfile";
import { toast } from "sonner";

type NegotiationStatus = "negotiating" | "ready_to_sign" | "signed";
type MessageType = "text" | "proposal" | "counter" | "accept" | "reject" | "sign" | "system";

type DealParticipant = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  role: string;
};

type SplitAllocation = {
  participantId: string;
  name: string;
  role: string;
  percent: number;
};

type SplitVersion = {
  id: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy: string;
  note: string;
  allocations: SplitAllocation[];
  revenueStreams: {
    id: string;
    label: string;
    status: string;
  }[];
};

type NegotiationMessage = {
  id: string;
  type: MessageType;
  senderId: string;
  createdAt: string;
  body: string;
  proposedSplitId?: string;
};

type NegotiationDeal = {
  id: string;
  title: string;
  artist: string;
  status: NegotiationStatus;
  updatedAt: string;
  unreadCount: number;
  document: StoredSplitSheetDocument;
  participants: DealParticipant[];
  requiredSignerIds: string[];
  viewerParticipantIds: Set<string>;
  acceptedBy: string[];
  signedBy: string[];
  currentVersionId: string;
  splitVersions: SplitVersion[];
  messages: NegotiationMessage[];
};

type PersistContext = SplitSheetUpdateContext & {
  successMessage?: string;
};

type StoredChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

type ProposalVersionRecord = StoredSplitSheetDocument["splitProposalVersions"][number];
type ApprovalRecord = StoredSplitSheetDocument["splitApprovals"][number];

type CollaborationViewProps = {
  documents: StoredSplitSheetDocument[];
  userProfile: UserProfile;
  initialDealId?: string;
  onUpdateDocument: (document: StoredSplitSheetDocument, context?: SplitSheetUpdateContext) => void | Promise<void>;
};

const CHAT_MESSAGES_KEY = "__splitChatMessages";
const FINAL_STATUSES = new Set(["Fully Signed", "Verified and Stored", "Executed", "Archived"]);

export default function CollaborationView({ documents, userProfile, initialDealId, onUpdateDocument }: CollaborationViewProps) {
  const deals = useMemo(
    () => documents.map((document) => documentToNegotiationDeal(document, userProfile)).filter(Boolean) as NegotiationDeal[],
    [documents, userProfile],
  );
  const [selectedDealId, setSelectedDealId] = useState("");
  const [composerText, setComposerText] = useState("");
  const [counterPercents, setCounterPercents] = useState<Record<string, string>>({});
  const [counterNote, setCounterNote] = useState("");
  const [counterOpen, setCounterOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) ?? deals[0] ?? null;
  const currentVersion = selectedDeal?.splitVersions.find((version) => version.id === selectedDeal.currentVersionId) ?? selectedDeal?.splitVersions.at(-1);
  const readyToSign = Boolean(selectedDeal && dealReadyToSign(selectedDeal));
  const viewerIdentity = selectedDeal ? participantIdentityForProfile(selectedDeal.document, userProfile) : null;
  const viewerName = viewerIdentity?.name || getProfileDisplayName(userProfile);
  const viewerParticipantId = selectedDeal ? viewerIdentity?.id || firstViewerParticipantId(selectedDeal) : "";

  useEffect(() => {
    if (!initialDealId || !deals.some((deal) => deal.id === initialDealId)) return;

    setSelectedDealId(initialDealId);
    setMobileChatOpen(true);
  }, [deals, initialDealId]);

  const updateDocument = async (document: StoredSplitSheetDocument, context: PersistContext) => {
    await onUpdateDocument(document, context);
    if (context.successMessage) {
      toast.success(context.successMessage);
    }
  };

  const sendTextMessage = async () => {
    if (!selectedDeal) return;

    const body = composerText.trim();
    if (!body) return;

    const now = new Date().toISOString();
    const message: StoredChatMessage = {
      id: makeId("chat"),
      senderId: viewerParticipantId || "viewer",
      senderName: viewerName,
      body,
      createdAt: now,
    };
    const updatedDocument = addDocumentAuditTrail(
      {
        ...selectedDeal.document,
        auditTrail: [
          ...selectedDeal.document.auditTrail,
          {
            timestamp: now,
            actor: viewerName,
            action: `${CHAT_MESSAGES_KEY}:${JSON.stringify(message)}`,
          },
        ],
      },
      viewerName,
      "Sent a negotiation message",
    );

    setComposerText("");
    await updateDocument(updatedDocument, {
      action: "local_chat",
      successMessage: "Message sent",
    });
  };

  const acceptInvite = async () => {
    if (!selectedDeal) return;

    const invite = findInviteForProfile(selectedDeal.document, userProfile);
    if (!invite || invite.status !== "Pending") return;

    const now = new Date().toISOString();
    const collaboratorInvites = selectedDeal.document.collaboratorInvites.map((item) =>
      item.id === invite.id
        ? {
            ...item,
            status: "Accepted" as const,
            respondedAt: now,
            profileSnapshot: {
              ...item.profileSnapshot,
              username: userProfile.username || item.profileSnapshot?.username,
              displayName: userProfile.displayName || item.profileSnapshot?.displayName || item.name,
              role: userProfile.roleTags || item.profileSnapshot?.role,
              email: userProfile.emailAddress || item.profileSnapshot?.email,
              phoneNumber: [userProfile.phoneCountryCode, userProfile.phoneNumber].filter(Boolean).join(" ").trim() || item.profileSnapshot?.phoneNumber,
              splitId: userProfile.splitId || item.profileSnapshot?.splitId,
            },
          }
        : item,
    );
    const currentProposalId = selectedDeal.document.currentProposalId || selectedDeal.document.splitProposalVersions.at(-1)?.id || "";
    const currentProposal = selectedDeal.document.splitProposalVersions.find((proposal) => proposal.id === currentProposalId);
    const approvalsWithCreator = ensureCreatorApprovalForProposal(
      selectedDeal.document,
      selectedDeal.document.splitApprovals,
      currentProposal,
      now,
    );
    const hasApproval = approvalsWithCreator.some(
      (approval) =>
        approval.proposalVersionId === currentProposalId &&
        (approval.collaboratorId === invite.id || approval.collaboratorId === invite.partyId),
    );
    const splitApprovals = hasApproval || !currentProposalId
      ? approvalsWithCreator
      : [
          ...approvalsWithCreator,
          {
            id: `${currentProposalId}-${invite.id}-approval`,
            proposalVersionId: currentProposalId,
            collaboratorId: invite.id,
            collaboratorName: splitSheetParticipantDisplayName(selectedDeal.document, invite.id, invite.name),
            status: "Pending" as const,
          },
        ];
    const acceptedInvites = collaboratorInvites.filter((item) => item.status === "Accepted").length;
    const updatedDocument = addDocumentAuditTrail(
      {
        ...selectedDeal.document,
        status: acceptedInvites > 0 ? "Pending Split Approval" : selectedDeal.document.status,
        collaboratorInvites,
        splitApprovals,
      },
      viewerName,
      `${viewerName} accepted the collaboration invite`,
    );

    await updateDocument(updatedDocument, {
      action: "invite_accept",
      responseType: "invite_accept",
      successMessage: "Invite accepted",
    });
  };

  const rejectProposal = async () => {
    if (!selectedDeal || !currentVersion) return;

    const currentProposal = selectedDeal.document.splitProposalVersions.find((proposal) => proposal.id === currentVersion.id);
    const currentApprovals = selectedDeal.document.splitApprovals.filter((approval) => approval.proposalVersionId === currentProposal?.id);
    const viewerApproval = currentApprovals.find((approval) => participantMatchesViewer(selectedDeal, approval.collaboratorId));
    if (!viewerApproval) return;

    const now = new Date().toISOString();
    const splitApprovals = selectedDeal.document.splitApprovals.map((approval) =>
      approval.id === viewerApproval.id
        ? {
            ...approval,
            status: "Rejected" as const,
            respondedAt: now,
            notes: counterNote.trim() || "Needs changes",
          }
        : approval,
    );
    const updatedDocument = addDocumentAuditTrail(
      {
        ...selectedDeal.document,
        status: "Disputed",
        splitApprovals,
      },
      viewerName,
      "Disputed the current split proposal",
    );

    await updateDocument(updatedDocument, {
      action: "split_reject",
      responseType: "split_reject",
      notes: counterNote.trim() || "Needs changes",
      successMessage: "Proposal disputed",
    });
  };

  const acceptProposal = async () => {
    if (!selectedDeal || !currentVersion) return;

    const currentProposal = selectedDeal.document.splitProposalVersions.find((proposal) => proposal.id === currentVersion.id);
    const currentApprovals = selectedDeal.document.splitApprovals.filter((approval) => approval.proposalVersionId === currentProposal?.id);
    const viewerApproval = currentApprovals.find((approval) => participantMatchesViewer(selectedDeal, approval.collaboratorId));
    if (!viewerApproval) return;

    const now = new Date().toISOString();
    const approvedByViewer = selectedDeal.document.splitApprovals.map((approval) =>
      approval.id === viewerApproval.id
        ? {
            ...approval,
            status: "Approved" as const,
            respondedAt: now,
          }
        : approval,
    );
    const splitApprovals = ensureCreatorApprovalForProposal(selectedDeal.document, approvedByViewer, currentProposal, now);
    const documentWithApprovals = {
      ...selectedDeal.document,
      splitApprovals,
    };
    const allApproved = currentProposal ? allRequiredParticipantsAccepted(documentWithApprovals, currentProposal.id) : false;
    const baseDocument = {
      ...selectedDeal.document,
      status: allApproved ? "Ready to Sign" as const : selectedDeal.document.status,
      splitApprovals,
    };
    const updatedDocument = addDocumentAuditTrail(
      allApproved
        ? {
            ...baseDocument,
            splitSignatures: buildSignatureRecords(baseDocument, currentProposal?.id ?? currentVersion.id),
          }
        : baseDocument,
      viewerName,
      "Accepted the current split proposal",
    );

    await updateDocument(updatedDocument, {
      action: "split_accept",
      responseType: "split_accept",
      successMessage: allApproved ? "Consensus reached" : "Proposal accepted",
    });
  };

  const openCounterComposer = () => {
    if (!selectedDeal || !currentVersion) return;
    setCounterPercents(Object.fromEntries(currentVersion.allocations.map((allocation) => [allocation.participantId, String(allocation.percent)])));
    setCounterNote("");
    setCounterOpen(true);
  };

  const createCounterOffer = async () => {
    if (!selectedDeal || !currentVersion) return;

    const total = Object.values(counterPercents).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error("Counter must total 100%");
      return;
    }

    const now = new Date().toISOString();
    const proposalId = `${selectedDeal.document.id}-proposal-${Date.now()}`;
    const versionNumber = (selectedDeal.document.splitProposalVersions.at(-1)?.versionNumber || selectedDeal.document.version || 1) + 1;
    const allocations = selectedDeal.document.data.parties.map((party) => ({
      partyId: party.id,
      name: splitSheetPartyDisplayName(selectedDeal.document, party),
      role: party.role || "Collaborator",
      percentage: Number(counterPercents[party.id]) || 0,
      notes: party.contributionDescription,
    }));
    const updatedParties = selectedDeal.document.data.parties.map((party) => ({
      ...party,
      percent: Number(counterPercents[party.id]) || 0,
    }));
    const creatorName = getProfileDisplayName(selectedDeal.document.creatorProfile);
    const approvalRecords = selectedDeal.document.collaboratorInvites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({
        id: `${proposalId}-${invite.id}`,
        proposalVersionId: proposalId,
        collaboratorId: invite.id,
        collaboratorName: splitSheetParticipantDisplayName(selectedDeal.document, invite.id, invite.name),
        status: participantMatchesViewer(selectedDeal, invite.id) ? "Approved" as const : "Pending" as const,
        respondedAt: participantMatchesViewer(selectedDeal, invite.id) ? now : undefined,
      }));
    const isCreator = documentBelongsToProfile(selectedDeal.document, userProfile);
    const updatedDocument = addDocumentAuditTrail(
      {
        ...selectedDeal.document,
        status: "Pending Split Approval",
        version: versionNumber,
        currentProposalId: proposalId,
        data: {
          ...selectedDeal.document.data,
          parties: updatedParties,
        },
        splitProposalVersions: [
          ...selectedDeal.document.splitProposalVersions,
          {
            id: proposalId,
            versionNumber,
            proposedBy: viewerName,
            notes: counterNote.trim() || "Counter-offer from Messages",
            createdAt: now,
            allocations,
          },
        ],
        splitApprovals: [
          ...selectedDeal.document.splitApprovals,
          {
            id: `${proposalId}-creator`,
            proposalVersionId: proposalId,
            collaboratorId: "creator",
            collaboratorName: creatorName,
            status: isCreator ? "Approved" as const : "Pending" as const,
            respondedAt: isCreator ? now : undefined,
          },
          ...approvalRecords,
        ],
        splitSignatures: selectedDeal.document.splitSignatures.filter((signature) => signature.proposalVersionId !== selectedDeal.document.currentProposalId),
      },
      viewerName,
      `Created split proposal v${versionNumber} from Messages`,
    );

    setCounterOpen(false);
    await updateDocument(updatedDocument, {
      action: isCreator ? "creator_update" : "counter_offer",
      responseType: isCreator ? undefined : "split_reject",
      notes: counterNote.trim() || "Counter-offer from Messages",
      successMessage: "Counter-offer sent",
    });
  };

  const signDeal = async () => {
    if (!selectedDeal || !currentVersion || !readyToSign) return;

    const preparedSignatures = buildSignatureRecords(selectedDeal.document, currentVersion.id);
    const viewerSignature = preparedSignatures.find((signature) => signature.status === "Pending" && participantMatchesViewer(selectedDeal, signature.collaboratorId));
    if (!viewerSignature) {
      toast.error("No pending signature for this account");
      return;
    }

    const now = new Date().toISOString();
    const splitSignatures = preparedSignatures.map((signature) =>
      signature.id === viewerSignature.id
        ? {
            ...signature,
            status: "Signed" as const,
            signedAt: now,
            signatureMethod: "SPLIT in-app acknowledgement",
          }
        : signature,
    );
    const proposalSignatures = splitSignatures.filter((signature) => signature.proposalVersionId === currentVersion.id);
    const allSigned = proposalSignatures.length > 0 && proposalSignatures.every((signature) => signature.status === "Signed");
    const updatedDocument = addDocumentAuditTrail(
      {
        ...selectedDeal.document,
        status: allSigned ? "Verified and Stored" : "Pending Signatures",
        storedAt: selectedDeal.document.storedAt || now,
        verifiedAt: allSigned ? now : selectedDeal.document.verifiedAt,
        splitSignatures,
      },
      viewerName,
      allSigned ? "Signed and verified the split sheet" : "Signed the split sheet",
    );

    await updateDocument(updatedDocument, {
      action: "sign",
      responseType: "signature",
      successMessage: allSigned ? "Split sheet fully signed" : "Signature saved",
    });
  };

  if (!selectedDeal) {
    return (
      <div className="flex h-full min-h-0 bg-background">
        <ChatListSidebar
          deals={deals}
          selectedDealId=""
          onSelect={(dealId) => {
            setSelectedDealId(dealId);
            setMobileChatOpen(true);
          }}
          mobileChatOpen={mobileChatOpen}
        />
        <section className={`${mobileChatOpen ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col md:flex`}>
          <EmptyMessagesPanel />
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <ChatListSidebar
        deals={deals}
        selectedDealId={selectedDeal.id}
        onSelect={(dealId) => {
          setSelectedDealId(dealId);
          setMobileChatOpen(true);
        }}
        mobileChatOpen={mobileChatOpen}
      />

      <section className={`${mobileChatOpen ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col md:flex`}>
        <ChatHeader
          deal={selectedDeal}
          currentVersion={currentVersion}
          readyToSign={readyToSign}
          contextOpen={contextOpen}
          onBack={() => setMobileChatOpen(false)}
          onToggleContext={() => setContextOpen((open) => !open)}
          onSign={signDeal}
        />
        {contextOpen && <MobileDealContext deal={selectedDeal} currentVersion={currentVersion} />}

        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 xl:px-8">
              <div className="mx-auto max-w-5xl space-y-4">
                <InvitePrompt deal={selectedDeal} onAccept={acceptInvite} />

                {selectedDeal.messages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    deal={selectedDeal}
                    onAccept={acceptProposal}
                    onReject={rejectProposal}
                    onCounter={openCounterComposer}
                  />
                ))}

                {readyToSign && selectedDeal.status !== "signed" && (
                  <div className="rounded-lg border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-bold text-[hsl(var(--split-verified))]">Consensus reached</div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Everyone accepted the current proposal. Sign here in Messages to lock this split sheet.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={signDeal}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--split-verified))] px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
                      >
                        <FileSignature className="h-4 w-4" />
                        Sign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {counterOpen && currentVersion && (
              <div className="border-t border-border bg-card px-4 py-3 md:px-6 xl:px-8">
                <div className="mx-auto max-w-5xl rounded-lg border border-border bg-background p-3">
                  <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs font-bold">Counter-offer split percentages</div>
                      <p className="text-[11px] text-muted-foreground">Adjust shares. Total must equal exactly 100%.</p>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${counterTotal(counterPercents) === 100 ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>
                      {counterTotal(counterPercents)}%
                    </span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {currentVersion.allocations.map((allocation) => (
                      <label key={allocation.participantId} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
                        {allocation.name}
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={counterPercents[allocation.participantId] ?? allocation.percent}
                            onChange={(event) =>
                              setCounterPercents((current) => ({
                                ...current,
                                [allocation.participantId]: event.target.value,
                              }))
                            }
                            className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
                          />
                          <span className="text-sm font-bold text-foreground">%</span>
                          <span className="text-[11px]">{allocation.role}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={counterNote}
                    onChange={(event) => setCounterNote(event.target.value)}
                    placeholder="Optional note for the counter-offer..."
                    className="mt-3 min-h-[70px] w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/30"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setCounterOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">
                      Cancel
                    </button>
                    <button type="button" onClick={createCounterOffer} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                      Send counter
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-border bg-card px-4 py-3 md:px-6 xl:px-8">
              <div className="mx-auto flex max-w-5xl items-end gap-2">
                <textarea
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendTextMessage();
                    }
                  }}
                  placeholder="Message the collaborators..."
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="button"
                  onClick={openCounterComposer}
                  disabled={FINAL_STATUSES.has(selectedDeal.document.status)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-secondary disabled:cursor-default disabled:opacity-40"
                >
                  <GitBranch className="h-4 w-4" />
                  Counter
                </button>
                <button
                  type="button"
                  onClick={() => void sendTextMessage()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </main>

          {contextOpen && <DealContextPanel deal={selectedDeal} currentVersion={currentVersion} />}
        </div>
      </section>
    </div>
  );
}

function ChatListSidebar({
  deals,
  selectedDealId,
  onSelect,
  mobileChatOpen,
}: {
  deals: NegotiationDeal[];
  selectedDealId: string;
  onSelect: (dealId: string) => void;
  mobileChatOpen: boolean;
}) {
  return (
    <aside className={`${mobileChatOpen ? "hidden" : "flex"} h-full min-h-0 w-full flex-col border-r border-border bg-card md:flex md:w-[340px] md:flex-shrink-0 xl:w-[360px]`}>
      <div className="border-b border-border px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Messages</p>
        <h1 className="mt-1 text-lg font-bold">Deal chats</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {deals.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSignature className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">No deal chats yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Sent split sheets will appear here as negotiation rooms.
            </p>
          </div>
        ) : deals.map((deal) => {
          const active = deal.id === selectedDealId;
          const latestMessage = deal.messages.at(-1);
          const primaryParticipant = deal.participants.find((participant) => !deal.viewerParticipantIds.has(participant.id)) ?? deal.participants[0];

          return (
            <button
              key={deal.id}
              type="button"
              onClick={() => onSelect(deal.id)}
              className={`w-full border-b border-border px-4 py-3 text-left transition-colors ${
                active ? "bg-primary/10" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar participant={primaryParticipant} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-bold">{primaryParticipant.name}</div>
                    <span className={`text-[10px] font-semibold ${deal.unreadCount > 0 ? "text-primary" : "text-muted-foreground"}`}>{deal.updatedAt}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs font-semibold text-foreground/80">{deal.title}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-muted-foreground">{latestMessage?.body ?? "No messages yet"}</p>
                    {deal.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {deal.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function EmptyMessagesPanel() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-6 text-center">
      <div className="max-w-sm rounded-xl border border-dashed border-border bg-card px-6 py-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileSignature className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-bold text-foreground">No messages yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Create and send a SPLIT Sheet, then this area becomes the negotiation room.
        </p>
      </div>
    </div>
  );
}

function ChatHeader({
  deal,
  currentVersion,
  readyToSign,
  contextOpen,
  onBack,
  onToggleContext,
  onSign,
}: {
  deal: NegotiationDeal;
  currentVersion?: SplitVersion;
  readyToSign: boolean;
  contextOpen: boolean;
  onBack: () => void;
  onToggleContext: () => void;
  onSign: () => void;
}) {
  return (
    <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-bold">{deal.title}</h2>
            <DealStatus status={deal.status} />
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {deal.artist} · current version v{currentVersion?.version ?? 1} · {deal.acceptedBy.length}/{deal.requiredSignerIds.length} accepted
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {readyToSign && deal.status !== "signed" && (
          <button
            type="button"
            onClick={onSign}
            className="hidden items-center gap-2 rounded-lg bg-[hsl(var(--split-verified))] px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 sm:flex"
          >
            <FileSignature className="h-3.5 w-3.5" />
            Sign
          </button>
        )}
        <button
          type="button"
          onClick={onToggleContext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
        >
          {contextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

function InvitePrompt({ deal, onAccept }: { deal: NegotiationDeal; onAccept: () => void }) {
  const invite = deal.document.collaboratorInvites.find((item) => item.status === "Pending" && deal.viewerParticipantIds.has(item.id));
  if (!invite) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-bold text-primary">New split-sheet invite</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Accept the invite to enter the negotiation and review your proposed split.
          </p>
        </div>
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Check className="h-4 w-4" />
          Accept invite
        </button>
      </div>
    </div>
  );
}

function MobileDealContext({ deal, currentVersion }: { deal: NegotiationDeal; currentVersion?: SplitVersion }) {
  if (!currentVersion) return null;

  return (
    <div className="border-b border-border bg-card p-4 xl:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold">Current terms v{currentVersion.version}</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{currentVersion.note}</p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
          {deal.acceptedBy.length}/{deal.requiredSignerIds.length} accepted
        </span>
      </div>
      <SplitBars allocations={currentVersion.allocations} />
    </div>
  );
}

function MessageRow({
  message,
  deal,
  onAccept,
  onReject,
  onCounter,
}: {
  message: NegotiationMessage;
  deal: NegotiationDeal;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}) {
  const sender = deal.participants.find((participant) => participant.id === message.senderId) ?? deal.participants[0];
  const fromMe = deal.viewerParticipantIds.has(sender.id);
  const version = message.proposedSplitId ? deal.splitVersions.find((item) => item.id === message.proposedSplitId) : undefined;

  if (message.type !== "text") {
    return (
      <div className={`flex gap-3 ${fromMe ? "justify-end" : ""}`}>
        {!fromMe && <Avatar participant={sender} />}
        <div className={`max-w-[860px] ${fromMe ? "order-first" : ""}`}>
          <MessageMeta sender={sender} createdAt={message.createdAt} fromMe={fromMe} />
          <StructuredMessageCard
            message={message}
            version={version}
            fromMe={fromMe}
            alreadyAccepted={deal.acceptedBy.some((participantId) => deal.viewerParticipantIds.has(participantId))}
            signed={deal.signedBy.some((participantId) => deal.viewerParticipantIds.has(participantId))}
            deal={deal}
            onAccept={onAccept}
            onReject={onReject}
            onCounter={onCounter}
          />
        </div>
        {fromMe && <Avatar participant={sender} />}
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${fromMe ? "justify-end" : ""}`}>
      {!fromMe && <Avatar participant={sender} />}
      <div className={`max-w-[82%] ${fromMe ? "order-first" : ""}`}>
        <MessageMeta sender={sender} createdAt={message.createdAt} fromMe={fromMe} />
        <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${fromMe ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border border-border bg-card text-foreground"}`}>
          {message.body}
        </div>
      </div>
      {fromMe && <Avatar participant={sender} />}
    </div>
  );
}

function StructuredMessageCard({
  message,
  version,
  fromMe,
  alreadyAccepted,
  signed,
  deal,
  onAccept,
  onReject,
  onCounter,
}: {
  message: NegotiationMessage;
  version?: SplitVersion;
  fromMe: boolean;
  alreadyAccepted: boolean;
  signed: boolean;
  deal: NegotiationDeal;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}) {
  const tone = {
    proposal: "border-primary/25 bg-primary/5",
    counter: "border-[hsl(var(--split-amended)/0.3)] bg-[hsl(var(--split-amended)/0.08)]",
    accept: "border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)]",
    reject: "border-destructive/25 bg-destructive/5",
    sign: "border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)]",
    system: "border-border bg-secondary/50",
    text: "border-border bg-card",
  }[message.type];
  const Icon = message.type === "accept" || message.type === "sign"
    ? CheckCircle2
    : message.type === "reject"
      ? X
      : message.type === "counter"
        ? GitBranch
        : PenLine;
  const actionable = (message.type === "proposal" || message.type === "counter") && !FINAL_STATUSES.has(deal.document.status);

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-background text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{message.body}</div>
          {version && (
            <div className="mt-3 rounded-lg border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-bold">Version {version.version}: {version.title}</div>
                <span className="text-[10px] font-semibold text-muted-foreground">{version.createdAt}</span>
              </div>
              <SplitBars allocations={version.allocations} />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{version.note}</p>
            </div>
          )}
          {actionable && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onAccept}
                disabled={alreadyAccepted}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--split-verified))] px-3 py-2 text-xs font-bold text-primary-foreground disabled:cursor-default disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {alreadyAccepted ? "Accepted" : "Accept"}
              </button>
              <button type="button" onClick={onCounter} disabled={signed} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:cursor-default disabled:opacity-50">
                <GitBranch className="h-3.5 w-3.5" />
                Counter
              </button>
              <button type="button" onClick={onReject} disabled={signed} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:cursor-default disabled:opacity-50">
                <X className="h-3.5 w-3.5" />
                Dispute
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DealContextPanel({ deal, currentVersion }: { deal: NegotiationDeal; currentVersion?: SplitVersion }) {
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <aside className="hidden w-[420px] flex-shrink-0 overflow-y-auto border-l border-border bg-card p-5 xl:block 2xl:w-[460px]">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Deal terms</p>
        <h2 className="mt-1 text-lg font-bold">{deal.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{deal.artist}</p>
      </div>

      {currentVersion && (
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-background p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold">Current split v{currentVersion.version}</div>
                <div className="text-[11px] text-muted-foreground">{currentVersion.title}</div>
              </div>
              <Split className="h-4 w-4 text-primary" />
            </div>
            <SplitBars allocations={currentVersion.allocations} />
          </section>

          <section className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 text-xs font-bold">Collaborators</div>
            <div className="space-y-2">
              {deal.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar participant={participant} small />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold">{participant.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{participant.handle}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">{participant.role}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 text-xs font-bold">Revenue streams</div>
            <div className="space-y-2">
              {currentVersion.revenueStreams.map((stream) => (
                <div key={stream.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary/50 px-2.5 py-2">
                  <span className="text-xs font-semibold">{stream.label}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{stream.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background">
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
            >
              <span className="text-xs font-bold">Version history</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </button>
            {historyOpen && (
              <div className="space-y-2 border-t border-border p-3">
                {deal.splitVersions.slice().reverse().map((version) => (
                  <div key={version.id} className={`rounded-lg border px-3 py-2 ${version.id === deal.currentVersionId ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold">v{version.version}</span>
                      <span className="text-[10px] text-muted-foreground">{version.createdAt}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{version.note}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}

function SplitBars({ allocations }: { allocations: SplitAllocation[] }) {
  const colors = ["bg-primary", "bg-[hsl(var(--split-pending))]", "bg-[hsl(var(--split-amended))]", "bg-muted-foreground"];

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-border">
        {allocations.map((allocation, index) => (
          <span key={allocation.participantId} className={colors[index % colors.length]} style={{ width: `${allocation.percent}%` }} />
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {allocations.map((allocation, index) => (
          <div key={allocation.participantId} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate">
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${colors[index % colors.length]}`} />
              {allocation.name}
            </span>
            <span className="font-bold tabular-nums">{allocation.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ participant, small }: { participant: DealParticipant; small?: boolean }) {
  return (
    <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary ${small ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"}`}>
      {participant.initials}
    </span>
  );
}

function MessageMeta({ sender, createdAt, fromMe }: { sender: DealParticipant; createdAt: string; fromMe: boolean }) {
  return (
    <div className={`mb-1 flex items-center gap-2 text-[11px] text-muted-foreground ${fromMe ? "justify-end" : ""}`}>
      <span className="font-semibold text-foreground">{fromMe ? "You" : sender.name}</span>
      <span>{formatDateTime(createdAt)}</span>
    </div>
  );
}

function DealStatus({ status }: { status: NegotiationStatus }) {
  const styles = {
    negotiating: "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    ready_to_sign: "bg-primary/10 text-primary border-primary/20",
    signed: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
  };
  const labels = {
    negotiating: "Negotiating",
    ready_to_sign: "Ready to sign",
    signed: "Signed",
  };

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function documentToNegotiationDeal(document: StoredSplitSheetDocument, userProfile: UserProfile): NegotiationDeal | null {
  if (document.status === "Draft" || !document.sentAt) return null;
  if (!documentBelongsToProfile(document, userProfile) && !findInviteForProfile(document, userProfile)) return null;

  const viewerParticipantIds = documentParticipantIdsForProfile(document, userProfile);
  const participants = document.data.parties.map((party) => {
    const invite = document.collaboratorInvites.find((item) => item.partyId === party.id);
    const id = party.isCurrentUser ? "creator" : invite?.id ?? party.id;
    const name = splitSheetPartyDisplayName(document, party, invite?.name || "Collaborator");
    const username = party.inviteMethod === "username" ? party.inviteValue.replace(/^@+/, "") : invite?.profileSnapshot?.username;

    return {
      id,
      name,
      handle: username ? `@${username}` : party.email || invite?.inviteValue || party.phoneNumber || "SPLIT user",
      initials: initialsForName(name),
      role: party.role || "Collaborator",
    };
  });
  const currentProposalId = document.currentProposalId || document.splitProposalVersions.at(-1)?.id || "";
  const splitVersions = document.splitProposalVersions.map((proposal) => ({
    id: proposal.id,
    version: proposal.versionNumber,
    title: proposal.proposedBy,
    createdAt: proposal.createdAt,
    createdBy: proposal.proposedBy,
    note: proposal.notes || "Split proposal",
    allocations: proposal.allocations.map((allocation) => ({
      participantId: allocation.partyId,
      name: splitSheetAllocationDisplayName(document, allocation),
      role: allocation.role,
      percent: Number(allocation.percentage) || 0,
    })),
    revenueStreams: [
      { id: "composition", label: "Composition / publishing", status: document.status },
      { id: "audit", label: "Agreement version", status: `v${proposal.versionNumber}` },
    ],
  }));
  const acceptedBy = acceptedParticipantIdsForProposal(document, currentProposalId);
  const signatures = buildSignatureRecords(document, currentProposalId);
  const signedBy = signatures
    .filter((signature) => signature.status === "Signed")
    .map((signature) => canonicalParticipantId(document, signature.collaboratorId) ?? signature.collaboratorId);
  const requiredSignerIds = requiredSignerIdsForDocument(document);
  const everyRequiredSignerAccepted = requiredSignerIds.length > 0 && requiredSignerIds.every((participantId) => acceptedBy.includes(participantId));
  const hasPendingInvites = document.collaboratorInvites.some((invite) => invite.status === "Pending");
  const status: NegotiationStatus = FINAL_STATUSES.has(document.status)
    ? "signed"
    : ["Ready to Sign", "Pending Signatures"].includes(document.status) || (!hasPendingInvites && everyRequiredSignerAccepted)
      ? "ready_to_sign"
      : "negotiating";

  return {
    id: document.id,
    title: document.data.songTitle || document.title || "Untitled SPLIT Sheet",
    artist: document.data.artistProjectName || document.creatorProfile.displayName || "SPLIT",
    status,
    updatedAt: relativeTime(document.updatedAt || document.createdAt),
    unreadCount: documentBelongsToProfile(document, userProfile) ? 0 : actionableCount(document, viewerParticipantIds),
    document,
    participants,
    requiredSignerIds,
    viewerParticipantIds,
    acceptedBy,
    signedBy,
    currentVersionId: currentProposalId,
    splitVersions,
    messages: buildMessages(document, currentProposalId),
  };
}

function buildMessages(document: StoredSplitSheetDocument, currentProposalId: string) {
  const creatorName = getProfileDisplayName(document.creatorProfile);
  const messages: NegotiationMessage[] = [
    {
      id: `${document.id}-sent`,
      type: "proposal",
      senderId: "creator",
      createdAt: document.sentAt || document.createdAt,
      body: `${creatorName} sent the initial split proposal.`,
      proposedSplitId: document.splitProposalVersions[0]?.id || currentProposalId,
    },
  ];

  document.collaboratorInvites.forEach((invite) => {
    if (invite.status === "Accepted") {
      messages.push({
        id: `${invite.id}-accepted`,
        type: "accept",
        senderId: invite.id,
        createdAt: invite.respondedAt || document.updatedAt,
        body: `${splitSheetParticipantDisplayName(document, invite.id, invite.name)} accepted the collaboration invite.`,
      });
    }

    if (invite.status === "Declined") {
      messages.push({
        id: `${invite.id}-declined`,
        type: "reject",
        senderId: invite.id,
        createdAt: invite.respondedAt || document.updatedAt,
        body: `${splitSheetParticipantDisplayName(document, invite.id, invite.name)} declined the collaboration invite.`,
      });
    }
  });

  document.splitProposalVersions.slice(1).forEach((proposal) => {
    messages.push({
      id: `${proposal.id}-message`,
      type: "counter",
      senderId: participantIdForActor(document, proposal.proposedBy),
      createdAt: proposal.createdAt,
      body: `${proposal.proposedBy} proposed split version ${proposal.versionNumber}.`,
      proposedSplitId: proposal.id,
    });
  });

  document.splitApprovals.forEach((approval) => {
    if (!approval.respondedAt) return;

    messages.push({
      id: `${approval.id}-response`,
      type: approval.status === "Approved" ? "accept" : "reject",
      senderId: approval.collaboratorId,
      createdAt: approval.respondedAt,
      body: approval.status === "Approved"
        ? `${splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName)} accepted this split version.`
        : `${splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName)} disputed this split version.`,
      proposedSplitId: approval.proposalVersionId,
    });
  });

  document.splitSignatures.forEach((signature) => {
    if (signature.status !== "Signed" || !signature.signedAt) return;

    messages.push({
      id: `${signature.id}-signed`,
      type: "sign",
      senderId: signature.collaboratorId,
      createdAt: signature.signedAt,
      body: `${splitSheetParticipantDisplayName(document, signature.collaboratorId, signature.collaboratorName)} signed the split sheet.`,
      proposedSplitId: signature.proposalVersionId,
    });
  });

  readStoredChatMessages(document).forEach((message) => {
    messages.push({
      id: message.id,
      type: "text",
      senderId: message.senderId,
      createdAt: message.createdAt,
      body: message.body,
    });
  });

  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function readStoredChatMessages(document: StoredSplitSheetDocument): StoredChatMessage[] {
  return document.auditTrail.flatMap((entry) => {
    if (!entry.action.startsWith(`${CHAT_MESSAGES_KEY}:`)) return [];

    try {
      const parsed = JSON.parse(entry.action.slice(CHAT_MESSAGES_KEY.length + 1));
      return parsed && typeof parsed === "object" && typeof parsed.body === "string" ? [parsed as StoredChatMessage] : [];
    } catch {
      return [];
    }
  });
}

function buildSignatureRecords(document: StoredSplitSheetDocument, proposalId: string) {
  const existingSignatures = Array.isArray(document.splitSignatures) ? document.splitSignatures : [];
  const currentSignatures = existingSignatures.filter((signature) => signature.proposalVersionId === proposalId);
  const creatorPartyId = document.data.parties.find((party) => party.isCurrentUser)?.id;
  const signers = [
    { id: "creator", aliases: ["creator", creatorPartyId].filter(Boolean), name: getProfileDisplayName(document.creatorProfile) },
    ...document.collaboratorInvites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({
        id: invite.id,
        aliases: [invite.id, invite.partyId].filter(Boolean),
        name: splitSheetParticipantDisplayName(document, invite.id, invite.name),
      })),
  ];
  const missingSignatures = signers
    .filter((signer) => !currentSignatures.some((signature) => signer.aliases.includes(signature.collaboratorId)))
    .map((signer) => ({
      id: `${document.id}-${proposalId}-${signer.id}-signature`,
      proposalVersionId: proposalId,
      collaboratorId: signer.id,
      collaboratorName: signer.name,
      status: "Pending" as const,
    }));

  return [...existingSignatures, ...missingSignatures];
}

function dealReadyToSign(deal: NegotiationDeal) {
  if (FINAL_STATUSES.has(deal.document.status)) return false;
  if (deal.document.collaboratorInvites.some((invite) => invite.status === "Pending")) return false;
  if (deal.status === "ready_to_sign") return true;

  const acceptedParticipants = new Set(deal.acceptedBy);
  return deal.requiredSignerIds.length > 0 && deal.requiredSignerIds.every((participantId) => acceptedParticipants.has(participantId));
}

function requiredSignerIdsForDocument(document: StoredSplitSheetDocument) {
  return uniqueParticipantIds([
    "creator",
    ...document.collaboratorInvites.filter((invite) => invite.status === "Accepted").map((invite) => invite.id),
  ]);
}

function acceptedParticipantIdsForProposal(document: StoredSplitSheetDocument, proposalId: string) {
  if (!proposalId) return [];

  const proposal = document.splitProposalVersions.find((item) => item.id === proposalId);
  const approvals = ensureCreatorApprovalForProposal(
    document,
    document.splitApprovals,
    proposal,
    proposal?.createdAt || document.createdAt,
  );
  const acceptedIds = approvals
    .filter((approval) => approval.proposalVersionId === proposalId && approval.status === "Approved")
    .map((approval) => canonicalParticipantId(document, approval.collaboratorId))
    .filter(Boolean) as string[];

  return uniqueParticipantIds(acceptedIds);
}

function allRequiredParticipantsAccepted(document: StoredSplitSheetDocument, proposalId: string) {
  const acceptedParticipants = new Set(acceptedParticipantIdsForProposal(document, proposalId));
  const requiredSigners = requiredSignerIdsForDocument(document);

  return requiredSigners.length > 0 && requiredSigners.every((participantId) => acceptedParticipants.has(participantId));
}

function ensureCreatorApprovalForProposal(
  document: StoredSplitSheetDocument,
  approvals: ApprovalRecord[],
  proposal?: ProposalVersionRecord,
  approvedAt?: string,
) {
  if (!proposal || !proposalWasCreatedByCreator(document, proposal)) return approvals;

  let hasCreatorApproval = false;
  const nextApprovals = approvals.map((approval) => {
    if (approval.proposalVersionId !== proposal.id || canonicalParticipantId(document, approval.collaboratorId) !== "creator") {
      return approval;
    }

    hasCreatorApproval = true;
    return {
      ...approval,
      collaboratorId: "creator",
      collaboratorName: splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName || getProfileDisplayName(document.creatorProfile)),
      status: "Approved" as const,
      respondedAt: approval.respondedAt || approvedAt || proposal.createdAt,
    };
  });

  if (hasCreatorApproval) return nextApprovals;

  return [
    ...nextApprovals,
    {
      id: `${proposal.id}-creator-approval`,
      proposalVersionId: proposal.id,
      collaboratorId: "creator",
      collaboratorName: getProfileDisplayName(document.creatorProfile),
      status: "Approved" as const,
      respondedAt: approvedAt || proposal.createdAt,
    },
  ];
}

function proposalWasCreatedByCreator(document: StoredSplitSheetDocument, proposal: ProposalVersionRecord) {
  if (proposal.id === document.splitProposalVersions[0]?.id) return true;

  const creatorProfile = document.creatorProfile;
  const creatorNames = [
    getProfileDisplayName(creatorProfile),
    creatorProfile.displayName,
    creatorProfile.pkaNames,
    creatorProfile.legalName,
    creatorProfile.emailAddress,
    creatorProfile.username,
  ].map(normalizeParticipantLabel);

  return creatorNames.includes(normalizeParticipantLabel(proposal.proposedBy));
}

function canonicalParticipantId(document: StoredSplitSheetDocument, participantId?: string) {
  if (!participantId) return undefined;

  const creatorPartyId = document.data.parties.find((party) => party.isCurrentUser)?.id;
  if (participantId === "creator" || participantId === creatorPartyId) return "creator";

  const invite = document.collaboratorInvites.find((item) => item.id === participantId || item.partyId === participantId);
  return invite?.id || participantId;
}

function uniqueParticipantIds(participantIds: string[]) {
  return Array.from(new Set(participantIds));
}

function normalizeParticipantLabel(value?: string) {
  return (value ?? "").trim().replace(/^@+/, "").toLowerCase();
}

function participantMatchesViewer(deal: NegotiationDeal, participantId?: string) {
  const canonicalId = canonicalParticipantId(deal.document, participantId);
  return Boolean(participantId && deal.viewerParticipantIds.has(canonicalId ?? participantId));
}

function firstViewerParticipantId(deal: NegotiationDeal) {
  return deal.participants.find((participant) => deal.viewerParticipantIds.has(participant.id))?.id || [...deal.viewerParticipantIds][0] || "";
}

function participantIdentityForProfile(document: StoredSplitSheetDocument, profile: UserProfile) {
  const invite = findInviteForProfile(document, profile);
  const inviteParty = invite ? document.data.parties.find((party) => party.id === invite.partyId) : undefined;
  if (invite && !inviteParty?.isCurrentUser) {
    return {
      id: invite.id,
      name: getInviteDisplayName(invite, inviteParty, profile),
    };
  }

  if (documentBelongsToProfile(document, profile)) {
    return {
      id: "creator",
      name: getProfileDisplayName(profile),
    };
  }

  return null;
}

function getInviteDisplayName(
  invite: StoredSplitSheetDocument["collaboratorInvites"][number],
  party: StoredSplitSheetDocument["data"]["parties"][number] | undefined,
  profile: UserProfile,
) {
  return (
    profile.displayName ||
    profile.pkaNames ||
    cleanParticipantLabel(party?.professionalName) ||
    cleanParticipantLabel(invite.profileSnapshot?.displayName) ||
    cleanParticipantLabel(invite.name) ||
    profile.username ||
    profile.emailAddress ||
    "SPLIT user"
  );
}

function cleanParticipantLabel(value?: string) {
  const label = (value ?? "").trim();
  if (!label || /^(invited writer|invited collaborator|collaborator|contributor|pending)$/i.test(label)) return "";
  return label;
}

function participantIdForActor(document: StoredSplitSheetDocument, actor: string) {
  const normalizedActor = normalizeParticipantLabel(actor);
  if (normalizedActor === getProfileDisplayName(document.creatorProfile).trim().toLowerCase()) return "creator";

  const invite = document.collaboratorInvites.find((item) =>
    [
      item.name,
      item.profileSnapshot?.displayName,
      item.profileSnapshot?.username,
      item.inviteValue,
    ]
      .map(normalizeParticipantLabel)
      .includes(normalizedActor),
  );
  return invite?.id || "creator";
}

function actionableCount(document: StoredSplitSheetDocument, viewerParticipantIds: Set<string>) {
  const currentProposalId = document.currentProposalId || document.splitProposalVersions.at(-1)?.id || "";
  const pendingApproval = document.splitApprovals.some(
    (approval) =>
      approval.proposalVersionId === currentProposalId &&
      approval.status === "Pending" &&
      viewerParticipantIds.has(canonicalParticipantId(document, approval.collaboratorId) ?? approval.collaboratorId),
  );
  const pendingInvite = document.collaboratorInvites.some((invite) => invite.status === "Pending" && viewerParticipantIds.has(invite.id));
  const pendingSignature = document.splitSignatures.some(
    (signature) =>
      signature.proposalVersionId === currentProposalId &&
      signature.status === "Pending" &&
      viewerParticipantIds.has(canonicalParticipantId(document, signature.collaboratorId) ?? signature.collaboratorId),
  );

  return [pendingInvite, pendingApproval, pendingSignature].filter(Boolean).length;
}

function getProfileDisplayName(profile: UserProfile) {
  return profile.displayName || profile.pkaNames || profile.legalName || profile.emailAddress || profile.username || "SPLIT user";
}

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SP";
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function counterTotal(values: Record<string, string>) {
  return Math.round(Object.values(values).reduce((sum, value) => sum + (Number(value) || 0), 0) * 100) / 100;
}
