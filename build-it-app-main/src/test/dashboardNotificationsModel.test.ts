import { describe, expect, it } from "vitest";
import {
  buildDashboardNotificationGroups,
  getDashboardNotificationPresentation,
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
