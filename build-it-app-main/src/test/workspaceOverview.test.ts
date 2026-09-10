import { describe, expect, it, vi } from "vitest";
import type { StoredSplitSheetDocument } from "@/components/contract-builder/document";
import type { SplitNotification } from "@/lib/notificationStorage";
import { documentToAgreement } from "@/lib/splitSheetAgreement";
import { createEmptyProfile } from "@/lib/userProfile";
import {
  filterWorkspaceRecords,
  workspaceActivity,
  workspaceDate,
  workspaceRecord,
} from "@/lib/workspaceOverview";
import { makeDocument } from "@/test/fixtures/splitSheet";

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

function makeViewer(username = "chori") {
  return {
    ...createEmptyProfile(),
    username,
    emailAddress: `${username}@example.com`,
  };
}

function makeSentDocument(overrides: Partial<StoredSplitSheetDocument> = {}): StoredSplitSheetDocument {
  const document = makeDocument();
  return { ...document, sentAt: document.createdAt, ...overrides };
}

function makeVersionedDocument() {
  const document = makeSentDocument();
  const initialProposal = document.splitProposalVersions[0];
  document.currentProposalId = "proposal-2";
  document.splitProposalVersions = [[60, 40], [25, 75], [10, 90]].map((percentages, index) => ({
    ...initialProposal,
    id: `proposal-${index + 1}`,
    versionNumber: index + 1,
    allocations: initialProposal.allocations.map((allocation, partyIndex) => ({
      ...allocation,
      percentage: percentages[partyIndex],
    })),
  }));
  return document;
}

