import React, { useMemo, useState } from "react";
import splitLogo from "@/assets/split-logo.png";
import UserProfileSheet from "@/components/UserProfileSheet";
import ProfilePage from "@/components/ProfilePage";
import { UserProfile } from "@/components/AccountAccess";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import AgreementsList from "@/components/AgreementsList";
import AgreementDetail from "@/components/AgreementDetail";
import ContractBuilder from "@/components/contract-builder/ContractBuilder";
import CollaborationView from "@/components/CollaborationView";
import AgreementAnalytics from "@/components/AgreementAnalytics";
import SettingsPage from "@/components/SettingsPage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  FileText,
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Plus,
  Shield,
  BarChart3,
  Menu,
  X,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  FilePenLine,
} from "lucide-react";

export type Agreement = {
  id: string;
  title: string;
  type: "Split Sheet";
  status: "Draft" | "Pending Signatures" | "Executed" | "Amended" | "Disputed";
  parties: string[];
  version: number;
  created: string;
  updated: string;
  splits: { name: string; role: string; percent: number }[];
  document?: StoredSplitSheetDocument;
};

const GENERATED_DOCUMENTS_KEY = "split.generatedDocuments.v1";

const MOCK_AGREEMENTS: Agreement[] = [
  {
    id: "agr-001",
    title: "Moonlight Sessions Split Sheet",
    type: "Split Sheet",
    status: "Executed",
    parties: ["Jordan Rivers", "Marcus Webb", "Nova Thomas"],
    version: 3,
    created: "2024-11-02",
    updated: "2025-01-14",
    splits: [
      { name: "Jordan Rivers", role: "Songwriter", percent: 45 },
      { name: "Marcus Webb", role: "Composer", percent: 40 },
      { name: "Nova Thomas", role: "Topliner", percent: 15 },
    ],
  },
  {
    id: "agr-002",
    title: "Frequency Split Sheet",
    type: "Split Sheet",
    status: "Pending Signatures",
    parties: ["Aisha Nkosi", "DJ Phantom"],
    version: 1,
    created: "2025-02-01",
    updated: "2025-02-10",
    splits: [
      { name: "Aisha Nkosi", role: "Songwriter", percent: 60 },
      { name: "DJ Phantom", role: "Composer", percent: 40 },
    ],
  },
  {
    id: "agr-003",
    title: "Depth Charge Split Sheet",
    type: "Split Sheet",
    status: "Draft",
    parties: ["Elara Sound", "T-Knox"],
    version: 2,
    created: "2025-01-20",
    updated: "2025-02-05",
    splits: [
      { name: "Elara Sound", role: "Songwriter", percent: 60 },
      { name: "T-Knox", role: "Beatmaker", percent: 40 },
    ],
  },
  {
    id: "agr-004",
    title: "Silhouette Split Sheet",
    type: "Split Sheet",
    status: "Amended",
    parties: ["Sofia Vega", "Ray Chen", "Lydia Voss"],
    version: 4,
    created: "2024-08-15",
    updated: "2025-02-18",
    splits: [
      { name: "Sofia Vega", role: "Composer", percent: 25 },
      { name: "Ray Chen", role: "Songwriter", percent: 40 },
      { name: "Lydia Voss", role: "Lyricist", percent: 35 },
    ],
  },
  {
    id: "agr-005",
    title: "Vapour Trails Split Sheet",
    type: "Split Sheet",
    status: "Executed",
    parties: ["KAEL", "Prim Audio"],
    version: 1,
    created: "2025-02-12",
    updated: "2025-02-12",
    splits: [
      { name: "KAEL", role: "Songwriter", percent: 60 },
      { name: "Prim Audio", role: "Composer", percent: 40 },
    ],
  },
];

function isStoredSplitSheetDocument(value: unknown): value is StoredSplitSheetDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as StoredSplitSheetDocument;
  return Boolean(candidate.id && candidate.data && Array.isArray(candidate.data.parties));
}

function loadGeneratedDocuments(): StoredSplitSheetDocument[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(GENERATED_DOCUMENTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isStoredSplitSheetDocument) : [];
  } catch {
    return [];
  }
}

function documentPartyName(party: StoredSplitSheetDocument["data"]["parties"][number]) {
  return party.professionalName || party.legalName || party.email || party.phoneNumber || party.splitId || "Invited writer";
}

function documentToAgreement(document: StoredSplitSheetDocument): Agreement {
  const parties = Array.isArray(document.data.parties) ? document.data.parties : [];
  const created = document.createdAt || new Date().toISOString();
  const updated = document.updatedAt || created;

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
    document,
  };
}

