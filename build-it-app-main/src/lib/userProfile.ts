import { formatNationalPhoneNumber } from "@/lib/phone";

export type UserProfile = {
  splitId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  roleTags: string;
  socialInstagram: string;
  socialTikTok: string;
  socialX: string;
  socialWebsite: string;
  profileLocation: string;
  profileVisibility: string;
  legalName: string;
  legalFirstName: string;
  legalMiddleName: string;
  legalLastName: string;
  pkaNames: string;
  phoneCountryCode: string;
  phoneNumber: string;
  emailAddress: string;
  legalAddress: string;
  addressLine: string;
  zipCode: string;
  city: string;
  state: string;
  country: string;
  mlcNumber: string;
  proAffiliation: string;
  ipiNumber: string;
  customProName: string;
  publishingStatus: string;
  publisherName: string;
  publisherIpi: string;
  publisherPro: string;
  publishingShare: string;
  adminCompanyName: string;
  adminIpi: string;
  adminCollectionShare: string;
  publisherContact: string;
};

export function createSplitId() {
  return `SPL-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function normalizeUsername(value?: string) {
  return (value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}

export function createEmptyProfile(): UserProfile {
  return {
    splitId: createSplitId(),
    username: "",
    displayName: "",
    profileImageUrl: "",
    roleTags: "",
    socialInstagram: "",
    socialTikTok: "",
    socialX: "",
    socialWebsite: "",
    profileLocation: "",
    profileVisibility: "Collaborators only",
    legalName: "",
    legalFirstName: "",
    legalMiddleName: "",
    legalLastName: "",
    pkaNames: "",
    phoneCountryCode: "+1",
    phoneNumber: "",
    emailAddress: "",
    legalAddress: "",
    addressLine: "",
    zipCode: "",
    city: "",
    state: "",
    country: "United States",
    mlcNumber: "",
    proAffiliation: "",
    ipiNumber: "",
    customProName: "",
    publishingStatus: "",
    publisherName: "",
    publisherIpi: "",
    publisherPro: "",
    publishingShare: "",
    adminCompanyName: "",
    adminIpi: "",
    adminCollectionShare: "",
    publisherContact: "",
  };
}

export function normalizeUserProfile(profile: Partial<UserProfile>): UserProfile {
  const base = createEmptyProfile();
  const normalized = {
    ...base,
    ...profile,
    splitId: profile.splitId || base.splitId,
  };

  return {
    ...normalized,
    username: normalizeUsername(normalized.username),
    displayName: (normalized.displayName ?? "").trim(),
    profileImageUrl: (normalized.profileImageUrl ?? "").trim(),
    roleTags: (normalized.roleTags ?? "").trim(),
    socialInstagram: (normalized.socialInstagram ?? "").trim(),
    socialTikTok: (normalized.socialTikTok ?? "").trim(),
    socialX: (normalized.socialX ?? "").trim(),
    socialWebsite: (normalized.socialWebsite ?? "").trim(),
    profileLocation: (normalized.profileLocation ?? "").trim(),
    profileVisibility: normalized.profileVisibility || "Collaborators only",
    phoneNumber: formatNationalPhoneNumber(normalized.phoneNumber ?? "", normalized.phoneCountryCode),
  };
}