function makeNotification(overrides: Partial<SplitNotification> = {}): SplitNotification {
  return {
    id: "notification-1",
    recipientUserId: "recipient-user",
    splitSheetId: "notification-record",
    actorUserId: "actor-user",
    actorLabel: "Maya Rios",
    eventType: "split_accept",
    title: "Proposal accepted",
    body: "Maya accepted the current proposal.",
    actionTarget: "messages",
    metadata: {},
    readAt: null,
    createdAt: "2026-08-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("workspaceRecord", () => {
  it("does not offer signing while another invitation is pending", () => {
    const document = makeSentDocument({ status: "Ready to Sign" });
    document.collaboratorInvites[0].status = "Pending";
    document.splitSignatures = [{ id: "pending-signature", proposalVersionId: document.currentProposalId!, collaboratorId: "creator", collaboratorName: "Chori", status: "Pending" }];
    expect(workspaceRecord(documentToAgreement(document), makeViewer()).actionLabel).toBe("Open messages");
  });
  it("uses the selected proposal instead of party percentages or the last proposal", () => {
    const document = makeVersionedDocument();
    const agreement = documentToAgreement(document);
    const record = workspaceRecord(agreement, makeViewer());

    expect(agreement.splits.map((allocation) => allocation.percent)).toEqual([60, 40]);
    expect(record.allocations).toEqual([
      { name: "Chori", percent: 25 },
      { name: "Maya Rios", percent: 75 },
    ]);
    expect(document.data.parties.map((party) => party.percent)).toEqual([60, 40]);
  });

  it.each(["missing-proposal", undefined])("falls back to the last proposal for current ID %s", (currentProposalId) => {
    const document = makeVersionedDocument();
    document.currentProposalId = currentProposalId;

    const record = workspaceRecord(documentToAgreement(document), makeViewer());

    expect(record.allocations.map((allocation) => allocation.percent)).toEqual([10, 90]);
  });

  it("uses agreement splits when no proposal is available", () => {
    const agreement = documentToAgreement(makeSentDocument());
    agreement.document!.splitProposalVersions = [];

    expect(workspaceRecord(agreement, makeViewer()).allocations).toEqual(agreement.splits);
  });

  it.each(["Pending Collaborator Acceptance", "Pending Split Approval"] as const)(
    "%s offers invite review only to the invited viewer",
    (status) => {
      const document = makeSentDocument({ status });
      document.collaboratorInvites[0].status = "Pending";
      const agreement = documentToAgreement(document);

      expect(workspaceRecord(agreement, makeViewer())).toMatchObject({
        reviewInvite: false,
        action: "messages",
        actionLabel: "Open messages",
      });
      expect(workspaceRecord(agreement, makeViewer("mayarios"))).toMatchObject({
        reviewInvite: true,
        action: "messages",
        actionLabel: "Review invite",
      });
    },
  );

  it.each(["Accepted", "Declined"] as const)("does not offer invite review for a %s invite", (status) => {
    const document = makeSentDocument();
    document.collaboratorInvites[0].status = status;

    expect(workspaceRecord(documentToAgreement(document), makeViewer("mayarios"))).toMatchObject({
      reviewInvite: false,
      action: "messages",
      actionLabel: "Open messages",
    });
  });

  it.each(["Ready to Sign", "Pending Signatures"] as const)(
    "%s prompts the unsigned viewer even if they signed an older proposal",
    (status) => {
      const document = makeVersionedDocument();
      document.status = status;
      document.splitSignatures = [
        { id: "old-maya", proposalVersionId: "proposal-1", collaboratorId: "maya-invite", collaboratorName: "Maya Rios", status: "Signed" },
        { id: "current-maya", proposalVersionId: "proposal-2", collaboratorId: "maya-party", collaboratorName: "Maya Rios", status: "Pending" },
        { id: "current-creator", proposalVersionId: "proposal-2", collaboratorId: "creator-party", collaboratorName: "Chori", status: "Signed" },
      ];
      const agreement = documentToAgreement(document);

      expect(workspaceRecord(agreement, makeViewer("mayarios"))).toMatchObject({ action: "messages", actionLabel: "Review & sign" });
      expect(workspaceRecord(agreement, makeViewer())).toMatchObject({ action: "messages", actionLabel: "Open messages" });
    },
  );

  it.each(["Ready to Sign", "Pending Signatures"] as const)(
    "%s does not prompt an already-signed viewer because another or older signature is pending",
    (status) => {
      const document = makeVersionedDocument();
      document.status = status;
      document.splitSignatures = [
        { id: "old-maya", proposalVersionId: "proposal-1", collaboratorId: "maya-party", collaboratorName: "Maya Rios", status: "Pending" },
        { id: "current-maya", proposalVersionId: "proposal-2", collaboratorId: "maya-invite", collaboratorName: "Maya Rios", status: "Signed" },
        { id: "current-creator", proposalVersionId: "proposal-2", collaboratorId: "creator", collaboratorName: "Chori", status: "Pending" },
      ];
      const agreement = documentToAgreement(document);

      expect(workspaceRecord(agreement, makeViewer("mayarios"))).toMatchObject({ action: "messages", actionLabel: "Open messages" });
      expect(workspaceRecord(agreement, makeViewer())).toMatchObject({ action: "messages", actionLabel: "Review & sign" });
    },
  );

  it.each(["Fully Signed", "Verified and Stored", "Executed", "Archived"] as const)(
    "%s opens the record rather than an outstanding invite or signature",
    (status) => {
      const document = makeSentDocument({ status });
      document.collaboratorInvites[0].status = "Pending";
      document.splitSignatures = [
        { id: "maya-signature", proposalVersionId: "proposal-1", collaboratorId: "maya-invite", collaboratorName: "Maya Rios", status: "Pending" },
      ];

      expect(workspaceRecord(documentToAgreement(document), makeViewer("mayarios"))).toMatchObject({
        pending: false,
        signed: status !== "Archived",
        reviewInvite: false,
        label: status === "Archived" ? "Archived" : "Signed",
        action: "agreement",
        actionLabel: "View record",
      });
    },
  );

  it("opens an unsent draft as a draft, not Messages", () => {
    const document = makeDocument();
    document.status = "Draft";

    expect(workspaceRecord(documentToAgreement(document), makeViewer())).toMatchObject({
      pending: false,
      signed: false,
      label: "Draft",
      action: "agreement",
      actionLabel: "View draft",
    });
  });

  it("does not send an unsent non-draft record to Messages", () => {
    expect(workspaceRecord(documentToAgreement(makeDocument()), makeViewer())).toMatchObject({
      action: "agreement",
      actionLabel: "View record",
    });
  });
});

