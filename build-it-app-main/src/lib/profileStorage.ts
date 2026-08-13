import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import { formatNationalPhoneNumber } from "@/lib/phone";
import { normalizeUserProfile, type UserProfile } from "@/lib/userProfile";

type ProfileRow = Tables<"profiles">;
type ProfileInsert = TablesInsert<"profiles">;

export type ProfileStorageResult = {
  profile: UserProfile;
  saved: boolean;
  needsEmailConfirmation?: boolean;
};

export type PasswordResetResult = {
  sent: boolean;
};

const DEFAULT_AUTH_REDIRECT_URL = "https://split-interface.vercel.app/";
const LOCAL_AUTH_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.");
  }
}

function clean(value?: string | null) {
  const next = (value ?? "").trim();
  return next || null;
}

export function normalizeEmailAddress(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function isValidEmailAddress(value?: string | null) {
  const email = normalizeEmailAddress(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeHttpRedirectUrl(value?: string | null) {
  const rawValue = clean(value);
  if (!rawValue) return null;

  try {
    const url = new URL(rawValue);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    url.search = "";
    if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveSupabaseAuthRedirectUrl(currentOrigin?: string | null, configuredUrl?: string | null) {
  const configuredRedirect = normalizeHttpRedirectUrl(configuredUrl);
  if (configuredRedirect) return configuredRedirect;

  const currentRedirect = normalizeHttpRedirectUrl(currentOrigin);
  if (!currentRedirect) return DEFAULT_AUTH_REDIRECT_URL;

  try {
    const url = new URL(currentRedirect);
    if (url.protocol === "http:" && LOCAL_AUTH_HOSTS.has(url.hostname)) {
      return DEFAULT_AUTH_REDIRECT_URL;
    }
  } catch {
    return DEFAULT_AUTH_REDIRECT_URL;
  }

  return currentRedirect;
}

export function getSupabaseAuthRedirectUrl() {
  const configuredUrl =
    import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL ||
    import.meta.env.VITE_PUBLIC_APP_URL ||
    import.meta.env.VITE_APP_URL;
  const currentOrigin = typeof window === "undefined" ? null : window.location.origin;

  return resolveSupabaseAuthRedirectUrl(currentOrigin, configuredUrl);
}

function buildLegalName(profile: UserProfile) {
  return [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function buildLegalAddress(profile: UserProfile) {
  return [profile.addressLine, profile.city, profile.state, profile.zipCode, profile.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function phoneNumberForStorage(profile: UserProfile) {
  return formatNationalPhoneNumber(profile.phoneNumber, profile.phoneCountryCode);
}

export function stripStoredCountryCode(phoneNumber: string, countryCode: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  const countryDigits = countryCode.replace(/\D/g, "");

  if (countryDigits && digits.startsWith(countryDigits) && digits.length > countryDigits.length) {
    return digits.slice(countryDigits.length);
  }

  return phoneNumber;
}

export function phoneNumberFromRow(row: Pick<ProfileRow, "phone_country_code" | "phone_number">, payload: Partial<UserProfile>) {
  const countryCode = row.phone_country_code ?? payload.phoneCountryCode ?? "+1";
  const storedPhone = row.phone_number ?? payload.phoneNumber ?? "";

  return formatNationalPhoneNumber(stripStoredCountryCode(storedPhone, countryCode), countryCode);
}

function fullPhoneForMetadata(profile: UserProfile) {
  const number = formatNationalPhoneNumber(profile.phoneNumber, profile.phoneCountryCode);
  return [profile.phoneCountryCode, number].map((part) => part.trim()).filter(Boolean).join(" ");
}

function profileStoragePayload(profile: UserProfile): Omit<ProfileInsert, "user_id"> {
  const normalized = normalizeUserProfile(profile);
  const legalName = clean(normalized.legalName) ?? clean(buildLegalName(normalized));
  const legalAddress = clean(normalized.legalAddress) ?? clean(buildLegalAddress(normalized));
  const stageName = clean(normalized.pkaNames.split(",")[0]) ?? clean(normalized.displayName);

  return {
    username: clean(normalized.username),
    display_name: clean(normalized.displayName),
    profile_image_url: clean(normalized.profileImageUrl),
    role_tags: clean(normalized.roleTags),
    social_instagram: clean(normalized.socialInstagram),
    social_tiktok: clean(normalized.socialTikTok),
    social_x: clean(normalized.socialX),
    social_website: clean(normalized.socialWebsite),
    profile_location: clean(normalized.profileLocation),
    profile_visibility: clean(normalized.profileVisibility),
    email: clean(normalized.emailAddress),
    phone_country_code: clean(normalized.phoneCountryCode),
    phone_number: clean(phoneNumberForStorage(normalized)),
    legal_name: legalName,
    legal_first_name: clean(normalized.legalFirstName),
    legal_middle_name: clean(normalized.legalMiddleName),
    legal_last_name: clean(normalized.legalLastName),
    pka_names: clean(normalized.pkaNames),
    stage_name: stageName,
    legal_address: legalAddress,
    address_street: clean(normalized.addressLine),
    address_line: clean(normalized.addressLine),
    address_city: clean(normalized.city),
    address_state: clean(normalized.state),
    address_zip: clean(normalized.zipCode),
    address_country: clean(normalized.country),
    zip_code: clean(normalized.zipCode),
    city: clean(normalized.city),
    state: clean(normalized.state),
    country: clean(normalized.country),
    mlc_number: clean(normalized.mlcNumber),
    pro_affiliation: clean(normalized.proAffiliation),
    ipi_number: clean(normalized.ipiNumber),
    custom_pro_name: clean(normalized.customProName),
    publishing_status: clean(normalized.publishingStatus),
    publisher_name: clean(normalized.publisherName),
    publisher_ipi: clean(normalized.publisherIpi),
    publisher_pro: clean(normalized.publisherPro),
    publishing_share: clean(normalized.publishingShare),
    admin_company_name: clean(normalized.adminCompanyName),
    admin_ipi: clean(normalized.adminIpi),
    admin_collection_share: clean(normalized.adminCollectionShare),
    publisher_contact: clean(normalized.publisherContact),
    terms_accepted_at: clean(normalized.termsAcceptedAt),
    terms_version: clean(normalized.termsVersion),
    privacy_acknowledged_at: clean(normalized.privacyAcknowledgedAt),
    privacy_policy_version: clean(normalized.privacyPolicyVersion),
    profile_data: normalized as unknown as Json,
  };
}

function rowToProfile(row: ProfileRow): UserProfile {
  const payload = row.profile_data && typeof row.profile_data === "object" && !Array.isArray(row.profile_data)
    ? row.profile_data as Partial<UserProfile>
    : {};

  return normalizeUserProfile({
    ...payload,
    username: row.username ?? payload.username,
    displayName: row.display_name ?? payload.displayName,
    profileImageUrl: row.profile_image_url ?? payload.profileImageUrl,
    roleTags: row.role_tags ?? payload.roleTags,
    socialInstagram: row.social_instagram ?? payload.socialInstagram,
    socialTikTok: row.social_tiktok ?? payload.socialTikTok,
    socialX: row.social_x ?? payload.socialX,
    socialWebsite: row.social_website ?? payload.socialWebsite,
    profileLocation: row.profile_location ?? payload.profileLocation,
    profileVisibility: row.profile_visibility ?? payload.profileVisibility,
    legalName: row.legal_name ?? payload.legalName,
    legalFirstName: row.legal_first_name ?? payload.legalFirstName,
    legalMiddleName: row.legal_middle_name ?? payload.legalMiddleName,
    legalLastName: row.legal_last_name ?? payload.legalLastName,
    pkaNames: row.pka_names ?? row.stage_name ?? payload.pkaNames,
    phoneCountryCode: row.phone_country_code ?? payload.phoneCountryCode,
    phoneNumber: phoneNumberFromRow(row, payload),
    emailAddress: row.email ?? payload.emailAddress,
    legalAddress: row.legal_address ?? payload.legalAddress,
    addressLine: row.address_line ?? row.address_street ?? payload.addressLine,
    zipCode: row.zip_code ?? row.address_zip ?? payload.zipCode,
    city: row.city ?? row.address_city ?? payload.city,
    state: row.state ?? row.address_state ?? payload.state,
    country: row.country ?? row.address_country ?? payload.country,
    mlcNumber: row.mlc_number ?? payload.mlcNumber,
    proAffiliation: row.pro_affiliation ?? payload.proAffiliation,
    ipiNumber: row.ipi_number ?? payload.ipiNumber,
    customProName: row.custom_pro_name ?? payload.customProName,
    publishingStatus: row.publishing_status ?? payload.publishingStatus,
    publisherName: row.publisher_name ?? payload.publisherName,
    publisherIpi: row.publisher_ipi ?? payload.publisherIpi,
    publisherPro: row.publisher_pro ?? payload.publisherPro,
    publishingShare: row.publishing_share ?? payload.publishingShare,
    adminCompanyName: row.admin_company_name ?? payload.adminCompanyName,
    adminIpi: row.admin_ipi ?? payload.adminIpi,
    adminCollectionShare: row.admin_collection_share ?? payload.adminCollectionShare,
    publisherContact: row.publisher_contact ?? payload.publisherContact,
    termsAcceptedAt: row.terms_accepted_at ?? payload.termsAcceptedAt,
    termsVersion: row.terms_version ?? payload.termsVersion,
    privacyAcknowledgedAt: row.privacy_acknowledged_at ?? payload.privacyAcknowledgedAt,
    privacyPolicyVersion: row.privacy_policy_version ?? payload.privacyPolicyVersion,
  });
}

export function profileFromStoredRowForTest(row: ProfileRow): UserProfile {
  return rowToProfile(row);
}

function profileToRow(userId: string, profile: UserProfile): ProfileInsert {
  return {
    user_id: userId,
    ...profileStoragePayload(profile),
  };
}

export function profileSignupMetadata(profile: UserProfile) {
  return {
    ...profileStoragePayload(profile),
    full_phone_number: clean(fullPhoneForMetadata(profile)),
  };
}

function explainStorageError(error: { message?: string }) {
  const message = error.message ?? "Supabase profile storage failed.";

  if (/already registered|already exists|user already|duplicate key|profiles_username_unique_idx|unique constraint/i.test(message)) {
    return "We could not complete account creation with those details. Try signing in or use different account details.";
  }

  if (/schema cache|profile_data|username|display_name|profiles/i.test(message)) {
    return "Supabase profile table is not ready yet. Run the profile storage SQL migration in Supabase, then try again.";
  }

  if (/row-level security|violates row-level security/i.test(message)) {
    return "Supabase blocked the profile save with row-level security. Sign in again, then retry.";
  }

  return message;
}

async function upsertProfileForUser(userId: string, profile: UserProfile) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profileToRow(userId, profile), { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error(explainStorageError(error));
  return rowToProfile(data);
}

async function loadProfileForUser(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(explainStorageError(error));
  return data ? rowToProfile(data) : null;
}

export async function loadProfileForActiveSession() {
  requireSupabaseConfig();
  await consumeSupabaseAuthCallbackFromUrl();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return loadProfileForUser(data.user.id);
}

function authHashParams() {
  if (typeof window === "undefined" || !window.location.hash) return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function hasAuthCallbackUrl() {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const hashParams = authHashParams();

  return Boolean(
    url.searchParams.get("code") ||
      url.searchParams.get("error") ||
      url.searchParams.get("error_description") ||
      hashParams.get("access_token") ||
      hashParams.get("refresh_token") ||
      hashParams.get("error") ||
      hashParams.get("error_description"),
  );
}

function clearSupabaseAuthUrl() {
  if (typeof window === "undefined" || !hasAuthCallbackUrl()) return;
  window.history.replaceState(null, "", window.location.pathname || "/");
}

export async function consumeSupabaseAuthCallbackFromUrl() {
  if (typeof window === "undefined" || !hasAuthCallbackUrl()) return false;

  const url = new URL(window.location.href);
  const hashParams = authHashParams();
  const callbackError = url.searchParams.get("error_description") || hashParams.get("error_description");
  if (callbackError) {
    clearSupabaseAuthUrl();
    throw new Error(callbackError);
  }

  const authCode = url.searchParams.get("code");
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    clearSupabaseAuthUrl();
    if (error) throw new Error(error.message);
    return true;
  }

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    clearSupabaseAuthUrl();
    if (error) throw new Error(error.message);
    return true;
  }

  return false;
}

export async function createSupabaseAccountProfile(profile: UserProfile, password: string): Promise<ProfileStorageResult> {
  requireSupabaseConfig();

  const normalized = normalizeUserProfile(profile);
  const email = clean(normalizeEmailAddress(normalized.emailAddress));
  if (!email) throw new Error("Add an email address before creating the account.");
  if (!isValidEmailAddress(email)) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Use at least 8 characters for your password.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getSupabaseAuthRedirectUrl(),
      data: profileSignupMetadata(normalized),
    },
  });

  if (error) throw new Error(explainStorageError(error));

  if (!data.session || !data.user) {
    return {
      profile: normalized,
      saved: false,
      needsEmailConfirmation: true,
    };
  }

  return {
    profile: await upsertProfileForUser(data.user.id, normalized),
    saved: true,
  };
}

export async function signInAndLoadSupabaseProfile(emailAddress: string, password: string): Promise<ProfileStorageResult> {
  requireSupabaseConfig();

  const email = clean(normalizeEmailAddress(emailAddress));
  if (!email) throw new Error("Enter the email address for this SPLIT account.");
  if (!isValidEmailAddress(email)) throw new Error("Enter a valid email address.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Supabase did not return a signed-in user.");

  const storedProfile = await loadProfileForUser(data.user.id);
  if (storedProfile) {
    return { profile: storedProfile, saved: true };
  }

  const fallbackProfile = normalizeUserProfile({
    username: email.split("@")[0],
    displayName: email.split("@")[0],
    legalName: email.split("@")[0],
    legalFirstName: email.split("@")[0],
    emailAddress: email,
  });

  return {
    profile: await upsertProfileForUser(data.user.id, fallbackProfile),
    saved: true,
  };
}

export async function saveSupabaseProfile(profile: UserProfile) {
  requireSupabaseConfig();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in before saving profile changes to Supabase.");

  return upsertProfileForUser(data.user.id, profile);
}

export async function requestSupabasePasswordReset(emailAddress: string): Promise<PasswordResetResult> {
  requireSupabaseConfig();

  const email = clean(normalizeEmailAddress(emailAddress));
  if (!email || !isValidEmailAddress(email)) {
    throw new Error("Enter a valid email address.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getSupabaseAuthRedirectUrl(),
  });

  if (error) throw new Error("If this account can receive reset emails, Supabase will send one shortly.");

  return { sent: true };
}

export async function updateSupabasePassword(password: string) {
  requireSupabaseConfig();

  if (password.length < 8) throw new Error("Use at least 8 characters for your password.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
