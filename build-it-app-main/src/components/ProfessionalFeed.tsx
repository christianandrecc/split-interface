import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Bookmark,
  ChevronRight,
  EyeOff,
  HelpCircle,
  MessageCircle,
  MoreHorizontal,
  Share2,
  UserMinus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import {
  feedCreatorSuggestions,
  feedTabs,
  professionalFeedItems,
} from "@/data/mockFeed";
import { cn } from "@/lib/utils";
import type {
  EditorialStoryFeedItem,
  FeedActor,
  FeedItem,
  FeedTabId,
  IndustryBriefFeedItem,
  ProfessionalPostFeedItem,
  VerifiedCreditFeedItem,
} from "@/types/feed";

type ProfessionalFeedProps = {
  isMobile?: boolean;
  onOpenProfile: () => void;
};

type DetailItem = FeedItem | null;

export default function ProfessionalFeed({ isMobile = false, onOpenProfile }: ProfessionalFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTabId>("for-you");
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(professionalFeedItems.filter((item) => item.saved).map((item) => item.id)),
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [detailItem, setDetailItem] = useState<DetailItem>(null);
  const [commentItem, setCommentItem] = useState<ProfessionalPostFeedItem | null>(null);

  const visibleItems = useMemo(
    () => professionalFeedItems.filter((item) => item.tabs.includes(activeTab) && !dismissedIds.has(item.id)),
    [activeTab, dismissedIds],
  );

  const toggleSave = (item: FeedItem) => {
    const nextSaved = !savedIds.has(item.id);
    setSavedIds((current) => {
      const next = new Set(current);
      if (nextSaved) next.add(item.id);
      else next.delete(item.id);
      return next;
    });

    toast({
      title: nextSaved ? "Saved to your feed" : "Removed from saved",
      description: nextSaved ? `${feedItemTitle(item)} is saved for later.` : `${feedItemTitle(item)} was removed from saved.`,
    });
  };

  const handleFeedback = (item: FeedItem, action: "why" | "less" | "mute" | "not-interested") => {
    if (action === "why") {
      toast({
        title: "Why you're seeing this",
        description: item.relevanceReason || "This is relevant to your collaborator network.",
      });
      return;
    }

    setDismissedIds((current) => new Set(current).add(item.id));
    toast({
      title:
        action === "mute"
          ? "Creator muted in this mock feed"
          : action === "less"
            ? "We'll show less like this"
            : "Marked as not interested",
      description: "This only updates local mock state for now.",
    });
  };

  const handleShare = (item: FeedItem) => {
    toast({
      title: "Share link ready",
      description: `${feedItemTitle(item)} can be shared from the live SPLIT feed later.`,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className={`mx-auto max-w-5xl ${isMobile ? "px-4 py-5" : "px-8 py-8"}`}>
        <header className="mb-5 md:mb-6">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Feed</h1>
          <p className="mt-0.5 max-w-2xl text-xs leading-5 text-muted-foreground md:text-sm">
            Verified work, stories, and professional updates from your collaborator network.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Feed filters"
          className="-mx-4 mb-5 flex gap-6 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
        >
          {feedTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-10 shrink-0 border-b-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {visibleItems.map((item, index) => (
              <div key={item.id}>
                <FeedItemRenderer
                  item={item}
                  saved={savedIds.has(item.id)}
                  onSave={() => toggleSave(item)}
                  onShare={() => handleShare(item)}
                  onOpenDetail={() => setDetailItem(item)}
                  onOpenProfile={onOpenProfile}
                  onComment={item.type === "professional-post" ? () => setCommentItem(item) : undefined}
                  onFeedback={(action) => handleFeedback(item, action)}
                />
                {activeTab === "for-you" && index === 3 && !isMobile && (
                  <CreatorDiscoveryInline onOpenProfile={onOpenProfile} />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <FeedDetailDialog
        item={detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        onOpenProfile={() => {
          setDetailItem(null);
          onOpenProfile();
        }}
        saved={detailItem ? savedIds.has(detailItem.id) : false}
        onSave={() => detailItem && toggleSave(detailItem)}
      />
      <CommentDialog item={commentItem} onOpenChange={(open) => !open && setCommentItem(null)} />
    </div>
  );
}

function FeedItemRenderer({
  item,
  saved,
  onSave,
  onShare,
  onOpenDetail,
  onOpenProfile,
  onComment,
  onFeedback,
}: {
  item: FeedItem;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onOpenDetail: () => void;
  onOpenProfile: () => void;
  onComment?: () => void;
  onFeedback: (action: "why" | "less" | "mute" | "not-interested") => void;
}) {
  if (item.type === "editorial-story") {
    return (
      <EditorialStoryItem
        item={item}
        saved={saved}
        onSave={onSave}
        onOpenDetail={onOpenDetail}
        onFeedback={onFeedback}
      />
    );
  }

  if (item.type === "verified-credit") {
    return (
      <VerifiedCreditItem
        item={item}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        onOpenDetail={onOpenDetail}
        onOpenProfile={onOpenProfile}
        onFeedback={onFeedback}
      />
    );
  }

  if (item.type === "industry-brief") {
    return (
      <IndustryBriefItem
        item={item}
        saved={saved}
        onSave={onSave}
        onOpenDetail={onOpenDetail}
        onFeedback={onFeedback}
      />
    );
  }

  return (
    <ProfessionalPostItem
      item={item}
      saved={saved}
      onSave={onSave}
      onShare={onShare}
      onOpenProfile={onOpenProfile}
      onComment={onComment}
      onFeedback={onFeedback}
    />
  );
}

function EditorialStoryItem({
  item,
  saved,
  onSave,
  onOpenDetail,
  onFeedback,
}: {
  item: EditorialStoryFeedItem;
  saved: boolean;
  onSave: () => void;
  onOpenDetail: () => void;
  onFeedback: (action: "why" | "less" | "mute" | "not-interested") => void;
}) {
  return (
    <article className="grid md:grid-cols-[minmax(0,0.98fr)_minmax(260px,0.82fr)]">
      <div className="min-h-[220px] md:order-2 md:min-h-0">
        <img src={item.image} alt="" className="h-full min-h-[220px] w-full object-cover" />
      </div>
      <div className="flex min-w-0 flex-col justify-center px-4 py-5 md:px-5 md:py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{item.label}</p>
            <h2 className="mt-3 max-w-xl text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">
              {item.headline}
            </h2>
          </div>
          <FeedItemMenu item={item} onFeedback={onFeedback} />
        </div>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{item.context}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <AvatarCluster actors={item.creators} />
          <span>
            With {item.creators.map((creator) => creator.name).join(", ")}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onOpenDetail} className="h-9 rounded-lg px-4">
            Open story
          </Button>
          <SaveButton saved={saved} onSave={onSave} />
        </div>
      </div>
    </article>
  );
}

function VerifiedCreditItem({
  item,
  saved,
  onSave,
  onShare,
  onOpenDetail,
  onOpenProfile,
  onFeedback,
}: {
  item: VerifiedCreditFeedItem;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onOpenDetail: () => void;
  onOpenProfile: () => void;
  onFeedback: (action: "why" | "less" | "mute" | "not-interested") => void;
}) {
  return (
    <article className="px-4 py-5 md:px-5">
      <div className="flex items-start justify-between gap-4">
        <FeedIdentity actor={item.actor} timestamp={item.timestamp} />
        <FeedItemMenu item={item} onFeedback={onFeedback} />
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">
        <span className="text-muted-foreground">{item.actor.name}</span>{" "}
        <span className="font-medium">{item.eventText}</span>
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[148px_minmax(0,1fr)]">
        <img
          src={item.release.image}
          alt={`${item.release.title} cover art`}
          className="aspect-square w-32 rounded-lg border border-border object-cover shadow-sm sm:w-full"
        />
        <div className="min-w-0 self-center">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified credit
          </div>
          <h3 className="mt-2 text-xl font-bold leading-tight text-foreground">{item.release.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.release.artist} · {item.release.year} · {item.release.releaseType}
          </p>
          <p className="mt-2 text-sm font-semibold text-primary">{item.release.role}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            {item.release.provenance}
          </p>
          {item.relevanceReason && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.relevanceReason}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onOpenDetail} className="h-9 rounded-lg px-4">
              View credit
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onOpenProfile} className="h-9 rounded-lg px-3 text-primary">
              View profile
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <SaveButton saved={saved} onSave={onSave} quiet />
            <IconAction label={`Share ${item.release.title}`} onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </IconAction>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProfessionalPostItem({
  item,
  saved,
  onSave,
  onShare,
  onOpenProfile,
  onComment,
  onFeedback,
}: {
  item: ProfessionalPostFeedItem;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onOpenProfile: () => void;
  onComment?: () => void;
  onFeedback: (action: "why" | "less" | "mute" | "not-interested") => void;
}) {
  return (
    <article className="px-4 py-5 md:px-5">
      <div className="flex items-start justify-between gap-4">
        <FeedIdentity actor={item.actor} timestamp={item.timestamp} />
        <FeedItemMenu item={item} onFeedback={onFeedback} />
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">{item.body}</p>
      {item.attachedRelease && (
        <button
          type="button"
          onClick={onOpenProfile}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <img
            src={item.attachedRelease.image}
            alt=""
            className="h-14 w-14 rounded-md border border-border object-cover"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{item.attachedRelease.title}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {item.attachedRelease.artist} · {item.attachedRelease.role}
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground/80">{item.attachedRelease.detail}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="mr-auto inline-flex items-center gap-1.5 font-medium">
          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
          {item.provenance}
        </span>
        {onComment && (
          <button type="button" onClick={onComment} className="rounded-md px-2 py-1 hover:bg-accent hover:text-foreground">
            Comment
          </button>
        )}
        <button type="button" onClick={onSave} className="rounded-md px-2 py-1 hover:bg-accent hover:text-foreground">
          {saved ? "Saved" : "Save"}
        </button>
        <button type="button" onClick={onShare} className="rounded-md px-2 py-1 hover:bg-accent hover:text-foreground">
          Share
        </button>
      </div>
    </article>
  );
}

function IndustryBriefItem({
  item,
  saved,
  onSave,
  onOpenDetail,
  onFeedback,
}: {
  item: IndustryBriefFeedItem;
  saved: boolean;
  onSave: () => void;
  onOpenDetail: () => void;
  onFeedback: (action: "why" | "less" | "mute" | "not-interested") => void;
}) {
  return (
    <article className="grid gap-4 px-4 py-5 md:grid-cols-[minmax(0,1fr)_164px] md:px-5">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{item.label}</p>
            <h3 className="mt-2 text-xl font-bold leading-tight text-foreground">{item.headline}</h3>
          </div>
          <FeedItemMenu item={item} onFeedback={onFeedback} />
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.summary}</p>
        {item.relevanceReason && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            {item.relevanceReason}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onOpenDetail} className="h-9 rounded-lg px-4">
            <BookOpen className="h-4 w-4" />
            Read brief
          </Button>
          <SaveButton saved={saved} onSave={onSave} />
        </div>
      </div>
      {item.image && (
        <img
          src={item.image}
          alt=""
          className="hidden h-full min-h-[120px] w-full rounded-lg border border-border object-cover md:block"
        />
      )}
    </article>
  );
}

function CreatorDiscoveryInline({ onOpenProfile }: { onOpenProfile: () => void }) {
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());

  const toggleFollow = (actor: FeedActor) => {
    const nextFollowing = !followed.has(actor.id);
    setFollowed((current) => {
      const next = new Set(current);
      if (nextFollowing) next.add(actor.id);
      else next.delete(actor.id);
      return next;
    });
    toast({
      title: nextFollowing ? "Following creator" : "Creator unfollowed",
      description: `${actor.name} updated in local mock state.`,
    });
  };

  return (
    <aside className="px-4 py-5 md:px-5" aria-label="Creator discovery">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Creators worth knowing</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">A light recognition loop from your collaborator graph.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {feedCreatorSuggestions.map(({ id, actor, reason }) => {
          const isFollowing = followed.has(actor.id);
          return (
            <div key={id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <CreatorAvatar actor={actor} className="h-11 w-11 rounded-md" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="flex max-w-full items-center gap-1 truncate text-sm font-semibold text-foreground hover:underline"
                >
                  <span className="truncate">{actor.name}</span>
                  {actor.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
                <p className="truncate text-xs text-muted-foreground">{actor.role}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground/80">{reason}</p>
              </div>
              <Button
                type="button"
                variant={isFollowing ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggleFollow(actor)}
                className="h-8 rounded-lg px-3 text-xs"
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function FeedIdentity({ actor, timestamp }: { actor: FeedActor; timestamp: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CreatorAvatar actor={actor} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="truncate text-sm font-bold text-foreground">{actor.name}</span>
          {actor.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
          <span className="text-xs text-muted-foreground">@{actor.username}</span>
          <span className="text-xs text-muted-foreground">· {timestamp}</span>
        </div>
        {actor.role && <p className="mt-0.5 truncate text-xs text-muted-foreground">{actor.role}</p>}
      </div>
    </div>
  );
}

function CreatorAvatar({ actor, className }: { actor: FeedActor; className?: string }) {
  return (
    <Avatar className={cn("h-10 w-10 border border-border bg-secondary", className)}>
      <AvatarImage src={actor.avatar} alt={`${actor.name} avatar`} className="object-cover" />
      <AvatarFallback className="text-xs font-bold text-primary">{initials(actor.name)}</AvatarFallback>
    </Avatar>
  );
}

function AvatarCluster({ actors }: { actors: FeedActor[] }) {
  return (
    <span className="flex -space-x-2">
      {actors.slice(0, 3).map((actor) => (
        <CreatorAvatar key={actor.id} actor={actor} className="h-6 w-6 border-2 border-card" />
      ))}
    </span>
  );
}

function SaveButton({ saved, onSave, quiet = false }: { saved: boolean; onSave: () => void; quiet?: boolean }) {
  return (
    <Button
      type="button"
      variant={quiet ? "ghost" : "outline"}
      size="sm"
      onClick={onSave}
      className="h-9 rounded-lg px-3"
      aria-pressed={saved}
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function FeedItemMenu({
  item,
  onFeedback,
}: {
  item: FeedItem;
  onFeedback: (action: "why" | "less" | "mute" | "not-interested") => void;
}) {
  const actor = "actor" in item ? item.actor : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          aria-label={`More options for ${feedItemTitle(item)}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => onFeedback("why")} className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Why am I seeing this?
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onFeedback("less")} className="gap-2">
          <EyeOff className="h-4 w-4" />
          Show me less like this
        </DropdownMenuItem>
        {actor && (
          <DropdownMenuItem onSelect={() => onFeedback("mute")} className="gap-2">
            <UserMinus className="h-4 w-4" />
            Mute {actor.name}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onFeedback("not-interested")} className="gap-2">
          Not interested
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FeedDetailDialog({
  item,
  onOpenChange,
  onOpenProfile,
  saved,
  onSave,
}: {
  item: DetailItem;
  onOpenChange: (open: boolean) => void;
  onOpenProfile: () => void;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto">
        {item?.type === "verified-credit" && (
          <VerifiedCreditDetail item={item} onOpenProfile={onOpenProfile} saved={saved} onSave={onSave} />
        )}
        {item?.type === "editorial-story" && <EditorialStoryDetail item={item} saved={saved} onSave={onSave} />}
        {item?.type === "industry-brief" && <IndustryBriefDetail item={item} saved={saved} onSave={onSave} />}
        {item?.type === "professional-post" && (
          <>
            <DialogHeader>
              <DialogTitle>{item.actor.name}'s post</DialogTitle>
              <DialogDescription>{item.provenance} · {item.timestamp}</DialogDescription>
            </DialogHeader>
            <p className="text-sm leading-6 text-foreground">{item.body}</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VerifiedCreditDetail({
  item,
  onOpenProfile,
  saved,
  onSave,
}: {
  item: VerifiedCreditFeedItem;
  onOpenProfile: () => void;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <img
        src={item.release.image}
        alt={`${item.release.title} cover art`}
        className="aspect-square w-full rounded-lg border border-border object-cover"
      />
      <div className="min-w-0">
        <DialogHeader>
          <DialogTitle className="text-2xl">{item.release.title}</DialogTitle>
          <DialogDescription>
            {item.release.artist} · {item.release.year} · {item.release.releaseType}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            {item.release.role}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.release.provenance}</p>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.release.detail}</p>
        {item.release.collaborators && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-foreground">Verified collaborators</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.release.collaborators.join(", ")}</p>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={onOpenProfile} className="h-9 rounded-lg px-4">
            View profile
          </Button>
          <SaveButton saved={saved} onSave={onSave} />
        </div>
      </div>
    </div>
  );
}

function EditorialStoryDetail({ item, saved, onSave }: { item: EditorialStoryFeedItem; saved: boolean; onSave: () => void }) {
  return (
    <div>
      <img src={item.image} alt="" className="-mx-6 -mt-6 mb-6 max-h-[300px] w-[calc(100%+3rem)] object-cover" />
      <DialogHeader>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{item.label}</p>
        <DialogTitle className="text-2xl leading-tight md:text-3xl">{item.headline}</DialogTitle>
        <DialogDescription>{item.story.publishedAt} · {item.readTime}</DialogDescription>
      </DialogHeader>
      <p className="mt-5 text-base font-semibold leading-7 text-foreground">"{item.story.pullQuote}"</p>
      <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
        {item.story.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Project metadata</h3>
        <dl className="mt-3 space-y-2">
          {item.story.credits.map((credit) => (
            <div key={credit.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm">
              <dt className="font-semibold text-foreground">{credit.label}</dt>
              <dd className="text-muted-foreground">{credit.names.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-5">
        <SaveButton saved={saved} onSave={onSave} />
      </div>
    </div>
  );
}

function IndustryBriefDetail({ item, saved, onSave }: { item: IndustryBriefFeedItem; saved: boolean; onSave: () => void }) {
  return (
    <div>
      <DialogHeader>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{item.label}</p>
        <DialogTitle className="text-2xl leading-tight">{item.headline}</DialogTitle>
        <DialogDescription>{item.readTime} · {item.relevanceReason}</DialogDescription>
      </DialogHeader>
      <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
        {item.body.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-5">
        <SaveButton saved={saved} onSave={onSave} />
      </div>
    </div>
  );
}

function CommentDialog({ item, onOpenChange }: { item: ProfessionalPostFeedItem | null; onOpenChange: (open: boolean) => void }) {
  const [draft, setDraft] = useState("");

  const submitComment = () => {
    if (!draft.trim()) return;
    toast({
      title: "Comment added",
      description: "This local thread is mocked for the feed prototype.",
    });
    setDraft("");
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>Comment on {item.actor.name}'s update</DialogTitle>
              <DialogDescription>Keep the conversation tied to the project context.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
              {item.body}
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 bg-primary/10">
                  <AvatarFallback className="text-xs font-bold text-primary">CP</AvatarFallback>
                </Avatar>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Add a professional note..."
                  className="min-h-[92px] flex-1 resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" onClick={submitComment} className="h-9 rounded-lg px-4">
                  Add comment
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function feedItemTitle(item: FeedItem) {
  if (item.type === "editorial-story") return item.headline;
  if (item.type === "industry-brief") return item.headline;
  if (item.type === "verified-credit") return item.release.title;
  return `${item.actor.name}'s update`;
}