type View = "dashboard" | "agreements" | "new-agreement" | "parties" | "settings" | "collaboration" | "analytics" | "profile" | "activity";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agreements", label: "Split Sheets", icon: FileText },
  { id: "collaboration", label: "Review Room", icon: FilePenLine },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "parties", label: "Parties", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const AGREEMENT_NOTIFICATIONS = [
  {
    id: "notif-001",
    type: "executed",
    title: "Moonlight Sessions executed",
    detail: "All writers signed version 3. PRO/MLC export packet is ready.",
    time: "12 min ago",
    agreementId: "agr-001",
    actionLabel: "Open executed split sheet",
    icon: CheckCircle2,
    tone: "text-[hsl(var(--split-verified))] bg-[hsl(var(--split-verified)/0.1)]",
  },
  {
    id: "notif-002",
    type: "amendment",
    title: "Amendment proposed",
    detail: "Aisha Nkosi proposed a writer share change on Frequency.",
    time: "1 hr ago",
    agreementId: "agr-002",
    actionLabel: "Review amendment",
    icon: FilePenLine,
    tone: "text-[hsl(var(--split-amended))] bg-[hsl(var(--split-amended)/0.1)]",
  },
  {
    id: "notif-003",
    type: "dispute",
    title: "Split sheet disputed",
    detail: "T-Knox disputed the composition share on Depth Charge.",
    time: "Yesterday",
    agreementId: "agr-003",
    actionLabel: "Open dispute",
    icon: AlertTriangle,
    tone: "text-[hsl(var(--split-pending))] bg-[hsl(var(--split-pending)/0.12)]",
  },
  {
    id: "notif-004",
    type: "received",
    title: "New split sheet received",
    detail: "Sofia Vega sent you a song ownership split sheet.",
    time: "2 days ago",
    agreementId: "agr-004",
    actionLabel: "Review split sheet",
    icon: FileText,
    tone: "text-primary bg-primary/10",
  },
];

