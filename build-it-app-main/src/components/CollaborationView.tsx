import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileSignature,
  GitBranch,
  Lightbulb,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import splitLockup from "@/assets/split-navy-amber-lockup.png";
import { addDocumentAuditTrail, type StoredSplitSheetDocument } from "@/components/contract-builder/document";
import {
  documentBelongsToProfile,
  findInviteForProfile,
  type SplitSheetUpdateContext,
} from "@/lib/splitSheetStorage";
import {
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import {
  allSplitSheetRequiredParticipantsAccepted,
  buildSplitSheetSignatureRecords,
  ensureSplitSheetCreatorApproval,
} from "@/lib/splitSheetParticipantState";
import {
  appendSplitSheetChatMessage,
  type StoredSplitSheetChatMessage,
} from "@/lib/splitSheetMessages";
import {
  dealReadyToSign,
  documentToNegotiationDeal,
  FINAL_NEGOTIATION_DOCUMENT_STATUSES,
  firstViewerParticipantId,
  formatNegotiationDateTime,
  getProfileDisplayName,
  participantIdentityForProfile,
  participantMatchesViewer,
  proposalResponsePermissions,
  type DealParticipant,
  type NegotiationDeal,
  type NegotiationMessage,
  type NegotiationStatus,
  type SplitAllocation,
  type SplitVersion,
} from "@/lib/splitSheetNegotiation";
import type { UserProfile } from "@/lib/userProfile";
import CounterOfferDialog from "@/components/CounterOfferDialog";
import DealSummary from "@/components/DealSummary";
import { counterAllocationState } from "@/lib/counterOffer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type InviteResponseResult = { ok: true } | { ok: false; error: string };

type PersistContext = SplitSheetUpdateContext & {
  successMessage?: string;
};

type CollaborationViewProps = {
  documents: StoredSplitSheetDocument[];
  userProfile: UserProfile;
  initialDealId?: string;
  onOpenAgreement?: (id: string) => void;
  onReloadDocuments?: () => void;
  reloading?: boolean;
  onUpdateDocument: (
    document: StoredSplitSheetDocument,
    context?: SplitSheetUpdateContext,
  ) => StoredSplitSheetDocument | void | Promise<StoredSplitSheetDocument | void>;
};

export default function CollaborationView({ documents, userProfile, initialDealId, onUpdateDocument, onOpenAgreement, onReloadDocuments, reloading = false }: CollaborationViewProps) {
  const deals = useMemo(
    () => documents.map((document) => documentToNegotiationDeal(document, userProfile)).filter(Boolean) as NegotiationDeal[],
    [documents, userProfile],
  );
  const [selectedDealId, setSelectedDealId] = useState("");
  const [composerDrafts, setComposerDrafts] = useState<Record<string, string>>({});
  const [retryReviewDealId, setRetryReviewDealId] = useState<string | null>(null);
  const chatAttempts = useRef(new Map<string, { body: string; document: StoredSplitSheetDocument }>());
  const writeInFlight = useRef(false);
  const [savingWrite, setSavingWrite] = useState(false);
  const [writeFailure, setWriteFailure] = useState<{ dealId: string; message: string } | null>(null);
  const [counterPercents, setCounterPercents] = useState<Record<string, string>>({});
  const [counterNote, setCounterNote] = useState("");
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterSnapshot, setCounterSnapshot] = useState<{ dealId: string; version: SplitVersion } | null>(null);
  const [counterSending, setCounterSending] = useState(false);
  const [counterError, setCounterError] = useState("");
  const counterInFlight = useRef(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const lastInitialDealIdRef = useRef<string | undefined>();

  const selectedDeal = selectedDealId
    ? deals.find((deal) => deal.id === selectedDealId) ?? null
    : deals[0] ?? null;
  const composerText = composerDrafts[selectedDeal?.id ?? ""] ?? "";
  const currentVersion = selectedDeal?.splitVersions.find((version) => version.id === selectedDeal.currentVersionId) ?? selectedDeal?.splitVersions.at(-1);
  const readyToSign = Boolean(selectedDeal && dealReadyToSign(selectedDeal));
  const isFinalRecord = Boolean(selectedDeal && FINAL_NEGOTIATION_DOCUMENT_STATUSES.has(selectedDeal.document.status));
  const viewerIdentity = selectedDeal ? participantIdentityForProfile(selectedDeal.document, userProfile) : null;
  const viewerName = viewerIdentity?.name || getProfileDisplayName(userProfile);
  const viewerParticipantId = selectedDeal ? viewerIdentity?.id || firstViewerParticipantId(selectedDeal) : "";
  const canCounter = Boolean(selectedDeal && proposalResponsePermissions(selectedDeal, currentVersion?.id).counter);
  const viewerInvite = selectedDeal && findInviteForProfile(selectedDeal.document, userProfile);
  const canMessage = Boolean(selectedDeal && !isFinalRecord && viewerInvite?.status !== "Declined");

  useEffect(() => {
    const initialDealExists = Boolean(initialDealId && deals.some((deal) => deal.id === initialDealId));
    if (initialDealId && initialDealExists && lastInitialDealIdRef.current !== initialDealId) {
      lastInitialDealIdRef.current = initialDealId;
      setSelectedDealId(initialDealId);
      setMobileChatOpen(true);
      return;
    }

    if (selectedDealId && deals.some((deal) => deal.id === selectedDealId)) return;

    const fallbackDealId = deals[0]?.id ?? "";
    if (selectedDealId !== fallbackDealId) {
      setSelectedDealId(fallbackDealId);
    }
  }, [deals, initialDealId, selectedDealId]);

  const updateDocument = async (document: StoredSplitSheetDocument, context: PersistContext) => {
    if (writeInFlight.current) return { ok: false as const, error: "Wait for the current update to finish." };
    writeInFlight.current = true;
    setSavingWrite(true);
    setWriteFailure(null);
    try {
      const persistedDocument = await onUpdateDocument(document, context);
      if (persistedDocument && persistedDocument.id) {
        setSelectedDealId((current) => current === document.id ? persistedDocument.id : current);
      }
      if (context.successMessage) {
        toast.success(context.successMessage);
      }
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Try again after checking your connection.";
      if (!["invite_accept", "invite_decline", "counter_offer"].includes(context.action ?? "")) {
        setWriteFailure({ dealId: document.id, message });
      }
      toast.error("Messages could not sync this update", {
        description: message,
      });
      return { ok: false as const, error: message };
    } finally {
      writeInFlight.current = false;
      setSavingWrite(false);
    }
  };

  const sendTextMessage = async (reviewedRetry = false) => {
    if (!selectedDeal || !canMessage || writeInFlight.current) return;

    const body = composerText.trim();
    if (!body) return;

    const now = new Date().toISOString();
    const message: StoredSplitSheetChatMessage = {
      id: makeId("chat"),
      senderId: viewerParticipantId || "viewer",
      senderName: viewerName,
      body,
      createdAt: now,
    };
    const previousAttempt = chatAttempts.current.get(selectedDeal.id);
    const retrying = previousAttempt?.body === body;
    if (retrying && !reviewedRetry && previousAttempt.document.serverRevision !== selectedDeal.document.serverRevision) {
      setRetryReviewDealId(selectedDeal.id);
      return;
    }
    const updatedDocument = retrying && !reviewedRetry ? previousAttempt.document : addDocumentAuditTrail(
      appendSplitSheetChatMessage(selectedDeal.document, message),
      viewerName,
      "Sent a negotiation message",
    );

    // Keep the original revision unless the user explicitly reviews a retry against newer state.
    chatAttempts.current.set(selectedDeal.id, { body, document: updatedDocument });
    const result = await updateDocument(updatedDocument, {
      action: "local_chat",
      notes: body,
      successMessage: "Message sent",
    });
    if (result.ok) {
      chatAttempts.current.delete(selectedDeal.id);
      setComposerDrafts(current => current[selectedDeal.id] === composerText ? { ...current, [selectedDeal.id]: "" } : current);
    }
  };

  const acceptInvite = async (): Promise<InviteResponseResult> => {
    if (!selectedDeal || isFinalRecord) return { ok: false, error: "This invitation is no longer available." };

    const invite = findInviteForProfile(selectedDeal.document, userProfile);
    if (!invite || invite.status !== "Pending") return { ok: false, error: "This invitation already has a response. Refresh to see it." };

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
    const approvalsWithCreator = ensureSplitSheetCreatorApproval(
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

    return updateDocument(updatedDocument, {
      action: "invite_accept",
      responseType: "invite_accept",
      successMessage: "Invite accepted",
    });
  };

  const declineInvite = async (): Promise<InviteResponseResult> => {
    if (!selectedDeal || isFinalRecord) return { ok: false, error: "This invitation is no longer available." };
    const invite = findInviteForProfile(selectedDeal.document, userProfile);
    if (!invite || invite.status !== "Pending") return { ok: false, error: "This invitation already has a response. Refresh to see it." };
    const updatedDocument = addDocumentAuditTrail({
      ...selectedDeal.document,
      status: "Disputed",
      collaboratorInvites: selectedDeal.document.collaboratorInvites.map((item) => item.id === invite.id
        ? { ...item, status: "Declined" as const, respondedAt: new Date().toISOString() } : item),
    }, viewerName, `${viewerName} declined the collaboration invite`);
    return updateDocument(updatedDocument, {
      action: "invite_decline",
      responseType: "invite_reject",
      successMessage: "Invite declined",
    });
  };

  const acceptProposal = async (proposalId: string) => {
    if (!selectedDeal || !currentVersion || !proposalResponsePermissions(selectedDeal, proposalId).accept) return;

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
    const splitApprovals = ensureSplitSheetCreatorApproval(selectedDeal.document, approvedByViewer, currentProposal, now);
    const documentWithApprovals = {
      ...selectedDeal.document,
      splitApprovals,
    };
    const allApproved = currentProposal ? allSplitSheetRequiredParticipantsAccepted(documentWithApprovals, currentProposal.id) : false;
    const baseDocument = {
      ...selectedDeal.document,
      status: allApproved ? "Ready to Sign" as const : selectedDeal.document.status,
      splitApprovals,
    };
    const updatedDocument = addDocumentAuditTrail(
      allApproved
        ? {
            ...baseDocument,
            splitSignatures: buildSplitSheetSignatureRecords(baseDocument, currentProposal?.id ?? currentVersion.id),
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

  const openCounterComposer = (proposalId = currentVersion?.id) => {
    if (writeInFlight.current || !selectedDeal || !currentVersion || !proposalResponsePermissions(selectedDeal, proposalId).counter) return;
    if (FINAL_NEGOTIATION_DOCUMENT_STATUSES.has(selectedDeal.document.status)) {
      toast.info("This SPLIT is signed and locked", {
        description: "Locked SPLIT records cannot be renegotiated or changed.",
      });
      return;
    }
    setCounterPercents(Object.fromEntries(currentVersion.allocations.map((allocation) => [allocation.participantId, String(allocation.percent)])));
    setCounterNote("");
    setCounterSnapshot({ dealId: selectedDeal.id, version: currentVersion });
    setCounterError("");
    setCounterOpen(true);
  };

  const createCounterOffer = async () => {
    if (!selectedDeal || !currentVersion || !counterSnapshot || counterInFlight.current) return;
    if (FINAL_NEGOTIATION_DOCUMENT_STATUSES.has(selectedDeal.document.status)) {
      toast.error("This SPLIT is signed and locked");
      return;
    }
    if (counterSnapshot.dealId !== selectedDeal.id || counterSnapshot.version.id !== currentVersion.id) {
      setCounterError("The proposal changed. Reload its shares before sending.");
      return;
    }
    if (!proposalResponsePermissions(selectedDeal, counterSnapshot.version.id).counter) {
      setCounterError("You can only respond to another collaborator's current proposal.");
      return;
    }
    const allocationState = counterAllocationState(currentVersion.allocations, counterPercents);
    const partyIds = new Set(selectedDeal.document.data.parties.map((party) => party.id));
    if (partyIds.size !== currentVersion.allocations.length || currentVersion.allocations.some((item) => !partyIds.has(item.participantId))) {
      setCounterError("The collaborators changed. Reopen this record before sending.");
      return;
    }
    if (!allocationState.valid) {
      setCounterError("Shares must be between 0 and 100% and total exactly 100%.");
      return;
    }
    if (!allocationState.changed && !counterNote.trim()) {
      return;
    }

    counterInFlight.current = true;
    setCounterSending(true);
    setCounterError("");
    try {
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
              proposedByUserId: userProfile.authUserId,
              proposedByParticipantId: viewerParticipantId,
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

      const result = await updateDocument(updatedDocument, {
        action: "counter_offer",
        responseType: "split_reject",
        notes: counterNote.trim() || "Counter-offer from Messages",
        successMessage: "Counter-offer sent",
      });
      if (result.ok) setCounterOpen(false);
      else setCounterError(result.error);
    } catch (error) {
      setCounterError(error instanceof Error ? error.message : "The counter could not be sent. Your changes are still here.");
    } finally {
      counterInFlight.current = false;
      setCounterSending(false);
    }
  };

  const signDeal = async () => {
    if (!selectedDeal || !currentVersion || !readyToSign) return;

    const preparedSignatures = buildSplitSheetSignatureRecords(selectedDeal.document, currentVersion.id);
    const viewerSignature = preparedSignatures.find(
      (signature) =>
        signature.proposalVersionId === currentVersion.id &&
        signature.status === "Pending" &&
        participantMatchesViewer(selectedDeal, signature.collaboratorId),
    );
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
            signerLegalName: (userProfile.legalName || "").trim() || undefined,
            signerArtistName: (userProfile.pkaNames || userProfile.displayName || "").trim() || undefined,
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
      successMessage: allSigned ? "Split sheet signed" : "Signature saved",
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
          saving={savingWrite}
        />
        <div className="deal-conversation-layout">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 xl:px-8">
              <div className="mx-auto max-w-5xl space-y-4">
                <InvitePrompt key={`${selectedDeal.id}-${viewerParticipantId}`} deal={selectedDeal} onAccept={acceptInvite} onDecline={declineInvite} busy={savingWrite} />

                {selectedDeal.messages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    deal={selectedDeal}
                    onAccept={acceptProposal}
                    onCounter={openCounterComposer}
                    busy={savingWrite}
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
                        disabled={savingWrite}
                        aria-busy={savingWrite}
                        className="split-press inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--split-verified))] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                      >
                        <FileSignature className="h-4 w-4" />
                        Sign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {counterOpen && counterSnapshot && counterSnapshot.dealId === selectedDeal.id && <CounterOfferDialog
              title={selectedDeal.title} version={counterSnapshot.version} values={counterPercents} note={counterNote}
              sending={counterSending} error={counterError} finalized={isFinalRecord}
              stale={counterSnapshot.version.id !== currentVersion?.id}
              onValuesChange={(values) => { setCounterPercents(values); setCounterError(""); }}
              onNoteChange={(note) => { setCounterNote(note); setCounterError(""); }}
              onClose={() => { if (!counterInFlight.current) setCounterOpen(false); }}
              onReload={() => { openCounterComposer(); setCounterNote(counterNote); }} onSubmit={() => void createCounterOffer()} />}

            <div className="border-t border-border bg-card px-4 py-3 md:px-6 xl:px-8">
              <AlertDialog open={retryReviewDealId === selectedDeal.id} onOpenChange={(open) => { if (!open) setRetryReviewDealId(null); }}>
                <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send this message again?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This split changed since your last attempt. Check the latest messages first: your previous send may have succeeded even though its confirmation did not arrive.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm">{composerText}</p>
                  <AlertDialogFooter className="gap-2 sm:space-x-0">
                    <AlertDialogCancel>Keep message</AlertDialogCancel>
                    <Button disabled={savingWrite} onClick={() => { setRetryReviewDealId(null); void sendTextMessage(true); }}>Send again</Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {writeFailure?.dealId === selectedDeal.id && <div role="alert" className="mx-auto mb-3 flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm text-destructive">
                <p className="min-w-0 break-words">{writeFailure.message}</p>
                {onReloadDocuments && <Button type="button" variant="outline" disabled={reloading || savingWrite} onClick={onReloadDocuments}>Reload latest</Button>}
              </div>}
              <div className="mx-auto flex max-w-5xl items-end gap-2">
                <textarea
                  value={composerText}
                  disabled={!canMessage}
                  onChange={(event) => {
                    const value = event.target.value;
                    setComposerDrafts(current => ({ ...current, [selectedDeal.id]: value }));
                    chatAttempts.current.delete(selectedDeal.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendTextMessage();
                    }
                  }}
                  placeholder={canMessage ? "Message the collaborators..." : "This conversation is read-only"}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="button"
                  onClick={() => openCounterComposer()}
                  disabled={!canCounter || savingWrite}
                  aria-label="Counter"
                  title={canCounter ? "Counter the current proposal" : "Waiting for another collaborator's proposal"}
                  className="flex h-11 flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-secondary disabled:cursor-default disabled:opacity-40"
                >
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">Counter</span>
                </button>
                <ElephantAssistantButton
                  key={selectedDeal.id}
                  deal={selectedDeal}
                  currentVersion={currentVersion}
                  onOpenCounter={() => openCounterComposer()}
                />
                <button
                  type="button"
                  onClick={() => void sendTextMessage()}
                  disabled={!canMessage || !composerText.trim() || savingWrite}
                  aria-busy={savingWrite}
                  className="split-press flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </main>

          {contextOpen && <DealSummary key={selectedDeal.id} deal={selectedDeal} currentVersion={currentVersion} onOpenAgreement={onOpenAgreement} />}
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
                    <span className={`text-[10px] font-semibold ${deal.pendingActionCount > 0 ? "text-primary" : "text-muted-foreground"}`}>{deal.updatedAt}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs font-semibold text-foreground/80">{deal.title}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-muted-foreground">{latestMessage?.body ?? "No messages yet"}</p>
                    {deal.pendingActionCount > 0 && (
                      <span aria-label="Action needed from you" title="Action needed from you" className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {deal.pendingActionCount}
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
  saving,
}: {
  deal: NegotiationDeal;
  currentVersion?: SplitVersion;
  readyToSign: boolean;
  contextOpen: boolean;
  onBack: () => void;
  onToggleContext: () => void;
  onSign: () => void;
  saving: boolean;
}) {
  return (
    <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to deal chats"
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
            disabled={saving}
            aria-busy={saving}
            className="split-press hidden items-center gap-2 rounded-lg bg-[hsl(var(--split-verified))] px-3 py-2 text-xs font-bold text-white hover:opacity-90 sm:flex"
          >
            <FileSignature className="h-3.5 w-3.5" />
            Sign
          </button>
        )}
        <button
          type="button"
          onClick={onToggleContext}
          aria-label={contextOpen ? "Hide deal summary" : "Show deal summary"}
          title={contextOpen ? "Hide deal summary" : "Show deal summary"}
          aria-expanded={contextOpen}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
        >
          {contextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

function InvitePrompt({ deal, onAccept, onDecline, busy }: {
  deal: NegotiationDeal;
  onAccept: () => Promise<InviteResponseResult>;
  onDecline: () => Promise<InviteResponseResult>;
  busy: boolean;
}) {
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [saving, setSaving] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const invite = deal.document.collaboratorInvites.find((item) => item.status === "Pending" && deal.viewerParticipantIds.has(item.id));
  const declined = deal.document.collaboratorInvites.filter((item) => item.status === "Declined");
  const viewerDeclined = declined.some((item) => deal.viewerParticipantIds.has(item.id));
  const respond = async (choice: "accept" | "decline") => {
    if (inFlight.current || !invite) return;
    inFlight.current = true;
    setSaving(choice);
    setError("");
    try {
      const result = await (choice === "accept" ? onAccept() : onDecline());
      if (result.ok) setConfirmDecline(false);
      else if ("error" in result) setError(result.error);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your response could not be saved. Try again.");
    } finally {
      inFlight.current = false;
      setSaving(null);
    }
  };
  if (FINAL_NEGOTIATION_DOCUMENT_STATUSES.has(deal.document.status)) return null;
  const declineNotice = declined.length > 0 && (
    <div className="rounded-lg border border-border bg-secondary/40 p-4" role="status">
      <p className="text-sm font-bold">{viewerDeclined ? "You declined this invitation" : "Invitation declined"}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {viewerDeclined ? "Your response is saved. This conversation is now read-only."
          : `${declined.map((item) => splitSheetParticipantDisplayName(deal.document, item.id, item.name)).join(", ")} declined. This split cannot be finalized with a declined invitation.`}
      </p>
    </div>
  );
  if (!invite) return declineNotice || null;

  return (
    <>
      {declineNotice}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-primary">New split-sheet invite</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Accept to join the discussion, or decline this invitation. Accepting does not approve the split percentages.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <AlertDialog open={confirmDecline} onOpenChange={(open) => { if (!inFlight.current) { setConfirmDecline(open); setError(""); } }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={saving !== null || busy} className="flex-1 gap-2 xl:flex-none"><X className="h-4 w-4" />Decline invite</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline this invitation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will not join {deal.title}. Your response will be shared with the collaborators, and you will not be able to negotiate or sign this split. You can still view its history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <AlertDialogFooter className="gap-2 sm:space-x-0">
                  <AlertDialogCancel disabled={saving !== null}>Keep invitation</AlertDialogCancel>
                  <Button variant="destructive" disabled={saving !== null || busy} onClick={() => void respond("decline")} className="gap-2">
                    <X className="h-4 w-4" />{saving === "decline" ? "Declining..." : "Decline invite"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => void respond("accept")} disabled={saving !== null || busy} className="flex-1 gap-2 xl:flex-none">
              <Check className="h-4 w-4" />
              {saving === "accept" ? "Accepting..." : "Accept invite"}
            </Button>
          </div>
        </div>
        {error && !confirmDecline && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </>
  );
}

function MessageRow({
  message,
  deal,
  onAccept,
  onCounter,
  busy,
}: {
  message: NegotiationMessage;
  deal: NegotiationDeal;
  onAccept: (proposalId: string) => void;
  onCounter: (proposalId: string) => void;
  busy: boolean;
}) {
  const sender = deal.participants.find((participant) => participant.id === message.senderId)
    ?? { id: "unknown", name: "Unknown collaborator", initials: "?", handle: "", role: "" };
  const fromMe = participantMatchesViewer(deal, sender.id);
  const version = message.proposedSplitId ? deal.splitVersions.find((item) => item.id === message.proposedSplitId) : undefined;

  if (message.type !== "text") {
    return (
      <div data-message-id={message.id} className={`flex gap-3 ${fromMe ? "justify-end" : ""}`}>
        {!fromMe && <Avatar participant={sender} />}
        <div className={`max-w-[860px] ${fromMe ? "order-first" : ""}`}>
          <MessageMeta sender={sender} createdAt={message.createdAt} fromMe={fromMe} />
          <StructuredMessageCard
            message={message}
            version={version}
            fromMe={fromMe}
            alreadyAccepted={deal.acceptedBy.some((participantId) => deal.viewerParticipantIds.has(participantId))}
            deal={deal}
            busy={busy}
            onAccept={() => { if (version) onAccept(version.id); }}
            onCounter={() => { if (version) onCounter(version.id); }}
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

function ElephantAssistantButton({
  deal,
  currentVersion,
  onOpenCounter,
}: {
  deal: NegotiationDeal;
  currentVersion?: SplitVersion;
  onOpenCounter: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isLocked = deal.status === "signed" || FINAL_NEGOTIATION_DOCUMENT_STATUSES.has(deal.document.status);
  const canCounter = proposalResponsePermissions(deal, currentVersion?.id).counter;
  const total = currentVersion?.allocations.reduce((sum, allocation) => sum + allocation.percent, 0) ?? 0;

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        aria-label="Open Elephant private read"
        aria-expanded={open}
        title="Elephant's private read"
        onClick={() => setOpen((current) => !current)}
        className={`group flex h-11 items-center justify-center gap-2 rounded-xl border px-2.5 text-xs font-bold shadow-sm transition ${
          open
            ? "border-primary/45 bg-primary/10 text-foreground"
            : "border-[hsl(var(--split-pending)/0.3)] bg-[hsl(var(--split-bone))] text-foreground hover:border-primary/50 hover:bg-primary/10"
        }`}
      >
        <span className="flex h-7 w-7 overflow-hidden rounded-lg border border-primary/20 bg-primary/10">
          <img src={splitLockup} alt="" className="h-full w-full object-cover object-left" />
        </span>
        <span className="hidden lg:inline">Elephant</span>
        <Sparkles className="hidden h-3.5 w-3.5 text-primary sm:block" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-40 mb-3 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[hsl(var(--split-pending)/0.25)] bg-white/90 p-3 text-left shadow-[0_24px_70px_hsl(var(--split-amended)/0.18)] backdrop-blur-xl">
          <span className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-b border-r border-[hsl(var(--split-pending)/0.25)] bg-white/90" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 overflow-hidden rounded-xl border border-primary/20 bg-[hsl(var(--split-bone))] shadow-sm">
                <img src={splitLockup} alt="" className="h-full w-full object-cover object-left" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground">Elephant's private read</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--split-bone))] px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Only you can see this
                </div>
              </div>
            </div>

            {isLocked ? (
              <div className="mt-3 rounded-xl border border-[hsl(var(--split-verified)/0.24)] bg-[hsl(var(--split-verified)/0.08)] p-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--split-verified))]">
                  <Lock className="h-4 w-4" />
                  Signed and locked
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Everyone signed this SPLIT, so the record is final. I can help you review what happened here, but I will not suggest counters or new terms on a locked record.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-xl border border-[hsl(var(--split-pending)/0.28)] bg-[hsl(var(--split-bone))] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Split read
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${Math.round(total) === 100 ? "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))]" : "bg-destructive/10 text-destructive"}`}>
                      Total {total}%
                    </span>
                  </div>
                  {currentVersion && <SplitBars allocations={currentVersion.allocations} />}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {canCounter ? "The current proposal is ready for your review." : "Waiting for the other collaborators to respond."}
                </p>
                <button
                  type="button"
                  disabled={!canCounter}
                  onClick={() => {
                    setOpen(false);
                    onOpenCounter();
                  }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-default disabled:opacity-40"
                >
                  <GitBranch className="h-4 w-4" />
                  Suggest a counter
                </button>
              </>
            )}

            {isLocked && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground hover:bg-secondary"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StructuredMessageCard({
  message,
  version,
  fromMe,
  alreadyAccepted,
  deal,
  onAccept,
  onCounter,
  busy,
}: {
  message: NegotiationMessage;
  version?: SplitVersion;
  fromMe: boolean;
  alreadyAccepted: boolean;
  deal: NegotiationDeal;
  onAccept: () => void;
  onCounter: () => void;
  busy: boolean;
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
  const isProposal = message.type === "proposal" || message.type === "counter";
  const permissions = proposalResponsePermissions(deal, version?.id);
  const actionable = isProposal && permissions.counter;

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
                <time dateTime={version.createdAt} title={version.createdAt} className="text-[10px] font-semibold text-muted-foreground">{formatNegotiationDateTime(version.createdAt)}</time>
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
                disabled={!permissions.accept || busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--split-verified))] px-3 py-2 text-xs font-bold text-white disabled:cursor-default disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {alreadyAccepted ? "Accepted" : "Accept"}
              </button>
              <button type="button" onClick={onCounter} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:cursor-default disabled:opacity-50">
                <GitBranch className="h-3.5 w-3.5" />
                Counter
              </button>
            </div>
          )}
          {isProposal && fromMe && version?.id === deal.currentVersionId && deal.status === "negotiating" && (
            <p className="mt-3 text-xs text-muted-foreground">Your proposal. Awaiting collaborators.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SplitBars({ allocations }: { allocations: SplitAllocation[] }) {
  const colors = ["split-allocation-1", "split-allocation-2", "split-allocation-3", "split-allocation-4", "split-allocation-5"];

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
      <span>{formatNegotiationDateTime(createdAt)}</span>
    </div>
  );
}

function DealStatus({ status }: { status: NegotiationStatus }) {
  const styles = {
    awaiting_invites: "bg-primary/10 text-primary border-primary/20",
    invite_declined: "bg-secondary text-muted-foreground border-border",
    negotiating: "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    ready_to_sign: "bg-primary/10 text-primary border-primary/20",
    signed: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
  };
  const labels = {
    awaiting_invites: "Awaiting invites",
    invite_declined: "Invite declined",
    negotiating: "Negotiating",
    ready_to_sign: "Ready to sign",
    signed: "Signed",
  };

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
