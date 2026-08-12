import React, { useEffect, useMemo, useState } from "react";
import splitLogo from "@/assets/split-logo.png";
import UserProfileSheet from "@/components/UserProfileSheet";
import ProfilePage from "@/components/ProfilePage";
import CreatorProfileView from "@/components/CreatorProfileView";
import type { UserProfile } from "@/lib/userProfile";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import AgreementsList, { type FilterStatus } from "@/components/AgreementsList";
import AgreementDetail from "@/components/AgreementDetail";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import CollaborationView from "@/components/CollaborationView";
import SettingsPage from "@/components/SettingsPage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getSplitWorkflowLabel,
  getSplitWorkflowStageById,
  PENDING_SPLIT_STATUSES,
  SPLIT_WORKFLOW_STAGES,
  VERIFIED_SPLIT_STATUSES,
  type SplitWorkflowStageId,
} from "@/lib/splitWorkflow";
import {
  loadLocalSplitSheetDocuments,
  loadSplitSheetDocuments,
  saveLocalSplitSheetDocuments,
  saveSplitSheetDocument,
  saveSplitSheetParticipantAction,
  type SplitSheetSaveMode,
  type SplitSheetUpdateContext,
} from "@/lib/splitSheetStorage";
import { toast } from "sonner";
import {
  FileText,
  LayoutDashboard,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Plus,
  Shield,
  Menu,
  X,
  ArrowLeft,
  FilePenLine,
} from "lucide-react";

export type Agreement = {
  id: string;
  title: string;
  type: "Split Sheet";
  status:
    | "Draft"
    | "Pending Collaborator Acceptance"
    | "Pending Split Approval"
    | "Revision Requested"
    | "Ready to Sign"
    | "Pending Signatures"
    | "Fully Signed"
    | "Verified and Stored"
    | "Executed"
    | "Amended"
    | "Disputed"
    | "Archived";
  parties: string[];
  version: number;
  created: string;
  updated: string;
  splits: { name: string; role: string; percent: number }[];
  document?: StoredSplitSheetDocument;
};

function documentPartyName(party: StoredSplitSheetDocument["data"]["parties"][number]) {
  return party.professionalName || party.legalName || party.email || party.phoneNumber || party.splitId || "Invited writer";
}

function documentCollaboratorInvites(document: StoredSplitSheetDocument) {
  if (Array.isArray(document.collaboratorInvites) && document.collaboratorInvites.length > 0) {
    return document.collaboratorInvites;
  }

  return document.data.parties
    .filter((party) => !party.isCurrentUser)
    .map((party) => ({
      id: party.id,
      partyId: party.id,
      name: documentPartyName(party),
      inviteMethod: party.inviteMethod,
      inviteValue: party.inviteValue || party.email || party.phoneNumber || party.splitId,
      status: "Pending" as const,
      profileSnapshot: {
        displayName: party.professionalName || party.legalName || party.inviteValue,
        role: party.role,
        email: party.email,
        phoneNumber: party.phoneNumber,
        splitId: party.splitId,
      },
    }));
}

function documentSplitProposals(document: StoredSplitSheetDocument) {
  if (Array.isArray(document.splitProposalVersions) && document.splitProposalVersions.length > 0) {
    return document.splitProposalVersions;
  }

  const proposalId = document.currentProposalId || `${document.id}-proposal-1`;
  return [
    {
      id: proposalId,
      versionNumber: document.version || 1,
      proposedBy: document.creatorProfile.displayName || document.creatorProfile.legalName || document.creatorProfile.emailAddress || "SPLIT user",
      notes: "Initial split proposal",
      createdAt: document.createdAt || new Date().toISOString(),
      allocations: document.data.parties.map((party) => ({
        partyId: party.id,
        name: documentPartyName(party),
        role: party.role || "Collaborator",
        percentage: Number(party.percent) || 0,
        notes: party.contributionDescription,
      })),
    },
  ];
}

