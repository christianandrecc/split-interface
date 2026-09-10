import { useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  FileSearch,
  FileText,
  History,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Music2,
  NotebookPen,
  PenLine,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import splitLockup from "@/assets/split-navy-amber-lockup.png";
import counterElephantMascot from "@/assets/split-elephant-counter-guide.png";
import discussingCollaborators from "@/assets/split-collaborators-discussing.png";
import elephantMascot from "@/assets/split-elephant-mascot.png";
import signingElephant from "@/assets/split-elephant-signing.png";
import creatingElephant from "@/assets/split-elephant-creating.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OnboardingStep = {
  id: number;
  title: string;
  body: string;
  thumbnailTitle: string;
};

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "Start a SPLIT",
    body: "Start with a title and creation date. Your artist profile is already filled in, and session notes are optional.",
    thumbnailTitle: "Start a SPLIT",
  },
  {
    id: 2,
    title: "Invite collaborators",
    body: "Find collaborators by @username or email, then invite them into the same room.",
    thumbnailTitle: "Invite collaborators",
  },
  {
    id: 3,
    title: "Everyone has a say",
    body: "Suggest a different split, talk it through, and approve the same version together. Signing comes next.",
    thumbnailTitle: "Everyone has a say",
  },
  {
    id: 4,
    title: "Review in Messages",
    body: "Every proposal, counter, and signature lives in one timeline. The elephant button stays nearby with private guidance as the room moves forward.",
    thumbnailTitle: "Review in Messages",
  },
  {
    id: 5,
    title: "Sign together",
    body: "Review the agreed shares and add your digital signature. Once everyone signs, your SPLIT is locked and the signed record is ready to download.",
    thumbnailTitle: "Sign together",
  },
  {
    id: 6,
    title: "Find it later",
    body: "Your signed SPLIT stays locked, searchable, and ready whenever you need it.",
    thumbnailTitle: "Find it later",
  },
];

type NewUserOnboardingProps = {
  onComplete: () => void;
};

function StepBadge({ step, active = false }: { step: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black shadow-sm",
        active ? "bg-primary text-primary-foreground" : "bg-sidebar-background text-white",
      )}
    >
      {step}
    </span>
  );
}

function ElephantMascot({ className }: { className?: string }) {
  return (
    <img
      src={elephantMascot}
      alt=""
      aria-hidden="true"
      className={cn("object-contain drop-shadow-[0_10px_18px_hsl(211_70%_15%/0.12)]", className)}
    />
  );
}

