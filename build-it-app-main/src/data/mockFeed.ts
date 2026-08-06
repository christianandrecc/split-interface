import fallingThroughImage from "@/assets/creator-profile/falling-through.png";
import glasshouseImage from "@/assets/creator-profile/glasshouse.png";
import mayaProfileImage from "@/assets/creator-profile/maya-profile.png";
import nightSwimImage from "@/assets/creator-profile/night-swim.png";
import songwritingNotesImage from "@/assets/creator-profile/songwriting-notes.png";
import studioNotesImage from "@/assets/creator-profile/studio-notes.png";
import type { FeedActor, FeedCreatorSuggestion, FeedItem, FeedTabId } from "@/types/feed";

export const feedTabs: { id: FeedTabId; label: string }[] = [
  { id: "for-you", label: "For you" },
  { id: "network", label: "Network" },
  { id: "credits", label: "Credits" },
  { id: "stories", label: "Stories" },
];

export const feedActors: Record<string, FeedActor> = {
  arlo: {
    id: "actor-arlo-parks",
    name: "Arlo Parks",
    username: "arloparks",
    role: "Artist, writer",
    avatar: glasshouseImage,
    verified: true,
  },
  elena: {
    id: "actor-elena-shore",
    name: "Elena Shore",
    username: "elenashore",
    role: "Artist",
    avatar: nightSwimImage,
    verified: true,
  },
  juan: {
    id: "actor-juan-medina",
    name: "Juan Medina",
    username: "juanmedina",
    role: "Mix engineer",
    avatar: fallingThroughImage,
  },
  maya: {
    id: "actor-maya-rios",
    name: "Maya Rios",
    username: "mayarios",
    role: "Producer, songwriter",
    avatar: mayaProfileImage,
    verified: true,
  },
  tobias: {
    id: "actor-tobias-jesso",
    name: "Tobias Jesso Jr.",
    username: "tobiasjesso",
    role: "Songwriter",
    avatar: songwritingNotesImage,
    verified: true,
  },
};

export const professionalFeedItems: FeedItem[] = [
  {
    id: "feed-story-glasshouse-retreat",
    type: "editorial-story",
    createdAt: "2026-07-15T13:12:00Z",
    timestamp: "Today",
    visibility: "public",
    tabs: ["for-you", "stories"],
    relevanceReason: "Because you follow Maya Rios",
    saved: false,
    label: "Editorial",
    headline: "Inside the Writing Retreat That Shaped \"Glasshouse\"",
    context: "Arlo Parks and her core team break down the creative process behind the Glasshouse EP.",
    image: studioNotesImage,
    creators: [feedActors.arlo, feedActors.maya, feedActors.tobias],
    readTime: "5 min read",
    story: {
      publishedAt: "SPLIT editorial · Jul 2026",
      pullQuote: "Glasshouse needed to feel fragile without feeling small, like every sound had light passing through it.",
      credits: [
        { label: "Writers", names: ["Arlo Parks", "Maya Rios", "Tobias Jesso Jr."] },
        { label: "Producers", names: ["Maya Rios", "June Vale"] },
        { label: "Mix Engineer", names: ["Lena Park"] },
        { label: "A&R", names: ["Mina Okafor"] },
      ],
      paragraphs: [
        "The Glasshouse retreat started with a constraint: no part could be added unless it made the vocal feel more human. That pushed the team toward small, tactile choices instead of broad production moves.",
        "Maya Rios shaped the EP's soft textures by preserving room tone, half-finished vocal doubles, and the subtle distortions that usually get cleaned out before release.",
        "SPLIT's verified records do not publish private terms, but they can show the creative chain around a credit. In this case, the story makes clear where the production work entered the project and how the writing team shaped the final release.",
      ],
    },
  },
  {
    id: "feed-credit-night-swim",
    type: "verified-credit",
    createdAt: "2026-07-15T12:03:00Z",
    timestamp: "38 min",
    visibility: "network",
    tabs: ["for-you", "network", "credits"],
    relevanceReason: "Because collaborators in your network contributed",
    saved: false,
    actor: feedActors.elena,
    eventText: "was credited as Lead vocals on Night Swim",
    release: {
      title: "Night Swim",
      artist: "Elena Shore",
      year: "2025",
      releaseType: "Single",
      role: "Lead vocals",
      image: nightSwimImage,
      provenance: "Verified through SPLIT",
      detail: "Lead vocal performance and final chorus ad-libs confirmed from the signed SPLIT record.",
      collaborators: ["Elena Shore", "Maya Rios", "Theo Grant"],
    },
  },
  {
    id: "feed-post-night-runner",
    type: "professional-post",
    createdAt: "2026-07-15T10:45:00Z",
    timestamp: "2 hr",
    visibility: "network",
    tabs: ["for-you", "network"],
    relevanceReason: "Because Juan has worked with two of your collaborators",
    actor: feedActors.juan,
    body: "Just released stems for Night Runner. Mixed a new vocal stack last night and added texture without losing the front-of-room feeling.",
    provenance: "Professional post",
    attachedRelease: {
      title: "Night Runner",
      artist: "Sofia Vega",
      role: "Mix revisions",
      image: fallingThroughImage,
      detail: "Session update tied to a released project in your network.",
    },
  },
  {
    id: "feed-brief-mechanical-royalties",
    type: "industry-brief",
    createdAt: "2026-07-14T18:30:00Z",
    timestamp: "Yesterday",
    visibility: "public",
    tabs: ["for-you", "stories"],
    relevanceReason: "Relevant to producers in your network",
    saved: false,
    label: "Industry brief",
    headline: "Understanding Mechanical Royalties for EPs",
    summary: "A concise guide to how mechanical royalties are generated, distributed, and claimed for EP releases.",
    image: songwritingNotesImage,
    readTime: "4 min read",
    body: {
      paragraphs: [
        "Mechanical royalties are generated when compositions are reproduced or distributed, including streaming, downloads, vinyl, and CDs.",
        "For EPs, the practical challenge is often metadata consistency. Writer shares, publisher information, ISWC/ISRC pairing, and release-level credits need to align before the project moves through distributors and collection societies.",
        "SPLIT can help collaborators keep the credit record clean before release day without exposing private deal terms in public feed surfaces.",
      ],
    },
  },
  {
    id: "feed-credit-glasshouse",
    type: "verified-credit",
    createdAt: "2026-07-14T15:05:00Z",
    timestamp: "1 day",
    visibility: "network",
    tabs: ["for-you", "network", "credits"],
    relevanceReason: "Because you viewed Maya Rios's credits",
    actor: feedActors.arlo,
    eventText: "confirmed Maya Rios's Production credit on Glasshouse",
    release: {
      title: "Glasshouse",
      artist: "Arlo Parks",
      year: "2024",
      releaseType: "EP",
      role: "Production",
      image: glasshouseImage,
      provenance: "Verified through SPLIT",
      detail: "Production credit verified on collaborated EP tracks only, with collaborators attached to the public credit record.",
      collaborators: ["Arlo Parks", "Maya Rios", "June Vale"],
    },
  },
];

export const feedCreatorSuggestions: FeedCreatorSuggestion[] = [
  {
    id: "suggest-maya",
    actor: feedActors.maya,
    reason: "12 mutual collaborators",
  },
  {
    id: "suggest-arlo",
    actor: feedActors.arlo,
    reason: "Released a new EP",
  },
  {
    id: "suggest-tobias",
    actor: feedActors.tobias,
    reason: "7 mutual collaborators",
  },
];