function documentSplitApprovals(document: StoredSplitSheetDocument, proposalId: string, invites: ReturnType<typeof documentCollaboratorInvites>) {
  if (Array.isArray(document.splitApprovals) && document.splitApprovals.length > 0) {
    return document.splitApprovals;
  }

  const creatorName = document.creatorProfile.displayName || document.creatorProfile.legalName || document.creatorProfile.emailAddress || "SPLIT user";
  return [
    {
      id: `${document.id}-creator-approval`,
      proposalVersionId: proposalId,
      collaboratorId: "creator",
      collaboratorName: creatorName,
      status: "Approved" as const,
      respondedAt: document.createdAt,
    },
    ...invites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({
        id: `${document.id}-${invite.id}-approval`,
        proposalVersionId: proposalId,
        collaboratorId: invite.id,
        collaboratorName: invite.name,
        status: "Pending" as const,
      })),
  ];
}

function documentSplitSignatures(document: StoredSplitSheetDocument, proposalId: string, invites: ReturnType<typeof documentCollaboratorInvites>) {
  if (Array.isArray(document.splitSignatures) && document.splitSignatures.length > 0) {
    return document.splitSignatures;
  }

  const creatorName = document.creatorProfile.displayName || document.creatorProfile.legalName || document.creatorProfile.emailAddress || "SPLIT user";
  const signatureStatuses = ["Pending Signatures", "Fully Signed", "Verified and Stored", "Executed"];
  const isSignedRecord = ["Fully Signed", "Verified and Stored", "Executed"].includes(document.status);
  const signedAt = isSignedRecord ? document.verifiedAt || document.updatedAt || document.createdAt : undefined;

  if (!signatureStatuses.includes(document.status) && document.status !== "Ready to Sign") {
    return [];
  }

  return [
    {
      id: `${document.id}-creator-signature`,
      proposalVersionId: proposalId,
      collaboratorId: "creator",
      collaboratorName: creatorName,
      status: isSignedRecord ? "Signed" as const : "Pending" as const,
      signedAt,
      signatureMethod: isSignedRecord ? "SPLIT beta acknowledgement" : undefined,
    },
    ...invites
      .filter((invite) => invite.status === "Accepted")
      .map((invite) => ({
        id: `${document.id}-${invite.id}-signature`,
        proposalVersionId: proposalId,
        collaboratorId: invite.id,
        collaboratorName: invite.name,
        status: isSignedRecord ? "Signed" as const : "Pending" as const,
        signedAt,
        signatureMethod: isSignedRecord ? "SPLIT beta acknowledgement" : undefined,
      })),
  ];
}

function documentToAgreement(document: StoredSplitSheetDocument): Agreement {
  const parties = Array.isArray(document.data.parties) ? document.data.parties : [];
  const created = document.createdAt || new Date().toISOString();
  const updated = document.updatedAt || created;
  const collaboratorInvites = documentCollaboratorInvites(document);
  const splitProposalVersions = documentSplitProposals(document);
  const currentProposalId = document.currentProposalId || splitProposalVersions[splitProposalVersions.length - 1]?.id;
  const normalizedDocument = {
    ...document,
    currentProposalId,
    collaboratorInvites,
    splitProposalVersions,
    splitApprovals: documentSplitApprovals(document, currentProposalId, collaboratorInvites),
    splitSignatures: documentSplitSignatures(document, currentProposalId, collaboratorInvites),
  };

  return {
    id: document.id,
    title: document.data.songTitle || document.title || "Untitled SPLIT Sheet",
    type: "Split Sheet",
    status: document.status || "Draft",
    parties: parties.map(documentPartyName),
    version: document.version || 1,
    created: created.slice(0, 10),
    updated: updated.slice(0, 10),
    splits: parties.map((party) => ({
      name: documentPartyName(party),
      role: party.role || "Songwriter",
      percent: Number(party.percent) || 0,
    })),
    document: normalizedDocument,
  };
}