describe("filterWorkspaceRecords", () => {
  function makeRecords() {
    return ([
      ["review", "Pending Split Approval", "Zulu", "10"],
      ["draft", "Draft", "Alpha", "13"],
      ["archived", "Archived", "Bravo", "09"],
      ["signed", "Verified and Stored", "Delta", "12"],
      ["dispute", "Disputed", "Echo", "11"],
    ] as const).map(([id, status, title, hour]) => {
      const document = makeSentDocument({ id, status, updatedAt: `2026-08-12T${hour}:00:00.000Z` });
      document.data.songTitle = title;
      return workspaceRecord(documentToAgreement(document), makeViewer());
    });
  }

  it.each([
    ["all", ["draft", "archived", "signed", "dispute", "review"]],
    ["attention", ["dispute", "review"]],
    ["signed", ["signed"]],
    ["drafts", ["draft"]],
    ["archived", ["archived"]],
  ] as const)("filters the %s status bucket", (filter, expectedIds) => {
    expect(filterWorkspaceRecords(makeRecords(), filter, "", "title").map((record) => record.agreement.id)).toEqual(expectedIds);
  });

  it.each([
    ["recent", ["draft", "signed", "dispute", "review", "archived"]],
    ["oldest", ["archived", "review", "dispute", "signed", "draft"]],
    ["title", ["draft", "archived", "signed", "dispute", "review"]],
  ] as const)("sorts by %s without mutating the input order", (sort, expectedIds) => {
    const records = makeRecords();
    const originalOrder = records.slice();

    expect(filterWorkspaceRecords(records, "all", "", sort).map((record) => record.agreement.id)).toEqual(expectedIds);
    expect(records).toEqual(originalOrder);
  });

  it.each(["  MOONRISE  ", "neon HARBOR", "xyz987", "MAYA RIOS", "guest writer"])(
    "searches titles, artists, document numbers, parties, and allocations for %s",
    (query) => {
      const document = makeSentDocument({ documentNumber: "SPLIT-20260812-XYZ987" });
      document.data.songTitle = "Moonrise";
      document.data.artistProjectName = "Neon Harbor";
      document.splitProposalVersions[0].allocations.push({ partyId: "guest", name: "Guest Writer", role: "Songwriter", percentage: 0 });
      const record = workspaceRecord(documentToAgreement(document), makeViewer());

      expect(filterWorkspaceRecords([record], "all", query, "recent")).toEqual([record]);
    },
  );

  it("combines the status and search filters and returns no unmatched records", () => {
    const records = makeRecords();

    expect(filterWorkspaceRecords(records, "attention", "  ZULU  ", "recent").map((record) => record.agreement.id)).toEqual(["review"]);
    expect(filterWorkspaceRecords(records, "signed", "Zulu", "recent")).toEqual([]);
    expect(filterWorkspaceRecords(records, "all", "not a song", "recent")).toEqual([]);
    expect(filterWorkspaceRecords([], "all", "", "recent")).toEqual([]);
  });
});

