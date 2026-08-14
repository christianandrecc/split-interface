import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

type SplitNotificationRow = Tables<"split_notifications">;

export type SplitNotificationActionTarget = "messages" | "agreement" | "activity";

export type SplitNotification = {
  id: string;
  recipientUserId: string;
  splitSheetId: string | null;
  actorUserId: string | null;
  actorLabel: string;
  eventType: string;
  title: string;
  body: string;
  actionTarget: SplitNotificationActionTarget;
  metadata: Json;
  readAt: string | null;
  createdAt: string;
};

function normalizeActionTarget(value?: string | null): SplitNotificationActionTarget {
  if (value === "agreement" || value === "activity") return value;
  return "messages";
}

function rowToNotification(row: SplitNotificationRow): SplitNotification {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    splitSheetId: row.split_sheet_id,
    actorUserId: row.actor_user_id,
    actorLabel: row.actor_label,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    actionTarget: normalizeActionTarget(row.action_target),
    metadata: row.metadata,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function loadSplitNotifications(limit = 30): Promise<SplitNotification[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase.rpc("load_my_split_notifications", {
      p_limit: limit,
    });

    if (error) throw new Error(error.message);

    return ((data ?? []) as SplitNotificationRow[]).map(rowToNotification);
  } catch (error) {
    console.warn("SPLIT could not load notifications from Supabase.", error);
    return [];
  }
}

export async function markSplitNotificationsRead(options: {
  notificationIds?: string[];
  splitSheetId?: string | null;
} = {}) {
  if (!isSupabaseConfigured) return 0;

  const notificationIds = options.notificationIds?.length ? options.notificationIds : null;
  const splitSheetId = options.splitSheetId || null;

  try {
    const { data, error } = await supabase.rpc("mark_split_notifications_read", {
      p_notification_ids: notificationIds,
      p_split_sheet_id: splitSheetId,
    });

    if (error) throw new Error(error.message);
    return Number(data) || 0;
  } catch (error) {
    console.warn("SPLIT could not mark notifications as read.", error);
    return 0;
  }
}

export async function subscribeToSplitNotifications(
  onNotification: (notification: SplitNotification) => void,
) {
  if (!isSupabaseConfigured) return () => undefined;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return () => undefined;

  const channel = supabase
    .channel(`split-notifications:${data.user.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "split_notifications",
        filter: `recipient_user_id=eq.${data.user.id}`,
      },
      (payload) => {
        onNotification(rowToNotification(payload.new as SplitNotificationRow));
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