function StartIllustration({ compact = false }: { compact?: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const detailsId = useId();

  return (
    <div
      data-testid="work-creation-preview"
      className={cn("mx-auto grid w-full min-w-0 max-w-[600px] items-center gap-4 lg:grid-cols-[minmax(0,1fr)_136px]", compact && "max-w-[480px]")}
    >
      <div className="min-w-0 rounded-2xl border border-border bg-white p-3.5 shadow-[0_16px_40px_hsl(211_70%_15%/0.09)] sm:p-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Music2 className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground">Creation preview</p>
            <p className="text-sm font-black leading-5 text-sidebar">New work</p>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">Work</span>
        </div>

        <dl className="mt-3 space-y-2">
          {[
            { label: "Work title", value: "Midnight Drive", icon: Music2 },
            { label: "Artist / Project", value: "Carter Lane", icon: UserRound, fromProfile: true },
            { label: "Creation date", value: "Sep 5, 2026", icon: CalendarDays },
          ].map(({ label, value, icon: Icon, fromProfile }) => (
            <div key={label} className="grid min-h-[42px] grid-cols-[28px_minmax(0,1fr)] items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] leading-3 text-muted-foreground">{label}</dt>
                <dd className="mt-1 flex items-center justify-between gap-2 text-[13px] font-bold leading-[18px] text-sidebar">
                  <span>{value}</span>
                  {fromProfile && (
                    <span aria-label="From your signed-in profile" title="From your signed-in profile" className="shrink-0 text-emerald-700">
                      <LockKeyhole className="h-3.5 w-3.5" />
                    </span>
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="mt-3 border-t border-border pt-2">
          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen(open => !open)}
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md text-left text-[11px] font-bold text-sidebar hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex items-center gap-2"><NotebookPen className="h-3.5 w-3.5 text-primary" />Optional details</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none", detailsOpen && "rotate-180")} />
          </button>
          <div className="h-[84px] pt-2">
            <dl id={detailsId} role="region" aria-label="Optional work details" hidden={!detailsOpen} className="border-l-2 border-primary/40 pl-2.5">
              <dt className="text-[9px] leading-3 text-muted-foreground">Alternate title</dt>
              <dd className="text-[11px] font-semibold leading-4 text-sidebar">Midnight Drive (demo)</dd>
              <dt className="mt-1 text-[9px] leading-3 text-muted-foreground">Session notes</dt>
              <dd className="text-[11px] leading-4 text-sidebar">Friday session with Mina.</dd>
            </dl>
            {!detailsOpen && (
              <p className="pt-2 text-[11px] leading-4 text-muted-foreground">Start with the basics. Extra context can wait.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-center gap-3 lg:grid-cols-1 lg:gap-4">
        <img
          src={creatingElephant}
          alt="SPLIT elephant composing at a keyboard with headphones and a music notebook"
          className="mx-auto aspect-square w-full max-w-[160px] object-contain mix-blend-multiply"
        />
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black leading-4 text-sidebar sm:text-sm">From session to SPLIT.</p>
          <div className="space-y-2.5 text-[10px] font-semibold leading-4 text-muted-foreground sm:text-[11px]">
            <p className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5 shrink-0 text-emerald-700" />Your profile, ready</p>
            <p className="flex items-center gap-2"><NotebookPen className="h-3.5 w-3.5 shrink-0 text-primary" />Keep session context</p>
            <p className="flex items-center gap-2"><UserPlus className="h-3.5 w-3.5 shrink-0 text-sidebar" />Bring in your team</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InviteIllustration({ compact = false }: { compact?: boolean }) {
  const collaboratorRows = [
    { name: "Maya Rios", handle: "@mayarios", role: "Producer", accent: "bg-primary", status: "Recent" },
    { name: "Adriano", handle: "@adriano", role: "Writer", accent: "bg-sidebar-background", status: "Invite" },
  ];

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2">
        <ElephantMascot className="h-12 w-14" />
        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
          <Search className="mb-2 h-6 w-6 text-sidebar-background" strokeWidth={2.1} />
          <div className="h-2 w-16 rounded-full bg-sidebar-background/25" />
        </div>
        <div className="relative rounded-2xl border border-primary/30 bg-primary/10 p-3 shadow-sm">
          <Users className="h-7 w-7 text-sidebar-background" strokeWidth={1.9} />
          <span className="absolute -bottom-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-white text-[12px] font-black text-primary">
            +
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto grid w-full max-w-[650px] grid-cols-[minmax(0,1fr)_74px_minmax(0,1fr)] items-center gap-4">
      <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_18px_42px_hsl(211_70%_15%/0.08)]">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          <Search className="h-4 w-4 text-primary" strokeWidth={2.2} />
          Find collaborator
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm font-bold text-sidebar-background">
          <AtSign className="h-4 w-4 text-primary" strokeWidth={2.2} />
          <span className="truncate">@username or email</span>
        </div>

        <div className="mt-4 space-y-2">
          {collaboratorRows.map((row) => (
            <div
              key={row.handle}
              className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm"
            >
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-white", row.accent)}>
                {row.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-sidebar-background">{row.name}</span>
                <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                  {row.handle} · {row.role}
                </span>
              </span>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <ElephantMascot className="h-20 w-24" />
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary shadow-sm">
          <Send className="h-5 w-5" strokeWidth={2.2} />
        </span>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-[0_18px_42px_hsl(38_94%_53%/0.09)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            <Users className="h-4 w-4 text-sidebar-background" strokeWidth={2.1} />
            Split room
          </div>
          <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[10px] font-black text-sidebar-background">
            Live
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-sidebar-background" strokeWidth={2.2} />
            <span className="text-sm font-black text-sidebar-background">Midnight Drive</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-sidebar-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
              Creator
            </span>
            <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-primary-foreground">
              Invited
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-white px-3 py-3">
            <Mail className="mb-2 h-5 w-5 text-primary" strokeWidth={2.1} />
            <p className="text-xs font-black text-sidebar-background">Email invite</p>
          </div>
          <div className="rounded-xl border border-border bg-white px-3 py-3">
            <UserPlus className="mb-2 h-5 w-5 text-primary" strokeWidth={2.1} />
            <p className="text-xs font-black text-sidebar-background">Join room</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitSharePanel({
  values,
  highlightFirst = false,
  label,
  caption,
}: {
  values: [string, string];
  highlightFirst?: boolean;
  label: string;
  caption: string;
}) {
  return (
    <div
      aria-label={label}
      className="flex min-h-[118px] min-w-0 flex-col justify-center gap-2 rounded-2xl border-2 border-border bg-white px-2 py-3 shadow-[0_16px_34px_hsl(211_70%_15%/0.09)] sm:min-h-[138px] sm:px-2.5 sm:py-4"
    >
      <p className="text-center text-[9px] font-bold leading-3 text-muted-foreground sm:text-[11px]">{caption}</p>
      {values.map((value, index) => {
        const isHighlighted = highlightFirst && index === 0;

        return (
          <div
            key={`${value}-${index}`}
            className={cn(
              "flex min-w-0 items-center justify-between gap-1 text-lg font-black sm:gap-2 sm:text-[22px]",
              isHighlighted ? "text-primary" : "text-sidebar",
            )}
          >
            <Users
              className={cn(
                "h-4 w-4 shrink-0 sm:h-5 sm:w-5",
                isHighlighted ? "text-primary" : "text-sidebar",
              )}
              strokeWidth={2}
            />
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function CounterIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div
      data-testid="counter-illustration"
      className={cn("relative mx-auto w-full max-w-[500px]", compact && "max-w-[390px]")}
    >
      <div className="relative h-[220px] w-full sm:h-[248px]">
        <img
          src={counterElephantMascot}
          alt=""
          aria-hidden="true"
          className="absolute left-[40%] top-0 z-0 h-[130px] w-[76%] max-w-[261px] -translate-x-1/2 object-contain drop-shadow-[0_12px_22px_hsl(211_70%_15%/0.12)] sm:h-[174px]"
        />
        <Sparkles
          className="absolute right-[4%] top-[62px] h-6 w-6 text-primary sm:right-[7%] sm:top-[72px] sm:h-8 sm:w-8"
          strokeWidth={2.4}
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] sm:gap-2">
          <SplitSharePanel values={["50%", "50%"]} label="Initial split: 50 percent and 50 percent" caption="Original v1" />
          <ArrowRight
            className="mx-auto h-6 w-6 text-sidebar sm:h-8 sm:w-8"
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <SplitSharePanel
            values={["60%", "40%"]}
            highlightFirst
            label="Updated split: 60 percent and 40 percent"
            caption="Counter v2"
          />
        </div>
      </div>
    </div>
  );
}

function CounterDiscussion() {
  const [approved, setApproved] = useState(false);

  return (
    <div data-testid="counter-discussion" className="mx-auto w-full min-w-0 max-w-[340px] space-y-2">
      <div className="flex min-h-12 items-center gap-3">
        <img
          src={discussingCollaborators}
          alt="Two music collaborators discussing a song"
          className="h-14 w-[84px] shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="text-sm font-black leading-5 text-sidebar">Talk it through</p>
          <p className="text-[10px] leading-4 text-muted-foreground">Sample discussion</p>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] leading-4 text-sidebar">
        <p className="mr-3 rounded-lg bg-muted/60 px-2.5 py-2">
          <span className="font-black">Mina: </span>Could we try 60/40?
        </p>
        <p className="ml-3 rounded-lg bg-primary/10 px-2.5 py-2">
          <span className="font-black">Carter: </span>Let&apos;s review the new shares.
        </p>
      </div>

      <div className="grid grid-rows-[34px_28px] gap-1">
        {approved ? (
          <div role="status" className="flex items-center justify-between gap-2 rounded-lg bg-emerald-100 px-2.5 text-[11px] font-bold text-emerald-800">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 shrink-0" />Both approved</span>
            <button
              type="button"
              aria-label="Replay approval preview"
              title="Replay approval preview"
              onClick={() => setApproved(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Preview approving this counter"
            onClick={() => setApproved(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-800 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            <ThumbsUp className="h-3.5 w-3.5" />Looks good
          </button>
        )}
        <p className="text-center text-[10px] leading-[14px] text-muted-foreground">
          {approved ? "2 of 2 approvals. Ready for signatures." : "Mina approved v2. Your review is next."}
        </p>
      </div>

      <div className="border-l-2 border-primary pl-3">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-sidebar">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />Elephant
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground">
            <LockKeyhole className="h-3 w-3" />Private
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Review the updated shares together. You decide what to approve.
        </p>
      </div>
    </div>
  );
}

function MessageIllustration({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative mx-auto w-full max-w-[220px]">
        <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <MessageSquareText className="h-5 w-5 text-sidebar-background" strokeWidth={2} />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-primary">
              Room
            </span>
          </div>
          <div className="mb-2 mr-auto h-7 w-[72%] rounded-xl rounded-tl-sm bg-muted" />
          <div className="mb-2 ml-auto h-7 w-[68%] rounded-xl rounded-tr-sm bg-sidebar-background" />
          <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-2 py-1.5">
            <ElephantMascot className="h-8 w-9 drop-shadow-none" />
            <span className="text-[10px] font-black text-sidebar-background">Private guide</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="messages-preview" className="relative mx-auto w-full min-w-0 max-w-[620px]">
      <div className="min-w-0 rounded-[1.25rem] border border-border bg-white p-3 shadow-[0_18px_48px_hsl(211_70%_15%/0.09)] sm:p-3.5">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 border-b border-border pb-2.5 max-[359px]:grid-cols-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar text-white">
              <MessageSquareText className="h-[18px] w-[18px]" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black text-sidebar max-[359px]:whitespace-normal max-[359px]:leading-4 sm:text-sm">
                Midnight Drive room
              </p>
              <p className="truncate text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                Proposal, counters, chat, and signatures
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-primary max-[359px]:col-start-1 max-[359px]:ml-[46px] max-[359px]:mt-1 max-[359px]:justify-self-start sm:text-[10px]">
            Negotiating
          </span>
        </div>

        <div className="mt-2.5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-[0.82fr_1.18fr]">
          <div className="grid min-w-0 content-start gap-2">
            <div className="mr-auto min-w-0 w-[94%] max-w-full rounded-xl rounded-tl-sm border border-border bg-muted/25 px-3 py-2.5 shadow-sm">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px]">
                Mina
              </p>
              <p className="text-[11px] font-semibold leading-4 text-sidebar sm:text-xs">
                Can we check the producer share before everyone signs?
              </p>
            </div>

            <div className="ml-auto min-w-0 w-[91%] max-w-full rounded-xl rounded-tr-sm bg-sidebar px-3 py-2.5 text-white shadow-sm">
              <p className="text-[11px] font-semibold leading-4 sm:text-xs">
                Yeah. Try 60/40 and I’ll send the counter.
              </p>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-primary/30 bg-primary/5 p-2.5 shadow-[0_12px_26px_hsl(38_94%_53%/0.08)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <PenLine className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[11px] font-black text-sidebar sm:text-[13px]">Counter proposal</p>
                  <p className="truncate text-[9px] font-semibold text-muted-foreground sm:text-[10px]">
                    Version 2 · sent in Messages
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-black text-sidebar shadow-sm">
                100%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <span className="inline-block h-full w-[60%] bg-primary align-top" />
              <span className="inline-block h-full w-[40%] bg-sidebar align-top" />
            </div>
            <div className="mt-2 grid gap-1 text-[11px] font-black text-sidebar sm:text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Mina
                </span>
                <span>60%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sidebar" />
                  Carter
                </span>
                <span>40%</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-900 sm:text-[10px]">
                <ThumbsUp className="h-3 w-3" />
                Looks good
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-sidebar shadow-sm sm:text-[10px]">
                <MessageSquareText className="h-3 w-3" />
                Counter
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-white px-3 py-2 shadow-[0_12px_28px_hsl(38_94%_53%/0.12)]">
          <ElephantMascot className="h-9 w-10 shrink-0 drop-shadow-none" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-black text-sidebar sm:text-[13px]">Elephant</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground">
                Private
              </span>
            </div>
            <p className="text-[10px] font-semibold leading-4 text-muted-foreground sm:text-[11px]">
              Reads the room and suggests a clean next step.
            </p>
          </div>
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.2} />
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 rounded-xl border border-border bg-muted/20 p-1.5">
          <span className="min-w-0 flex-1 truncate px-2 text-[11px] font-semibold text-muted-foreground sm:text-xs">
            Message collaborators...
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-2 text-[10px] font-black text-muted-foreground max-[359px]:px-2 sm:text-[11px]"
          >
            <MessageSquareText className="h-3.5 w-3.5 max-[359px]:hidden" strokeWidth={2.1} />
            Counter
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SignIllustration({ compact = false }: { compact?: boolean }) {
  const [signed, setSigned] = useState(false);

  return (
    <div
      data-testid="signing-preview"
      className={cn("mx-auto grid w-full min-w-0 max-w-[600px] items-center gap-4 lg:grid-cols-[minmax(0,1fr)_136px]", compact && "max-w-[480px]")}
    >
      <div className="min-w-0 rounded-2xl border border-border bg-white p-3.5 shadow-[0_16px_40px_hsl(211_70%_15%/0.09)] sm:p-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Music2 className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground">Signing preview</p>
            <p className="text-sm font-black leading-5 text-sidebar">Midnight Drive</p>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">v3</span>
        </div>

        <div className="pt-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-sidebar">
            <span>Agreed split</span>
            <span className="flex items-center gap-1 text-emerald-700"><Check className="h-3 w-3" />100%</span>
          </div>
          <div className="my-2.5 flex h-2 overflow-hidden rounded-full" aria-hidden="true">
            <span className="w-[60%] bg-primary" />
            <span className="w-[40%] bg-sidebar" />
          </div>
          <div className="space-y-1.5 text-xs font-semibold text-sidebar">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-primary" />Mina Rios</span>
              <span className="font-black">60%</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-sidebar" />Carter Lane</span>
              <span className="font-black">40%</span>
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
            <span className="text-sidebar">Signatures</span>
            <span className={signed ? "text-emerald-700" : "text-muted-foreground"}>{signed ? "2 of 2" : "1 of 2"}</span>
          </div>
          {[
            { name: "Mina Rios", signature: "M. Rios", complete: true, time: "Signed at 2:14 PM" },
            { name: "Carter Lane", signature: "C. Lane", complete: signed, time: "Signed at 2:15 PM" },
          ].map((signer) => (
            <div key={signer.name} className="grid min-h-[46px] grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-1">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", signer.complete ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary")}>
                {signer.complete ? <Check className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold leading-4 text-sidebar">{signer.name}</p>
                <p className="text-[9px] leading-3 text-muted-foreground">{signer.complete ? signer.time : "Awaiting your signature"}</p>
              </div>
              <span className={cn("text-right", signer.complete ? "font-serif text-xs italic text-sidebar" : "text-[9px] font-semibold text-primary")}>
                {signer.complete ? signer.signature : "You"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 grid min-h-[68px] grid-rows-[40px_16px] gap-1.5">
          {signed ? (
            <div className="flex items-center justify-between gap-1 rounded-lg bg-emerald-100 px-2.5 text-[11px] font-bold text-emerald-800" role="status">
              <span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />Signed and locked</span>
              <button type="button" onClick={() => setSigned(false)} aria-label="Replay signing preview" title="Replay signing preview" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setSigned(true)} aria-label="Preview signing this SPLIT" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <PenLine className="h-4 w-4" />Sign SPLIT
            </button>
          )}
          <p className="text-center text-[9px] leading-4 text-muted-foreground">{signed ? "Final record. No changes after locking." : "Try signing this sample sheet."}</p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[80px_minmax(0,1fr)] items-center gap-3 lg:grid-cols-1 lg:gap-4">
        <img src={signingElephant} alt="SPLIT elephant signing a music split sheet" className="mx-auto aspect-square w-full max-w-[160px] object-contain" />
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black leading-4 text-sidebar sm:text-sm">Every signature counts.</p>
          <div className="space-y-2.5 text-[10px] font-semibold leading-4 text-muted-foreground sm:text-[11px]">
            <p className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 shrink-0 text-primary" />Timestamped signatures</p>
            <p className="flex items-center gap-2"><History className="h-3.5 w-3.5 shrink-0 text-sidebar" />Version history</p>
            <p className="flex items-center gap-2"><Download className="h-3.5 w-3.5 shrink-0 text-emerald-700" />Download signed record</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FindIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[600px]", compact && "scale-90")}>
      <div className="absolute -right-6 top-10 hidden h-32 w-32 rounded-full bg-primary/10 blur-3xl sm:block" />
      <div className="relative grid items-center gap-5 sm:grid-cols-[1fr_170px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_18px_42px_hsl(211_70%_15%/0.09)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sidebar-background text-white">
                  <FileText className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Signed SPLIT
                  </p>
                  <p className="mt-1 text-base font-black text-sidebar-background">Midnight Drive</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-black text-emerald-800">
                Locked
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                ["100%", "Total"],
                ["3", "Signers"],
                ["Today", "Updated"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-border bg-muted/20 px-3 py-3 text-center">
                  <p className="text-sm font-black text-sidebar-background">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-[0_12px_28px_hsl(38_94%_53%/0.08)]">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-sidebar-background">
              <Search className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <span>Search by title, collaborator, or date</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Dashboard", "Messages", "Signed records"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-black text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mx-auto h-[230px] w-[180px]">
          <div className="absolute left-0 top-4 flex h-24 w-28 -rotate-3 items-center justify-center rounded-2xl border border-border bg-white p-3 shadow-[0_14px_32px_hsl(211_70%_15%/0.1)]">
            <FileText className="h-10 w-10 text-sidebar-background" strokeWidth={2} />
            <Search className="absolute bottom-5 right-5 h-7 w-7 text-sidebar-background" strokeWidth={2.2} />
          </div>
          <div className="absolute right-0 top-0 w-[118px] rotate-3 rounded-2xl border border-border bg-white p-4 shadow-[0_14px_32px_hsl(211_70%_15%/0.1)]">
            <FileSearch className="mb-3 h-8 w-8 text-sidebar-background" strokeWidth={2.1} />
            <p className="text-xs font-black text-sidebar-background">View record</p>
            <p className="text-[10px] font-semibold text-muted-foreground">Downloadable</p>
          </div>
          <div className="absolute left-1 top-[108px] w-[112px] -rotate-6 rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-[0_14px_32px_hsl(38_94%_53%/0.12)]">
            <LockKeyhole className="mb-3 h-7 w-7 text-sidebar-background" strokeWidth={2.1} />
            <p className="text-xs font-black text-sidebar-background">Locked</p>
            <p className="text-[10px] font-semibold text-muted-foreground">No edits</p>
          </div>
          <ElephantMascot className={cn("absolute bottom-0 right-2", compact ? "h-12 w-14" : "h-20 w-24")} />
        </div>
      </div>
    </div>
  );
}

function StepVisual({ step, compact = false }: { step: OnboardingStep; compact?: boolean }) {
  if (step.id === 1) return <StartIllustration compact={compact} />;
  if (step.id === 2) return <InviteIllustration compact={compact} />;
  if (step.id === 3) return <CounterIllustration compact={compact} />;
  if (step.id === 4) return <MessageIllustration compact={compact} />;
  if (step.id === 5) return <SignIllustration compact={compact} />;
  return <FindIllustration compact={compact} />;
}

function ThumbnailVisual({ step }: { step: OnboardingStep }) {
  if (step.id === 1) {
    return (
      <div className="flex h-full w-full items-end justify-center gap-1.5 pb-1">
        <ElephantMascot className="h-[58px] w-[62px] drop-shadow-none" />
        <div className="mb-1 flex h-[68px] w-[48px] flex-col justify-center rounded-xl border-2 border-sidebar-background/80 bg-white px-2 shadow-[0_8px_16px_hsl(211_70%_15%/0.08)]">
          <Music2 className="mb-2 h-5 w-5 text-sidebar-background" strokeWidth={2.2} />
          <span className="mb-1 h-1.5 w-8 rounded-full bg-sidebar-background/55" />
          <span className="h-1.5 w-6 rounded-full bg-sidebar-background/35" />
        </div>
      </div>
    );
  }

  if (step.id === 2) {
    return (
      <div className="relative h-full w-full">
        <ElephantMascot className="absolute bottom-1 left-2 h-[58px] w-[62px] drop-shadow-none" />
        <div className="absolute bottom-2 left-[50px] h-[68px] w-[28px] rounded-l-xl border-2 border-sidebar-background/80 bg-gradient-to-br from-white to-primary/10" />
        <div className="absolute bottom-2 right-3 flex h-[68px] w-[48px] items-center justify-center rounded-xl border-2 border-dashed border-sidebar-background/70 bg-white shadow-[0_8px_16px_hsl(211_70%_15%/0.08)]">
          <UserPlus className="h-8 w-8 text-sidebar-background" strokeWidth={1.9} />
          <span className="absolute -bottom-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-sidebar-background/40 bg-white text-[13px] font-black text-sidebar-background">
            +
          </span>
        </div>
      </div>
    );
  }

  if (step.id === 3) {
    return (
      <div className="grid h-full w-full min-w-0 grid-cols-[minmax(0,1fr)_12px_minmax(0,1fr)] items-center gap-[3px]">
        <div className="min-w-0 rounded-lg border border-border bg-white px-1 py-2 shadow-sm">
          <div className="flex items-center justify-center gap-0.5 whitespace-nowrap text-[10px] font-black leading-[14px] text-sidebar">
            <Users className="h-2 w-2 shrink-0" />
            50%
          </div>
          <div className="mt-1 flex items-center justify-center gap-0.5 whitespace-nowrap text-[10px] font-black leading-[14px] text-sidebar">
            <Users className="h-2 w-2 shrink-0" />
            50%
          </div>
        </div>
        <ArrowRight className="h-3 w-3 text-sidebar" strokeWidth={2.4} />
        <div className="min-w-0 rounded-lg border border-border bg-white px-1 py-2 shadow-sm">
          <div className="flex items-center justify-center gap-0.5 whitespace-nowrap text-[10px] font-black leading-[14px] text-primary">
            <Users className="h-2 w-2 shrink-0" />
            60%
          </div>
          <div className="mt-1 flex items-center justify-center gap-0.5 whitespace-nowrap text-[10px] font-black leading-[14px] text-sidebar">
            <Users className="h-2 w-2 shrink-0" />
            40%
          </div>
        </div>
      </div>
    );
  }

  if (step.id === 4) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="relative h-[66px] w-[80px] rounded-xl border-2 border-sidebar-background/75 bg-white p-3 shadow-[0_8px_16px_hsl(211_70%_15%/0.08)]">
          <MessageSquareText className="mb-2 h-6 w-6 text-sidebar-background" strokeWidth={1.9} />
          <span className="mb-1 block h-1.5 w-11 rounded-full bg-sidebar-background/35" />
          <span className="block h-1.5 w-8 rounded-full bg-sidebar-background/25" />
        </div>
        <ElephantMascot className="absolute bottom-1 right-3 h-[48px] w-[54px] drop-shadow-none" />
      </div>
    );
  }

  if (step.id === 5) {
    return (
      <div className="relative flex h-full w-full items-end justify-center pb-1">
        <div className="flex h-[76px] w-[56px] flex-col justify-center rounded-xl border-2 border-sidebar-background/75 bg-white px-2 shadow-[0_8px_16px_hsl(211_70%_15%/0.08)]">
          <Music2 className="mb-2 h-5 w-5 text-sidebar-background" strokeWidth={2.2} />
          <span className="mb-1 h-1.5 w-9 rounded-full bg-sidebar-background/45" />
          <span className="mb-2 h-1.5 w-7 rounded-full bg-sidebar-background/28" />
          <PenLine className="h-4 w-4 text-primary" strokeWidth={2.2} />
        </div>
        <ElephantMascot className="absolute bottom-2 right-3 h-[50px] w-[56px] drop-shadow-none" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="relative flex h-[60px] w-[76px] items-center justify-center rounded-xl border-2 border-sidebar-background/75 bg-white shadow-[0_8px_16px_hsl(211_70%_15%/0.08)]">
        <FileText className="h-8 w-8 text-sidebar-background" strokeWidth={2} />
        <Search className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white text-sidebar-background" strokeWidth={2.2} />
      </div>
      <ElephantMascot className="absolute right-2 top-1 h-[50px] w-[56px] drop-shadow-none" />
    </div>
  );
}

function StepThumbnail({
  step,
  active,
  onClick,
}: {
  step: OnboardingStep;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show onboarding step ${step.id}: ${step.title}`}
      className={cn(
        "relative flex h-[174px] w-[132px] shrink-0 flex-col items-center overflow-visible rounded-2xl border bg-white px-3 pb-5 pt-4 text-center shadow-[0_10px_24px_hsl(211_70%_15%/0.06)] transition will-change-transform hover:-translate-y-0.5 hover:shadow-[0_16px_30px_hsl(211_70%_15%/0.1)]",
        active
          ? "border-primary shadow-[0_14px_32px_hsl(38_94%_53%/0.16)] ring-1 ring-primary/35"
          : "border-border",
      )}
    >
      <div className="relative flex h-[92px] w-full items-center justify-center overflow-visible">
        <ThumbnailVisual step={step} />
      </div>
      <p className="mt-auto text-center text-[13px] font-black leading-[1.12] text-sidebar-background">
        {step.thumbnailTitle}
      </p>
    </button>
  );
}

export default function NewUserOnboarding({ onComplete }: NewUserOnboardingProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = steps[activeIndex];
  const isLastStep = activeIndex === steps.length - 1;

  const goBack = () => setActiveIndex((current) => Math.max(current - 1, 0));
  const goNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }

    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  return (
    <main className="min-h-screen bg-white text-foreground">
      <header className="flex items-center justify-between px-7 py-7 sm:px-14">
        <img src={splitLockup} alt="SPLIT" className="h-11 w-auto rounded-xl shadow-sm" />
        <button
          type="button"
          onClick={onComplete}
          className="rounded-full px-4 py-2 text-sm font-bold text-sidebar-background transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          Skip
        </button>
      </header>

      <section className="mx-auto flex min-h-[calc(100svh-104px)] w-full max-w-6xl flex-col justify-center px-5 pb-9 pt-5 sm:px-8">
        <div
          data-testid="onboarding-window"
          className="grid h-[1000px] min-h-0 grid-rows-[minmax(0,1fr)_198px] overflow-hidden rounded-2xl border border-border bg-white px-7 py-7 shadow-[0_24px_80px_hsl(211_70%_15%/0.08)] max-[359px]:h-[1140px] sm:h-[850px] sm:px-10 sm:py-8 lg:h-[736px] lg:px-12"
        >
          <div
            data-testid="onboarding-story-canvas"
            className={cn(
              "grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-5 sm:gap-6 lg:grid-cols-[0.74fr_1.26fr] lg:gap-8",
              (activeStep.id === 1 || activeStep.id === 5) && "sm:max-lg:grid-cols-[0.8fr_1.2fr]",
            )}
          >
            {activeStep.id === 3 ? (
              <div
                data-testid="counter-story"
                className="relative col-span-full flex h-full min-h-0 min-w-0 flex-col items-center justify-center px-1 py-3 sm:px-3"
              >
                <div className="absolute left-0 top-3 sm:left-1 sm:top-5">
                  <StepBadge step={activeStep.id} active />
                </div>
                <div className="grid w-full min-w-0 items-center gap-4 pt-8 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] sm:gap-6 sm:pt-2 lg:gap-10">
                  <CounterIllustration />
                  <CounterDiscussion />
                </div>
                <h1 className="mt-5 text-center text-2xl font-black tracking-normal text-sidebar sm:text-4xl">
                  {activeStep.title}
                </h1>
                <p className="mt-2 max-w-[640px] text-center text-sm font-medium leading-5 text-muted-foreground">
                  {activeStep.body}
                </p>
              </div>
            ) : (
              <>
                <div className="mx-auto w-full min-w-0 max-w-sm self-center lg:mx-0">
                  <StepBadge step={activeStep.id} active />
                  <h1 className="mt-6 text-2xl font-black tracking-normal text-sidebar-background sm:mt-8 sm:text-4xl lg:mt-12">
                    {activeStep.title}
                  </h1>
                  <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-muted-foreground sm:text-lg sm:leading-7">
                    {activeStep.body}
                  </p>
                </div>

                <div className="flex min-h-0 w-full min-w-0 items-center justify-center px-0 py-2 sm:px-2 sm:py-3 lg:px-0">
                  <StepVisual step={activeStep} />
                </div>
              </>
            )}
          </div>

          <div
            data-testid="onboarding-card-rail"
            className="-mx-4 flex h-[198px] min-w-0 items-center gap-5 overflow-x-auto px-4 py-3 lg:justify-center lg:gap-7"
          >
            {steps.map((step, index) => (
              <StepThumbnail
                key={step.id}
                step={step}
                active={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>

        <div className="mt-9 flex flex-col items-center justify-between gap-7 border-t border-border pt-8 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={activeIndex === 0}
            className="h-12 min-w-[148px] rounded-xl border-sidebar-background/25 bg-white text-base font-bold text-sidebar-background disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to onboarding step ${step.id}`}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition",
                    index === activeIndex ? "bg-primary" : "bg-muted-foreground/25",
                  )}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-muted-foreground">
              {activeIndex + 1} of {steps.length}
            </p>
          </div>

          <Button
            type="button"
            onClick={goNext}
            className="h-12 min-w-[148px] rounded-xl bg-primary text-base font-black text-primary-foreground shadow-[0_16px_30px_hsl(38_94%_53%/0.24)] hover:bg-primary/90"
          >
            {isLastStep ? "Enter SPLIT" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </main>
  );
}
