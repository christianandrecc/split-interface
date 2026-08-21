import type { SplitNotification, SplitNotificationActionTarget } from "@/lib/notificationStorage";

export type DashboardNotificationIconKey = "message" | "counter" | "alert" | "check" | "file";
export type DashboardNotificationToneKey = "primary" | "amended" | "danger" | "verified" | "default";

export type DashboardNotificationPresentation = {
  iconKey: DashboardNotificationIconKey;
  toneKey: DashboardNotificationToneKey;
  actionLabel: string;
};

export type DashboardNotificationGroups = {
  priorityItems: SplitNotification[];
  executedItems: SplitNotification[];
  needsAction: number;
  executed: number;
};

const VERIFIED_NOTIFICATION_EVENTS = new Set(["signature", "split_verified"]);
const POSITIVE_NOTIFICATION_EVENTS = new Set(["signature", "split_verified", "split_accept", "invite_accept"]);
const NEGATIVE_NOTIFICATION_EVENTS = new Set(["split_reject", "invite_decline"]);

export function splitNotificationActionLabel(actionTarget: SplitNotificationActionTarget) {
  if (actionTarget === "agreement") return "View split";
  if (actionTarget === "activity") return "View activity";
  return "Open messages";
}

export function splitNotificationIsVerifiedEvent(eventType: string) {
  return VERIFIED_NOTIFICATION_EVENTS.has(eventType);
}

export function getDashboardNotificationPresentation(notification: SplitNotification): DashboardNotificationPresentation {
  const actionLabel = splitNotificationActionLabel(notification.actionTarget);

  if (notification.eventType === "chat_message") {
    return { iconKey: "message", toneKey: "primary", actionLabel };
  }

  if (notification.eventType === "counter_offer") {
    return { iconKey: "counter", toneKey: "amended", actionLabel };
  }

  if (NEGATIVE_NOTIFICATION_EVENTS.has(notification.eventType)) {
    return { iconKey: "alert", toneKey: "danger", actionLabel };
  }

  if (POSITIVE_NOTIFICATION_EVENTS.has(notification.eventType)) {
    return { iconKey: "check", toneKey: "verified", actionLabel };
  }

  return { iconKey: "file", toneKey: "default", actionLabel };
}

export function buildDashboardNotificationGroups(notifications: SplitNotification[]): DashboardNotificationGroups {
  const priorityItems = notifications.filter((notification) => !notification.readAt);
  const executedItems = notifications.filter((notification) => splitNotificationIsVerifiedEvent(notification.eventType));

  return {
    priorityItems,
    executedItems,
    needsAction: priorityItems.length,
    executed: executedItems.length,
  };
}
