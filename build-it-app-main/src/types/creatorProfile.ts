export type CreatorCredit = {
  id: string;
  title: string;
  artist: string;
  year: string;
  releaseType: string;
  contribution: string;
  image: string;
  verifiedAt: string;
  collaborators: string[];
  notes: string;
  collaboratedTracks?: {
    trackNumber: number;
    title: string;
    contribution: string;
  }[];
};

export type CreatorSpotlightItem = {
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
  duration: string;
  image: string;
  featured?: boolean;
  story?: {
    publishedAt: string;
    readTime: string;
    pullQuote: string;
    paragraphs: string[];
    credits: {
      label: string;
      names: string[];
    }[];
  };
};

export type CreatorProfile = {
  id: string;
  displayName: string;
  username: string;
  verified: boolean;
  profileImage: string;
  roles: string[];
  bio: string;
  location: string;
  verifiedCredits: number;
  socials: {
    instagram?: string;
    tiktok?: string;
    x?: string;
  };
  credits: CreatorCredit[];
  spotlight: CreatorSpotlightItem[];
};
