export type NegotiationMessageType = "text" | "proposal" | "counter" | "accept" | "reject";

export type DealParticipant = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  role: string;
};

export type SplitAllocation = {
  participantId: string;
  name: string;
  role: string;
  percent: number;
};

export type SplitVersion = {
  id: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy: string;
  originatingMessageId?: string;
  note: string;
  allocations: SplitAllocation[];
  revenueStreams: {
    id: string;
    label: string;
    status: string;
  }[];
};

export type NegotiationMessage = {
  id: string;
  type: NegotiationMessageType;
  senderId: string;
  createdAt: string;
  body: string;
  proposedSplitId?: string;
  respondsToMessageId?: string;
  acceptedBy?: string[];
};

export type NegotiationDeal = {
  id: string;
  title: string;
  artist: string;
  status: "negotiating" | "ready_to_sign" | "signed";
  unreadCount: number;
  updatedAt: string;
  participants: DealParticipant[];
  requiredSignerIds: string[];
  acceptedBy: string[];
  currentVersionId: string;
  splitVersions: SplitVersion[];
  messages: NegotiationMessage[];
};

export const currentUserId = "user-christian";

export const mockNegotiationDeals: NegotiationDeal[] = [
  {
    id: "deal-moonlight",
    title: "Moonlight Sessions",
    artist: "Jordan Rivers",
    status: "negotiating",
    unreadCount: 2,
    updatedAt: "10:24 AM",
    requiredSignerIds: ["user-christian", "user-jordan", "user-marcus"],
    acceptedBy: ["user-jordan"],
    currentVersionId: "moon-v2",
    participants: [
      { id: "user-christian", name: "Christian", handle: "@christianandrecc", initials: "CP", role: "Producer" },
      { id: "user-jordan", name: "Jordan Rivers", handle: "@jordanrivers", initials: "JR", role: "Writer" },
      { id: "user-marcus", name: "Marcus Webb", handle: "@marcuswebb", initials: "MW", role: "Composer" },
    ],
    splitVersions: [
      {
        id: "moon-v1",
        version: 1,
        title: "Initial draft",
        createdAt: "9:42 AM",
        createdBy: "user-jordan",
        note: "Original split sent with Jordan leading lyric and topline.",
        allocations: [
          { participantId: "user-christian", name: "Christian", role: "Producer", percent: 35 },
          { participantId: "user-jordan", name: "Jordan Rivers", role: "Writer", percent: 45 },
          { participantId: "user-marcus", name: "Marcus Webb", role: "Composer", percent: 20 },
        ],
        revenueStreams: [
          { id: "composition", label: "Composition", status: "Negotiating" },
          { id: "publishing", label: "Publishing admin", status: "Private routing" },
          { id: "master", label: "Master royalty note", status: "Not included" },
        ],
      },
      {
        id: "moon-v2",
        version: 2,
        title: "Marcus counter",
        createdAt: "10:08 AM",
        createdBy: "user-marcus",
        originatingMessageId: "msg-4",
        note: "Marcus requested 25% for additional chord changes and bridge work.",
        allocations: [
          { participantId: "user-christian", name: "Christian", role: "Producer", percent: 35 },
          { participantId: "user-jordan", name: "Jordan Rivers", role: "Writer", percent: 40 },
          { participantId: "user-marcus", name: "Marcus Webb", role: "Composer", percent: 25 },
        ],
        revenueStreams: [
          { id: "composition", label: "Composition", status: "Needs consensus" },
          { id: "publishing", label: "Publishing admin", status: "Private routing" },
          { id: "master", label: "Master royalty note", status: "Not included" },
        ],
      },
    ],
    messages: [
      {
        id: "msg-1",
        type: "text",
        senderId: "user-jordan",
        createdAt: "9:41 AM",
        body: "Sent the split for Moonlight. I started with the session notes from Tuesday.",
      },
      {
        id: "msg-2",
        type: "proposal",
        senderId: "user-jordan",
        createdAt: "9:42 AM",
        body: "Jordan proposed the initial 35 / 45 / 20 composition split.",
        proposedSplitId: "moon-v1",
      },
      {
        id: "msg-3",
        type: "text",
        senderId: "user-marcus",
        createdAt: "10:02 AM",
        body: "I added the bridge progression and cleaned up the pre-hook, so I think my share should move up a bit.",
      },
      {
        id: "msg-4",
        type: "counter",
        senderId: "user-marcus",
        createdAt: "10:08 AM",
        body: "Marcus countered with 35 / 40 / 25.",
        proposedSplitId: "moon-v2",
      },
      {
        id: "msg-5",
        type: "accept",
        senderId: "user-jordan",
        createdAt: "10:16 AM",
        body: "Jordan accepted v2.",
        proposedSplitId: "moon-v2",
      },
    ],
  },
  {
    id: "deal-frequency",
    title: "Frequency",
    artist: "Aisha Nkosi",
    status: "ready_to_sign",
    unreadCount: 0,
    updatedAt: "Yesterday",
    requiredSignerIds: ["user-christian", "user-aisha"],
    acceptedBy: ["user-aisha", "user-christian"],
    currentVersionId: "freq-v1",
    participants: [
      { id: "user-christian", name: "Christian", handle: "@christianandrecc", initials: "CP", role: "Producer" },
      { id: "user-aisha", name: "Aisha Nkosi", handle: "@aishankosi", initials: "AN", role: "Writer" },
    ],
    splitVersions: [
      {
        id: "freq-v1",
        version: 1,
        title: "Approved draft",
        createdAt: "Yesterday",
        createdBy: "user-aisha",
        note: "Both parties accepted the composition split.",
        allocations: [
          { participantId: "user-christian", name: "Christian", role: "Producer", percent: 40 },
          { participantId: "user-aisha", name: "Aisha Nkosi", role: "Writer", percent: 60 },
        ],
        revenueStreams: [
          { id: "composition", label: "Composition", status: "Accepted" },
          { id: "publishing", label: "Publishing admin", status: "Private routing" },
        ],
      },
    ],
    messages: [
      {
        id: "freq-msg-1",
        type: "proposal",
        senderId: "user-aisha",
        createdAt: "Yesterday",
        body: "Aisha proposed 40 / 60.",
        proposedSplitId: "freq-v1",
      },
      {
        id: "freq-msg-2",
        type: "accept",
        senderId: "user-christian",
        createdAt: "Yesterday",
        body: "Christian accepted v1.",
        proposedSplitId: "freq-v1",
      },
    ],
  },
  {
    id: "deal-depth",
    title: "Depth Charge",
    artist: "Elara Sound",
    status: "negotiating",
    unreadCount: 1,
    updatedAt: "Mon",
    requiredSignerIds: ["user-christian", "user-elara", "user-knox"],
    acceptedBy: [],
    currentVersionId: "depth-v1",
    participants: [
      { id: "user-christian", name: "Christian", handle: "@christianandrecc", initials: "CP", role: "Producer" },
      { id: "user-elara", name: "Elara Sound", handle: "@elarasound", initials: "ES", role: "Artist" },
      { id: "user-knox", name: "T-Knox", handle: "@tknox", initials: "TK", role: "Beatmaker" },
    ],
    splitVersions: [
      {
        id: "depth-v1",
        version: 1,
        title: "Draft under review",
        createdAt: "Mon",
        createdBy: "user-elara",
        note: "Draft includes beat composition and topline.",
        allocations: [
          { participantId: "user-christian", name: "Christian", role: "Producer", percent: 30 },
          { participantId: "user-elara", name: "Elara Sound", role: "Artist", percent: 45 },
          { participantId: "user-knox", name: "T-Knox", role: "Beatmaker", percent: 25 },
        ],
        revenueStreams: [
          { id: "composition", label: "Composition", status: "Negotiating" },
          { id: "sample", label: "Sample clearance", status: "Needs note" },
        ],
      },
    ],
    messages: [
      {
        id: "depth-msg-1",
        type: "text",
        senderId: "user-knox",
        createdAt: "Mon",
        body: "Can we clarify if the intro loop is counted as a sample or an original replay?",
      },
    ],
  },
];
