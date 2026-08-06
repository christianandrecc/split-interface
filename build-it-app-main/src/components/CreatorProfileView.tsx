import { useEffect, useMemo, useState } from "react";
import type { UserProfile } from "@/lib/userProfile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  BadgeCheck,
  ChevronRight,
  Check,
  Edit3,
  Heart,
  MapPin,
  MessageCircle,
  Repeat2,
  Share2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import type {
  CreatorCredit,
  CreatorProfile,
  CreatorSpotlightItem,
} from "@/types/creatorProfile";
import { cn } from "@/lib/utils";

type CreatorProfileViewProps = {
  userProfile?: UserProfile;
  creatorProfile?: CreatorProfile;
  mode?: "own" | "collaborator";
  onEditProfile?: () => void;
  onMessage?: () => void;
};

const EMPTY_CREATOR_PROFILE: CreatorProfile = {
  id: "current-user",
  displayName: "",
  username: "",
  verified: false,
  profileImage: "",
  roles: [],
  bio: "",
  location: "",
  verifiedCredits: 0,
  socials: {},
  credits: [],
  spotlight: [],
};

export default function CreatorProfileView({
  userProfile,
  creatorProfile = EMPTY_CREATOR_PROFILE,
  mode = "own",
  onEditProfile,
  onMessage,
}: CreatorProfileViewProps) {
  const profile = useMemo(
    () => mergeUserProfileWithCreatorProfile(creatorProfile, userProfile),
    [creatorProfile, userProfile],
  );
  const [following, setFollowing] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreatorCredit | null>(null);
  const [showAllCredits, setShowAllCredits] = useState(false);
  const [showAllSpotlights, setShowAllSpotlights] = useState(false);
  const [selectedStory, setSelectedStory] = useState<CreatorSpotlightItem | null>(null);

  const featuredSpotlights = useMemo(() => {
    const featured = profile.spotlight.filter((item) => item.featured);
    return (featured.length >= 2 ? featured : profile.spotlight).slice(0, 2);
  }, [profile.spotlight]);
  const completeCreditList = useMemo(() => buildCompleteCreditList(profile), [profile]);

  const handleFollow = () => {
    const nextFollowing = !following;
    setFollowing(nextFollowing);
    toast({
      title: nextFollowing ? "Following creator" : "Unfollowed creator",
      description: nextFollowing
        ? `${profile.displayName}'s public credits and spotlight updates will appear in your feed.`
        : `${profile.displayName} was removed from your followed creators.`,
    });
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/?profile=${profile.username}`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(profileUrl).catch(() => undefined);
    }

    toast({
      title: "Profile link copied",
      description: `@${profile.username}'s public SPLIT profile is ready to share.`,
    });
  };

  const handleMessage = () => {
    onMessage?.();
    toast({
      title: "Opening Messages",
      description: `Starting from the existing SPLIT Messages experience for @${profile.username}.`,
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 md:px-8 md:py-8">
        <section className="relative border-b border-border pb-0">
          {mode === "own" && (
            <div className="absolute right-0 top-0 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                aria-label="Share profile"
                title="Share profile"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onEditProfile}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                aria-label="Edit profile"
                title="Edit profile"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center xl:grid-cols-[248px_minmax(0,1fr)]">
            <div className="w-full max-w-[240px] overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:max-w-[248px]">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={`${profile.displayName} profile portrait`}
                  className="aspect-square h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square h-full w-full items-center justify-center bg-primary/10 text-primary">
                  {profile.displayName || profile.username ? (
                    <span className="text-4xl font-bold tracking-tight">{getInitials(profile.displayName || profile.username)}</span>
                  ) : (
                    <UserRound className="h-12 w-12" />
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 lg:pt-1">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
                      {profile.displayName || "Your profile"}
                    </h1>
                    {profile.verified && (
                      <BadgeCheck className="h-5 w-5 text-primary" aria-label="Verified creator" />
                    )}
                  </div>
                  {profile.username && <p className="mt-1.5 text-sm font-medium text-muted-foreground">@{profile.username}</p>}
                  {profile.roles.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex h-7 items-center rounded-full border border-primary/15 bg-primary/10 px-2.5 text-xs font-bold text-primary"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                  {profile.bio && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                </div>

                {mode === "collaborator" && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <>
                      <Button
                        type="button"
                        onClick={handleFollow}
                        className="h-10 rounded-full px-4"
                        aria-label={following ? "Following creator" : "Follow creator"}
                      >
                        {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {following ? "Following" : "Follow"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleMessage}
                        className="h-10 rounded-full px-4"
                        aria-label="Message creator"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </Button>
                    </>
                  </div>
                )}
              </div>

              <div className="flex min-h-[60px] flex-wrap items-center gap-4 border-t border-border py-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <span className="text-lg font-bold tabular-nums">{profile.verifiedCredits}</span>
                  <span className="text-sm text-muted-foreground">verified credits</span>
                </div>
                {profile.location && (
                  <>
                    <div className="hidden h-6 w-px bg-border sm:block" />
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 md:mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Credits</h2>
            {completeCreditList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllCredits(true)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                View all {profile.verifiedCredits}
              </button>
            )}
          </div>

          {profile.credits.length === 0 ? (
            <EmptyProfileSection
              title="No verified credits yet"
              description="Credits will appear here after real split sheets are verified and stored."
            />
          ) : (
            <div
              role="list"
              aria-label={`${profile.displayName || "Your profile"} verified credits`}
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-[calc((100vw-78vw)/2)] px-[11vw] pb-4 md:-mx-8 md:scroll-px-8 md:px-8"
            >
              {profile.credits.map((credit) => (
                <div
                  key={credit.id}
                  role="listitem"
                  className="w-[78vw] max-w-[360px] shrink-0 snap-center sm:w-[260px] md:w-[220px] lg:w-[210px] xl:w-[220px]"
                >
                  <CreditCard credit={credit} onOpen={() => setSelectedCredit(credit)} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-9 pb-10 md:mt-11">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Spotlight</h2>
            {profile.spotlight.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllSpotlights(true)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                View all
              </button>
            )}
          </div>

          {featuredSpotlights.length === 0 ? (
            <EmptyProfileSection
              title="No spotlight stories yet"
              description="Stories will appear after real creator credits and editorial records are connected."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {featuredSpotlights.map((item) => (
                <SpotlightCard
                  key={item.id}
                  item={item}
                  featured
                  onOpen={() => setSelectedStory(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreditDetailsDialog credit={selectedCredit} onOpenChange={(open) => !open && setSelectedCredit(null)} />
      <AllCreditsDialog
        credits={completeCreditList}
        open={showAllCredits}
        total={profile.verifiedCredits}
        onOpenChange={setShowAllCredits}
        onOpenCredit={setSelectedCredit}
      />
      <SpotlightStoryPage
        story={selectedStory}
        creatorName={profile.displayName}
        onClose={() => setSelectedStory(null)}
      />
      <AllSpotlightsDialog
        open={showAllSpotlights}
        spotlights={profile.spotlight}
        onOpenChange={setShowAllSpotlights}
        onOpenStory={(story) => {
          setShowAllSpotlights(false);
          setSelectedStory(story);
        }}
      />
    </div>
  );
}

function EmptyProfileSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BadgeCheck className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function CreditCard({ credit, onOpen }: { credit: CreatorCredit; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-ring/30"
    >
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
        <img src={credit.image} alt={`${credit.title} cover art`} className="aspect-square w-full object-cover" />
      </div>
      <div className="mt-3">
        <h3 className="truncate text-base font-bold leading-5 text-foreground">{credit.title}</h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">{credit.artist}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {credit.year} · {credit.releaseType}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
          <BadgeCheck className="h-3.5 w-3.5" />
          <span className="truncate">{credit.contribution}</span>
        </div>
      </div>
    </button>
  );
}

function SpotlightCard({
  item,
  featured,
  onOpen,
}: {
  item: CreatorSpotlightItem;
  featured?: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open story: ${item.title}`}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm outline-none transition-transform duration-300 hover:-translate-y-0.5 focus:ring-2 focus:ring-ring/30",
        featured ? "min-h-[340px] md:min-h-[390px]" : "min-h-[210px] sm:min-h-[240px] lg:min-h-[116px] xl:min-h-[220px]",
      )}
    >
      <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5" />
      <div className={cn("relative flex h-full min-h-[inherit] flex-col justify-end p-4", featured && "p-5 md:p-6")}>
        <div
          className={cn(
            "flex w-full flex-col rounded-xl bg-white/[0.008] p-4 text-white shadow-[0_10px_22px_rgba(0,0,0,0.08)] backdrop-blur-xl",
            featured && "min-h-[148px] p-3.5 md:min-h-[164px] md:p-4",
          )}
        >
          {item.eyebrow && (
            <p className="mb-2 text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-white/68">
              {item.eyebrow}
            </p>
          )}
          <h3 className={cn("max-w-xl font-bold leading-tight", featured ? "text-lg md:text-xl" : "text-base")}>
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-2 max-w-xl text-xs leading-5 text-white/70">{item.description}</p>
          )}
          <SpotlightActions title={item.title} />
        </div>
      </div>
    </article>
  );
}

function SpotlightActions({ title, tone = "light" }: { title: string; tone?: "light" | "dark" }) {
  const actions = [
    { label: `Like ${title}`, icon: Heart, count: "1.2k" },
    { label: `Comment on ${title}`, icon: MessageCircle, count: "38" },
    { label: `Repost ${title}`, icon: Repeat2, count: "126" },
    { label: `Share ${title}`, icon: Share2 },
  ];

  return (
    <div className="mt-auto flex justify-center pt-3">
      <div
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full p-1 shadow-sm backdrop-blur-2xl",
          tone === "light" ? "bg-white/5 text-white" : "bg-foreground/5 text-foreground",
        )}
      >
        {actions.map(({ label, icon: Icon, count }) => (
          <button
            key={label}
            type="button"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full px-2 transition-colors focus:outline-none focus:ring-2",
              tone === "light"
                ? "text-white/80 hover:bg-white/15 hover:text-white focus:ring-white/60"
                : "text-foreground/70 hover:bg-foreground/8 hover:text-foreground focus:ring-ring/40",
            )}
            aria-label={count ? `${label}, ${count}` : label}
            title={count ? `${label}: ${count}` : label}
          >
            <Icon className="h-3 w-3" />
            {count && <span className="text-[10px] font-semibold leading-none tabular-nums">{count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpotlightStoryPage({
  story,
  creatorName,
  onClose,
}: {
  story: CreatorSpotlightItem | null;
  creatorName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!story) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, story]);

  if (!story) return null;

  const storyCopy = {
    ...createFallbackStory(story, creatorName),
    ...story.story,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background animate-in fade-in duration-200">
      <div className="fixed inset-0">
        <img src={story.image} alt="" className="h-full w-full scale-105 object-cover animate-in zoom-in-95 duration-500" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/50 to-black/80" />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="fixed right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white shadow-sm backdrop-blur-xl transition-colors hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-white/60 md:right-6 md:top-6"
        aria-label="Close story"
      >
        <X className="h-5 w-5" />
      </button>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-16 md:px-8 md:py-20">
        <article className="w-full rounded-2xl bg-white/[0.075] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl animate-in zoom-in-95 slide-in-from-bottom-6 duration-500 md:p-8">
          <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="pt-1">
              {story.eyebrow && (
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/68">{story.eyebrow}</p>
              )}
              <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] md:text-6xl">
                {story.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/82 md:text-base">{story.description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-white/62">
                <span>{creatorName}</span>
                <span>·</span>
                <span>{storyCopy.publishedAt}</span>
                <span>·</span>
                <span>{storyCopy.readTime}</span>
              </div>
              <StoryCredits credits={storyCopy.credits} />
            </div>

            <div className="rounded-xl bg-slate-950/42 p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl md:p-7">
              <p className="text-lg font-semibold leading-8 tracking-tight text-sky-50 md:text-xl">
                “{storyCopy.pullQuote}”
              </p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-white/82 md:text-[15px]">
                {storyCopy.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="mt-6 flex justify-start">
                <div className="rounded-full bg-white/8">
                  <SpotlightActions title={story.title} tone="light" />
                </div>
              </div>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

function createFallbackStory(story: CreatorSpotlightItem, creatorName: string) {
  return {
    publishedAt: "SPLIT Spotlight",
    readTime: "3 min read",
    pullQuote: `${story.title} shows how a verified credit becomes a fuller creative story.`,
    credits: [
      { label: "Writers", names: [creatorName, "Invited collaborator"] },
      { label: "Producers", names: [creatorName] },
      { label: "Mix Engineer", names: ["Pending metadata"] },
      { label: "Master Engineer", names: ["Pending metadata"] },
    ],
    paragraphs: [
      `${story.title} follows ${creatorName} through the choices behind the public credit, from the first session notes to the finished release.`,
      "The piece uses SPLIT's verified records as a starting point, then opens up the human context around the work: what changed in the room, what collaborators heard, and why the final contribution mattered.",
      "Creator profiles can turn credits into living context without exposing private contract details.",
    ],
  };
}

function StoryCredits({ credits = [] }: { credits?: { label: string; names: string[] }[] }) {
  if (credits.length === 0) return null;

  return (
    <section className="mt-8 max-w-xl rounded-xl bg-white/[0.055] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.14)] backdrop-blur-2xl">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/58">Project metadata</h2>
      <dl className="mt-4 space-y-3">
        {credits.map((credit) => (
          <div key={credit.label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-xs leading-5">
            <dt className="font-semibold text-white/52">{credit.label}</dt>
            <dd className="font-semibold text-sky-50/92">{credit.names.join(", ")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CreditDetailsDialog({
  credit,
  onOpenChange,
}: {
  credit: CreatorCredit | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(credit)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-4xl overflow-y-auto p-0">
        {credit && (
          <div className="grid md:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex items-center border-b border-border bg-secondary/30 p-5 md:min-h-[560px] md:border-b-0 md:border-r md:p-6">
              <img
                src={credit.image}
                alt={`${credit.title} cover art`}
                className="aspect-square w-full rounded-lg border border-border bg-card object-cover shadow-sm"
              />
            </div>
            <div className="min-w-0 p-6 pr-12 md:p-8 md:pr-14">
              <DialogHeader>
                <DialogTitle className="text-2xl">{credit.title}</DialogTitle>
                <DialogDescription>
                  {credit.artist} · {credit.year} · {credit.releaseType}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 space-y-5">
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    {credit.contribution}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{credit.verifiedAt}</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold">Verified collaborators</h4>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{credit.collaborators.join(", ")}</p>
                </div>
                {credit.collaboratedTracks && credit.collaboratedTracks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold">Collaborated tracks</h4>
                    <div className="mt-2 overflow-hidden rounded-lg border border-border">
                      {credit.collaboratedTracks.map((track) => (
                        <div
                          key={`${credit.id}-${track.trackNumber}`}
                          className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
                        >
                          <span className="text-center text-xs font-bold tabular-nums text-muted-foreground">
                            {track.trackNumber.toString().padStart(2, "0")}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">{track.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {track.contribution}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-sm leading-6 text-muted-foreground">{credit.notes}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AllCreditsDialog({
  credits,
  open,
  total,
  onOpenChange,
  onOpenCredit,
}: {
  credits: CreatorCredit[];
  open: boolean;
  total: number;
  onOpenChange: (open: boolean) => void;
  onOpenCredit: (credit: CreatorCredit) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verified Credits</DialogTitle>
          <DialogDescription>
            Showing public records from {total} verified credits.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 divide-y divide-border">
          {credits.map((credit) => (
            <button
              key={credit.id}
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenCredit(credit);
              }}
              className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 py-3 text-left focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <img src={credit.image} alt="" className="h-16 w-16 rounded-md object-cover" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">{credit.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {credit.artist} · {credit.year} · {credit.releaseType}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {credit.contribution}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AllSpotlightsDialog({
  open,
  spotlights,
  onOpenChange,
  onOpenStory,
}: {
  open: boolean;
  spotlights: CreatorSpotlightItem[];
  onOpenChange: (open: boolean) => void;
  onOpenStory: (story: CreatorSpotlightItem) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spotlight Stories</DialogTitle>
          <DialogDescription>
            Feature stories, writing notes, studio details, and verified project context from this creator.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spotlights.map((story) => (
            <button
              key={story.id}
              type="button"
              onClick={() => onOpenStory(story)}
              className="group relative min-h-[330px] overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <img src={story.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/28 to-black/8" />
              <div className="relative flex h-full min-h-[330px] flex-col justify-end p-4">
                <div className="mx-auto w-[88%] rounded-xl bg-white/[0.065] px-3.5 py-3 text-white shadow-[0_12px_32px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/64">
                      {story.eyebrow || "Spotlight"}
                    </span>
                    <span className="text-[10px] font-semibold text-sky-50/82">{story.story?.readTime || "3 min read"}</span>
                  </div>
                  <h3 className="line-clamp-2 text-base font-semibold leading-5 text-white">{story.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-white/70">
                    {story.description || "Open the full story behind this verified creator credit."}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-white/74">
                    <span>Open story</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function mergeUserProfileWithCreatorProfile(base: CreatorProfile, userProfile?: UserProfile): CreatorProfile {
  if (!userProfile) {
    return base;
  }

  const displayName = userProfile.displayName || buildPublicName(userProfile) || base.displayName;
  const roles = parseRoleTags(userProfile.roleTags);

  return {
    ...base,
    displayName,
    username: userProfile.username || base.username,
    profileImage: userProfile.profileImageUrl || base.profileImage,
    roles,
    location: userProfile.profileLocation || buildLocationLabel(userProfile) || base.location,
    socials: {
      instagram: userProfile.socialInstagram || undefined,
      tiktok: userProfile.socialTikTok || undefined,
      x: userProfile.socialX || undefined,
    },
  };
}

function buildCompleteCreditList(profile: CreatorProfile) {
  return profile.credits;
}

function parseRoleTags(value?: string) {
  return (value ?? "")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function buildPublicName(profile: UserProfile) {
  return [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function buildLocationLabel(profile: UserProfile) {
  return [profile.city, profile.state]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
