import React, { useState } from "react";
import { Agreement, StatusBadge, AgreementIcon } from "@/components/Dashboard";
import { SplitSheetDocumentPage } from "@/components/contract-builder/SplitSheetDocumentPreview";
import { addDocumentAuditTrail, type StoredSplitSheetDocument } from "@/components/contract-builder/document";
import { getSplitWorkflowLabel, VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";
import { documentBelongsToProfile, findInviteForProfile, type SplitSheetUpdateContext } from "@/lib/splitSheetStorage";
import type { UserProfile } from "@/lib/userProfile";
import {
  Shield,
  GitBranch,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  ChevronDown,
  ChevronUp,
  PenLine,
  Download,
} from "lucide-react";

const FINAL_STATUSES = [...VERIFIED_SPLIT_STATUSES, "Archived"] as Agreement["status"][];

function documentActorName(document: StoredSplitSheetDocument) {
  return document.creatorProfile.displayName || document.creatorProfile.legalName || document.creatorProfile.emailAddress || "SPLIT user";
}

function formatDisplayDateTime(value: string | undefined) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function buildSignatureRecords(document: StoredSplitSheetDocument, proposalId: string) {
  const existingSignatures = Array.isArray(document.splitSignatures) ? document.splitSignatures : [];
  const currentSignatures = existingSignatures.filter((signature) => signature.proposalVersionId === proposalId);
  const signers = [
    { id: "creator", name: documentActorName(document) },
    ...document.collaboratorInvites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({ id: invite.id, name: invite.name })),
  ];
  const missingSignatures = signers
    .filter((signer) => !currentSignatures.some((signature) => signature.collaboratorId === signer.id))
    .map((signer) => ({
      id: `${document.id}-${proposalId}-${signer.id}-signature`,
      proposalVersionId: proposalId,
      collaboratorId: signer.id,
      collaboratorName: signer.name,
      status: "Pending" as const,
    }));

  return [...existingSignatures, ...missingSignatures];
}

