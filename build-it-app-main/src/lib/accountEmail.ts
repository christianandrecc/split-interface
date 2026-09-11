import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { getSupabaseAuthRedirectUrl, isValidEmailAddress, normalizeEmailAddress } from "@/lib/profileStorage";

export type AccountEmail = { userId: string; email: string; pendingEmail: string | null };

function readEmail(user: { id: string; email?: string; new_email?: string } | null, userId: string): AccountEmail {
  if (!userId || user?.id !== userId || !user.email) {
    throw new Error("Your account changed or your session expired. Sign in again.");
  }
  const email = normalizeEmailAddress(user.email);
  const pending = normalizeEmailAddress(user.new_email);
  return { userId, email, pendingEmail: pending && pending !== email ? pending : null };
}

export async function loadAccountEmail(userId: string): Promise<AccountEmail> {
  if (!isSupabaseConfigured) throw new Error("Connect your account before changing your email.");
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Could not verify your account email. Check your connection and try again.");
  return readEmail(data.user, userId);
}

function changeError(error: { code?: string }) {
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return new Error("Please wait a minute before requesting another confirmation email.");
  }
  return new Error("Could not request the email change. Check your connection and email address, then check status before trying again.");
}

export async function requestAccountEmailChange(userId: string, value: string): Promise<AccountEmail> {
  const email = normalizeEmailAddress(value);
  if (!isValidEmailAddress(email) || email.length > 254) throw new Error("Enter a valid email address.");
  const current = await loadAccountEmail(userId);
  if (email === current.email) throw new Error("This is already your account email.");
  if (email === current.pendingEmail) throw new Error("This address is already awaiting confirmation. Check your inboxes or resend the confirmation.");
  const { data, error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: getSupabaseAuthRedirectUrl() });
  if (error) throw changeError(error);
  const result = readEmail(data.user, userId);
  if (result.email !== email && result.pendingEmail !== email) {
    throw new Error("Could not verify the email change request. Check status before trying again.");
  }
  return result;
}

export async function resendAccountEmailChange(userId: string): Promise<AccountEmail> {
  const current = await loadAccountEmail(userId);
  if (!current.pendingEmail) return current;
  const { error } = await supabase.auth.resend({
    // GoTrue looks up the account by its current address, then sends to EmailChange.
    type: "email_change", email: current.email, options: { emailRedirectTo: getSupabaseAuthRedirectUrl() },
  });
  if (error) throw changeError(error);
  return current;
}
