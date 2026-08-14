import React, { useCallback, useEffect, useMemo, useState } from "react";
import splitLogo from "@/assets/split-logo.png";
import UserProfileSheet from "@/components/UserProfileSheet";
import ProfilePage from "@/components/ProfilePage";
import CreatorProfileView from "@/components/CreatorProfileView";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import AgreementsList, { type FilterStatus } from "@/components/AgreementsList";
import AgreementDetail from "@/components/AgreementDetail";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import CollaborationView from "@/components/CollaborationView";
import SettingsPage from "@/components/SettingsPage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  searchPublicProfiles,
  searchSplitSheets,
  type PublicProfileSearchResult,
  type SplitSheetSearchResult,
} from "@/lib/globalSearch";
import {
  getSplitWorkflowLabel,
  PENDING_SPLIT_STATUSES,
  VERIFIED_SPLIT_STATUSES,
} from "@/lib/splitWorkflow";
import {
  loadSplitSheetDocuments,
  saveLocalSplitSheetDocuments,
  saveSplitSheetDocument,
  saveSplitSheetParticipantAction,
  splitSheetLocalStorageOwnerForAuthUser,
  type SplitSheetSaveMode,
  type SplitSheetUpdateContext,
} from "@/lib/splitSheetStorage";
import {
  loadSplitNotifications,
  markSplitNotificationsRead,
  subscribeToSplitNotifications,
  type SplitNotification,
} from "@/lib/notificationStorage";
import {
  splitSheetAllocationDisplayName,
  splitSheetParticipantDisplayName,
  splitSheetPartyDisplayName,
} from "@/lib/splitSheetDisplay";
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
  AlertTriangle,
  CheckCircle2,
  FilePenLine,
  MessageCircle,
  Loader2,
  PenLine,
  UserRound,
  GitBranch,
  type LucideIcon,
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

function documentPartyName(document: StoredSplitSheetDocument, party: StoredSplitSheetDocument["data"]["parties"][number]) {
  return splitSheetPartyDisplayName(document, party);
}

function isPlaceholderName(value?: string) {
  return /^(invited writer|invited collaborator|collaborator|contributor|pending)$/i.test((value ?? "").trim());
}

function documentCollaboratorInvites(document: StoredSplitSheetDocument) {
  if (Array.isArray(document.collaboratorInvites) && document.collaboratorInvites.length > 0) {
    return document.collaboratorInvites.map((invite) => {
      const party = document.data.parties.find((item) => item.id === invite.partyId);
      const name = splitSheetPartyDisplayName(document, party, invite.name || "Invited writer");
      const snapshotDisplayName = invite.profileSnapshot?.displayName;

      return {
        ...invite,
        name,
        profileSnapshot: {
          ...invite.profileSnapshot,
          displayName: snapshotDisplayName && !isPlaceholderName(snapshotDisplayName) ? snapshotDisplayName : name,
        },
      };
    });
  }

  return document.data.parties
    .filter((party) => !party.isCurrentUser)
    .map((party) => ({
      id: party.id,
      partyId: party.id,
      name: documentPartyName(document, party),
      inviteMethod: party.inviteMethod,
      inviteValue: party.inviteValue || party.email || party.phoneNumber || party.splitId,
      status: "Pending" as const,
      profileSnapshot: {
        displayName: documentPartyName(document, party),
        role: party.role,
        email: party.email,
        phoneNumber: party.phoneNumber,
        splitId: party.splitId,
      },
    }));
}

function documentSplitProposals(document: StoredSplitSheetDocument) {
  if (Array.isArray(document.splitProposalVersions) && document.splitProposalVersions.length > 0) {
    return document.splitProposalVersions.map((proposal) => ({
      ...proposal,
      allocations: proposal.allocations.map((allocation) => ({
        ...allocation,
        name: splitSheetAllocationDisplayName(document, allocation),
      })),
    }));
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
        name: documentPartyName(document, party),
        role: party.role || "Collaborator",
        percentage: Number(party.percent) || 0,
        notes: party.contributionDescription,
      })),
    },
  ];
}

