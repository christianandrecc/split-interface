import { describe, expect, it } from "vitest";
import {
  buildDashboardNotificationGroups,
  getDashboardNotificationPresentation,
  groupNotificationFeed,
  notificationCategory,
  splitNotificationActionLabel,
  splitNotificationIsVerifiedEvent,
} from "@/lib/dashboardNotifications";
import type { SplitNotification } from "@/lib/notificationStorage";

function notification(overrides: Partial<SplitNotification> = {}): SplitNotification {
  return {
    id: overrides.id ?? "notification-1",
    recipientUserId: "recipient-user",
    splitSheetId: "split-sheet-1",
    actorUserId: "actor-user",
    actorLabel: "Chori",
    eventType: overrides.eventType ?? "split_invite",
    title: overrides.title ?? "Split update",
    body: overrides.body ?? "A split sheet needs attention.",
    actionTarget: overrides.actionTarget ?? "messages",
    metadata: {},
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? "2026-08-20T22:00:00.000Z",
  };
}

describe("dashboard notification model", () => {
  it("categorizes every supported event and keeps unknown events in Updates", () => {
    for (const event of ["split_invite", "split_sent", "invite_accept", "invite_decline"]) expect(notificationCategory(event)).toBe("invites");
    for (const event of ["counter_offer", "split_accept", "split_reject"]) expect(notificationCategory(event)).toBe("proposals");
    for (const event of ["signature", "split_verified"]) expect(notificationCategory(event)).toBe("signatures");
    expect(notificationCategory("chat_message")).toBe("messages");
    for (const event of ["split_updated", "contract_delivery", "future_event"]) expect(notificationCategory(event)).toBe("updates");
  });

  it("combines type and unread filters without mutating notifications", () => {
    const items = [notification({ id: "read", eventType: "signature", readAt: "2026-09-16" }),
      notification({ id: "invite" }), notification({ id: "unread", eventType: "signature" })];
    expect(groupNotificationFeed(items, { category: "signatures", unreadOnly: true }).flatMap((group) => group.items.map((item) => item.id))).toEqual(["unread"]);
    expect(items.map((item) => item.id)).toEqual(["read", "invite", "unread"]);
    expect(groupNotificationFeed(items, { category: "messages" })).toEqual([]);
  });

  it("sorts by newest first and separates local calendar dates and older months", () => {
    const now = new Date(2026, 8, 16, 12);
    const dated = (id: string, date: Date) => notification({ id, createdAt: date.toISOString() });
    const groups = groupNotificationFeed([
      dated("august", new Date(2026, 7, 20, 10)),
      dated("this-week", new Date(2026, 8, 14, 10)),
      dated("today", new Date(2026, 8, 16, 9)),
      dated("yesterday", new Date(2026, 8, 15, 23, 59)),
      notification({ id: "invalid", createdAt: "invalid" }),
      dated("september", new Date(2026, 8, 10, 10)),
    ], { now });
    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "This week", "September 2026", "August 2026", "Earlier"]);
    expect(groups.flatMap((group) => group.items.map((item) => item.id))).toEqual(["today", "yesterday", "this-week", "september", "august", "invalid"]);
  });

  it("maps action targets to dashboard button labels", () => {
    expect(splitNotificationActionLabel("messages")).toBe("Open messages");
    expect(splitNotificationActionLabel("agreement")).toBe("View split");
    expect(splitNotificationActionLabel("activity")).toBe("View activity");
  });

  it("presents message, counter, rejection, signing, and fallback notification types", () => {
    expect(getDashboardNotificationPresentation(notification({ eventType: "chat_message" }))).toMatchObject({
      iconKey: "message",
      toneKey: "primary",
    });
    expect(getDashboardNotificationPresentation(notification({ eventType: "counter_offer" }))).toMatchObject({
      iconKey: "counter",
      toneKey: "amended",
    });
    expect(getDashboardNotificationPresentation(notification({ eventType: "split_reject" }))).toMatchObject({
      iconKey: "alert",
      toneKey: "danger",
    });
    expect(getDashboardNotificationPresentation(notification({ eventType: "signature", actionTarget: "agreement" }))).toMatchObject({
      actionLabel: "View split",
      iconKey: "check",
      toneKey: "verified",
    });
    expect(getDashboardNotificationPresentation(notification({ eventType: "split_invite" }))).toMatchObject({
      iconKey: "file",
      toneKey: "default",
    });
  });

  it("groups unread priority items separately from verified activity", () => {
    const groups = buildDashboardNotificationGroups([
      notification({ id: "invite", eventType: "split_invite" }),
      notification({ id: "signed", eventType: "signature", readAt: "2026-08-20T22:02:00.000Z" }),
      notification({ id: "verified", eventType: "split_verified" }),
      notification({ id: "chat", eventType: "chat_message", readAt: "2026-08-20T22:03:00.000Z" }),
    ]);

    expect(groups.needsAction).toBe(2);
    expect(groups.priorityItems.map((item) => item.id)).toEqual(["invite", "verified"]);
    expect(groups.executed).toBe(2);
    expect(groups.executedItems.map((item) => item.id)).toEqual(["signed", "verified"]);
  });

  it("keeps only signature and split verified events in the verified bucket", () => {
    expect(splitNotificationIsVerifiedEvent("signature")).toBe(true);
    expect(splitNotificationIsVerifiedEvent("split_verified")).toBe(true);
    expect(splitNotificationIsVerifiedEvent("split_accept")).toBe(false);
    expect(splitNotificationIsVerifiedEvent("invite_accept")).toBe(false);
  });
});
