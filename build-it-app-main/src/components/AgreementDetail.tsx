import React, { useState } from "react";
import SplitSheetDownloadButton from "@/components/SplitSheetDownloadButton";
import DeleteDraftButton from "@/components/DeleteDraftButton";
import type { Agreement } from "@/lib/splitSheetAgreement";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import {
  formatSplitSheetAuditTrail,
  splitSheetDisplayInitials,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
import { buildSplitSheetSignatureRecords } from "@/lib/splitSheetParticipantState";
import { getSplitWorkflowLabel, VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";
import type { UserProfile } from "@/lib/userProfile";
import { documentBelongsToProfile } from "@/lib/splitSheetStorage";
import { Button } from "@/components/ui/button";
import {
  Archive,
  BadgeCheck,
  Building2,
  CalendarDays,
  Shield,
  Lock,
  GitBranch,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  ChevronDown,
  ChevronUp,
  PenLine,
  MessageCircle,
  ListChecks,
  MapPin,
  Music2,
  Send,
  SlidersHorizontal,
  Type,
  UserRound,
  UsersRound,
} from "lucide-react";

const FINAL_STATUSES = [...VERIFIED_SPLIT_STATUSES, "Archived"] as Agreement["status"][];
const ALLOCATION_TEXT_COLORS = [
  "text-[hsl(var(--split-allocation-1))]",
  "text-[hsl(var(--split-allocation-2))]",
  "text-[hsl(var(--split-allocation-3))]",
  "text-[hsl(var(--split-allocation-4))]",
  "text-[hsl(var(--split-allocation-5))]",
];
const ALLOCATION_AVATAR_CLASSES = [
  "bg-[hsl(var(--split-allocation-1))] text-white",
  "bg-[hsl(var(--split-allocation-2))] text-[hsl(var(--split-allocation-1))]",
  "bg-[hsl(var(--split-allocation-3))] text-white",
  "bg-[hsl(var(--split-allocation-4))] text-white",
  "bg-[hsl(var(--split-allocation-5))] text-white",
];

type MetadataItem = {
  label: string;
  value: string;
};

type MetadataGroupDefinition = {
  title: string;
  items: MetadataItem[];
};

type SummaryParticipant = {
  partyId?: string;
  participantId?: string;
  name: string;
  role: string;
  percent: number;
  inviteStatus?: "Pending" | "Accepted" | "Declined";
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  signatureStatus?: "Pending" | "Signed";
};

const CORE_METADATA_LABELS: Record<string, string[]> = {
  Record: ["Document", "Status", "Created", "Verified"],
  Work: ["Title", "Artist / project", "Composition type", "Language", "Creation date", "Creation location", "Studio", "Notes"],
  Release: ["Recording artist", "Recording title", "Release status", "Release date", "Expected release", "Distributor", "Label"],
  "Codes & identifiers": ["UPC", "ISWC", "Related ISRC"],
  "Registration contact": ["Registration contact", "Designated contact", "Contact role", "Contact email", "Authority", "Deadline"],
  "Sample & clearance": ["Sample status", "Clearance status", "Public domain", "PD claim"],
  Authorizations: ["Split percent", "Personal metadata", "PRO / IPI", "Publisher admin", "Registration use", "Require all signatures"],
};

function formatDisplayDateTime(value: string | undefined) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDisplayDate(value: string | undefined) {
  if (!value) return "Not provided";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function compactValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not provided";
  const text = String(value ?? "").trim();
  return text || "Not provided";
}

function sameLabel(a?: string, b?: string) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

function sameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function relativeDateLabel(value: string | undefined) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (sameCalendarDay(date, today)) return "Today";
  if (sameCalendarDay(date, yesterday)) return "Yesterday";
  return "Latest";
}

function findDetailGroup(groups: MetadataGroupDefinition[], title: string) {
  return groups.find((group) => group.title === title);
}

function allocationTextClasses(index: number) {
  return ALLOCATION_TEXT_COLORS[index % ALLOCATION_TEXT_COLORS.length];
}

function allocationAvatarClasses(index: number) {
  return ALLOCATION_AVATAR_CLASSES[index % ALLOCATION_AVATAR_CLASSES.length];
}

export default function AgreementDetail({
  agreement,
  viewerProfile,
  onOpenMessages,
  onDeleteDraft,
  onEditDraft,
}: {
  agreement: Agreement;
  viewerProfile: UserProfile;
  onOpenMessages?: (agreementId: string) => void;
  onDeleteDraft?: (document: StoredSplitSheetDocument) => Promise<void>;
  onEditDraft?: (agreementId: string) => void;
}) {
  const [showWorkMetadata, setShowWorkMetadata] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const document = agreement.document;
  const isDraft = agreement.status === "Draft" && !document?.sentAt;
  const canEditDraft = isDraft && document && documentBelongsToProfile(document, viewerProfile) && onEditDraft;
  const isFinalRecord = FINAL_STATUSES.includes(agreement.status);
  const invites = document?.collaboratorInvites ?? [];
  const currentProposal = document?.splitProposalVersions.find((proposal) => proposal.id === document.currentProposalId) ?? document?.splitProposalVersions.at(-1);
  const currentApprovals = document?.splitApprovals.filter((approval) => approval.proposalVersionId === currentProposal?.id) ?? [];
  const currentSignatures = document?.splitSignatures.filter((signature) => signature.proposalVersionId === currentProposal?.id) ?? [];
  const visibleSignatures = currentSignatures.length > 0
    ? currentSignatures
    : document && currentProposal && ["Ready to Sign", "Pending Signatures"].includes(agreement.status)
      ? buildSplitSheetSignatureRecords(document, currentProposal.id).filter((signature) => signature.proposalVersionId === currentProposal.id)
      : [];
  const canOpenMessages = Boolean(document?.sentAt && agreement.status !== "Draft" && onOpenMessages);
  const participants = buildSummaryParticipants(agreement, currentProposal, currentApprovals, visibleSignatures);
  const totalPercent = Math.round(participants.reduce((s, p) => s + p.percent, 0) * 100) / 100;
  const approvedCount = isFinalRecord
    ? participants.length
    : participants.filter((participant) => participant.approvalStatus === "Approved").length;
  const signedCount = isFinalRecord && visibleSignatures.length === 0
    ? participants.length
    : participants.filter((participant) => participant.signatureStatus === "Signed").length;
  const requiredSignatureCount = visibleSignatures.length || participants.length;
  const lastUpdatedAt = document?.verifiedAt || document?.updatedAt || agreement.updated;
  const versionItems = document?.splitProposalVersions.map((proposal) => ({
    version: proposal.versionNumber,
    date: formatDisplayDateTime(proposal.createdAt),
    note: proposal.notes || "Split proposal",
    active: proposal.id === document.currentProposalId,
  })) ?? [];
  const auditItems = document ? formatSplitSheetAuditTrail(document).reverse() : [];
  const detailGroups = buildDetailGroups(agreement);
  const recordGroup = findDetailGroup(detailGroups, "Record");
  const workGroup = findDetailGroup(detailGroups, "Work");
  const sampleGroup = findDetailGroup(detailGroups, "Sample & clearance");
  const authorizationGroup = findDetailGroup(detailGroups, "Authorizations");
  const registrationGroup = findDetailGroup(detailGroups, "Registration");
  const inviteGroup = buildInviteDetailGroup(document, invites);
  const workMetadataGroups = [recordGroup, workGroup, inviteGroup].filter(Boolean) as MetadataGroupDefinition[];
  const legalGroups = [sampleGroup, authorizationGroup].filter(Boolean) as MetadataGroupDefinition[];
  const registrationGroups = buildRegistrationDisplayGroups(registrationGroup);

  return (
    <section aria-label={isDraft ? "Draft details" : "Split sheet details"} className="mx-auto max-w-3xl px-4 py-5 md:px-6 md:py-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="break-words text-2xl font-extrabold leading-tight text-[hsl(var(--split-allocation-1))] md:text-[28px]">
            {agreement.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RecordStatusPill status={agreement.status} />
            <Chip tone="neutral">SPLIT</Chip>
            {isFinalRecord && (
              <Chip tone="lock">
                <Lock className="h-3.5 w-3.5" />
                Read-only
              </Chip>
            )}
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2 [&>button]:h-10">
          <SplitSheetDownloadButton key={agreement.id} source={agreement.exportDocument || agreement.document} viewerProfile={viewerProfile} isFinalRecord={isFinalRecord} />
          {canEditDraft && (
            <Button size="sm" className="gap-2" onClick={() => onEditDraft(agreement.id)}>
              <PenLine className="h-4 w-4" aria-hidden="true" />Edit Draft
            </Button>
          )}
          {document && onDeleteDraft && <DeleteDraftButton key={`delete-${document.id}`} document={document} profile={viewerProfile} onDelete={onDeleteDraft} />}
          {canOpenMessages && !isFinalRecord && (
            <button
              type="button"
              aria-label="Open in Messages"
              onClick={() => onOpenMessages?.(document?.id || agreement.id)}
              className="split-press inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Messages
            </button>
          )}
        </div>
      </div>

      {!isFinalRecord && <VerificationBanner status={agreement.status} />}

      <div className="mt-4 space-y-4">
        <SummaryStrip
          totalPercent={totalPercent}
          signedCount={signedCount}
          requiredSignatureCount={requiredSignatureCount}
          lastUpdatedAt={lastUpdatedAt}
          draftCollaboratorCount={isDraft ? participants.length : undefined}
        />

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-[1fr_auto] gap-3 bg-[hsl(var(--split-allocation-1))] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white md:grid-cols-[1.25fr_0.45fr_0.7fr]">
            <span>Collaborator</span>
            <span className="text-right">Share</span>
            <span className="hidden text-right md:block">Status</span>
          </div>
          <div className="divide-y divide-border bg-card">
            {participants.map((participant, index) => (
              <div key={`${participant.partyId || participant.name}-${index}`} className="grid gap-3 px-4 py-4 md:grid-cols-[1.25fr_0.45fr_0.7fr] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${allocationAvatarClasses(index)}`}>
                      {splitSheetDisplayInitials(participant.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-[hsl(var(--split-allocation-1))]">{participant.name}</div>
                      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{participant.role}</div>
                    </div>
                  </div>
                </div>

                <div className={`text-left text-2xl font-extrabold tabular-nums md:text-right ${allocationTextClasses(index)}`}>
                  {participant.percent}%
                </div>

                <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                  {isDraft ? (
                    <Chip tone="neutral">{participant.participantId === "creator" ? "Creator" : "Not invited"}</Chip>
                  ) : <>
                    {(participant.approvalStatus || participant.inviteStatus || isFinalRecord) && (
                      <ApprovalStatus
                        status={participant.approvalStatus ?? (participant.inviteStatus === "Accepted" ? "Approved" : participant.inviteStatus === "Declined" ? "Rejected" : "Pending")}
                      />
                    )}
                    {(participant.signatureStatus || isFinalRecord) && <SignatureRecordStatus status={participant.signatureStatus ?? "Signed"} />}
                  </>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <StackedCollapsibleSection
            title="Work & Metadata"
            description="Title, writers, publishers, codes, territory"
            icon={FileText}
            open={showWorkMetadata}
            onToggle={() => setShowWorkMetadata((v) => !v)}
          >
            <MetadataGroups groups={workMetadataGroups} showAdvancedRow />
          </StackedCollapsibleSection>
          <StackedCollapsibleSection
            title="Legal"
            description="Agreements, rights, ownership terms"
            icon={Shield}
            open={showLegal}
            onToggle={() => setShowLegal((v) => !v)}
          >
            <MetadataGroups groups={legalGroups} showAdvancedRow advancedTitle="Advanced legal metadata" />
          </StackedCollapsibleSection>
          <StackedCollapsibleSection
            title="Registration"
            description="PRO, publisher, codes, territories"
            icon={Hash}
            open={showRegistration}
            onToggle={() => setShowRegistration((v) => !v)}
          >
            <MetadataGroups groups={registrationGroups} showAdvancedRow advancedTitle="Advanced registration metadata" />
          </StackedCollapsibleSection>
          <StackedCollapsibleSection
            title="Version History"
            description={`${versionItems.length} version${versionItems.length === 1 ? "" : "s"} · ${isDraft ? "draft" : "current record"}`}
            icon={GitBranch}
            open={showHistory}
            onToggle={() => setShowHistory((v) => !v)}
          >
            <div className="space-y-2">
              {versionItems.length ? versionItems.map((item) => (
                <div key={item.version} className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${item.active ? "border-primary/25 bg-primary/5" : "border-border bg-card"}`}>
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${item.active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {item.version}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">v{item.version}</span>
                      {item.active && <Chip tone={isDraft ? "neutral" : "verified"}>{isDraft ? "Draft" : "Current"}</Chip>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground/70">{item.date}</div>
                  </div>
                </div>
              )) : <EmptyCompact>No version history yet.</EmptyCompact>}
            </div>
          </StackedCollapsibleSection>
          <StackedCollapsibleSection
            title="Audit Trail"
            description={`${auditItems.length} event${auditItems.length === 1 ? "" : "s"}${auditItems[0]?.date ? ` · Last: ${auditItems[0].date}` : ""}`}
            icon={Clock}
            open={showAudit}
            onToggle={() => setShowAudit((v) => !v)}
            last
          >
            <div className="space-y-2">
              {auditItems.length ? auditItems.map((entry, index) => (
                <div key={`${entry.timestamp}-${index}`} className="grid gap-2 rounded-lg border border-border bg-card px-3 py-3 md:grid-cols-[145px_1fr_1.2fr] md:items-center">
                  <div className="text-xs text-muted-foreground">{entry.date}</div>
                  <div className="truncate text-sm font-bold">{entry.actor}</div>
                  <div className="text-sm text-muted-foreground">{entry.event}</div>
                </div>
              )) : <EmptyCompact>No audit activity yet.</EmptyCompact>}
            </div>
          </StackedCollapsibleSection>
        </div>

        {isFinalRecord && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            This SPLIT is fully signed and locked. No changes can be made.
          </div>
        )}
      </div>
    </section>
  );
}

function buildSummaryParticipants(
  agreement: Agreement,
  currentProposal: NonNullable<Agreement["document"]>["splitProposalVersions"][number] | undefined,
  currentApprovals: NonNullable<Agreement["document"]>["splitApprovals"],
  visibleSignatures: NonNullable<Agreement["document"]>["splitSignatures"],
): SummaryParticipant[] {
  const document = agreement.document;

  if (document?.status === "Draft" && !document.sentAt) {
    return document.data.parties.map((party) => ({
      partyId: party.id,
      participantId: party.isCurrentUser ? "creator" : party.id,
      name: splitSheetPartyDisplayName(document, party),
      role: party.role || "Collaborator",
      percent: Number(party.percent) || 0,
    }));
  }

  if (document && currentProposal) {
    return currentProposal.allocations.map((allocation) => {
      const party = document.data.parties.find((item) => item.id === allocation.partyId);
      const invite = document.collaboratorInvites.find((item) => item.partyId === allocation.partyId || item.id === allocation.partyId);
      const participantId = party?.isCurrentUser ? "creator" : invite?.id || allocation.partyId;
      const name = party ? splitSheetPartyDisplayName(document, party, allocation.name) : allocation.name || "SPLIT user";
      const approval = currentApprovals.find((item) =>
        item.collaboratorId === participantId ||
        item.collaboratorId === allocation.partyId ||
        sameLabel(item.collaboratorName, name)
      );
      const signature = visibleSignatures.find((item) =>
        item.collaboratorId === participantId ||
        item.collaboratorId === allocation.partyId ||
        sameLabel(item.collaboratorName, name)
      );

      return {
        partyId: allocation.partyId,
        participantId,
        name,
        role: allocation.role || party?.role || "Collaborator",
        percent: Number(allocation.percentage) || 0,
        inviteStatus: invite?.status,
        approvalStatus: approval?.status,
        signatureStatus: signature?.status,
      };
    });
  }

  return agreement.splits.map((split) => ({
    name: split.name,
    role: split.role,
    percent: Number(split.percent) || 0,
  }));
}

function buildInviteDetailGroup(
  document: Agreement["document"],
  invites: NonNullable<Agreement["document"]>["collaboratorInvites"],
): MetadataGroupDefinition | undefined {
  if (!document || invites.length === 0) return undefined;

  return {
    title: "Collaborator invites",
    items: invites.map((invite) => {
      const invitee = splitSheetParticipantDisplayName(document, invite.id, invite.name);
      const inviteTarget = compactValue(invite.inviteValue);
      const isDraft = document.status === "Draft" && !document.sentAt;
      const response = !isDraft && invite.respondedAt ? ` · responded ${formatDisplayDateTime(invite.respondedAt)}` : "";

      return {
        label: invitee,
        value: `${isDraft ? "Not sent" : invite.status} · ${invite.inviteMethod}: ${inviteTarget}${response}`,
      };
    }),
  };
}

function buildRegistrationDisplayGroups(group: MetadataGroupDefinition | undefined): MetadataGroupDefinition[] {
  if (!group) return [];

  const itemsForLabels = (labels: string[]) =>
    labels
      .map((label) => findMetadataItem(group.items, label))
      .filter(Boolean) as MetadataItem[];

  return [
    {
      title: "Release",
      items: itemsForLabels([
        "Recording artist",
        "Recording title",
        "Release status",
        "Release date",
        "Expected release",
        "Distributor",
        "Label",
      ]),
    },
    {
      title: "Codes & identifiers",
      items: itemsForLabels(["UPC", "ISWC", "Related ISRC"]),
    },
    {
      title: "Registration contact",
      items: itemsForLabels([
        "Registration contact",
        "Designated contact",
        "Contact role",
        "Contact email",
        "Authority",
        "Deadline",
      ]),
    },
  ].filter((displayGroup) => displayGroup.items.length > 0);
}

function buildDetailGroups(agreement: Agreement): MetadataGroupDefinition[] {
  const document = agreement.document;
  const data = document?.data;

  return [
    {
      title: "Record",
      items: [
        { label: "Document", value: compactValue(document?.documentNumber || agreement.id) },
        { label: "Status", value: getSplitWorkflowLabel(agreement.status) },
        { label: "Version", value: `v${agreement.version}` },
        { label: "Created", value: formatDisplayDate(document?.createdAt || agreement.created) },
        { label: "Updated", value: formatDisplayDate(document?.updatedAt || agreement.updated) },
        { label: "Sent", value: agreement.status === "Draft" && !document?.sentAt ? "Not sent" : formatDisplayDateTime(document?.sentAt) },
        { label: "Stored", value: formatDisplayDateTime(document?.storedAt) },
        ...(agreement.status === "Draft" ? [] : [{ label: "Verified", value: formatDisplayDateTime(document?.verifiedAt) }]),
      ],
    },
    {
      title: "Work",
      items: [
        { label: "Title", value: compactValue(data?.songTitle || agreement.title) },
        { label: "Alternate title", value: compactValue(data?.alternateTitles) },
        { label: "Artist / project", value: compactValue(data?.artistProjectName) },
        { label: "Composition type", value: compactValue(data?.compositionType) },
        { label: "Language", value: compactValue(data?.lyricLanguage) },
        { label: "Creation date", value: formatDisplayDate(data?.creationDate) },
        { label: "Creation location", value: compactValue(data?.creationLocation) },
        { label: "Studio", value: compactValue(data?.studioName) },
        { label: "Notes", value: compactValue(data?.workNotes) },
      ],
    },
    {
      title: "Registration",
      items: [
        { label: "Recording artist", value: compactValue(data?.recordingArtist) },
        { label: "Recording title", value: compactValue(data?.recordingTitle) },
        { label: "Release status", value: compactValue(data?.releaseStatus) },
        { label: "Release date", value: formatDisplayDate(data?.releaseDate) },
        { label: "Expected release", value: formatDisplayDate(data?.expectedReleaseDate) },
        { label: "Distributor", value: compactValue(data?.distributor) },
        { label: "Label", value: compactValue(data?.label) },
        { label: "UPC", value: compactValue(data?.upc) },
        { label: "ISWC", value: compactValue(data?.iswc) },
        { label: "Related ISRC", value: compactValue(data?.relatedIsrc) },
        { label: "Registration contact", value: compactValue(data?.registrationContactType) },
        { label: "Designated contact", value: compactValue(data?.designatedContactName) },
        { label: "Contact role", value: compactValue(data?.designatedContactRole) },
        { label: "Contact email", value: compactValue(data?.designatedContactEmail) },
        { label: "Authority", value: compactValue(data?.designatedContactAuthority) },
        { label: "Deadline", value: formatDisplayDate(data?.registrationDeadline) },
      ],
    },
    {
      title: "Sample & clearance",
      items: [
        { label: "Sample status", value: compactValue(data?.sampleStatus) },
        { label: "Sample notes", value: compactValue(data?.sampleNotes) },
        { label: "Original work", value: compactValue(data?.sampleOriginalWork) },
        { label: "Original artist", value: compactValue(data?.sampleOriginalArtist) },
        { label: "Original writers", value: compactValue(data?.sampleOriginalWriters) },
        { label: "Original publishers", value: compactValue(data?.sampleOriginalPublishers) },
        { label: "Master owner", value: compactValue(data?.sampleMasterOwner) },
        { label: "Seconds used", value: compactValue(data?.samplePortion) },
        { label: "Clearance status", value: compactValue(data?.sampleClearanceStatus) },
        { label: "Agreed share", value: compactValue(data?.sampleAgreedShare) },
        { label: "Public domain", value: compactValue(data?.publicDomainStatus) },
        { label: "PD source", value: compactValue(data?.publicDomainSource) },
        { label: "PD jurisdiction", value: compactValue(data?.publicDomainJurisdiction) },
        { label: "PD claim", value: compactValue(data?.publicDomainClaim) },
        { label: "Dispute status", value: compactValue(data?.disputeStatus) },
        { label: "Dispute contributor", value: compactValue(data?.disputeContributor) },
        { label: "Dispute percent", value: compactValue(data?.disputePercent) },
        { label: "Dispute reason", value: compactValue(data?.disputeReason) },
        { label: "Dispute evidence", value: compactValue(data?.disputeEvidence) },
        { label: "Freeze registration", value: compactValue(data?.freezeRegistration) },
        { label: "Export undisputed shares", value: compactValue(data?.exportUndisputedShares) },
      ],
    },
    {
      title: "Authorizations",
      items: [
        { label: "Split percent", value: compactValue(data?.authorizeSplitPercent) },
        { label: "Personal metadata", value: compactValue(data?.authorizePersonalMetadata) },
        { label: "PRO / IPI", value: compactValue(data?.authorizeProIpi) },
        { label: "Publisher admin", value: compactValue(data?.authorizePublisherAdmin) },
        { label: "Registration use", value: compactValue(data?.authorizeRegistrationUse) },
        { label: "Export packet", value: compactValue(data?.exportPacket) },
        { label: "Send to PRO", value: compactValue(data?.sendToPRO) },
        { label: "Send to MLC", value: compactValue(data?.sendToMLC) },
        { label: "Send to publisher/admin", value: compactValue(data?.sendToPublisherAdmin) },
        { label: "Approval before submission", value: compactValue(data?.requireApprovalBeforeSubmission) },
        { label: "Designated submitter", value: compactValue(data?.allowDesignatedSubmitter) },
        { label: "Require all signatures", value: compactValue(data?.requireAllSignatures) },
        { label: "Signing order", value: compactValue(data?.signingOrderEnabled) },
        { label: "Conditional signatures", value: compactValue(data?.conditionalSignatures) },
        { label: "Include audit trail", value: compactValue(data?.includeAuditTrail) },
      ],
    },
  ];
}

function SummaryStrip({
  totalPercent,
  signedCount,
  requiredSignatureCount,
  lastUpdatedAt,
  draftCollaboratorCount,
}: {
  totalPercent: number;
  signedCount: number;
  requiredSignatureCount: number;
  lastUpdatedAt: string | undefined;
  draftCollaboratorCount?: number;
}) {
  return (
    <section className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-3">
      <SummaryStat label={draftCollaboratorCount !== undefined ? "Proposed Split" : "SPLIT Total"} value={`${totalPercent}%`} detail={totalPercent === 100 ? "Complete" : "Needs review"} />
      {draftCollaboratorCount !== undefined ? <SummaryStat label="Collaborators" value={String(draftCollaboratorCount)} detail="Invitations not sent" /> : <SummaryStat
        label="Signatures"
        value={`${signedCount} / ${requiredSignatureCount}`}
        detail={signedCount === requiredSignatureCount ? "All signed" : "Waiting"}
        valueClassName="text-[hsl(var(--split-verified))]"
      />}
      <SummaryStat label="Last Updated" value={formatDisplayDate(lastUpdatedAt)} detail={relativeDateLabel(lastUpdatedAt)} last />
    </section>
  );
}

function SummaryStat({
  label,
  value,
  detail,
  valueClassName = "text-[hsl(var(--split-allocation-1))]",
  last = false,
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex min-h-[118px] flex-col items-center justify-center px-5 py-4 text-center ${last ? "" : "border-b border-border md:border-b-0 md:border-r"}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--split-amended))]">{label}</div>
      <div className={`mt-2 text-2xl font-extrabold leading-tight tabular-nums md:text-[26px] ${valueClassName}`}>{value}</div>
      <div className="mt-2 text-xs font-medium text-[hsl(var(--split-amended))]">{detail}</div>
    </div>
  );
}

function RecordStatusPill({ status }: { status: Agreement["status"] }) {
  const label = getSplitWorkflowLabel(status);
  const verified = VERIFIED_SPLIT_STATUSES.includes(status);

  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.1)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--split-verified))]">
        <CheckCircle2 className="h-3.5 w-3.5 fill-[hsl(var(--split-verified))] text-white" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--split-pending)/0.25)] bg-[hsl(var(--split-pending)/0.12)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--split-pending))]">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function VerificationBanner({ status }: { status: Agreement["status"] }) {
  if (status === "Pending Collaborator Acceptance") {
    return (
      <AlertBanner icon={AlertCircle} tone="pending" title={getSplitWorkflowLabel(status)}>
        Invited collaborators need to confirm they were part of this work.
      </AlertBanner>
    );
  }
  if (status === "Pending Split Approval") {
    return (
      <AlertBanner icon={CheckCircle2} tone="primary" title={getSplitWorkflowLabel(status)}>
        Collaborators can review the current proposal in Messages before signing.
      </AlertBanner>
    );
  }
  if (status === "Ready to Sign") {
    return (
      <AlertBanner icon={PenLine} tone="primary" title={getSplitWorkflowLabel(status)}>
        All split approvals are in. Collect signatures to verify and store the record.
      </AlertBanner>
    );
  }
  if (status === "Pending Signatures") {
    return (
      <AlertBanner icon={AlertCircle} tone="pending" title={getSplitWorkflowLabel(status)}>
        One or more writers have not signed yet.
      </AlertBanner>
    );
  }
  if (status === "Disputed") {
    return (
      <AlertBanner icon={AlertCircle} tone="danger" title={getSplitWorkflowLabel(status)}>
        A collaborator disputed the proposal. Send a revised split to restart review.
      </AlertBanner>
    );
  }
  if (status === "Revision Requested" || status === "Amended") {
    return (
      <AlertBanner icon={GitBranch} tone="amended" title={getSplitWorkflowLabel(status)}>
        This split needs a revised proposal before the agreement can move forward.
      </AlertBanner>
    );
  }
  if (status === "Draft") {
    return (
      <AlertBanner icon={FileText} tone="neutral" title={getSplitWorkflowLabel(status)}>
        Only you can see this draft. Invitations have not been sent.
      </AlertBanner>
    );
  }
  return null;
}

function AlertBanner({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: React.ElementType;
  tone: "primary" | "pending" | "verified" | "danger" | "amended" | "neutral";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    primary: "border-primary/20 bg-primary/5 text-primary",
    pending: "border-[hsl(var(--split-pending)/0.3)] bg-[hsl(var(--split-pending)/0.07)] text-[hsl(var(--split-pending))]",
    verified: "border-[hsl(var(--split-verified)/0.3)] bg-[hsl(var(--split-verified)/0.07)] text-[hsl(var(--split-verified))]",
    danger: "border-destructive/20 bg-destructive/5 text-destructive",
    amended: "border-[hsl(var(--split-amended)/0.25)] bg-[hsl(var(--split-amended)/0.08)] text-[hsl(var(--split-amended))]",
    neutral: "border-border bg-secondary/40 text-foreground",
  };

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 md:px-4 ${styles[tone]}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold">{title}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function ApprovalStatus({ status }: { status: "Pending" | "Approved" | "Rejected" }) {
  const tone = status === "Approved" ? "verified" : status === "Rejected" ? "amended" : "pending";
  return <Chip tone={tone}>{status}</Chip>;
}

function SignatureRecordStatus({ status }: { status: "Pending" | "Signed" }) {
  return <Chip tone={status === "Signed" ? "verified" : "pending"}>{status}</Chip>;
}

function Chip({
  tone,
  children,
}: {
  tone: "neutral" | "muted" | "primary" | "pending" | "verified" | "danger" | "amended" | "lock";
  children: React.ReactNode;
}) {
  const styles = {
    neutral: "border-border bg-secondary/70 text-muted-foreground",
    muted: "border-border bg-background text-muted-foreground/80",
    primary: "border-primary/25 bg-primary/10 text-primary",
    pending: "border-[hsl(var(--split-pending)/0.25)] bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))]",
    verified: "border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.1)] text-[hsl(var(--split-verified))]",
    danger: "border-destructive/20 bg-destructive/10 text-destructive",
    amended: "border-[hsl(var(--split-amended)/0.25)] bg-[hsl(var(--split-amended)/0.1)] text-[hsl(var(--split-amended))]",
    lock: "border-[hsl(var(--split-bone))] bg-[hsl(var(--split-bone))] text-foreground",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${styles[tone]}`}>
      {children}
    </span>
  );
}

function MetadataGroups({
  groups,
  showAdvancedRow = false,
  advancedTitle = "Advanced metadata",
}: {
  groups: MetadataGroupDefinition[];
  showAdvancedRow?: boolean;
  advancedTitle?: string;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    groups.forEach((group) => {
      defaults[group.title] = true;
    });
    defaults[advancedTitle] = false;
    return defaults;
  });

  if (groups.length === 0) {
    return <EmptyCompact>No details available yet.</EmptyCompact>;
  }

  const advancedItems = showAdvancedRow ? buildAdvancedMetadataItems(groups) : [];

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <MetadataGroup
          key={group.title}
          group={group}
          items={showAdvancedRow ? getCoreMetadataItems(group) : group.items}
          open={openGroups[group.title] ?? true}
          onToggle={() => setOpenGroups((current) => ({ ...current, [group.title]: !(current[group.title] ?? true) }))}
        />
      ))}
      {showAdvancedRow && advancedItems.length > 0 && (
        <MetadataGroup
          group={{
            title: advancedTitle,
            items: advancedItems,
          }}
          items={advancedItems}
          open={openGroups[advancedTitle] ?? false}
          onToggle={() => setOpenGroups((current) => ({ ...current, [advancedTitle]: !(current[advancedTitle] ?? false) }))}
          advanced
        />
      )}
    </div>
  );
}

function MetadataGroup({
  group,
  items,
  open,
  onToggle,
  advanced = false,
}: {
  group: MetadataGroupDefinition;
  items: MetadataItem[];
  open: boolean;
  onToggle: () => void;
  advanced?: boolean;
}) {
  const presentation = getMetadataGroupPresentation(group.title);
  const GroupIcon = presentation.icon;

  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/30 md:grid-cols-[auto_minmax(190px,0.8fr)_minmax(0,1.45fr)_auto] md:px-4"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${presentation.iconClass}`}>
          <GroupIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-[hsl(var(--split-allocation-1))]">
            {presentation.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
            {presentation.subtitle}
          </span>
        </span>
        <MetadataGroupSummary group={group} advanced={advanced} />
        {open ? <ChevronUp className="h-4 w-4 text-[hsl(var(--split-allocation-1))]" /> : <ChevronDown className="h-4 w-4 text-[hsl(var(--split-allocation-1))]" />}
      </button>
      {open && (
        <div className="px-3 pb-3 md:px-4">
          <MetadataReceipt title={group.title} items={items} tone={presentation.tone} />
        </div>
      )}
    </section>
  );
}

function MetadataGroupSummary({ group, advanced = false }: { group: MetadataGroupDefinition; advanced?: boolean }) {
  const items = group.items;
  const title = group.title.toLowerCase();

  if (advanced) {
    return (
      <div className="hidden justify-end md:flex">
        <ValuePill value={`${items.length} field${items.length === 1 ? "" : "s"}`} tone="neutral" />
      </div>
    );
  }

  if (title === "record") {
    const document = findMetadataItem(items, "Document")?.value;
    const status = findMetadataItem(items, "Status")?.value;

    return (
      <div className="hidden min-w-0 items-center justify-end gap-3 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {document && <InlineSummaryValue label="Document" value={document} />}
        {document && status && <span className="h-4 w-px bg-border" />}
        {status && <ValuePill value={status} />}
      </div>
    );
  }

  if (title === "work") {
    const workTitle = findMetadataItem(items, "Title")?.value;
    const artist = findMetadataItem(items, "Artist / project")?.value;
    const composition = findMetadataItem(items, "Composition type")?.value;
    const language = findMetadataItem(items, "Language")?.value;

    return (
      <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {workTitle && <InlineSummaryValue label="Title" value={workTitle} />}
        {artist && <span className="h-4 w-px bg-border" />}
        {artist && <span className="max-w-[70px] truncate font-semibold">{artist}</span>}
        {composition && <span className="h-4 w-px bg-border" />}
        {composition && <ValuePill value={composition} />}
        {language && <span className="h-4 w-px bg-border" />}
        {language && <ValuePill value={language} tone="neutral" />}
      </div>
    );
  }

  if (title === "release") {
    const artist = meaningfulMetadataValue(findMetadataItem(items, "Recording artist")?.value);
    const status = meaningfulMetadataValue(findMetadataItem(items, "Release status")?.value);
    const releaseDate = meaningfulMetadataValue(findMetadataItem(items, "Release date")?.value);

    return (
      <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {artist && <InlineSummaryValue label="Artist" value={artist} />}
        {artist && status && <span className="h-4 w-px bg-border" />}
        {status && <ValuePill value={status} tone="amber" />}
        {(artist || status) && releaseDate && <span className="h-4 w-px bg-border" />}
        {releaseDate && <InlineSummaryValue label="Release" value={releaseDate} />}
      </div>
    );
  }

  if (title.includes("codes")) {
    const upc = meaningfulMetadataValue(findMetadataItem(items, "UPC")?.value);
    const iswc = meaningfulMetadataValue(findMetadataItem(items, "ISWC")?.value);
    const isrc = meaningfulMetadataValue(findMetadataItem(items, "Related ISRC")?.value);

    return (
      <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {upc && <InlineSummaryValue label="UPC" value={upc} />}
        {upc && iswc && <span className="h-4 w-px bg-border" />}
        {iswc && <InlineSummaryValue label="ISWC" value={iswc} />}
        {(upc || iswc) && isrc && <span className="h-4 w-px bg-border" />}
        {isrc && <InlineSummaryValue label="ISRC" value={isrc} />}
      </div>
    );
  }

  if (title.includes("registration contact")) {
    const contact = meaningfulMetadataValue(findMetadataItem(items, "Designated contact")?.value);
    const role = meaningfulMetadataValue(findMetadataItem(items, "Contact role")?.value);
    const deadline = meaningfulMetadataValue(findMetadataItem(items, "Deadline")?.value);

    return (
      <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {contact && <InlineSummaryValue label="Contact" value={contact} />}
        {contact && role && <span className="h-4 w-px bg-border" />}
        {role && <ValuePill value={role} tone="neutral" />}
        {(contact || role) && deadline && <span className="h-4 w-px bg-border" />}
        {deadline && <InlineSummaryValue label="Deadline" value={deadline} />}
      </div>
    );
  }

  if (title.includes("invite")) {
    const invite = items[0];
    const parsed = invite ? parseInviteValue(invite.value) : undefined;

    return (
      <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {invite && <span className="max-w-[120px] truncate font-semibold">{invite.label}</span>}
        {parsed && <ValuePill value={parsed.status} />}
      </div>
    );
  }

  if (title.includes("sample")) {
    const sampleStatus = findMetadataItem(items, "Sample status")?.value;
    const clearanceStatus = findMetadataItem(items, "Clearance status")?.value;
    const publicDomain = findMetadataItem(items, "Public domain")?.value;

    return (
      <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {sampleStatus && <InlineSummaryValue label="Sample" value={sampleStatus} />}
        {sampleStatus && clearanceStatus && <span className="h-4 w-px bg-border" />}
        {clearanceStatus && <ValuePill value={clearanceStatus} />}
        {clearanceStatus && publicDomain && <span className="h-4 w-px bg-border" />}
        {publicDomain && <InlineSummaryValue label="Public domain" value={publicDomain} />}
      </div>
    );
  }

  if (title.includes("authorization")) {
    const splitPercent = findMetadataItem(items, "Split percent")?.value;
    const proIpi = findMetadataItem(items, "PRO / IPI")?.value;
    const allSignatures = findMetadataItem(items, "Require all signatures")?.value;

    return (
      <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
        {splitPercent && <InlineSummaryValue label="Split" value={splitPercent} />}
        {splitPercent && proIpi && <span className="h-4 w-px bg-border" />}
        {proIpi && <InlineSummaryValue label="PRO/IPI" value={proIpi} />}
        {proIpi && allSignatures && <span className="h-4 w-px bg-border" />}
        {allSignatures && <ValuePill value={allSignatures === "Yes" ? "All signatures" : allSignatures} />}
      </div>
    );
  }

  return (
    <div className="hidden min-w-0 items-center justify-end gap-2 text-xs text-[hsl(var(--split-allocation-1))] md:flex">
      {items.slice(0, 2).map((item) => (
        <InlineSummaryValue key={`${group.title}-${item.label}`} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function meaningfulMetadataValue(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["not provided", "pending", "none"].includes(normalized)) return undefined;
  return value;
}

function InlineSummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 truncate">
      <span className="font-medium text-muted-foreground">{label}</span>{" "}
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function MetadataReceipt({ title, items, tone }: { title: string; items: MetadataItem[]; tone: MetadataTone }) {
  if (items.length === 0) {
    return <EmptyCompact>No extra metadata stored yet.</EmptyCompact>;
  }

  if (title.toLowerCase().includes("invite")) {
    return <InviteReceipt items={items} />;
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${getReceiptToneClass(tone)}`}>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => (
          <MetaFact key={`${title}-${item.label}`} item={item} tone={tone} index={index} />
        ))}
      </div>
    </div>
  );
}

function MetaFact({ item, tone, index }: { item: MetadataItem; tone: MetadataTone; index: number }) {
  const ItemIcon = getMetadataItemIcon(item.label);

  return (
    <div className={`min-w-0 ${index > 0 ? "xl:border-l xl:border-border/70 xl:pl-4" : ""}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${getSmallIconToneClass(tone)}`}>
          <ItemIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--split-amended))]">
            {item.label}
          </div>
          <div className="mt-1 min-w-0 break-words text-xs font-semibold leading-5 text-[hsl(var(--split-allocation-1))]">
            <MetadataValue label={item.label} value={item.value} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteReceipt({ items }: { items: MetadataItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const parsed = parseInviteValue(item.value);

        return (
          <div
            key={`invite-${item.label}`}
            className="flex flex-col gap-2 rounded-xl border border-[hsl(var(--split-verified)/0.22)] bg-[hsl(var(--split-verified)/0.045)] px-4 py-3 sm:flex-row sm:items-center"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--split-verified)/0.1)] text-[hsl(var(--split-verified))]">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--split-amended))]">{item.label}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[hsl(var(--split-allocation-1))]">
                <ValuePill value={parsed.status} />
                {parsed.details && <span>{parsed.details}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetadataValue({ label, value }: { label: string; value: string }) {
  const tone = getMetadataValueTone(label, value);

  if (tone) {
    return <ValuePill value={value} tone={tone} />;
  }

  return <>{value}</>;
}

function ValuePill({ value, tone }: { value: string; tone?: MetadataValueTone }) {
  const resolvedTone = tone ?? getMetadataValueTone("", value) ?? "neutral";
  const showCheck = resolvedTone === "verified";

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-5 ${getValuePillClass(resolvedTone)}`}>
      {showCheck && <CheckCircle2 className="h-3 w-3" />}
      <span className="truncate">{value}</span>
    </span>
  );
}

type MetadataTone = "record" | "work" | "legal" | "registration" | "invites" | "advanced" | "default";
type MetadataValueTone = "verified" | "amber" | "muted" | "neutral";

function getMetadataGroupPresentation(title: string): {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconClass: string;
  tone: MetadataTone;
} {
  const normalized = title.toLowerCase();

  if (normalized === "record") {
    return {
      title: "Record",
      subtitle: "Core record details and status",
      icon: FileText,
      iconClass: "bg-[hsl(var(--split-pending)/0.14)] text-[hsl(var(--split-allocation-1))]",
      tone: "record",
    };
  }

  if (normalized === "work") {
    return {
      title: "Work",
      subtitle: "Core work details and composition",
      icon: Music2,
      iconClass: "bg-[hsl(var(--split-pending)/0.16)] text-[hsl(var(--split-allocation-1))]",
      tone: "work",
    };
  }

  if (normalized.includes("invite")) {
    return {
      title: "Collaborator Invites",
      subtitle: "Invitations and collaboration status",
      icon: UsersRound,
      iconClass: "bg-[hsl(var(--split-pending)/0.14)] text-[hsl(var(--split-allocation-1))]",
      tone: "invites",
    };
  }

  if (normalized.includes("advanced")) {
    const legal = normalized.includes("legal");
    const registration = normalized.includes("registration");
    return {
      title,
      subtitle: legal
        ? "Sample details, dispute fields, authorization toggles, and delivery settings"
        : registration
          ? "Additional release, code, publisher, and registration details"
        : "Additional codes, publishers, writers, territory, and more",
      icon: SlidersHorizontal,
      iconClass: "bg-secondary text-[hsl(var(--split-amended))]",
      tone: "advanced",
    };
  }

  if (normalized.includes("sample")) {
    return {
      title: "Sample & Clearance",
      subtitle: "Sample, clearance, public domain, and dispute terms",
      icon: FileText,
      iconClass: "bg-[hsl(var(--split-pending)/0.14)] text-[hsl(var(--split-allocation-1))]",
      tone: "legal",
    };
  }

  if (normalized === "release") {
    return {
      title: "Release",
      subtitle: "Recording details, release status, distributor, and label",
      icon: Music2,
      iconClass: "bg-[hsl(var(--split-pending)/0.14)] text-[hsl(var(--split-allocation-1))]",
      tone: "registration",
    };
  }

  if (normalized.includes("codes") || normalized.includes("identifier")) {
    return {
      title: "Codes & Identifiers",
      subtitle: "UPC, ISWC, ISRC, and registration codes",
      icon: Hash,
      iconClass: "bg-[hsl(var(--split-pending)/0.14)] text-[hsl(var(--split-allocation-1))]",
      tone: "registration",
    };
  }

  if (normalized.includes("registration contact")) {
    return {
      title: "Registration Contact",
      subtitle: "Designated submitter and deadline information",
      icon: UserRound,
      iconClass: "bg-[hsl(var(--split-pending)/0.14)] text-[hsl(var(--split-allocation-1))]",
      tone: "registration",
    };
  }

  if (normalized.includes("authorization")) {
    return {
      title: "Authorizations",
      subtitle: "Permissions, registration use, signatures, and export rules",
      icon: Shield,
      iconClass: "bg-[hsl(var(--split-pending)/0.14)] text-[hsl(var(--split-allocation-1))]",
      tone: "legal",
    };
  }

  return {
    title,
    subtitle: `${itemsLabelForTitle(title)} stored for this SPLIT`,
    icon: FileText,
    iconClass: "bg-secondary text-[hsl(var(--split-amended))]",
    tone: "default",
  };
}

function itemsLabelForTitle(title: string) {
  if (title.toLowerCase().includes("sample")) return "Clearance details";
  if (title.toLowerCase().includes("authorization")) return "Authorization details";
  if (title.toLowerCase().includes("registration")) return "Registration details";
  return "Details";
}

function getCoreMetadataItems(group: MetadataGroupDefinition) {
  const coreLabels = CORE_METADATA_LABELS[group.title];
  if (!coreLabels) return group.items;

  const normalizedCoreLabels = new Set(coreLabels.map(normalizeMetadataLabel));
  return group.items.filter((item) => normalizedCoreLabels.has(normalizeMetadataLabel(item.label)));
}

function buildAdvancedMetadataItems(groups: MetadataGroupDefinition[]) {
  return groups.flatMap((group) => {
    const coreLabels = CORE_METADATA_LABELS[group.title];
    if (!coreLabels) return [];

    const normalizedCoreLabels = new Set(coreLabels.map(normalizeMetadataLabel));
    return group.items
      .filter((item) => !normalizedCoreLabels.has(normalizeMetadataLabel(item.label)))
      .map((item) => ({
        ...item,
        label: `${group.title} · ${item.label}`,
      }));
  });
}

function normalizeMetadataLabel(label: string) {
  return label.trim().toLowerCase();
}

function findMetadataItem(items: MetadataItem[], label: string) {
  return items.find((item) => normalizeMetadataLabel(item.label) === normalizeMetadataLabel(label));
}

function parseInviteValue(value: string) {
  const [status = "Pending", ...details] = value.split(" · ");
  return {
    status,
    details: details.join(" · "),
  };
}

function getMetadataItemIcon(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("document")) return FileText;
  if (normalized.includes("upc") || normalized.includes("iswc") || normalized.includes("isrc") || normalized.includes("code")) return Hash;
  if (normalized.includes("status") || normalized.includes("verified")) return BadgeCheck;
  if (normalized.includes("sent")) return Send;
  if (normalized.includes("stored")) return Archive;
  if (normalized.includes("created") || normalized.includes("updated") || normalized.includes("date") || normalized.includes("deadline")) return CalendarDays;
  if (normalized.includes("artist") || normalized.includes("contact")) return UserRound;
  if (normalized.includes("distributor") || normalized.includes("label")) return Building2;
  if (normalized.includes("composition") || normalized.includes("title")) return Type;
  if (normalized.includes("language")) return Music2;
  if (normalized.includes("location")) return MapPin;
  if (normalized.includes("studio")) return Building2;
  return FileText;
}

function getReceiptToneClass(tone: MetadataTone) {
  const classes = {
    record: "border-border/80 bg-card",
    work: "border-[hsl(var(--split-pending)/0.24)] bg-[hsl(var(--split-bone)/0.52)]",
    legal: "border-[hsl(var(--split-pending)/0.2)] bg-[hsl(var(--split-bone)/0.28)]",
    registration: "border-[hsl(var(--split-pending)/0.22)] bg-[hsl(var(--split-bone)/0.34)]",
    invites: "border-[hsl(var(--split-verified)/0.22)] bg-[hsl(var(--split-verified)/0.045)]",
    advanced: "border-border/80 bg-secondary/35",
    default: "border-border/80 bg-card",
  };

  return classes[tone];
}

function getSmallIconToneClass(tone: MetadataTone) {
  const classes = {
    record: "bg-[hsl(var(--split-allocation-1)/0.07)] text-[hsl(var(--split-allocation-1))]",
    work: "bg-[hsl(var(--split-pending)/0.18)] text-[hsl(var(--split-allocation-1))]",
    legal: "bg-[hsl(var(--split-pending)/0.16)] text-[hsl(var(--split-allocation-1))]",
    registration: "bg-[hsl(var(--split-pending)/0.16)] text-[hsl(var(--split-allocation-1))]",
    invites: "bg-[hsl(var(--split-verified)/0.1)] text-[hsl(var(--split-verified))]",
    advanced: "bg-background text-[hsl(var(--split-amended))]",
    default: "bg-secondary text-[hsl(var(--split-amended))]",
  };

  return classes[tone];
}

function getMetadataValueTone(label: string, value: string): MetadataValueTone | undefined {
  const normalizedLabel = label.toLowerCase();
  const normalizedValue = value.toLowerCase();

  if (normalizedValue.includes("no sample") || normalizedValue === "not needed") return "verified";
  if (["not provided", "pending", "none", "no"].includes(normalizedValue)) return "muted";
  if (["fully signed", "signed", "accepted", "approved", "verified"].some((status) => normalizedValue.includes(status))) return "verified";
  if (normalizedLabel.includes("composition") || normalizedLabel.includes("language") || normalizedValue.includes("original song")) return "amber";
  return undefined;
}

function getValuePillClass(tone: MetadataValueTone) {
  const classes = {
    verified: "bg-[hsl(var(--split-verified)/0.1)] text-[hsl(var(--split-verified))]",
    amber: "bg-[hsl(var(--split-pending)/0.16)] text-[hsl(var(--split-allocation-1))]",
    muted: "bg-secondary text-muted-foreground",
    neutral: "bg-secondary text-[hsl(var(--split-amended))]",
  };

  return classes[tone];
}

function StackedCollapsibleSection({
  title,
  description,
  icon: Icon,
  open,
  onToggle,
  last = false,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${last ? "" : "border-b border-border"} border-l-4 transition-colors ${open ? "border-l-[hsl(var(--split-allocation-2))]" : "border-l-transparent"}`}>
      <button onClick={onToggle} className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-secondary/30 md:grid-cols-[auto_1fr_1.15fr_auto] md:px-4">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${open ? "bg-[hsl(var(--split-allocation-1))] text-white" : "bg-secondary text-[hsl(var(--split-allocation-1))]"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-left text-[13px] font-bold text-[hsl(var(--split-allocation-1))]">{title}</span>
        <span className="hidden text-left text-[11px] font-medium text-[hsl(var(--split-amended))] md:block">{description}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-[hsl(var(--split-allocation-1))]" /> : <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--split-allocation-1))]" />}
      </button>
      {open && <div className="border-t border-border px-3 py-3 md:px-4">{children}</div>}
    </div>
  );
}

function EmptyCompact({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 text-xs text-muted-foreground">
      <ListChecks className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}
