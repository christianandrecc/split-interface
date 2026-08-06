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
