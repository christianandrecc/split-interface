import type { SplitNotification, SplitNotificationActionTarget } from "@/lib/notificationStorage";
import { format, isSameDay, isValid, startOfWeek, subDays } from "date-fns";

export const NOTIFICATION_CATEGORIES = [
  { value: "all", label: "All types" },
  { value: "invites", label: "Invites" },
  { value: "proposals", label: "Proposals" },
  { value: "signatures", label: "Signatures" },
  { value: "messages", label: "Messages" },
  { value: "updates", label: "Updates" },
] as const;

export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number]["value"];

export function notificationCategory(eventType: string): Exclude<NotificationCategory, "all"> {
  if (["split_invite", "split_sent", "invite_accept", "invite_decline"].includes(eventType)) return "invites";
  if (["counter_offer", "split_accept", "split_reject"].includes(eventType)) return "proposals";
  if (VERIFIED_NOTIFICATION_EVENTS.has(eventType)) return "signatures";
  if (eventType === "chat_message") return "messages";
  return "updates";
}

export function groupNotificationFeed(
  notifications: SplitNotification[],
  { unreadOnly = false, category = "all", now = new Date() }: { unreadOnly?: boolean; category?: NotificationCategory; now?: Date } = {},
) {
  const groups = new Map<string, SplitNotification[]>();
  const timestamp = (value: string) => new Date(value).getTime() || 0;
  const visible = notifications.filter((item) => (!unreadOnly || !item.readAt) &&
    (category === "all" || notificationCategory(item.eventType) === category))
    .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));

  for (const item of visible) {
    const date = new Date(item.createdAt);
    const label = !isValid(date) ? "Earlier"
      : isSameDay(date, now) ? "Today"
      : isSameDay(date, subDays(now, 1)) ? "Yesterday"
      : date >= startOfWeek(now, { weekStartsOn: 1 }) && date <= now ? "This week"
      : format(date, "MMMM yyyy");
    const group = groups.get(label) ?? [];
    group.push(item);
    groups.set(label, group);
  }

  return Array.from(groups, ([label, items]) => ({ label, items }));
}

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
