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
  termsAcceptedAt: string;
  termsVersion: string;
  privacyAcknowledgedAt: string;
  privacyPolicyVersion: string;
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
    termsAcceptedAt: "",
    termsVersion: "",
    privacyAcknowledgedAt: "",
    privacyPolicyVersion: "",
  };
}

function text(value?: string | null) {
  return (value ?? "").trim();
}

export function normalizeUserProfile(profile: Partial<UserProfile>): UserProfile {
  const base = createEmptyProfile();
  const normalized = {
    ...base,
    ...profile,
  };
  const phoneCountryCode = text(normalized.phoneCountryCode) || "+1";

  return {
    ...normalized,
    splitId: text(normalized.splitId) || base.splitId,
    username: normalizeUsername(normalized.username),
    displayName: text(normalized.displayName),
    profileImageUrl: text(normalized.profileImageUrl),
    roleTags: text(normalized.roleTags),
    socialInstagram: text(normalized.socialInstagram),
    socialTikTok: text(normalized.socialTikTok),
    socialX: text(normalized.socialX),
    socialWebsite: text(normalized.socialWebsite),
    profileLocation: text(normalized.profileLocation),
    profileVisibility: text(normalized.profileVisibility) || "Collaborators only",
    legalName: text(normalized.legalName),
    legalFirstName: text(normalized.legalFirstName),
    legalMiddleName: text(normalized.legalMiddleName),
    legalLastName: text(normalized.legalLastName),
    pkaNames: text(normalized.pkaNames),
    phoneCountryCode,
    phoneNumber: formatNationalPhoneNumber(text(normalized.phoneNumber), phoneCountryCode),
    emailAddress: text(normalized.emailAddress),
    legalAddress: text(normalized.legalAddress),
    addressLine: text(normalized.addressLine),
    zipCode: text(normalized.zipCode),
    city: text(normalized.city),
    state: text(normalized.state),
    country: text(normalized.country) || "United States",
    mlcNumber: text(normalized.mlcNumber),
    proAffiliation: text(normalized.proAffiliation),
    ipiNumber: text(normalized.ipiNumber),
    customProName: text(normalized.customProName),
    publishingStatus: text(normalized.publishingStatus),
    publisherName: text(normalized.publisherName),
    publisherIpi: text(normalized.publisherIpi),
    publisherPro: text(normalized.publisherPro),
    publishingShare: text(normalized.publishingShare),
    adminCompanyName: text(normalized.adminCompanyName),
    adminIpi: text(normalized.adminIpi),
    adminCollectionShare: text(normalized.adminCollectionShare),
    publisherContact: text(normalized.publisherContact),
    termsAcceptedAt: text(normalized.termsAcceptedAt),
    termsVersion: text(normalized.termsVersion),
    privacyAcknowledgedAt: text(normalized.privacyAcknowledgedAt),
    privacyPolicyVersion: text(normalized.privacyPolicyVersion),
  };
}
