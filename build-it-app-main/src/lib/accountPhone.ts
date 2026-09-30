import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { supabase } from "@/integrations/supabase/client";

export type AccountPhone = { userId: string; required: boolean; verified: boolean; phone: string; pendingPhone: string };

export function normalizeAccountPhone(value: string) {
  const phone = parsePhoneNumberFromString(value);
  if (!value.trim().startsWith("+") || !phone?.isValid()) throw new Error("Enter a valid phone number, including its country code.");
  return phone.number;
}

async function requireAccount(userId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !userId || data.user?.id !== userId || !data.user.email_confirmed_at) {
    throw new Error("Confirm your email and sign in to this account before verifying your phone.");
  }
  return data.user;
}

export async function loadAccountPhone(userId: string): Promise<AccountPhone> {
  await requireAccount(userId);
  const { data, error } = await supabase.rpc("my_phone_verification_status");
  if (error) throw new Error("Could not check phone verification. Please retry.");
  const state = data as unknown as AccountPhone;
  if (!state || state.userId !== userId || typeof state.required !== "boolean" || typeof state.verified !== "boolean") {
    throw new Error("Your account changed. Sign in again.");
  }
  if (state.verified) await syncVerifiedPhone(state.phone);
  return state;
}

async function syncVerifiedPhone(phone: string) {
  const parsed = parsePhoneNumberFromString(`+${phone.replace(/\D/g, "")}`);
  if (!parsed?.isValid()) throw new Error("Could not read the verified phone number. Contact SPLIT.");
  const synced = await supabase.rpc("sync_my_verified_phone", { p_country_code: `+${parsed.countryCallingCode}`, p_national_number: parsed.nationalNumber });
  if (synced.error) throw new Error("Phone verified, but the profile could not sync. Check status to retry.");
}

function phoneError(error: { code?: string }) {
  if (["over_sms_send_rate_limit", "over_request_rate_limit", "sms_send_frequency_limit"].includes(error.code ?? "")) {
    return new Error("Please wait a minute before requesting another text.");
  }
  if (["phone_provider_disabled", "sms_provider_disabled"].includes(error.code ?? "")) {
    return new Error("SMS verification is not available yet. Contact SPLIT before continuing.");
  }
  if (["otp_expired", "otp_disabled"].includes(error.code ?? "")) return new Error("That code is invalid or expired. Check it or request a new code.");
  return new Error("Phone verification could not be completed. Check the number and code, then try again.");
}

export async function requestPhoneVerification(userId: string, value: string) {
  const phone = normalizeAccountPhone(value);
  await requireAccount(userId);
  const { data, error } = await supabase.auth.updateUser({ phone });
  if (error) throw phoneError(error);
  if (data.user?.id !== userId) throw new Error("Your account changed. Sign in again.");
  return phone;
}

export async function confirmPhoneVerification(userId: string, value: string, code: string) {
  const phone = normalizeAccountPhone(value);
  if (!/^\d{6}$/.test(code.trim())) throw new Error("Enter the six-digit code from your text message.");
  await requireAccount(userId);
  const { data, error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: "phone_change" });
  if (error) throw phoneError(error);
  if (data.user?.id !== userId) throw new Error("Your account changed. Sign in again.");
  const current = await requireAccount(userId);
  if (!current.phone_confirmed_at || current.phone?.replace(/\D/g, "") !== phone.replace(/\D/g, "")) {
    throw new Error("This phone has not been verified. Check its status before continuing.");
  }
  return loadAccountPhone(userId);
}