export default function Dashboard({
  userProfile,
  onUpdateProfile,
  onOpenAccountCreation,
}: {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenAccountCreation: () => void;
}) {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [isNewAgreement, setIsNewAgreement] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<StoredSplitSheetDocument[]>(loadGeneratedDocuments);
  const isMobile = useIsMobile();

  const agreements = useMemo(
    () => [...generatedDocuments.map(documentToAgreement), ...MOCK_AGREEMENTS],
    [generatedDocuments],
  );

  const saveGeneratedDocument = (document: StoredSplitSheetDocument) => {
    setGeneratedDocuments((current) => {
      const exists = current.some((item) => item.id === document.id);
      const next = exists
        ? current.map((item) => (item.id === document.id ? document : item))
        : [document, ...current];

      window.localStorage.setItem(GENERATED_DOCUMENTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const executed = agreements.filter((a) => a.status === "Executed").length;
  const pending = agreements.filter((a) => a.status === "Pending Signatures").length;
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
        onStoreDocument={saveGeneratedDocument}
        onSendDocument={saveGeneratedDocument}
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
          <AgreementDetail agreement={selectedAgreement} />
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
          <NotificationsPopover onViewAll={() => setActiveView("activity")} />
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
              onSelectAgreement={(a) => {
                setSelectedAgreement(a);
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
              />
            ) : (
              <div className="h-full flex">
                <AgreementsList
                  agreements={agreements}
                  selected={selectedAgreement}
                  onSelect={setSelectedAgreement}
                  onNew={() => setIsNewAgreement(true)}
                />
                <div className="flex-1 min-w-0 overflow-y-auto bg-background">
                  {selectedAgreement ? (
                    <AgreementDetail agreement={selectedAgreement} />
                  ) : (
                    <EmptyDetail onNew={() => setIsNewAgreement(true)} />
                  )}
                </div>
              </div>
            )
          )}
          {activeView === "collaboration" && <CollaborationView />}
          {activeView === "analytics" && <AgreementAnalytics />}
          {activeView === "parties" && <ComingSoon label="Parties" />}
          {activeView === "settings" && <SettingsPage />}
          {activeView === "profile" && <ProfilePage userProfile={userProfile} onUpdateProfile={onUpdateProfile} />}
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
  onSelectAgreement,
  onNew,
  isMobile,
}: {
  agreements: Agreement[];
  executed: number;
  pending: number;
  drafts: number;
  onSelectAgreement: (a: Agreement) => void;
  onNew: () => void;
  isMobile: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={`max-w-5xl mx-auto ${isMobile ? "px-4 py-5" : "px-8 py-8"}`}>
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Manage song ownership split sheets and registration metadata.</p>
          </div>
        </div>

        <div className={`grid ${isMobile ? "grid-cols-3 gap-2" : "grid-cols-3 gap-4"} mb-6 md:mb-8`}>
          <StatCard label="Executed" value={executed} accent="verified" compact={isMobile} />
          <StatCard label="Pending" value={pending} accent="pending" compact={isMobile} />
          <StatCard label="Drafts" value={drafts} accent="draft" compact={isMobile} />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Split Sheets</h2>
          <button className="text-xs text-primary hover:underline font-medium">View all</button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {agreements.slice(0, 4).map((agr, i) => (
            <button
              key={agr.id}
              onClick={() => onSelectAgreement(agr)}
              className={`w-full flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 md:py-4 text-left hover:bg-secondary/40 transition-colors ${
                i < agreements.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <AgreementIcon type={agr.type} />
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-foreground truncate">{agr.title}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">
                  {isMobile ? agr.parties.slice(0, 1).join(", ") + (agr.parties.length > 1 ? ` +${agr.parties.length - 1}` : "") : agr.parties.join(", ")} · v{agr.version}
                </div>
              </div>
              <StatusBadge status={agr.status} />
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 hidden md:block" />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, accent, compact }: { label: string; value: number; accent: "verified" | "pending" | "draft"; compact?: boolean }) {
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
    <div className={`rounded-xl border border-border ${compact ? "p-3" : "p-5"} ${bgs[accent]}`}>
      <div className={`${compact ? "text-2xl" : "text-3xl"} font-bold tabular-nums ${accents[accent]}`}>{value}</div>
      <div className={`${compact ? "text-[10px]" : "text-xs"} text-muted-foreground mt-1 font-medium`}>{label}</div>
    </div>
  );
}

function NotificationsPopover({ onViewAll }: { onViewAll: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">Split Sheet Updates</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Sent, received, disputed, executed, and registration activity.</p>
            </div>
            <span className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary">
              {AGREEMENT_NOTIFICATIONS.length} updates
            </span>
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {AGREEMENT_NOTIFICATIONS.map(({ id, title, detail, time, icon: Icon, tone }) => (
            <button key={id} className="flex w-full gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-secondary/60">
              <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{detail}</span>
                <span className="mt-1 block text-[11px] font-medium text-muted-foreground/80">{time}</span>
              </span>
            </button>
          ))}
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
                {priorityItems.map(({ id, title, detail, agreementId, actionLabel, icon: Icon, tone }) => (
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
                ))}
              </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--split-verified))]">Recently Executed</p>
                <h2 className="mt-2 text-lg font-bold">Signed split sheets</h2>
              </div>
              <span className="inline-flex h-8 items-center rounded-full bg-[hsl(var(--split-verified)/0.12)] px-3 text-sm font-bold text-[hsl(var(--split-verified))]">
                {executed}
              </span>
            </div>

            <div className="space-y-3">
              {executedItems.map(({ id, title, detail, agreementId, actionLabel, icon: Icon, tone, time }) => (
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
              ))}
            </div>
          </section>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold">Activity Inbox</h2>
            <span className="text-xs font-medium text-muted-foreground">{AGREEMENT_NOTIFICATIONS.length} total updates</span>
          </div>

          <div className="divide-y divide-border">
            {AGREEMENT_NOTIFICATIONS.map(({ id, title, detail, time, agreementId, actionLabel, icon: Icon, tone }) => {
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

export function StatusBadge({ status }: { status: Agreement["status"] }) {
  const styles: Record<Agreement["status"], string> = {
    Executed: "bg-[hsl(var(--split-verified)/0.12)] text-[hsl(var(--split-verified))] border-[hsl(var(--split-verified)/0.25)]",
    "Pending Signatures": "bg-[hsl(var(--split-pending)/0.12)] text-[hsl(var(--split-pending))] border-[hsl(var(--split-pending)/0.25)]",
    Draft: "bg-secondary text-muted-foreground border-border",
    Amended: "bg-[hsl(var(--split-amended)/0.12)] text-[hsl(var(--split-amended))] border-[hsl(var(--split-amended)/0.25)]",
    Disputed: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 md:px-2.5 py-0.5 text-[10px] md:text-[11px] font-semibold whitespace-nowrap ${styles[status]}`}>
      {status === "Executed" && <span className="mr-1 md:mr-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--split-verified))] inline-block" />}
      {status}
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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{label}</h3>
      <p className="text-xs text-muted-foreground mt-1.5">Coming soon.</p>
    </div>
  );
}