type View =
  | "dashboard"
  | "agreements"
  | "new-agreement"
  | "settings"
  | "collaboration"
  | "profile"
  | "profile-edit"
  | "activity";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agreements", label: "Split Sheets", icon: FileText },
  { id: "collaboration", label: "Messages", icon: FilePenLine },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type AgreementNotification = {
  id: string;
  type: "executed" | "needs_action";
  title: string;
  detail: string;
  time: string;
  agreementId: string;
  actionLabel: string;
  icon: typeof FileText;
  tone: string;
};

const AGREEMENT_NOTIFICATIONS: AgreementNotification[] = [];

export default function Dashboard({
  userProfile,
  onUpdateProfile,
  onOpenAccountCreation,
}: {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onOpenAccountCreation: () => void;
}) {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [agreementFilter, setAgreementFilter] = useState<FilterStatus>("All");
  const [isNewAgreement, setIsNewAgreement] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<StoredSplitSheetDocument[]>(() => loadLocalSplitSheetDocuments(userProfile));
  const [loadingSplitSheets, setLoadingSplitSheets] = useState(true);
  const [splitSheetsPersisted, setSplitSheetsPersisted] = useState(false);
  const isMobile = useIsMobile();

  const agreements = useMemo(() => generatedDocuments.map(documentToAgreement), [generatedDocuments]);

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      setLoadingSplitSheets(true);
      const results = await loadSplitSheetDocuments(userProfile);
      if (!active) return;

      const documents = results.map((result) => result.document);
      setGeneratedDocuments(documents);
      saveLocalSplitSheetDocuments(documents);
      setSplitSheetsPersisted(results.length > 0 && results.every((result) => result.persisted));
      setLoadingSplitSheets(false);
    }

    loadDocuments();

    return () => {
      active = false;
    };
  }, [userProfile]);

  const applyGeneratedDocument = (document: StoredSplitSheetDocument) => {
    setGeneratedDocuments((current) => {
      const exists = current.some((item) => item.id === document.id);
      const next = exists
        ? current.map((item) => (item.id === document.id ? document : item))
        : [document, ...current];

      saveLocalSplitSheetDocuments(next);
      return next;
    });
  };

  const persistGeneratedDocument = async (document: StoredSplitSheetDocument, mode: SplitSheetSaveMode) => {
    applyGeneratedDocument(document);
    const result = await saveSplitSheetDocument(document, mode, userProfile);
    applyGeneratedDocument(result.document);
    setSplitSheetsPersisted(result.persisted);
    return result.persisted;
  };

  const updateGeneratedDocument = async (document: StoredSplitSheetDocument, context: SplitSheetUpdateContext = {}) => {
    applyGeneratedDocument(document);
    setSelectedAgreement(documentToAgreement(document));
    const persisted = context.action && context.action !== "creator_update"
      ? await saveSplitSheetParticipantAction(document, context, userProfile)
      : await saveSplitSheetDocument(document, "update", userProfile);

    applyGeneratedDocument(persisted.document);
    setSelectedAgreement(documentToAgreement(persisted.document));
    if (!persisted.persisted) {
      toast.warning("Saved locally", {
        description: "Supabase did not confirm this split-sheet update yet.",
      });
    }
  };

  const executed = agreements.filter((a) => VERIFIED_SPLIT_STATUSES.includes(a.status)).length;
  const pending = agreements.filter((a) => PENDING_SPLIT_STATUSES.includes(a.status)).length;
  const drafts = agreements.filter((a) => a.status === "Draft").length;
  const openAgreement = (agreementId: string) => {
    const agreement = agreements.find((item) => item.id === agreementId);

    if (agreement) {
      setSelectedAgreement(agreement);
      setActiveView("agreements");
      if (isMobile) setSidebarOpen(false);
    }
  };

  if (isNewAgreement) {
    return (
      <ContractBuilder
        userProfile={userProfile}
        onBack={() => setIsNewAgreement(false)}
        onStoreDocument={(document) => persistGeneratedDocument(document, "draft")}
        onSendDocument={(document) => persistGeneratedDocument(document, "send")}
      />
    );
  }

  // On mobile agreements view with a selected agreement, show detail with back button
  if (isMobile && activeView === "agreements" && selectedAgreement) {
    return (
      <div className="flex flex-col h-screen bg-background safe-top safe-bottom">
        <header className="h-[56px] flex items-center px-4 border-b border-border bg-background flex-shrink-0 gap-3">
          <button onClick={() => setSelectedAgreement(null)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-accent">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold truncate flex-1">{selectedAgreement.title}</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <AgreementDetail agreement={selectedAgreement} viewerProfile={userProfile} onUpdateDocument={updateGeneratedDocument} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${
        isMobile
          ? `fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-200 ease-out safe-top safe-bottom ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
          : "w-[220px] flex-shrink-0"
      } border-r border-border flex flex-col bg-card`}>
        {/* Logo */}
        <div className="h-[60px] flex items-center px-5 border-b border-border gap-2.5 flex-shrink-0">
          <img src={splitLogo} alt="SPLIT" className="h-7 w-7" />
          <span className="text-sm font-bold tracking-tight text-foreground">SPLIT</span>
          <span className="ml-auto flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-primary opacity-70" />
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveView(id as View);
                  setSelectedAgreement(null);
                  if (id === "agreements") setAgreementFilter("All");
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border">
          <UserProfileSheet
            onOpenProfile={() => {
              setActiveView("profile");
              setSelectedAgreement(null);
              if (isMobile) setSidebarOpen(false);
            }}
            onOpenAccountCreation={() => {
              onOpenAccountCreation();
              if (isMobile) setSidebarOpen(false);
            }}
          />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-[56px] md:h-[60px] flex items-center px-4 md:px-6 border-b border-border bg-background flex-shrink-0 gap-3 md:gap-4 safe-top">
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1 rounded-lg hover:bg-accent">
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
          <div className="flex-1 flex items-center gap-3">
            <div className={`relative ${isMobile ? "w-full" : "max-w-sm w-full"}`}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Search…"
                className="w-full rounded-lg border border-border bg-secondary/60 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <NotificationsPopover onViewAll={() => setActiveView("activity")} onOpenAgreement={openAgreement} />
          {!isMobile && (
            <button
              onClick={() => setIsNewAgreement(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3.5 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New SPLIT Sheet
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden safe-bottom">
          {activeView === "dashboard" && (
            <DashboardHome
              agreements={agreements}
              executed={executed}
              pending={pending}
              drafts={drafts}
              loading={loadingSplitSheets}
              persisted={splitSheetsPersisted}
              onOpenBucket={(filter) => {
                setAgreementFilter(filter);
                setSelectedAgreement(null);
                setActiveView("agreements");
              }}
              onNew={() => setIsNewAgreement(true)}
              isMobile={isMobile}
            />
          )}
          {activeView === "agreements" && (
            isMobile ? (
              <AgreementsList
                agreements={agreements}
                selected={selectedAgreement}
                onSelect={setSelectedAgreement}
                onNew={() => setIsNewAgreement(true)}
                filter={agreementFilter}
                onFilterChange={setAgreementFilter}
              />
            ) : (
              <div className="h-full flex">
                <AgreementsList
                  agreements={agreements}
                  selected={selectedAgreement}
                  onSelect={setSelectedAgreement}
                  onNew={() => setIsNewAgreement(true)}
                  filter={agreementFilter}
                  onFilterChange={setAgreementFilter}
                />
                <div className="flex-1 min-w-0 overflow-y-auto bg-background">
                  {selectedAgreement ? (
                    <AgreementDetail agreement={selectedAgreement} viewerProfile={userProfile} onUpdateDocument={updateGeneratedDocument} />
                  ) : (
                    <EmptyDetail onNew={() => setIsNewAgreement(true)} />
                  )}
                </div>
              </div>
            )
          )}
          {activeView === "collaboration" && <CollaborationView />}
          {activeView === "settings" && <SettingsPage />}
          {activeView === "profile" && (
            <CreatorProfileView
              userProfile={userProfile}
              mode="own"
              onEditProfile={() => setActiveView("profile-edit")}
              onMessage={() => setActiveView("collaboration")}
            />
          )}
          {activeView === "profile-edit" && (
            <ProfilePage
              userProfile={userProfile}
              onUpdateProfile={onUpdateProfile}
              onBackToPublicProfile={() => setActiveView("profile")}
            />
          )}
          {activeView === "activity" && <AgreementActivityPage agreements={agreements} onOpenAgreement={openAgreement} />}
        </main>

        {/* Mobile FAB */}
        {isMobile && (
          <button
            onClick={() => setIsNewAgreement(true)}
            className="fixed bottom-6 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}

function DashboardHome({
  agreements,
  executed,
  pending,
  drafts,
  loading,
  persisted,
  onOpenBucket,
  onNew,
  isMobile,
}: {
  agreements: Agreement[];
  executed: number;
  pending: number;
  drafts: number;
  loading: boolean;
  persisted: boolean;
  onOpenBucket: (filter: FilterStatus) => void;
  onNew: () => void;
  isMobile: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={`max-w-5xl mx-auto ${isMobile ? "px-4 py-5" : "px-8 py-8"}`}>
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-muted-foreground md:text-sm">
              See the split sheets that need attention, then finish drafts, approvals, signatures, and verified records.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                persisted
                  ? "border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)] text-[hsl(var(--split-verified))]"
                  : "border-border bg-secondary/50 text-muted-foreground"
              }`}>
                {loading ? "Loading split sheets..." : persisted ? "Supabase synced" : "Local preview fallback"}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Contracts are queued for server-side delivery, never sent from the browser.
              </span>
            </div>
          </div>
          <button
            onClick={onNew}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:hidden"
          >
            <Plus className="h-3.5 w-3.5" />
            New SPLIT Sheet
          </button>
        </div>

        <div className={`mb-6 grid ${isMobile ? "grid-cols-3 gap-2" : "grid-cols-3 gap-4"} md:mb-8`}>
          <StatCard
            label="Needs Action"
            value={pending}
            accent="pending"
            compact={isMobile}
            onClick={() => onOpenBucket("Pending")}
          />
          <StatCard
            label="Drafts"
            value={drafts}
            accent="draft"
            compact={isMobile}
            onClick={() => onOpenBucket("Draft")}
          />
          <StatCard
            label="Verified"
            value={executed}
            accent="verified"
            compact={isMobile}
            onClick={() => onOpenBucket("Verified")}
          />
        </div>

        <WorkflowStrip agreements={agreements} onOpenStage={(stageId) => onOpenBucket(workflowStageToFilter(stageId))} />
      </div>
    </div>
  );
}

function workflowStageToFilter(stageId: SplitWorkflowStageId): FilterStatus {
  if (stageId === "fully-signed") return "Verified";
  if (stageId === "draft") return "Draft";

  const stage = getSplitWorkflowStageById(stageId);
  return (stage.statuses[0] as FilterStatus) || "All";
}

function WorkflowStrip({
  agreements,
  onOpenStage,
}: {
  agreements: Agreement[];
  onOpenStage: (stageId: SplitWorkflowStageId) => void;
}) {
  const counts = SPLIT_WORKFLOW_STAGES.map((stage) => ({
    ...stage,
    count: agreements.filter((agreement) => stage.statuses.includes(agreement.status)).length,
  }));

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm md:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Split workflow</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Draft to locked record, using SPLIT status language.</p>
        </div>
        <span className="hidden rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary md:inline-flex">
          {agreements.length} total
        </span>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {counts.map((stage, index) => {
            const active = stage.count > 0;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onOpenStage(stage.id)}
                className={`group flex min-w-[150px] items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-primary/25 bg-primary/5 hover:bg-primary/10"
                    : "border-border bg-background hover:border-primary/20 hover:bg-secondary/40"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate text-xs font-semibold text-foreground">{stage.label}</span>
                </span>
                <span className={`text-sm font-bold tabular-nums ${active ? "text-primary" : "text-muted-foreground"}`}>{stage.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent,
  compact,
  onClick,
}: {
  label: string;
  value: number;
  accent: "verified" | "pending" | "draft";
  compact?: boolean;
  onClick?: () => void;
}) {
  const accents = {
    verified: "text-[hsl(var(--split-verified))]",
    pending: "text-[hsl(var(--split-pending))]",
    draft: "text-muted-foreground",
  };
  const bgs = {
    verified: "bg-[hsl(var(--split-verified)/0.08)]",
    pending: "bg-[hsl(var(--split-pending)/0.08)]",
    draft: "bg-secondary/60",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border border-border text-left transition-colors hover:border-primary/30 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-ring/30 ${compact ? "p-3" : "p-5"} ${bgs[accent]}`}
    >
      <div className={`${compact ? "text-2xl" : "text-3xl"} font-bold tabular-nums ${accents[accent]}`}>{value}</div>
      <div className={`${compact ? "text-[10px]" : "text-xs"} text-muted-foreground mt-1 font-medium`}>{label}</div>
    </button>
  );
}

function NotificationsPopover({
  onViewAll,
  onOpenAgreement,
}: {
  onViewAll: () => void;
  onOpenAgreement: (agreementId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          {AGREEMENT_NOTIFICATIONS.length > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(420px,calc(100vw-24px))] p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Recent Notifications</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Signatures, approvals, invites, and split-sheet updates.</p>
            </div>
            <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary">
              {AGREEMENT_NOTIFICATIONS.length}
            </span>
          </div>
        </div>

        <div className="max-h-[420px] space-y-2 overflow-y-auto px-3 py-3">
          {AGREEMENT_NOTIFICATIONS.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center">
              <Bell className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Real invites, approvals, signatures, and stored split updates will show up here.
              </p>
            </div>
          ) : (
            AGREEMENT_NOTIFICATIONS.map(({ id, title, detail, time, agreementId, actionLabel, icon: Icon, tone }) => (
              <button
                key={id}
                onClick={() => {
                  setOpen(false);
                  onOpenAgreement(agreementId);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/25 hover:bg-secondary/50"
              >
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
                  <span className="mt-1 block text-[11px] font-medium text-muted-foreground/80">{time}</span>
                </span>
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">
                  <span className="hidden sm:inline">{actionLabel}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            onClick={() => {
              setOpen(false);
              onViewAll();
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all split sheet activity
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AgreementActivityPage({
  agreements,
  onOpenAgreement,
}: {
  agreements: Agreement[];
  onOpenAgreement: (agreementId: string) => void;
}) {
  const executed = AGREEMENT_NOTIFICATIONS.filter((item) => item.type === "executed").length;
  const needsAction = AGREEMENT_NOTIFICATIONS.filter((item) => item.type !== "executed").length;
  const priorityItems = AGREEMENT_NOTIFICATIONS.filter((item) => item.type !== "executed");
  const executedItems = AGREEMENT_NOTIFICATIONS.filter((item) => item.type === "executed");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Split Sheet Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review sent, received, disputed, executed, and registration activity in one place.</p>
        </div>

        <div className="mb-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Action Queue</p>
                  <h2 className="mt-2 text-lg font-bold">Needs your attention</h2>
                </div>
                <span className="inline-flex h-8 items-center rounded-full bg-[hsl(var(--split-pending)/0.12)] px-3 text-sm font-bold text-[hsl(var(--split-pending))]">
                  {needsAction}
                </span>
              </div>

              <div className="space-y-3">
                {priorityItems.length === 0 ? (
                  <ActivityEmptyState label="No pending activity" />
                ) : (
                  priorityItems.map(({ id, title, detail, agreementId, actionLabel, icon: Icon, tone }) => (
                    <div key={id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{title}</div>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                      </div>
                      <button
                        onClick={() => onOpenAgreement(agreementId)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary"
                      >
                        {actionLabel}
                      </button>
                    </div>
                  ))
                )}
              </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--split-verified))]">Recently Verified</p>
                <h2 className="mt-2 text-lg font-bold">Stored split records</h2>
              </div>
              <span className="inline-flex h-8 items-center rounded-full bg-[hsl(var(--split-verified)/0.12)] px-3 text-sm font-bold text-[hsl(var(--split-verified))]">
                {executed}
              </span>
            </div>

            <div className="space-y-3">
              {executedItems.length === 0 ? (
                <ActivityEmptyState label="No verified records yet" />
              ) : (
                executedItems.map(({ id, title, detail, agreementId, actionLabel, icon: Icon, tone, time }) => (
                  <div key={id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-bold">{title}</div>
                          <span className="text-[11px] font-medium text-muted-foreground">{time}</span>
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenAgreement(agreementId)}
                      className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      {actionLabel}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold">Activity Inbox</h2>
            <span className="text-xs font-medium text-muted-foreground">{AGREEMENT_NOTIFICATIONS.length} total updates</span>
          </div>

          <div className="divide-y divide-border">
            {AGREEMENT_NOTIFICATIONS.length === 0 ? (
              <div className="px-4 py-8">
                <ActivityEmptyState label="No activity yet" />
              </div>
            ) : AGREEMENT_NOTIFICATIONS.map(({ id, title, detail, time, agreementId, actionLabel, icon: Icon, tone }) => {
              const agreement = agreements.find((item) => item.id === agreementId);

              return (
                <div key={id} className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{title}</h3>
                        <span className="text-[11px] font-medium text-muted-foreground">{time}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                      {agreement && (
                        <p className="mt-1 text-xs font-medium text-foreground">
                          Related split sheet: <span className="text-primary">{agreement.title}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenAgreement(agreementId)}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center">
      <Bell className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Once backend events are connected, SPLIT will show real updates here.
      </p>
    </div>
  );
}

export function StatusBadge({ status }: { status: Agreement["status"] }) {
  const styles: Record<Agreement["status"], string> = {
    Executed: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
    "Verified and Stored": "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
    "Fully Signed": "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
    "Pending Collaborator Acceptance": "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    "Pending Split Approval": "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    "Revision Requested": "bg-[hsl(var(--split-amended)/0.12)] text-[hsl(var(--split-amended))] border-[hsl(var(--split-amended)/0.25)]",
    "Ready to Sign": "bg-primary/10 text-primary border-primary/20",
    "Pending Signatures": "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    Draft: "bg-secondary text-muted-foreground border-border",
    Amended: "bg-[hsl(var(--split-amended)/0.12)] text-[hsl(var(--split-amended))] border-[hsl(var(--split-amended)/0.25)]",
    Disputed: "bg-destructive/10 text-destructive border-destructive/20",
    Archived: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const workflowLabel = getSplitWorkflowLabel(status);
  const verified = VERIFIED_SPLIT_STATUSES.includes(status);

  return (
    <span className={`inline-flex items-center rounded-full border px-2 md:px-2.5 py-0.5 text-[10px] md:text-[11px] font-semibold whitespace-nowrap ${styles[status]}`}>
      {verified && <span className="mr-1 md:mr-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--split-verified))] inline-block" />}
      {workflowLabel}
    </span>
  );
}

export function AgreementIcon({ type }: { type: Agreement["type"] }) {
  const colors: Record<Agreement["type"], string> = {
    "Split Sheet": "bg-primary/10 text-primary",
  };
  const initials: Record<Agreement["type"], string> = {
    "Split Sheet": "SS",
  };
  return (
    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colors[type]}`}>
      {initials[type]}
    </div>
  );
}

function EmptyDetail({ onNew }: { onNew: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold">No split sheet selected</h3>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
        Select a split sheet to view writers, ownership, registration metadata, and version history.
      </p>
      <button
        onClick={onNew}
        className="mt-5 flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        New SPLIT Sheet
      </button>
    </div>
  );
}