function documentSplitApprovals(document: StoredSplitSheetDocument, proposalId: string, invites: ReturnType<typeof documentCollaboratorInvites>) {
  if (Array.isArray(document.splitApprovals) && document.splitApprovals.length > 0) {
    return document.splitApprovals.map((approval) => ({
      ...approval,
      collaboratorName: splitSheetParticipantDisplayName(document, approval.collaboratorId, approval.collaboratorName),
    }));
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
        collaboratorName: splitSheetParticipantDisplayName(document, invite.id, invite.name),
        status: "Pending" as const,
      })),
  ];
}

function documentSplitSignatures(document: StoredSplitSheetDocument, proposalId: string, invites: ReturnType<typeof documentCollaboratorInvites>) {
  if (Array.isArray(document.splitSignatures) && document.splitSignatures.length > 0) {
    return document.splitSignatures.map((signature) => ({
      ...signature,
      collaboratorName: splitSheetParticipantDisplayName(document, signature.collaboratorId, signature.collaboratorName),
    }));
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
        collaboratorName: splitSheetParticipantDisplayName(document, invite.id, invite.name),
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
    parties: parties.map((party) => documentPartyName(document, party)),
    version: document.version || 1,
    created: created.slice(0, 10),
    updated: updated.slice(0, 10),
    splits: parties.map((party) => ({
      name: documentPartyName(document, party),
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
  | "public-profile"
  | "profile-edit"
  | "activity";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agreements", label: "Split Sheets", icon: FileText },
  { id: "collaboration", label: "Messages", icon: FilePenLine },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export default function Dashboard({
  userProfile,
  activeAuthUserId,
  onUpdateProfile,
  onOpenAccountCreation,
}: {
  userProfile: UserProfile;
  activeAuthUserId?: string | null;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onOpenAccountCreation: () => void;
}) {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [selectedMessageDealId, setSelectedMessageDealId] = useState<string | undefined>();
  const [agreementFilter, setAgreementFilter] = useState<FilterStatus>("All");
  const [isNewAgreement, setIsNewAgreement] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<StoredSplitSheetDocument[]>([]);
  const [loadingSplitSheets, setLoadingSplitSheets] = useState(true);
  const [splitSheetsPersisted, setSplitSheetsPersisted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileSearchResults, setProfileSearchResults] = useState<PublicProfileSearchResult[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [selectedPublicProfile, setSelectedPublicProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<SplitNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const isMobile = useIsMobile();
  const localStorageOwner = splitSheetLocalStorageOwnerForAuthUser(activeAuthUserId);

  const agreements = useMemo(() => generatedDocuments.map(documentToAgreement), [generatedDocuments]);
  const splitSheetSearchResults = useMemo(
    () => searchSplitSheets(agreements, searchQuery, 5),
    [agreements, searchQuery],
  );
  const searchResultsOpen = searchFocused && searchQuery.trim().length >= 2;

  const upsertNotification = useCallback((notification: SplitNotification) => {
    setNotifications((current) => {
      const next = current.some((item) => item.id === notification.id)
        ? current.map((item) => (item.id === notification.id ? notification : item))
        : [notification, ...current];

      return next
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);
    });
  }, []);

  const refreshNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingNotifications(true);
    const nextNotifications = await loadSplitNotifications(50);
    setNotifications(nextNotifications);
    setLoadingNotifications(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDocuments(showLoading = true) {
      if (showLoading) setLoadingSplitSheets(true);
      const results = await loadSplitSheetDocuments(userProfile);
      if (!active) return;

      const documents = results.map((result) => result.document);
      setGeneratedDocuments(documents);
      saveLocalSplitSheetDocuments(documents, localStorageOwner);
      setSplitSheetsPersisted(results.length > 0 && results.every((result) => result.persisted));
      setLoadingSplitSheets(false);
    }

    loadDocuments();
    const refreshTimer = window.setInterval(() => {
      void loadDocuments(false);
    }, 30000);
    const refreshOnFocus = () => {
      void loadDocuments(false);
    };
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void loadDocuments(false);
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [userProfile, localStorageOwner]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => undefined;

    setLoadingNotifications(true);
    void loadSplitNotifications(50).then((nextNotifications) => {
      if (!active) return;
      setNotifications(nextNotifications);
      setLoadingNotifications(false);
    });

    void subscribeToSplitNotifications((notification) => {
      if (!active) return;
      upsertNotification(notification);
    }).then((cleanup) => {
      if (active) {
        unsubscribe = cleanup;
      } else {
        cleanup();
      }
    });

    const refreshTimer = window.setInterval(() => {
      void refreshNotifications(false);
    }, 30000);
    const refreshOnFocus = () => {
      void refreshNotifications(false);
    };
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void refreshNotifications(false);
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [activeAuthUserId, refreshNotifications, upsertNotification]);

  useEffect(() => {
    const query = searchQuery.trim();
    let active = true;

    if (query.length < 2) {
      setProfileSearchResults([]);
      setSearchingProfiles(false);
      return () => {
        active = false;
      };
    }

    setSearchingProfiles(true);
    const searchTimer = window.setTimeout(() => {
      void searchPublicProfiles(query, 6).then((results) => {
        if (!active) return;
        setProfileSearchResults(results);
        setSearchingProfiles(false);
      });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(searchTimer);
    };
  }, [searchQuery]);

  const applyGeneratedDocument = (document: StoredSplitSheetDocument) => {
    setGeneratedDocuments((current) => {
      const exists = current.some((item) => item.id === document.id);
      const next = exists
        ? current.map((item) => (item.id === document.id ? document : item))
        : [document, ...current];

      saveLocalSplitSheetDocuments(next, localStorageOwner);
      return next;
    });
  };

  const persistGeneratedDocument = async (document: StoredSplitSheetDocument, mode: SplitSheetSaveMode) => {
    applyGeneratedDocument(document);
    const result = await saveSplitSheetDocument(document, mode, userProfile);
    applyGeneratedDocument(result.document);
    setSplitSheetsPersisted(result.persisted);
    void refreshNotifications(false);
    return result;
  };

  const updateGeneratedDocument = async (document: StoredSplitSheetDocument, context: SplitSheetUpdateContext = {}) => {
    applyGeneratedDocument(document);
    setSelectedAgreement(documentToAgreement(document));

    const persisted = context.action && context.action !== "creator_update"
      ? await saveSplitSheetParticipantAction(document, context, userProfile)
      : await saveSplitSheetDocument(document, "update", userProfile);

    applyGeneratedDocument(persisted.document);
    setSelectedAgreement(documentToAgreement(persisted.document));
    void refreshNotifications(false);
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

  const openDealMessages = (agreementId: string) => {
    setSelectedMessageDealId(agreementId);
    setActiveView("collaboration");
    if (isMobile) setSidebarOpen(false);
  };

  const markNotificationLocallyRead = (notificationIds?: string[] | null, splitSheetId?: string | null) => {
    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => {
        const idMatches = !notificationIds || notificationIds.includes(notification.id);
        const splitMatches = !splitSheetId || notification.splitSheetId === splitSheetId;
        return idMatches && splitMatches ? { ...notification, readAt: notification.readAt || readAt } : notification;
      }),
    );
  };

  const openNotification = async (notification: SplitNotification) => {
    markNotificationLocallyRead([notification.id]);
    void markSplitNotificationsRead({ notificationIds: [notification.id] });

    if (!notification.splitSheetId) {
      setActiveView("activity");
      return;
    }

    if (notification.actionTarget === "agreement") {
      openAgreement(notification.splitSheetId);
      return;
    }

    openDealMessages(notification.splitSheetId);
  };

  const markAllNotificationsRead = async () => {
    markNotificationLocallyRead(null);
    await markSplitNotificationsRead();
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchFocused(false);
  };

  const openAgreementFromSearch = (agreementId: string) => {
    openAgreement(agreementId);
    clearSearch();
  };

  const openProfileFromSearch = (result: PublicProfileSearchResult) => {
    const profile = createEmptyProfile();
    const roleTags = result.roleTags || "Creator";
    setSelectedPublicProfile({
      ...profile,
      splitId: "",
      username: result.username,
      displayName: result.displayName,
      pkaNames: result.displayName,
      roleTags,
      profileImageUrl: result.profileImageUrl,
      profileLocation: result.profileLocation,
      profileVisibility: "Public",
    });
    setSelectedAgreement(null);
    setActiveView("public-profile");
    if (isMobile) setSidebarOpen(false);
    clearSearch();
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
          <AgreementDetail agreement={selectedAgreement} viewerProfile={userProfile} onOpenMessages={openDealMessages} />
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
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                placeholder="Search split sheets or users..."
                className="w-full rounded-lg border border-border bg-secondary/60 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <GlobalSearchResults
                open={searchResultsOpen}
                splitSheets={splitSheetSearchResults}
                profiles={profileSearchResults}
                searchingProfiles={searchingProfiles}
                onOpenAgreement={openAgreementFromSearch}
                onOpenProfile={openProfileFromSearch}
              />
            </div>
          </div>
          <NotificationsPopover
            notifications={notifications}
            loading={loadingNotifications}
            onViewAll={() => setActiveView("activity")}
            onOpenNotification={openNotification}
            onMarkAllRead={markAllNotificationsRead}
          />
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
              onOpenAgreement={openAgreement}
              onOpenMessages={openDealMessages}
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
                    <AgreementDetail agreement={selectedAgreement} viewerProfile={userProfile} onOpenMessages={openDealMessages} />
                  ) : (
                    <EmptyDetail onNew={() => setIsNewAgreement(true)} />
                  )}
                </div>
              </div>
            )
          )}
          {activeView === "collaboration" && (
            <CollaborationView
              documents={generatedDocuments}
              userProfile={userProfile}
              initialDealId={selectedMessageDealId}
              onUpdateDocument={updateGeneratedDocument}
            />
          )}
          {activeView === "settings" && <SettingsPage userProfile={userProfile} />}
          {activeView === "profile" && (
            <CreatorProfileView
              userProfile={userProfile}
              mode="own"
              onEditProfile={() => setActiveView("profile-edit")}
              onMessage={() => setActiveView("collaboration")}
            />
          )}
          {activeView === "public-profile" && selectedPublicProfile && (
            <CreatorProfileView
              userProfile={selectedPublicProfile}
              mode="collaborator"
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
          {activeView === "activity" && (
            <AgreementActivityPage
              agreements={agreements}
              notifications={notifications}
              onOpenNotification={openNotification}
            />
          )}
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

function GlobalSearchResults({
  open,
  splitSheets,
  profiles,
  searchingProfiles,
  onOpenAgreement,
  onOpenProfile,
}: {
  open: boolean;
  splitSheets: SplitSheetSearchResult[];
  profiles: PublicProfileSearchResult[];
  searchingProfiles: boolean;
  onOpenAgreement: (agreementId: string) => void;
  onOpenProfile: (profile: PublicProfileSearchResult) => void;
}) {
  if (!open) return null;

  const hasResults = splitSheets.length > 0 || profiles.length > 0;

  return (
    <div
      className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-xl"
      role="listbox"
      aria-label="Search results"
      onMouseDown={(event) => event.preventDefault()}
    >
      {splitSheets.length > 0 && (
        <SearchSection title="Split sheets">
          {splitSheets.map((result) => (
            <button
              key={result.id}
              type="button"
              onMouseDown={() => onOpenAgreement(result.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{result.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {result.status} · {result.description}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          ))}
        </SearchSection>
      )}

      {(profiles.length > 0 || searchingProfiles) && (
        <SearchSection title="People">
          {profiles.map((profile) => (
            <button
              key={profile.userId || profile.username}
              type="button"
              onMouseDown={() => onOpenProfile(profile)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt=""
                  className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <UserRound className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{profile.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {profile.username ? `@${profile.username}` : "SPLIT profile"}
                  {profile.roleTags ? ` · ${profile.roleTags}` : ""}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          ))}
          {searchingProfiles && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching SPLIT users
            </div>
          )}
        </SearchSection>
      )}

      {!hasResults && !searchingProfiles && (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
          No split sheets or users found.
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-1">
      <p className="px-3 pb-1.5 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
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
  onOpenAgreement,
  onOpenMessages,
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
  onOpenAgreement: (agreementId: string) => void;
  onOpenMessages: (agreementId: string) => void;
  isMobile: boolean;
}) {
  const quickAccess = useMemo(() => buildQuickAccessMoments(agreements), [agreements]);

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

        <QuickAccessSection
          moments={quickAccess}
          onNew={onNew}
          onOpenAgreement={onOpenAgreement}
          onOpenMessages={onOpenMessages}
        />
      </div>
    </div>
  );
}

type QuickAccessMoment = {
  id: string;
  label: string;
  title: string;
  detail: string;
  meta: string;
  agreement: Agreement;
  icon: typeof MessageCircle;
  tone: string;
  action: "messages" | "agreement";
};

function buildQuickAccessMoments(agreements: Agreement[]) {
  const recent = [...agreements].sort((a, b) => agreementTimeValue(b) - agreementTimeValue(a));
  const continueAgreement =
    recent.find((agreement) => ["Pending Split Approval", "Pending Collaborator Acceptance", "Revision Requested", "Amended", "Disputed"].includes(agreement.status)) ??
    recent.find((agreement) => PENDING_SPLIT_STATUSES.includes(agreement.status)) ??
    recent[0];

  const primary = continueAgreement
    ? {
        id: `${continueAgreement.id}-continue`,
        label: continueAgreement.status === "Disputed" ? "Dispute thread" : "Continue negotiation",
        title: continueAgreement.title,
        detail: quickAccessDetail(continueAgreement),
        meta: formatAgreementActivityTime(continueAgreement),
        agreement: continueAgreement,
        icon: continueAgreement.status === "Disputed" ? AlertTriangle : MessageCircle,
        tone: continueAgreement.status === "Disputed" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        action: "messages" as const,
      }
    : null;

  const secondary: QuickAccessMoment[] = [];
  const signingAgreement = recent.find((agreement) => ["Ready to Sign", "Pending Signatures"].includes(agreement.status));
  const disputeAgreement = recent.find((agreement) => ["Disputed", "Revision Requested", "Amended"].includes(agreement.status));
  const signedAgreement = recent.find((agreement) => VERIFIED_SPLIT_STATUSES.includes(agreement.status));
  const draftAgreement = recent.find((agreement) => agreement.status === "Draft");

  if (signingAgreement) {
    secondary.push({
      id: `${signingAgreement.id}-signature`,
      label: "Ready for signature",
      title: signingAgreement.title,
      detail: "All approvals are in. Finish signatures to lock the record.",
      meta: formatAgreementActivityTime(signingAgreement),
      agreement: signingAgreement,
      icon: PenLine,
      tone: "bg-primary/10 text-primary",
      action: "messages",
    });
  }

  if (disputeAgreement && disputeAgreement.id !== signingAgreement?.id) {
    secondary.push({
      id: `${disputeAgreement.id}-dispute`,
      label: disputeAgreement.status === "Disputed" ? "Dispute updated" : "Revision requested",
      title: disputeAgreement.title,
      detail: "Review the latest notes before anyone signs.",
      meta: formatAgreementActivityTime(disputeAgreement),
      agreement: disputeAgreement,
      icon: AlertTriangle,
      tone: "bg-destructive/10 text-destructive",
      action: "messages",
    });
  }

  if (signedAgreement && secondary.length < 2) {
    secondary.push({
      id: `${signedAgreement.id}-signed`,
      label: "Recent signing",
      title: signedAgreement.title,
      detail: "Signed and stored in your split archive.",
      meta: formatAgreementActivityTime(signedAgreement),
      agreement: signedAgreement,
      icon: CheckCircle2,
      tone: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))]",
      action: "agreement",
    });
  }

  if (draftAgreement && secondary.length < 2) {
    secondary.push({
      id: `${draftAgreement.id}-draft`,
      label: "Recent draft",
      title: draftAgreement.title,
      detail: "Keep building this split sheet before invitations go out.",
      meta: formatAgreementActivityTime(draftAgreement),
      agreement: draftAgreement,
      icon: FileText,
      tone: "bg-secondary text-muted-foreground",
      action: "agreement",
    });
  }

  const fallbackAgreement = recent.find((agreement) => agreement.id !== primary?.agreement.id && !secondary.some((item) => item.agreement.id === agreement.id));

  if (fallbackAgreement && secondary.length < 2) {
    secondary.push({
      id: `${fallbackAgreement.id}-latest`,
      label: "Latest update",
      title: fallbackAgreement.title,
      detail: quickAccessDetail(fallbackAgreement),
      meta: formatAgreementActivityTime(fallbackAgreement),
      agreement: fallbackAgreement,
      icon: FileText,
      tone: "bg-primary/10 text-primary",
      action: "agreement",
    });
  }

  return { primary, secondary: secondary.slice(0, 2) };
}

function QuickAccessSection({
  moments,
  onNew,
  onOpenAgreement,
  onOpenMessages,
}: {
  moments: ReturnType<typeof buildQuickAccessMoments>;
  onNew: () => void;
  onOpenAgreement: (agreementId: string) => void;
  onOpenMessages: (agreementId: string) => void;
}) {
  const primary = moments.primary;

  return (
    <section className="mt-6 md:mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight md:text-lg">Quick access</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground md:text-sm">Jump back into active split moments.</p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="hidden rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-secondary md:inline-flex"
        >
          New SPLIT Sheet
        </button>
      </div>

      {!primary ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-7 text-center shadow-sm">
          <MessageCircle className="mx-auto h-5 w-5 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-bold">No active split moments yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
            Once you create, send, sign, or dispute a split sheet, SPLIT will keep the next useful action here.
          </p>
          <button
            type="button"
            onClick={onNew}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Create a split sheet
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
          <PrimaryQuickAccessCard
            moment={primary}
            onOpenAgreement={onOpenAgreement}
            onOpenMessages={onOpenMessages}
          />

          <div className="grid gap-4">
            {moments.secondary.map((moment) => (
              <SecondaryQuickAccessCard
                key={moment.id}
                moment={moment}
                onOpenAgreement={onOpenAgreement}
                onOpenMessages={onOpenMessages}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PrimaryQuickAccessCard({
  moment,
  onOpenAgreement,
  onOpenMessages,
}: {
  moment: QuickAccessMoment;
  onOpenAgreement: (agreementId: string) => void;
  onOpenMessages: (agreementId: string) => void;
}) {
  const Icon = moment.icon;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${moment.tone}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold text-foreground">{moment.label}</div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">{moment.meta}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenMessages(moment.agreement.id)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Open messages for ${moment.title}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <AgreementIcon type={moment.agreement.type} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold tracking-tight text-foreground">{moment.title}</h3>
            <StatusBadge status={moment.agreement.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <QuickPartyPills parties={moment.agreement.parties} />
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm leading-6 text-muted-foreground">{moment.detail}</p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => onOpenMessages(moment.agreement.id)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
          Open messages
        </button>
        <button
          type="button"
          onClick={() => onOpenAgreement(moment.agreement.id)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-primary transition-colors hover:bg-secondary"
        >
          <FileText className="h-4 w-4" />
          View split
        </button>
      </div>
    </div>
  );
}

function SecondaryQuickAccessCard({
  moment,
  onOpenAgreement,
  onOpenMessages,
}: {
  moment: QuickAccessMoment;
  onOpenAgreement: (agreementId: string) => void;
  onOpenMessages: (agreementId: string) => void;
}) {
  const Icon = moment.icon;
  const openMoment = () => {
    if (moment.action === "messages") {
      onOpenMessages(moment.agreement.id);
      return;
    }

    onOpenAgreement(moment.agreement.id);
  };

  return (
    <button
      type="button"
      onClick={openMoment}
      className="rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/20 hover:bg-secondary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${moment.tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-4">
        <div className="text-sm font-bold text-foreground">{moment.label}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-bold text-foreground">{moment.title}</span>
          <StatusBadge status={moment.agreement.status} />
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{moment.detail}</p>
        <div className="mt-3 text-[11px] font-medium text-muted-foreground">{moment.meta}</div>
      </div>
    </button>
  );
}

function QuickPartyPills({ parties }: { parties: string[] }) {
  const visibleParties = parties.filter(Boolean).slice(0, 3);
  const hiddenCount = Math.max(0, parties.length - visibleParties.length);

  return (
    <>
      {visibleParties.map((party) => (
        <span key={party} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background text-[9px] font-bold text-primary">
            {initialsForName(party)}
          </span>
          {party}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          +{hiddenCount}
        </span>
      )}
    </>
  );
}

function quickAccessDetail(agreement: Agreement) {
  const collaborator = agreement.parties[1] ?? agreement.parties[0] ?? "Collaborator";

  if (agreement.status === "Disputed") return `${collaborator} raised a dispute. Review the thread before a new split version is signed.`;
  if (agreement.status === "Revision Requested" || agreement.status === "Amended") return `${collaborator} requested changes. Open the negotiation to compare versions.`;
  if (agreement.status === "Ready to Sign" || agreement.status === "Pending Signatures") return "All approvals are in. Finish signatures to lock the record.";
  if (agreement.status === "Pending Collaborator Acceptance") return `${collaborator} still needs to accept the invite before the split can move forward.`;
  if (agreement.status === "Pending Split Approval") return `${collaborator} has a split proposal waiting for review in Messages.`;
  if (agreement.status === "Draft") return "Draft saved. Add collaborators when you are ready to send the split sheet.";
  if (VERIFIED_SPLIT_STATUSES.includes(agreement.status)) return "Signed and stored in your split archive.";

  return "Open this split sheet to review the latest status.";
}

function agreementTimeValue(agreement: Agreement) {
  const timestamp = Date.parse(agreement.updated || agreement.created);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatAgreementActivityTime(agreement: Agreement) {
  const timestamp = agreementTimeValue(agreement);
  if (!timestamp) return "Recently updated";

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= 0 && diffMs < minute) return "Just now";
  if (diffMs >= 0 && diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs >= 0 && diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs >= 0 && diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function initialsForName(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "SS";
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

function notificationPresentation(notification: SplitNotification): {
  icon: LucideIcon;
  tone: string;
  actionLabel: string;
} {
  const actionLabel = notification.actionTarget === "agreement"
    ? "View split"
    : notification.actionTarget === "activity"
      ? "View activity"
      : "Open messages";

  if (notification.eventType === "chat_message") {
    return { icon: MessageCircle, tone: "bg-primary/10 text-primary", actionLabel };
  }

  if (notification.eventType === "counter_offer") {
    return { icon: GitBranch, tone: "bg-[hsl(var(--split-amended)/0.12)] text-[hsl(var(--split-amended))]", actionLabel };
  }

  if (notification.eventType === "split_reject" || notification.eventType === "invite_decline") {
    return { icon: AlertTriangle, tone: "bg-destructive/10 text-destructive", actionLabel };
  }

  if (notification.eventType === "signature" || notification.eventType === "split_verified" || notification.eventType === "split_accept" || notification.eventType === "invite_accept") {
    return { icon: CheckCircle2, tone: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))]", actionLabel };
  }

  return { icon: FileText, tone: "bg-secondary text-primary", actionLabel };
}

function notificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotificationsPopover({
  notifications,
  loading,
  onViewAll,
  onOpenNotification,
  onMarkAllRead,
}: {
  notifications: SplitNotification[];
  loading: boolean;
  onViewAll: () => void;
  onOpenNotification: (notification: SplitNotification) => void;
  onMarkAllRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Open notifications" className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
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
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
              <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary">
                {unreadCount || notifications.length}
              </span>
            </div>
          </div>
        </div>

        <div className="max-h-[420px] space-y-2 overflow-y-auto px-3 py-3">
          {loading && notifications.length === 0 ? (
            <div className="rounded-lg border border-border bg-background px-4 py-6 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-foreground">Loading notifications</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center">
              <Bell className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Invites, approvals, signatures, disputes, and messages will show up here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const { icon: Icon, tone, actionLabel } = notificationPresentation(notification);
              return (
                <button
                  key={notification.id}
                  onClick={() => {
                    setOpen(false);
                    onOpenNotification(notification);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/25 hover:bg-secondary/50 ${
                    notification.readAt ? "border-border bg-background" : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block truncate text-sm font-semibold text-foreground">{notification.title}</span>
                      {!notification.readAt && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{notification.body}</span>
                    <span className="mt-1 block text-[11px] font-medium text-muted-foreground/80">{notificationTime(notification.createdAt)}</span>
                  </span>
                  <span className="inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">
                    <span className="hidden sm:inline">{actionLabel}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })
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
  notifications,
  onOpenNotification,
}: {
  agreements: Agreement[];
  notifications: SplitNotification[];
  onOpenNotification: (notification: SplitNotification) => void;
}) {
  const priorityItems = notifications.filter((notification) => !notification.readAt);
  const executedItems = notifications.filter((notification) => ["signature", "split_verified"].includes(notification.eventType));
  const needsAction = priorityItems.length;
  const executed = executedItems.length;

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
                  priorityItems.map((notification) => {
                    const { icon: Icon, tone, actionLabel } = notificationPresentation(notification);
                    return (
                    <div key={notification.id} className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{notification.title}</div>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                      </div>
                      <button
                        onClick={() => onOpenNotification(notification)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary"
                      >
                        {actionLabel}
                      </button>
                    </div>
                    );
                  })
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
                executedItems.map((notification) => {
                  const { icon: Icon, tone, actionLabel } = notificationPresentation(notification);
                  return (
                  <div key={notification.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-bold">{notification.title}</div>
                          <span className="text-[11px] font-medium text-muted-foreground">{notificationTime(notification.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenNotification(notification)}
                      className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      {actionLabel}
                    </button>
                  </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold">Activity Inbox</h2>
            <span className="text-xs font-medium text-muted-foreground">{notifications.length} total updates</span>
          </div>

          <div className="divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-8">
                <ActivityEmptyState label="No activity yet" />
              </div>
            ) : notifications.map((notification) => {
              const { icon: Icon, tone, actionLabel } = notificationPresentation(notification);
              const agreement = agreements.find((item) => item.id === notification.splitSheetId);

              return (
                <div key={notification.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{notification.title}</h3>
                        {!notification.readAt && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">New</span>}
                        <span className="text-[11px] font-medium text-muted-foreground">{notificationTime(notification.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.body}</p>
                      {agreement && (
                        <p className="mt-1 text-xs font-medium text-foreground">
                          Related split sheet: <span className="text-primary">{agreement.title}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenNotification(notification)}
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
        SPLIT will show invites, signatures, disputes, and messages here as they happen.
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