describe("workspaceActivity", () => {
  it("combines another record's audit with notifications, excluding internal chat and inaccessible records", () => {
    const auditDocument = makeSentDocument({ id: "audit-record", status: "Verified and Stored" });
    auditDocument.auditTrail = [
      { timestamp: "2026-08-12T13:00:00.000Z", actor: "Maya Rios", action: "Sent a negotiation message" },
      { timestamp: "2026-08-12T11:00:00.000Z", actor: "Chori", action: "Created split proposal v2 from Messages" },
      { timestamp: "2026-08-12T12:00:00.000Z", actor: "Maya Rios", action: '__splitChatMessages:{"body":"signed chat payload"}' },
      { timestamp: "2026-08-12T09:00:00.000Z", actor: "Chori", action: "SPLIT Sheet preview generated" },
      { timestamp: "2026-08-12T14:00:00.000Z", actor: "Maya Rios", action: "Sent a message in Messages" },
    ];
    const originalAudit = auditDocument.auditTrail.slice();
    const notificationDocument = makeSentDocument({ id: "notification-record", auditTrail: [{ timestamp: "2026-08-12T09:00:00.000Z", actor: "Chori", action: "SPLIT Sheet preview generated" }] });
    const notification = makeNotification();
    const notifications = [
      notification,
      makeNotification({ id: "unavailable", splitSheetId: "unavailable-record", createdAt: "2026-08-12T15:00:00.000Z" }),
      makeNotification({ id: "no-record", splitSheetId: null, createdAt: "2026-08-12T16:00:00.000Z" }),
    ];
    const originalNotifications = notifications.slice();

    const activity = workspaceActivity([auditDocument, notificationDocument].map(documentToAgreement), notifications);

    expect(activity).toEqual([
      {
        id: "audit-record-2026-08-12T11:00:00.000Z",
        agreementId: "audit-record",
        text: "Chori: Created split proposal v2 from Messages - Night Swim",
        createdAt: "2026-08-12T11:00:00.000Z",
        signed: false,
        notification: undefined,
      },
      {
        id: notification.id,
        agreementId: "notification-record",
        text: notification.body,
        createdAt: notification.createdAt,
        signed: false,
        notification,
      },
    ]);
    expect(auditDocument.auditTrail).toEqual(originalAudit);
    expect(notifications).toEqual(originalNotifications);
  });

  it("uses a notification's title when its body is empty and does not duplicate the record's audit", () => {
    const document = makeSentDocument({ id: "notification-record" });
    const notification = makeNotification({ body: "", title: "Split verified", eventType: "split_verified", createdAt: document.updatedAt });

    expect(workspaceActivity([documentToAgreement(document)], [notification])).toEqual([
      expect.objectContaining({ id: notification.id, text: "Split verified", signed: true, notification }),
    ]);
  });

  it("keeps a newer signing audit even when the record has an older notification", () => {
    const document = makeSentDocument({ id: "notification-record", auditTrail: [{ timestamp: "2026-08-12T13:00:00.000Z", actor: "Chori", action: "Signed the split sheet" }] });
    const activity = workspaceActivity([documentToAgreement(document)], [makeNotification()]);
    expect(activity[0]).toMatchObject({ signed: true, createdAt: "2026-08-12T13:00:00.000Z" });
    expect(activity[1].notification?.id).toBe("notification-1");
  });

  it("returns only the three newest combined events, using audit timestamps rather than record update times", () => {
    const documents = ["08", "11", "13"].map((hour) => makeSentDocument({
      id: `audit-${hour}`,
      updatedAt: "2026-08-12T23:00:00.000Z",
      auditTrail: [{ timestamp: `2026-08-12T${hour}:00:00.000Z`, actor: "Chori", action: "Signed the split sheet" }],
    }));
    documents.push(makeSentDocument({ id: "notification-record" }));
    const notification = makeNotification({ createdAt: "2026-08-12T12:00:00.000Z" });

    const activity = workspaceActivity(documents.map(documentToAgreement), [notification]);

    expect(activity.map((item) => item.agreementId)).toEqual(["audit-13", "notification-record", "audit-11"]);
    expect(activity.map((item) => item.signed)).toEqual([true, false, true]);
  });

  it("does not fabricate activity for empty records or records containing only internal chat events", () => {
    const emptyDocument = makeSentDocument({ id: "empty", status: "Fully Signed", auditTrail: [] });
    const chatDocument = makeSentDocument({
      id: "chat-only",
      auditTrail: [{ timestamp: "2026-08-12T12:00:00.000Z", actor: "Maya Rios", action: "__splitChatMessages:invalid-json" }],
    });

    expect(workspaceActivity([emptyDocument, chatDocument].map(documentToAgreement), [])).toEqual([]);
    expect(workspaceActivity([], [makeNotification()])).toEqual([]);
  });
});

describe("workspaceDate", () => {
  it("formats date-only values without shifting their calendar day", () => {
    expect(workspaceDate("2026-08-12")).toBe("Aug 12, 2026");
    expect(workspaceDate("2026-08-12", true)).toBe("Wed, Aug 12, 2026");
  });

  it("reports unavailable dates for invalid or empty values", () => {
    expect(workspaceDate("not-a-date")).toBe("Date unavailable");
    expect(workspaceDate("")).toBe("Date unavailable");
  });
});
