import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import splitLightLockup from "@/assets/split-light-lockup.png";
import WorkspaceOverview from "@/components/WorkspaceOverview";
import { workspaceInitials } from "@/lib/workspaceOverview";
import ProfilePage from "@/components/ProfilePage";
import CreatorProfileView from "@/components/CreatorProfileView";
import { createEmptyProfile, type UserProfile } from "@/lib/userProfile";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import AgreementsList from "@/components/AgreementsList";
import { INITIAL_LIBRARY_VIEW, type LibraryPosition, type LibraryView } from "@/lib/splitLibrary";
import AgreementDetail from "@/components/AgreementDetail";
import AccountContractBuilder from "@/components/contract-builder/AccountContractBuilder";
import CollaborationView from "@/components/CollaborationView";
import SettingsPage from "@/components/SettingsPage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useContentEntrance } from "@/hooks/use-content-entrance";
import {
  searchPublicProfiles,
  searchSplitSheets,
  type PublicProfileSearchResult,
  type SplitSheetSearchResult,
} from "@/lib/globalSearch";
import { documentToAgreement, type Agreement } from "@/lib/splitSheetAgreement";
import { getSplitWorkflowLabel, VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";
import {
  buildDashboardNotificationGroups,
  getDashboardNotificationPresentation,
  type DashboardNotificationIconKey,
  type DashboardNotificationToneKey,
} from "@/lib/dashboardNotifications";
import {
  loadSplitSheetDocuments,
  documentBelongsToProfile,
  deleteSplitSheetDraft,
  cacheLocalSplitSheetDocuments,
  saveSplitSheetDocument,
  saveSplitSheetParticipantAction,
  splitSheetCanUseLocalDraftFallback,
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
import { buildRecentCollaboratorSuggestions } from "@/lib/collaboratorSuggestions";
import { toast } from "sonner";
import {
  FileText,
  LayoutDashboard,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Plus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Loader2,
  LogOut,
  UserRound,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

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
  { id: "collaboration", label: "Messages", icon: MessageCircle },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export default function Dashboard({
  userProfile,
  activeAuthUserId,
  onUpdateProfile,
  onOpenAccountCreation,
  onViewOnboardingAgain,
  onSignOut,
  signingOut = false,
}: {
  userProfile: UserProfile;
  activeAuthUserId?: string | null;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onOpenAccountCreation: () => void;
  onViewOnboardingAgain?: () => void;
  onSignOut?: () => Promise<void>;
  signingOut?: boolean;
}) {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [selectedMessageDealId, setSelectedMessageDealId] = useState<string | undefined>();
  const [libraryView, setLibraryView] = useState<LibraryView>(INITIAL_LIBRARY_VIEW);
  const libraryPosition = useRef<LibraryPosition>({ top: 0, focusId: null });
  const [isNewAgreement, setIsNewAgreement] = useState(false);
  const [draftToEdit, setDraftToEdit] = useState<StoredSplitSheetDocument | undefined>();
  const [generatedDocuments, setGeneratedDocuments] = useState<StoredSplitSheetDocument[]>([]);
  const [loadingSplitSheets, setLoadingSplitSheets] = useState(true);
  const [splitSheetLoadError, setSplitSheetLoadError] = useState(false);
  const [reloadSplitSheets, setReloadSplitSheets] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileSearchResults, setProfileSearchResults] = useState<PublicProfileSearchResult[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [selectedPublicProfile, setSelectedPublicProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<SplitNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const localStorageOwner = splitSheetLocalStorageOwnerForAuthUser(activeAuthUserId);
  const activeAccountKey = localStorageOwner
    ?? `profile:${userProfile.emailAddress || userProfile.username || "anonymous"}`;
  const notificationAccountKey = activeAuthUserId ?? activeAccountKey;
  const lastDocumentAccountKeyRef = useRef(activeAccountKey);
  const deletedDraftIds = useRef(new Set<string>());
  const documentLoadGeneration = useRef(0);
  const lastNotificationAccountKeyRef = useRef(notificationAccountKey);

  const agreements = useMemo(() => generatedDocuments.map(documentToAgreement), [generatedDocuments]);
  const recentCollaborators = useMemo(
    () => buildRecentCollaboratorSuggestions(generatedDocuments, userProfile),
    [generatedDocuments, userProfile],
  );
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

    if (lastDocumentAccountKeyRef.current !== activeAccountKey) {
      lastDocumentAccountKeyRef.current = activeAccountKey;
      deletedDraftIds.current.clear();
      setGeneratedDocuments([]);
      setSelectedAgreement(null);
      setLibraryView(INITIAL_LIBRARY_VIEW);
      libraryPosition.current = { top: 0, focusId: null };
      setSelectedMessageDealId(undefined);
      setSplitSheetLoadError(false);
      setLoadingSplitSheets(true);
    }

    async function loadDocuments(showLoading = true) {
      const generation = ++documentLoadGeneration.current;
      if (showLoading) setLoadingSplitSheets(true);
      let loadFailed = false;
      const results = await loadSplitSheetDocuments(userProfile, () => { loadFailed = true; });
      if (!active || generation !== documentLoadGeneration.current) return;

      // A refresh started before deletion may still return the removed draft.
      const documents = results.map((result) => result.document).filter((document) => !deletedDraftIds.current.has(document.id));
      setSplitSheetLoadError(loadFailed);
      setGeneratedDocuments((current) => loadFailed && current.length ? current : documents);
      if (!loadFailed) cacheLocalSplitSheetDocuments(documents.filter(splitSheetCanUseLocalDraftFallback), localStorageOwner);
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
  }, [activeAccountKey, userProfile, localStorageOwner, reloadSplitSheets]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => undefined;

    if (lastNotificationAccountKeyRef.current !== notificationAccountKey) {
      lastNotificationAccountKeyRef.current = notificationAccountKey;
      setNotifications([]);
    }

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
  }, [activeAuthUserId, notificationAccountKey, refreshNotifications, upsertNotification]);

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
    documentLoadGeneration.current++;
    setLoadingSplitSheets(false);
    setGeneratedDocuments((current) => {
      const exists = current.some((item) => item.id === document.id);
      const next = exists
        ? current.map((item) => (item.id === document.id ? document : item))
        : [document, ...current];

      cacheLocalSplitSheetDocuments(next.filter(splitSheetCanUseLocalDraftFallback), localStorageOwner);
      return next;
    });
  };

  const persistGeneratedDocument = async (document: StoredSplitSheetDocument, mode: SplitSheetSaveMode) => {
    const result = await saveSplitSheetDocument(document, mode, userProfile);
    applyGeneratedDocument(result.document);
    void refreshNotifications(false);
    return result;
  };

  const deleteDraft = async (document: StoredSplitSheetDocument) => {
    await deleteSplitSheetDraft(document, userProfile);
    documentLoadGeneration.current++;
    setLoadingSplitSheets(false);
    deletedDraftIds.current.add(document.id);
    setGeneratedDocuments((current) => current.filter((item) => item.id !== document.id));
    setSelectedAgreement(null);
    setDraftToEdit(undefined);
    setIsNewAgreement(false);
    setSelectedMessageDealId(undefined);
    setActiveView("agreements");
    clearSearch();
  };

  const updateGeneratedDocument = async (document: StoredSplitSheetDocument, context: SplitSheetUpdateContext = {}) => {
    const requiresRemoteConfirmation = Boolean(context.action) ||
      !splitSheetCanUseLocalDraftFallback(document);
    const persisted = requiresRemoteConfirmation
      ? await saveSplitSheetParticipantAction(document, context, userProfile)
      : await saveSplitSheetDocument(document, "update", userProfile);

    applyGeneratedDocument(persisted.document);
    setSelectedAgreement(documentToAgreement(persisted.document));
    void refreshNotifications(false);
    if (!persisted.persisted) {
      toast.warning("Saved locally", {
        description: "The backend did not confirm this split-sheet update yet.",
      });
    }
    return persisted.document;
  };

  const openAgreement = (agreementId: string) => {
    const agreement = agreements.find((item) => item.id === agreementId);

    if (agreement) {
      setSelectedAgreement(agreement);
      setActiveView("agreements");
    }
  };

  const editDraft = (agreementId: string) => {
    const draft = generatedDocuments.find((item) => item.id === agreementId);
    if (!draft || draft.status !== "Draft" || draft.sentAt || !documentBelongsToProfile(draft, userProfile)) return;
    setSelectedAgreement(documentToAgreement(draft));
    setActiveView("agreements");
    setDraftToEdit(draft);
    setIsNewAgreement(true);
  };

  const openDealMessages = (agreementId: string) => {
    setSelectedMessageDealId(agreementId);
    setActiveView("collaboration");
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
    clearSearch();
  };

  const contentKey = activeView === "agreements" && selectedAgreement
    ? `agreements:${selectedAgreement.id}`
    : activeView;
  const contentRef = useContentEntrance<HTMLElement>(
    contentKey,
    activeView === "agreements" ? (selectedAgreement ? "preview" : "back") : "page",
  );

  const goToDashboard = () => {
    setIsNewAgreement(false);
    setDraftToEdit(undefined);
    setActiveView("dashboard");
    setSelectedAgreement(null);
    setSelectedMessageDealId(undefined);
    clearSearch();
  };

  const startNewAgreement = () => {
    setDraftToEdit(undefined);
    setIsNewAgreement(true);
  };

  if (isNewAgreement) {
    return (
      <AccountContractBuilder
        key={`${activeAuthUserId ?? userProfile.authUserId ?? "local"}:${draftToEdit?.id ?? "new"}`}
        accountId={activeAuthUserId}
        initialDocument={draftToEdit}
        userProfile={userProfile}
        onBack={() => { setIsNewAgreement(false); setDraftToEdit(undefined); }}
        onHome={goToDashboard}
        onStoreDocument={(document) => persistGeneratedDocument(document, "draft")}
        onSendDocument={(document) => persistGeneratedDocument(document, "send")}
        onDeleteDocument={deleteDraft}
        onComplete={(document, mode) => {
          setIsNewAgreement(false);
          setDraftToEdit(undefined);
          setSelectedAgreement(mode === "draft" && draftToEdit ? documentToAgreement(document) : null);
          if (mode === "send") openDealMessages(document.id);
          else {
            if (!draftToEdit) {
              setLibraryView({ ...INITIAL_LIBRARY_VIEW, filter: "Draft" });
              libraryPosition.current = { top: 0, focusId: null };
            }
            setActiveView("agreements");
          }
        }}
        recentCollaborators={recentCollaborators}
      />
    );
  }

  return (
    <div className="workspace-shell">
        <header className="workspace-header safe-top">
          <button type="button" aria-label="Go to Dashboard" onClick={goToDashboard} className="workspace-brand">
            <img src={splitLightLockup} alt="SPLIT" width="166" height="48" />
          </button>
          <nav className="workspace-navigation" aria-label="Main navigation">
            <TooltipProvider delayDuration={300}>
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button aria-label={label} aria-current={activeView === id ? "page" : undefined} className={activeView === id ? "active" : ""}
                      onClick={() => {
                        setActiveView(id);
                        setSelectedAgreement(null);
                        setSelectedMessageDealId(undefined);
                        clearSearch();
                      }}>
                      <Icon size={20} aria-hidden="true" /><span>{label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{label}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </nav>
          <div className="workspace-header-search">
            <div className="workspace-global-search" onFocus={() => setSearchFocused(true)} onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchFocused(false);
            }}>
              <Search size={18} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(event) => { if (event.key === "Escape") clearSearch(); }}
                placeholder="Search SPLIT"
                aria-label="Search split sheets or users"
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
          <div className="workspace-header-tools">
            <NotificationsPopover
              notifications={notifications}
              loading={loadingNotifications}
              onViewAll={() => setActiveView("activity")}
              onOpenNotification={openNotification}
              onMarkAllRead={markAllNotificationsRead}
            />
            <Popover open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
              <PopoverTrigger asChild>
                <button className="workspace-profile-button" aria-label="Open account menu" title="Your account">
                  {userProfile.profileImageUrl
                    ? <img src={userProfile.profileImageUrl} alt="" />
                    : workspaceInitials(userProfile.displayName || userProfile.username || "SPLIT")}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="border-b border-border px-3 py-3 mb-1 text-sm font-bold break-words">{userProfile.displayName || userProfile.username || "Your account"}</div>
                <button type="button" disabled={signingOut} onClick={() => { setAccountMenuOpen(false); setActiveView("profile"); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-secondary disabled:opacity-50"><UserRound size={16} />Your Profile</button>
                <button type="button" disabled={signingOut} onClick={() => { setAccountMenuOpen(false); onOpenAccountCreation(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-secondary disabled:opacity-50"><Settings size={16} />Account Setup</button>
                {onSignOut && <div className="mt-1 border-t border-border pt-1">
                  <button type="button" disabled={signingOut} aria-busy={signingOut} onClick={() => void onSignOut()} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-secondary disabled:opacity-50">
                    {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>}
              </PopoverContent>
            </Popover>
            <button onClick={startNewAgreement} className="workspace-action primary workspace-header-new" aria-label="New SPLIT" title="New SPLIT">
              <Plus size={20} /><span>New SPLIT</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main ref={contentRef} className="workspace-content safe-bottom">
          {activeView === "dashboard" && (
            <WorkspaceOverview
              key={activeAccountKey}
              agreements={agreements}
              userProfile={userProfile}
              notifications={notifications}
              loading={loadingSplitSheets}
              loadError={splitSheetLoadError}
              onRetry={() => setReloadSplitSheets((current) => current + 1)}
              onNew={startNewAgreement}
              onOpenAgreement={openAgreement}
              onOpenMessages={openDealMessages}
              onOpenNotification={openNotification}
              onViewActivity={() => setActiveView("activity")}
            />
          )}
          {activeView === "agreements" && (
            selectedAgreement ? (
              <div className="library-preview">
                <div className="library-preview-back">
                  <button type="button" autoFocus aria-label="Back to split sheets" onClick={() => setSelectedAgreement(null)}>
                    <ArrowLeft size={16} aria-hidden="true" />Back to Split Sheets
                  </button>
                </div>
                <div className="library-preview-body">
                  <AgreementDetail key={selectedAgreement.id} agreement={selectedAgreement} viewerProfile={userProfile} onOpenMessages={openDealMessages} onDeleteDraft={deleteDraft} onEditDraft={editDraft} />
                </div>
              </div>
            ) : (
              <AgreementsList
                agreements={agreements}
                onSelect={(agreement) => openAgreement(agreement.id)}
                onNew={startNewAgreement}
                view={libraryView}
                onViewChange={setLibraryView}
                scrollPosition={libraryPosition}
                loading={loadingSplitSheets}
                loadError={splitSheetLoadError}
                onRetry={() => setReloadSplitSheets((current) => current + 1)}
              />
            )
          )}
          {activeView === "collaboration" && (
            <CollaborationView
              documents={generatedDocuments}
              userProfile={userProfile}
              initialDealId={selectedMessageDealId}
              onUpdateDocument={updateGeneratedDocument}
              onReloadDocuments={() => setReloadSplitSheets(current => current + 1)}
              reloading={loadingSplitSheets}
              onOpenAgreement={openAgreement}
            />
          )}
          {activeView === "settings" && <SettingsPage userProfile={userProfile} onViewOnboardingAgain={onViewOnboardingAgain} />}
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
              onClick={() => onOpenAgreement(result.id)}
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
              onClick={() => onOpenProfile(profile)}
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

function notificationPresentation(notification: SplitNotification): {
  icon: LucideIcon;
  tone: string;
  actionLabel: string;
} {
  const iconByKey: Record<DashboardNotificationIconKey, LucideIcon> = {
    alert: AlertTriangle,
    check: CheckCircle2,
    counter: GitBranch,
    file: FileText,
    message: MessageCircle,
  };
  const toneByKey: Record<DashboardNotificationToneKey, string> = {
    amended: "bg-[hsl(var(--split-amended)/0.12)] text-[hsl(var(--split-amended))]",
    danger: "bg-destructive/10 text-destructive",
    default: "bg-secondary text-primary",
    primary: "bg-primary/10 text-primary",
    verified: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))]",
  };
  const presentation = getDashboardNotificationPresentation(notification);

  return {
    icon: iconByKey[presentation.iconKey],
    tone: toneByKey[presentation.toneKey],
    actionLabel: presentation.actionLabel,
  };
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
        <button aria-label="Open notifications" className="split-press relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
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
  const { priorityItems, executedItems, needsAction, executed } = buildDashboardNotificationGroups(notifications);

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

export function StatusBadge({ status, inviteDeclined }: { status: Agreement["status"]; inviteDeclined?: boolean }) {
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
  const workflowLabel = inviteDeclined ? "Invite declined" : getSplitWorkflowLabel(status);
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
