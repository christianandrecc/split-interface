import { useState } from "react";
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
import {
  type DealParticipant,
  type NegotiationDeal,
  type NegotiationMessage,
  type SplitAllocation,
  type SplitVersion,
} from "@/types/negotiation";

const currentUserId = "current-user";

export default function CollaborationView() {
  const [deals, setDeals] = useState<NegotiationDeal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [composerText, setComposerText] = useState("");
  const [counterPercent, setCounterPercent] = useState("40");
  const [counterOpen, setCounterOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) ?? deals[0] ?? null;

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

  const currentVersion = selectedDeal.splitVersions.find((version) => version.id === selectedDeal.currentVersionId) ?? selectedDeal.splitVersions.at(-1);
  const currentUser = selectedDeal.participants.find((participant) => participant.id === currentUserId) ?? selectedDeal.participants[0];
  const acceptedCount = selectedDeal.acceptedBy.length;
  const readyToSign = selectedDeal.status === "ready_to_sign" || acceptedCount >= selectedDeal.requiredSignerIds.length;

  const updateSelectedDeal = (updater: (deal: NegotiationDeal) => NegotiationDeal) => {
    setDeals((currentDeals) => currentDeals.map((deal) => (deal.id === selectedDeal.id ? updater(deal) : deal)));
  };

  const sendTextMessage = () => {
    const body = composerText.trim();
    if (!body) return;

    updateSelectedDeal((deal) => ({
      ...deal,
      unreadCount: 0,
      updatedAt: "Now",
      messages: [
        ...deal.messages,
        {
          id: makeId("text"),
          type: "text",
          senderId: currentUserId,
          createdAt: "Now",
          body,
        },
      ],
    }));
    setComposerText("");
  };

  const createCounterOffer = () => {
    if (!currentVersion || !currentUser) return;

    const nextPercent = clampPercent(Number(counterPercent) || 0);
    const allocations = rebalanceAllocations(currentVersion.allocations, currentUser.id, nextPercent);
    const messageId = makeId("counter");
    const splitVersion: SplitVersion = {
      ...currentVersion,
      id: makeId("split"),
      version: selectedDeal.splitVersions.length + 1,
      title: `${currentUser.name} counter`,
      createdAt: "Now",
      createdBy: currentUserId,
      originatingMessageId: messageId,
      note: `${currentUser.name} countered with ${formatAllocationSummary(allocations)}.`,
      allocations,
      revenueStreams: currentVersion.revenueStreams.map((stream) =>
        stream.id === "composition" ? { ...stream, status: "Needs consensus" } : stream,
      ),
    };
    const message: NegotiationMessage = {
      id: messageId,
      type: "counter",
      senderId: currentUserId,
      createdAt: "Now",
      body: `${currentUser.name} countered with ${formatAllocationSummary(allocations)}.`,
      proposedSplitId: splitVersion.id,
    };

    updateSelectedDeal((deal) => ({
      ...deal,
      status: "negotiating",
      currentVersionId: splitVersion.id,
      acceptedBy: [],
      updatedAt: "Now",
      splitVersions: [...deal.splitVersions, splitVersion],
      messages: [...deal.messages, message],
    }));
    setCounterOpen(false);
  };

  const respondToProposal = (message: NegotiationMessage, response: "accept" | "reject") => {
    updateSelectedDeal((deal) => {
      const acceptedBy = response === "accept"
        ? Array.from(new Set([...deal.acceptedBy, currentUserId]))
        : deal.acceptedBy.filter((id) => id !== currentUserId);
      const allAccepted = acceptedBy.length >= deal.requiredSignerIds.length;

      return {
        ...deal,
        status: allAccepted ? "ready_to_sign" : response === "reject" ? "negotiating" : deal.status,
        acceptedBy,
        updatedAt: "Now",
        messages: [
          ...deal.messages,
          {
            id: makeId(response),
            type: response,
            senderId: currentUserId,
            createdAt: "Now",
            body: response === "accept" ? `${currentUser.name} accepted this split version.` : `${currentUser.name} rejected this split version.`,
            proposedSplitId: message.proposedSplitId,
            respondsToMessageId: message.id,
          },
        ],
      };
    });
  };

  const signDeal = () => {
    updateSelectedDeal((deal) => ({
      ...deal,
      status: "signed",
      updatedAt: "Now",
      messages: [
        ...deal.messages,
        {
          id: makeId("signed"),
          type: "accept",
          senderId: currentUserId,
          createdAt: "Now",
          body: "All required parties accepted. Christian signed the split sheet.",
          proposedSplitId: deal.currentVersionId,
        },
      ],
    }));
  };

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
                {selectedDeal.messages.map((message) => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    deal={selectedDeal}
                    currentUserId={currentUserId}
                    onAccept={() => respondToProposal(message, "accept")}
                    onReject={() => respondToProposal(message, "reject")}
                    onCounter={() => {
                      const version = selectedDeal.splitVersions.find((item) => item.id === message.proposedSplitId);
                      const mine = version?.allocations.find((allocation) => allocation.participantId === currentUserId)?.percent;
                      setCounterPercent(String(mine ?? 40));
                      setCounterOpen(true);
                    }}
                  />
                ))}

                {readyToSign && selectedDeal.status !== "signed" && (
                  <div className="rounded-lg border border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-bold text-[hsl(var(--split-verified))]">Consensus reached</div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          All required parties accepted the current version. Sign to lock the split sheet.
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
                <div className="mx-auto grid max-w-5xl gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Counter with your writer share
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={counterPercent}
                        onChange={(event) => setCounterPercent(event.target.value)}
                        className="h-10 w-24 rounded-lg border border-border bg-card px-3 text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-ring/30"
                      />
                      <span className="text-sm font-bold">%</span>
                      <span className="text-xs font-medium text-muted-foreground">SPLIT will rebalance the remaining shares.</span>
                    </div>
                  </label>
                  <div className="flex gap-2">
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
                      sendTextMessage();
                    }
                  }}
                  placeholder="Message the collaborators..."
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="button"
                  onClick={() => setCounterOpen((open) => !open)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-secondary"
                >
                  <GitBranch className="h-4 w-4" />
                  Counter
                </button>
                <button
                  type="button"
                  onClick={sendTextMessage}
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
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Messages</p>
          <h1 className="mt-1 text-lg font-bold">Deal chats</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {deals.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSignature className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">No deal chats yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pending split negotiations will appear here after real collaborator invites are connected.
            </p>
          </div>
        ) : deals.map((deal) => {
          const active = deal.id === selectedDealId;
          const latestMessage = deal.messages.at(-1);
          const primaryParticipant = deal.participants.find((participant) => participant.id !== currentUserId) ?? deal.participants[0];

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
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {primaryParticipant.initials}
                </div>
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
          Real split negotiations, counter-offers, approvals, and signatures will show up here once the backend is connected.
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
  currentUserId,
  onAccept,
  onReject,
  onCounter,
}: {
  message: NegotiationMessage;
  deal: NegotiationDeal;
  currentUserId: string;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}) {
  const sender = deal.participants.find((participant) => participant.id === message.senderId) ?? deal.participants[0];
  const fromMe = sender.id === currentUserId;
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
            alreadyAccepted={deal.acceptedBy.includes(currentUserId)}
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
  onAccept,
  onReject,
  onCounter,
}: {
  message: NegotiationMessage;
  version?: SplitVersion;
  fromMe: boolean;
  alreadyAccepted: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}) {
  const tone = {
    proposal: "border-primary/25 bg-primary/5",
    counter: "border-[hsl(var(--split-amended)/0.3)] bg-[hsl(var(--split-amended)/0.08)]",
    accept: "border-[hsl(var(--split-verified)/0.25)] bg-[hsl(var(--split-verified)/0.08)]",
    reject: "border-destructive/25 bg-destructive/5",
    text: "border-border bg-card",
  }[message.type];
  const Icon = message.type === "accept" ? CheckCircle2 : message.type === "reject" ? X : message.type === "counter" ? GitBranch : PenLine;
  const actionable = (message.type === "proposal" || message.type === "counter") && !fromMe;

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
              <button type="button" onClick={onCounter} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary">
                <GitBranch className="h-3.5 w-3.5" />
                Counter
              </button>
              <button type="button" onClick={onReject} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10">
                <X className="h-3.5 w-3.5" />
                Reject
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
      <span>{createdAt}</span>
    </div>
  );
}

function DealStatus({ status }: { status: NegotiationDeal["status"] }) {
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

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function rebalanceAllocations(allocations: SplitAllocation[], participantId: string, percent: number) {
  const others = allocations.filter((allocation) => allocation.participantId !== participantId);
  const remaining = Math.max(0, 100 - percent);
  const otherTotal = others.reduce((sum, allocation) => sum + allocation.percent, 0) || 1;

  return allocations.map((allocation) => {
    if (allocation.participantId === participantId) {
      return { ...allocation, percent };
    }

    return {
      ...allocation,
      percent: clampPercent((allocation.percent / otherTotal) * remaining),
    };
  });
}

function formatAllocationSummary(allocations: SplitAllocation[]) {
  return allocations.map((allocation) => `${allocation.name.split(" ")[0]} ${allocation.percent}%`).join(" / ");
}