export default function AgreementDetail({
  agreement,
  viewerProfile,
  onUpdateDocument,
}: {
  agreement: Agreement;
  viewerProfile: UserProfile;
  onUpdateDocument?: (document: StoredSplitSheetDocument, context?: SplitSheetUpdateContext) => void | Promise<void>;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [proposalNote, setProposalNote] = useState("");
  const [proposalPercents, setProposalPercents] = useState<Record<string, string>>(() =>
    Object.fromEntries((agreement.document?.data.parties ?? []).map((party) => [party.id, String(party.percent)])),
  );

  const totalPercent = agreement.splits.reduce((s, p) => s + p.percent, 0);
  const isFinalRecord = FINAL_STATUSES.includes(agreement.status);
  const invites = agreement.document?.collaboratorInvites ?? [];
  const isCreator = Boolean(agreement.document && documentBelongsToProfile(agreement.document, viewerProfile));
  const viewerInvite = agreement.document ? findInviteForProfile(agreement.document, viewerProfile) : undefined;
  const viewerParticipantId = isCreator ? "creator" : viewerInvite?.id;
  const canUpdateInvites = Boolean(agreement.document && onUpdateDocument && !isFinalRecord && !isCreator && viewerInvite);
  const currentProposal = agreement.document?.splitProposalVersions.find((proposal) => proposal.id === agreement.document?.currentProposalId) ?? agreement.document?.splitProposalVersions.at(-1);
  const currentApprovals = agreement.document?.splitApprovals.filter((approval) => approval.proposalVersionId === currentProposal?.id) ?? [];
  const currentSignatures = agreement.document?.splitSignatures.filter((signature) => signature.proposalVersionId === currentProposal?.id) ?? [];
  const visibleSignatures = currentSignatures.length > 0
    ? currentSignatures
    : agreement.document && currentProposal && ["Ready to Sign", "Pending Signatures"].includes(agreement.status)
      ? buildSignatureRecords(agreement.document, currentProposal.id).filter((signature) => signature.proposalVersionId === currentProposal.id)
      : [];
  const proposalTotal = Object.values(proposalPercents).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const canNegotiate = Boolean(agreement.document && onUpdateDocument && !isFinalRecord && agreement.status !== "Draft" && agreement.status !== "Pending Collaborator Acceptance");
  const canReviseProposal = canNegotiate && (isCreator || viewerInvite?.status === "Accepted");
  const signableSignature = visibleSignatures.find((signature) => signature.status === "Pending" && signature.collaboratorId === viewerParticipantId);
  const canSign = Boolean(agreement.document && onUpdateDocument && signableSignature && ["Ready to Sign", "Pending Signatures"].includes(agreement.status));
  const versionItems = agreement.document?.splitProposalVersions.map((proposal) => ({
    version: proposal.versionNumber,
    date: new Date(proposal.createdAt).toLocaleDateString(),
    note: proposal.notes || "Split proposal",
    active: proposal.id === agreement.document?.currentProposalId,
  })) ?? [];
  const auditItems = agreement.document?.auditTrail
    .map((entry) => ({
      date: new Date(entry.timestamp).toLocaleString(),
      event: entry.action,
      actor: entry.actor,
    }))
    .reverse() ?? [];

  const updateInviteStatus = (inviteId: string, status: "Accepted" | "Declined") => {
    if (!agreement.document || !onUpdateDocument || isFinalRecord || inviteId !== viewerInvite?.id) return;

    const now = new Date().toISOString();
    const collaboratorInvites = invites.map((invite) =>
      invite.id === inviteId
        ? {
            ...invite,
            status,
            respondedAt: now,
            profileSnapshot: {
              ...invite.profileSnapshot,
              displayName: invite.profileSnapshot?.displayName || invite.name,
            },
          }
        : invite,
    );
    const allResponded = collaboratorInvites.length > 0 && collaboratorInvites.every((invite) => invite.status !== "Pending");
    const acceptedCount = collaboratorInvites.filter((invite) => invite.status === "Accepted").length;
    const nextStatus = allResponded && acceptedCount > 0 ? "Pending Split Approval" : agreement.document.status;
    const actor = collaboratorInvites.find((invite) => invite.id === inviteId)?.name || "Collaborator";
    const currentProposalId = agreement.document.currentProposalId || agreement.document.splitProposalVersions.at(-1)?.id || "";
    const splitApprovals = status === "Accepted" && currentProposalId && !agreement.document.splitApprovals.some((approval) => approval.collaboratorId === inviteId && approval.proposalVersionId === currentProposalId)
      ? [
          ...agreement.document.splitApprovals,
          {
            id: `${agreement.document.id}-${inviteId}-${Date.now()}`,
            proposalVersionId: currentProposalId,
            collaboratorId: inviteId,
            collaboratorName: actor,
            status: "Pending" as const,
          },
        ]
      : agreement.document.splitApprovals;
    const updatedDocument = addDocumentAuditTrail(
      {
        ...agreement.document,
        status: nextStatus,
        collaboratorInvites,
        splitApprovals,
      },
      actor,
      `${actor} ${status.toLowerCase()} the collaboration invite`,
    );

    onUpdateDocument(updatedDocument, {
      action: status === "Accepted" ? "invite_accept" : "invite_decline",
      responseType: status === "Accepted" ? "invite_accept" : "invite_reject",
    });
  };

  const updateApprovalStatus = (approvalId: string, status: "Approved" | "Rejected") => {
    const approval = currentApprovals.find((item) => item.id === approvalId);
    if (
      !agreement.document ||
      !onUpdateDocument ||
      !currentProposal ||
      isFinalRecord ||
      approval?.collaboratorId !== viewerParticipantId
    ) return;

    const now = new Date().toISOString();
    const splitApprovals = agreement.document.splitApprovals.map((item) =>
      item.id === approvalId
        ? {
            ...item,
            status,
            respondedAt: now,
            notes: status === "Rejected" ? proposalNote.trim() : item.notes,
          }
        : item,
    );
    const nextCurrentApprovals = splitApprovals.filter((item) => item.proposalVersionId === currentProposal.id);
    const allApproved = nextCurrentApprovals.length > 0 && nextCurrentApprovals.every((item) => item.status === "Approved");
    const baseDocument = {
      ...agreement.document,
      status: status === "Rejected" ? "Disputed" as const : allApproved ? "Ready to Sign" as const : agreement.document.status,
      splitApprovals,
    };
    const documentWithSignatures = status !== "Rejected" && allApproved
      ? { ...baseDocument, splitSignatures: buildSignatureRecords(baseDocument, currentProposal.id) }
      : baseDocument;
    const updatedDocument = addDocumentAuditTrail(
      documentWithSignatures,
      approval?.collaboratorName || "Collaborator",
      status === "Rejected" ? "Disputed the current split proposal" : "Approved the current split proposal",
    );

    onUpdateDocument(updatedDocument, {
      action: status === "Approved" ? "split_accept" : "split_reject",
      responseType: status === "Approved" ? "split_accept" : "split_reject",
      notes: status === "Rejected" ? proposalNote.trim() : undefined,
    });
    setProposalNote("");
  };

  const signSplitSheet = (signatureId: string) => {
    if (!agreement.document || !onUpdateDocument || !currentProposal || !canSign) return;

    const now = new Date().toISOString();
    const preparedSignatures = buildSignatureRecords(agreement.document, currentProposal.id);
    const signature = preparedSignatures.find((item) => item.id === signatureId);
    if (signature?.collaboratorId !== viewerParticipantId) return;
    const splitSignatures = preparedSignatures.map((item) =>
      item.id === signatureId
        ? {
            ...item,
            status: "Signed" as const,
            signedAt: now,
            signatureMethod: "SPLIT beta acknowledgement",
          }
        : item,
    );
    const proposalSignatures = splitSignatures.filter((item) => item.proposalVersionId === currentProposal.id);
    const allSigned = proposalSignatures.length > 0 && proposalSignatures.every((item) => item.status === "Signed");
    const updatedDocument = addDocumentAuditTrail(
      {
        ...agreement.document,
        status: allSigned ? "Verified and Stored" : "Pending Signatures",
        storedAt: allSigned ? now : agreement.document.storedAt,
        verifiedAt: allSigned ? now : agreement.document.verifiedAt,
        splitSignatures,
      },
      signature?.collaboratorName || "Collaborator",
      allSigned ? "Signed and verified the split sheet" : "Signed the split sheet",
    );

    onUpdateDocument(updatedDocument, {
      action: "sign",
      responseType: "signature",
    });
  };

  const createRevisionProposal = () => {
    if (!agreement.document || !onUpdateDocument || !canReviseProposal) return;

    const nextTotal = Math.round(proposalTotal * 100) / 100;
    if (Math.abs(nextTotal - 100) > 0.01) return;

    const now = new Date().toISOString();
    const proposalId = `${agreement.document.id}-proposal-${Date.now()}`;
    const versionNumber = (agreement.document.splitProposalVersions.at(-1)?.versionNumber || agreement.document.version || 1) + 1;
    const allocations = agreement.document.data.parties.map((party) => ({
      partyId: party.id,
      name: party.professionalName || party.legalName || party.email || party.phoneNumber || party.splitId || "Invited writer",
      role: party.role || "Collaborator",
      percentage: Number(proposalPercents[party.id]) || 0,
      notes: party.contributionDescription,
    }));
    const viewerName = viewerProfile.displayName || viewerProfile.pkaNames || viewerProfile.legalName || viewerProfile.emailAddress || "SPLIT user";
    const creatorName = agreement.document.creatorProfile.displayName || agreement.document.creatorProfile.legalName || agreement.document.creatorProfile.emailAddress || "SPLIT user";
    const approvalRecords = agreement.document.collaboratorInvites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({
        id: `${proposalId}-${invite.id}`,
        proposalVersionId: proposalId,
        collaboratorId: invite.id,
        collaboratorName: invite.name,
        status: !isCreator && invite.id === viewerInvite?.id ? "Approved" as const : "Pending" as const,
        respondedAt: !isCreator && invite.id === viewerInvite?.id ? now : undefined,
      }));
    const updatedParties = agreement.document.data.parties.map((party) => ({
      ...party,
      percent: Number(proposalPercents[party.id]) || 0,
    }));
    const updatedDocument = addDocumentAuditTrail(
      {
        ...agreement.document,
        status: "Pending Split Approval",
        version: versionNumber,
        currentProposalId: proposalId,
        data: {
          ...agreement.document.data,
          parties: updatedParties,
        },
        splitProposalVersions: [
          ...agreement.document.splitProposalVersions,
          {
            id: proposalId,
            versionNumber,
            proposedBy: isCreator ? creatorName : viewerName,
            notes: proposalNote.trim() || "Updated split proposal",
            createdAt: now,
            allocations,
          },
        ],
        splitApprovals: [
          ...agreement.document.splitApprovals,
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
      },
      isCreator ? creatorName : viewerName,
      `Created split proposal v${versionNumber}`,
    );

    onUpdateDocument(updatedDocument, {
      action: isCreator ? "creator_update" : "counter_offer",
      responseType: isCreator ? undefined : "split_reject",
      notes: proposalNote.trim() || "Updated split proposal",
    });
    setProposalNote("");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 mb-6">
        <div className="flex items-start gap-3">
          <AgreementIcon type={agreement.type} />
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight leading-tight">{agreement.title}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={agreement.status} />
              <span className="text-xs text-muted-foreground">v{agreement.version}</span>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">{agreement.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {isFinalRecord ? "Print Record" : "Export Packet"}
          </button>
          {isFinalRecord ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--split-verified))]">
              <Shield className="h-3.5 w-3.5" />
              Read-only
            </span>
          ) : (
            <button
              type="button"
              disabled={!canSign}
              onClick={() => signableSignature && signSplitSheet(signableSignature.id)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors disabled:cursor-default disabled:opacity-40"
            >
              <PenLine className="h-3.5 w-3.5" />
              Sign
            </button>
          )}
        </div>
      </div>

      {/* Execution banner */}
      <VerificationBanner status={agreement.status} />

      {agreement.document && (
        <div className="mt-6">
          <SplitSheetDocumentPage document={agreement.document} viewerProfile={agreement.document.creatorProfile} compact />
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isFinalRecord && (
          <Section title={agreement.status === "Archived" ? "Archived Record" : "Verified Archive"} icon={Shield}>
            <div className="rounded-xl border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.07)] p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <MetaCell label="Document" value={agreement.document?.documentNumber || agreement.id} />
                <MetaCell label="Verified" value={formatDisplayDateTime(agreement.document?.verifiedAt || agreement.document?.storedAt || agreement.document?.updatedAt || agreement.updated)} />
                <MetaCell label="Signers" value={String(visibleSignatures.filter((signature) => signature.status === "Signed").length || agreement.parties.length)} />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                This split sheet is stored as the final verified record. Create a new version if the split needs to change later.
              </p>
            </div>
          </Section>
        )}

        {/* Parties */}
        {invites.length > 0 && (
          <Section title="Collaborator Invitations" icon={Users}>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {invites.map((invite) => (
                <div key={invite.id} className="grid gap-3 bg-card px-3 py-3 md:grid-cols-[1fr_auto] md:items-center md:px-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{invite.name}</div>
                      <InviteStatus status={invite.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Invited by {invite.inviteMethod}: {invite.inviteValue || "Not provided"}
                      {invite.respondedAt && ` · ${new Date(invite.respondedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!canUpdateInvites || invite.id !== viewerInvite?.id || invite.status === "Accepted"}
                      onClick={() => updateInviteStatus(invite.id, "Accepted")}
                      className="rounded-lg border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--split-verified))] disabled:cursor-default disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={!canUpdateInvites || invite.id !== viewerInvite?.id || invite.status === "Declined"}
                      onClick={() => updateInviteStatus(invite.id, "Declined")}
                      className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive disabled:cursor-default disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Writers" icon={Users}>
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {agreement.parties.map((party, i) => {
              const split = agreement.splits.find((s) => s.name === party);
              return (
                <div key={i} className="flex items-center justify-between px-3 md:px-4 py-3 bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {party.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{party}</div>
                      {split && <div className="text-xs text-muted-foreground">{split.role}</div>}
                    </div>
                  </div>
                  <SignatureStatus index={i} status={agreement.status} />
                </div>
              );
            })}
          </div>
        </Section>

        {agreement.document && currentProposal && (
          <Section title="Split Proposal" icon={GitBranch}>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-bold">Current proposal v{currentProposal.versionNumber}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {currentProposal.notes || "No proposal note"} · Proposed by {currentProposal.proposedBy}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${Math.abs(sumProposalAllocations(currentProposal.allocations) - 100) < 0.01 ? "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))]" : "bg-destructive/10 text-destructive"}`}>
                  {sumProposalAllocations(currentProposal.allocations)}%
                </span>
              </div>

              <div className="mb-4 grid gap-2">
                {currentApprovals.map((approval) => (
                  <div key={approval.id} className="grid gap-3 rounded-lg border border-border bg-background px-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{approval.collaboratorName}</span>
                        <ApprovalStatus status={approval.status} />
                      </div>
                      {approval.notes && <p className="mt-1 text-xs text-muted-foreground">{approval.notes}</p>}
                    </div>
                    {approval.status === "Pending" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!canNegotiate || approval.collaboratorId !== viewerParticipantId}
                          onClick={() => updateApprovalStatus(approval.id, "Approved")}
                          className="rounded-lg border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--split-verified))] disabled:cursor-default disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={!canNegotiate || approval.collaboratorId !== viewerParticipantId}
                          onClick={() => updateApprovalStatus(approval.id, "Rejected")}
                          className="rounded-lg border border-[hsl(var(--split-amended)/0.25)] bg-[hsl(var(--split-amended)/0.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--split-amended))] disabled:cursor-default disabled:opacity-50"
                        >
                          Dispute
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!isFinalRecord ? (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isCreator ? "Create a revised proposal" : "Counter offer"}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {agreement.document.data.parties.map((party) => (
                      <label key={party.id} className="text-xs font-semibold text-muted-foreground">
                        {party.professionalName || party.legalName || party.email || party.phoneNumber || party.splitId || "Invited writer"}
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={proposalPercents[party.id] ?? ""}
                            onChange={(event) => setProposalPercents((current) => ({ ...current, [party.id]: event.target.value }))}
                            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
                          />
                          <span>%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={proposalNote}
                    onChange={(event) => setProposalNote(event.target.value)}
                    placeholder="Optional reason for this proposal or revision request."
                    className="mt-3 min-h-[72px] w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring/30"
                  />
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <span className={`text-xs font-bold ${Math.abs(proposalTotal - 100) < 0.01 ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>
                      Proposal total: {Math.round(proposalTotal * 100) / 100}%
                    </span>
                    <button
                      type="button"
                      disabled={!canReviseProposal || Math.abs(proposalTotal - 100) > 0.01}
                      onClick={createRevisionProposal}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isCreator ? "Propose updated split" : "Send counter offer"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-background px-3 py-3 text-xs leading-5 text-muted-foreground">
                  This proposal is locked because the split sheet has been verified and stored.
                </div>
              )}
            </div>
          </Section>
        )}

        {agreement.document && currentProposal && visibleSignatures.length > 0 && (
          <Section title="Signature & Verification" icon={Shield}>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-bold">Signature packet v{currentProposal.versionNumber}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Each approved collaborator signs the current split proposal before SPLIT stores the verified record.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  {visibleSignatures.filter((signature) => signature.status === "Signed").length}/{visibleSignatures.length} signed
                </span>
              </div>

              <div className="grid gap-2">
                {visibleSignatures.map((signature) => (
                  <div key={signature.id} className="grid gap-3 rounded-lg border border-border bg-background px-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{signature.collaboratorName}</span>
                        <SignatureRecordStatus status={signature.status} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {signature.signedAt
                          ? `Signed ${new Date(signature.signedAt).toLocaleString()}`
                          : "Awaiting signature"}
                        {signature.signatureMethod && ` · ${signature.signatureMethod}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canSign || signature.status === "Signed" || signature.collaboratorId !== viewerParticipantId}
                      onClick={() => signSplitSheet(signature.id)}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-default disabled:opacity-40"
                    >
                      {signature.status === "Signed" ? "Signed" : "Sign"}
                    </button>
                  </div>
                ))}
              </div>

              {agreement.document.verifiedAt && (
                <div className="mt-3 rounded-lg border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)] px-3 py-2 text-xs font-semibold text-[hsl(var(--split-verified))]">
                  Verified and stored {new Date(agreement.document.verifiedAt).toLocaleString()}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Splits */}
        <Section title="Ownership Splits" icon={FileText}>
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="px-3 md:px-4 py-2.5 bg-secondary/50 flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <span className="flex-1">Writer</span>
              <span className="w-16 md:w-20 text-center">Role</span>
              <span className="w-14 md:w-20 text-right">Share</span>
            </div>
            {agreement.splits.map((split, i) => (
              <div key={i} className="flex items-center px-3 md:px-4 py-3 border-b border-border last:border-b-0">
                <div className="flex-1 text-sm font-medium truncate">{split.name}</div>
                <div className="w-16 md:w-20 text-center">
                  <span className="text-[10px] md:text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{split.role}</span>
                </div>
                <div className="w-14 md:w-20 text-right">
                  <span className="text-sm font-bold tabular-nums">{split.percent}%</span>
                </div>
              </div>
            ))}
            <div className="flex items-center px-3 md:px-4 py-2.5 border-t border-border bg-secondary/30">
              <div className="flex-1 text-xs font-semibold text-muted-foreground">Total</div>
              <div className={`text-sm font-bold tabular-nums ${totalPercent === 100 ? "text-[hsl(var(--split-verified))]" : "text-destructive"}`}>
                {totalPercent}%
              </div>
            </div>
          </div>
          <div className="mt-3">
            <SplitBar splits={agreement.splits} />
          </div>
        </Section>

        {/* Metadata */}
        <Section title="Split Sheet Details" icon={Hash}>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <MetaCell label="Created" value={agreement.created} />
            <MetaCell label="Last Updated" value={agreement.updated} />
            <MetaCell label="Version" value={`v${agreement.version}`} />
            <MetaCell label="Type" value={agreement.type} />
            {agreement.document?.documentNumber && <MetaCell label="Document" value={agreement.document.documentNumber} />}
            {agreement.document?.verifiedAt && <MetaCell label="Verified" value={formatDisplayDateTime(agreement.document.verifiedAt)} />}
          </div>
        </Section>

        {/* Version History */}
        <CollapsibleSection title="Version History" icon={GitBranch} open={showHistory} onToggle={() => setShowHistory((v) => !v)} count={versionItems.length}>
          <div className="space-y-2">
            {versionItems.map((v) => (
              <div key={v.version} className={`flex items-start gap-3 rounded-lg px-3 md:px-4 py-3 border ${v.active ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${v.active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">v{v.version}</span>
                    {v.active && <span className="text-[10px] text-[hsl(var(--split-verified))] font-semibold bg-[hsl(var(--split-verified)/0.1)] rounded-full px-2 py-0.5">Current</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{v.note}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1">{v.date}</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Audit Trail */}
        <CollapsibleSection title="Audit Trail" icon={Clock} open={showAudit} onToggle={() => setShowAudit((v) => !v)} count={auditItems.length}>
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {auditItems.map((entry, i) => (
              <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                <div className="absolute -left-4 mt-0.5 h-3.5 w-3.5 rounded-full border-2 border-border bg-background flex-shrink-0" />
                <div className="ml-2 min-w-0">
                  <div className="text-xs font-medium text-foreground">{entry.event}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{entry.actor} · {entry.date}</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

function VerificationBanner({ status }: { status: Agreement["status"] }) {
  if (status === "Pending Collaborator Acceptance") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--split-pending)/0.3)] bg-[hsl(var(--split-pending)/0.07)] px-3 md:px-4 py-3">
        <AlertCircle className="h-4 w-4 text-[hsl(var(--split-pending))] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[hsl(var(--split-pending))]">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Invited collaborators need to confirm they were part of this work.</div>
        </div>
      </div>
    );
  }
  if (status === "Pending Split Approval") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 md:px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-primary">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Collaborators have responded. Everyone can review the proposed split before signing.</div>
        </div>
      </div>
    );
  }
  if (status === "Ready to Sign") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 md:px-4 py-3">
        <PenLine className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-primary">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">All split approvals are in. Collect signatures to verify and store the record.</div>
        </div>
      </div>
    );
  }
  if (VERIFIED_SPLIT_STATUSES.includes(status)) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--split-verified)/0.3)] bg-[hsl(var(--split-verified)/0.07)] px-3 md:px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--split-verified))] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[hsl(var(--split-verified))]">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">All required parties signed. This split sheet is locked as the verified record.</div>
        </div>
        <Shield className="h-4 w-4 text-[hsl(var(--split-verified)/0.5)] flex-shrink-0 hidden md:block" />
      </div>
    );
  }
  if (status === "Pending Signatures") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--split-pending)/0.3)] bg-[hsl(var(--split-pending)/0.07)] px-3 md:px-4 py-3">
        <AlertCircle className="h-4 w-4 text-[hsl(var(--split-pending))] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[hsl(var(--split-pending))]">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">One or more writers have not yet signed.</div>
        </div>
      </div>
    );
  }
  if (status === "Disputed") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 md:px-4 py-3">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-destructive">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">A collaborator disputed the proposal. Send a revised split to restart review.</div>
        </div>
      </div>
    );
  }
  if (status === "Revision Requested" || status === "Amended") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--split-amended)/0.25)] bg-[hsl(var(--split-amended)/0.08)] px-3 md:px-4 py-3">
        <GitBranch className="h-4 w-4 text-[hsl(var(--split-amended))] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[hsl(var(--split-amended))]">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">This split needs a revised proposal before the agreement can move forward.</div>
        </div>
      </div>
    );
  }
  if (status === "Archived") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 md:px-4 py-3">
        <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">This split sheet is closed and kept for record history.</div>
        </div>
      </div>
    );
  }
  if (status === "Draft") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 md:px-4 py-3">
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-foreground">{getSplitWorkflowLabel(status)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">This split sheet has not been sent for signatures yet.</div>
        </div>
      </div>
    );
  }
  return null;
}

function InviteStatus({ status }: { status: "Pending" | "Accepted" | "Declined" }) {
  const styles = {
    Pending: "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    Accepted: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
    Declined: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function ApprovalStatus({ status }: { status: "Pending" | "Approved" | "Rejected" }) {
  const styles = {
    Pending: "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    Approved: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
    Rejected: "bg-[hsl(var(--split-amended)/0.12)] text-[hsl(var(--split-amended))] border-[hsl(var(--split-amended)/0.25)]",
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function SignatureRecordStatus({ status }: { status: "Pending" | "Signed" }) {
  const styles = {
    Pending: "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    Signed: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

function sumProposalAllocations(allocations: Array<{ percentage: number }>) {
  return Math.round(allocations.reduce((sum, allocation) => sum + (Number(allocation.percentage) || 0), 0) * 100) / 100;
}

function SignatureStatus({ index, status }: { index: number; status: Agreement["status"] }) {
  if (VERIFIED_SPLIT_STATUSES.includes(status)) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--split-verified))]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Signed
      </div>
    );
  }
  if (status === "Archived") {
    return <div className="text-[11px] text-muted-foreground">Archived</div>;
  }
  if (status === "Pending Signatures" && index === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--split-verified))]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Signed
      </div>
    );
  }
  if (status === "Pending Signatures") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(var(--split-pending))]">
        <AlertCircle className="h-3.5 w-3.5" />
        Pending
      </div>
    );
  }
  return <div className="text-[11px] text-muted-foreground">—</div>;
}

function SplitBar({ splits }: { splits: { name: string; percent: number }[] }) {
  const COLORS = ["bg-primary", "bg-[hsl(var(--split-pending))]", "bg-[hsl(var(--split-amended))]", "bg-muted-foreground"];
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2 gap-[2px]">
        {splits.map((s, i) => (
          <div key={i} className={`${COLORS[i % COLORS.length]} transition-all`} style={{ width: `${s.percent}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 md:gap-3 mt-2">
        {splits.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] md:text-[11px] text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${COLORS[i % COLORS.length]} inline-block`} />
            {s.name} ({s.percent}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 md:px-4 py-2.5 md:py-3">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xs md:text-sm font-medium">{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, open, onToggle, count, children }: { title: string; icon: React.ElementType; open: boolean; onToggle: () => void; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 md:px-4 py-3.5 hover:bg-secondary/30 transition-colors">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">{title}</span>
        <span className="text-[10px] text-muted-foreground mr-2">{count} entries</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 md:px-4 pb-4 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
