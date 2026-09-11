import { ROLE_OPTIONS } from "@/components/contract-builder/types";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AppSettings = {
  defaultSplitMethod: "Equal" | "Custom";
  defaultTerritory: string;
  defaultUserRole: typeof ROLE_OPTIONS[number];
  includeAuditTrail: boolean;
};
export type SavedSettings = { settings: AppSettings; revision: number | null };
export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultSplitMethod: "Custom", defaultTerritory: "Worldwide", defaultUserRole: "Songwriter", includeAuditTrail: true,
};

export function validateAccountSettings(settings: AppSettings): AppSettings {
  if (!["Equal", "Custom"].includes(settings.defaultSplitMethod) || !ROLE_OPTIONS.includes(settings.defaultUserRole)
    || typeof settings.includeAuditTrail !== "boolean") throw new Error("Choose a valid split method and composition role.");
  const territory = typeof settings.defaultTerritory === "string" ? settings.defaultTerritory.trim() : "";
  if (!territory || territory.length > 100) throw new Error("Enter a society territory between 1 and 100 characters.");
  return { defaultSplitMethod: settings.defaultSplitMethod, defaultTerritory: territory,
    defaultUserRole: settings.defaultUserRole, includeAuditTrail: settings.includeAuditTrail };
}

async function requireAccount(userId: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured. Settings cannot be saved yet.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !userId || data.user?.id !== userId) throw new Error("Your account changed or your session expired. Sign in again.");
}

function readRow(row: Tables<"account_settings">, userId: string): SavedSettings {
  if (row.user_id !== userId || !Number.isSafeInteger(row.revision) || row.revision < 1) throw new Error("Could not verify the saved settings.");
  return { revision: row.revision, settings: validateAccountSettings({
    defaultSplitMethod: row.default_split_method as AppSettings["defaultSplitMethod"], defaultTerritory: row.default_territory,
    defaultUserRole: row.default_user_role as AppSettings["defaultUserRole"], includeAuditTrail: row.include_audit_trail,
  }) };
}

function storageError(error: { code?: string; message: string }) {
  if (error.code === "23505") return new Error("Settings changed in another tab. Reload saved settings before trying again.");
  if (["42P01", "PGRST205"].includes(error.code ?? "")) return new Error("Account settings are not available on this server yet. Apply the settings migration before saving.");
  return new Error("Could not reach your account settings. Check your connection and try again.");
}

export async function loadAccountSettings(userId: string): Promise<SavedSettings> {
  await requireAccount(userId);
  const { data, error } = await supabase.from("account_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw storageError(error);
  return data ? readRow(data, userId) : { settings: { ...DEFAULT_APP_SETTINGS }, revision: null };
}

export async function saveAccountSettings(userId: string, settings: AppSettings, revision: number | null): Promise<SavedSettings> {
  const valid = validateAccountSettings(settings);
  if (revision !== null && (!Number.isSafeInteger(revision) || revision < 1)) throw new Error("Reload saved settings before trying again.");
  await requireAccount(userId);
  const fields = { default_split_method: valid.defaultSplitMethod, default_territory: valid.defaultTerritory,
    default_user_role: valid.defaultUserRole, include_audit_trail: valid.includeAuditTrail };
  const table = supabase.from("account_settings");
  // Do not upsert: a first-save race must not overwrite another tab's preferences.
  const query = revision === null ? table.insert({ user_id: userId, ...fields })
    : table.update(fields).eq("user_id", userId).eq("revision", revision);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw storageError(error);
  if (!data) throw new Error("Settings changed in another tab. Reload saved settings before trying again.");
  return readRow(data, userId);
}
