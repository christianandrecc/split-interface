export type FeedTabId = "for-you" | "network" | "credits" | "stories";

export type FeedItemType = "verified-credit" | "editorial-story" | "professional-post" | "industry-brief";

export type FeedVisibility = "public" | "network";

export type FeedActor = {
  id: string;
  name: string;
  username: string;
  role?: string;
  avatar: string;
  verified?: boolean;
};

export type FeedRelease = {
  title: string;
  artist: string;
  year: string;
  releaseType: string;
  role: string;
  image: string;
  provenance: string;
  detail: string;
  collaborators?: string[];
};

export type FeedItemBase = {
  id: string;
  type: FeedItemType;
  createdAt: string;
  timestamp: string;
  relevanceReason?: string;
  saved?: boolean;
  visibility: FeedVisibility;
  tabs: FeedTabId[];
};

export type VerifiedCreditFeedItem = FeedItemBase & {
  type: "verified-credit";
  actor: FeedActor;
  eventText: string;
  release: FeedRelease;
};

export type EditorialStoryFeedItem = FeedItemBase & {
  type: "editorial-story";
  label: "SPLIT story" | "Editorial";
  headline: string;
  context: string;
  image: string;
  creators: FeedActor[];
  readTime: string;
  story: {
    publishedAt: string;
    pullQuote: string;
    paragraphs: string[];
    credits: { label: string; names: string[] }[];
  };
};

export type ProfessionalPostFeedItem = FeedItemBase & {
  type: "professional-post";
  actor: FeedActor;
  body: string;
  provenance: "Professional post" | "Creator confirmed";
  attachedRelease?: Pick<FeedRelease, "title" | "artist" | "role" | "image" | "detail">;
};

export type IndustryBriefFeedItem = FeedItemBase & {
  type: "industry-brief";
  label: "Industry brief";
  headline: string;
  summary: string;
  image?: string;
  readTime: string;
  body: {
    paragraphs: string[];
  };
};

export type FeedItem =
  | VerifiedCreditFeedItem
  | EditorialStoryFeedItem
  | ProfessionalPostFeedItem
  | IndustryBriefFeedItem;

export type FeedCreatorSuggestion = {
  id: string;
  actor: FeedActor;
  reason: string;
};
