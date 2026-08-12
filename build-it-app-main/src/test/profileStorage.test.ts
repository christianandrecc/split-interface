import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isValidEmailAddress,
  normalizeEmailAddress,
  phoneNumberForStorage,
  phoneNumberFromRow,
  profileSignupMetadata,
  profileFromStoredRowForTest,
  stripStoredCountryCode,
} from "@/lib/profileStorage";
import { createEmptyProfile } from "@/lib/userProfile";

const phoneMigrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812152000_profile_phone_storage.sql"),
  "utf8",
);
const consentMigrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812162000_account_consent_profile_fields.sql"),
  "utf8",
);
const fullProfileSignupMigrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812222000_full_profile_signup_storage.sql"),
  "utf8",
);

describe("profile phone storage", () => {
  it("normalizes and validates account emails before Supabase Auth calls", () => {
    expect(normalizeEmailAddress(" CHORI@Example.COM ")).toBe("chori@example.com");
    expect(isValidEmailAddress("chori@example.com")).toBe(true);
    expect(isValidEmailAddress("not-an-email")).toBe(false);
  });

  it("stores phone country code separately from the national number", () => {
    const profile = {
      ...createEmptyProfile(),
      phoneCountryCode: "+1",
      phoneNumber: "2168578164",
    };

    expect(phoneNumberForStorage(profile)).toBe("216-857-8164");
  });

  it("loads older rows that accidentally stored the country code in phone_number", () => {
    expect(stripStoredCountryCode("+1 216-857-8164", "+1")).toBe("2168578164");
    expect(phoneNumberFromRow(
      { phone_country_code: "+1", phone_number: "+1 216-857-8164" },
      {},
    )).toBe("216-857-8164");
  });

  it("normalizes sparse Supabase profile rows without crashing on missing strings", () => {
    const profile = profileFromStoredRowForTest({
      user_id: "00000000-0000-0000-0000-000000000000",
      email: "chori@example.com",
      username: "chori",
      display_name: null,
      phone_country_code: null,
      phone_number: null,
      profile_data: {},
    } as Parameters<typeof profileFromStoredRowForTest>[0]);

    expect(profile.emailAddress).toBe("chori@example.com");
    expect(profile.username).toBe("chori");
    expect(profile.legalFirstName).toBe("");
    expect(profile.phoneCountryCode).toBe("+1");
    expect(profile.country).toBe("United States");
  });

  it("updates the auth signup trigger to save phone metadata into profiles", () => {
    expect(phoneMigrationSql).toContain("metadata_phone_country_code");
    expect(phoneMigrationSql).toContain("metadata_phone_number");
    expect(phoneMigrationSql).toContain("phone_country_code");
    expect(phoneMigrationSql).toContain("profile_data");
    expect(phoneMigrationSql).toContain("drop trigger if exists on_auth_user_created on auth.users");
  });

  it("keeps phone-based split invites working with separated phone columns", () => {
    expect(phoneMigrationSql).toContain("profiles_phone_full_digits_lookup_idx");
    expect(phoneMigrationSql).toContain("coalesce(profile.phone_country_code, '') || ' ' || coalesce(profile.phone_number, '')");
    expect(phoneMigrationSql).toContain("after insert or update of username, email, phone_number, phone_country_code");
  });

  it("sends full non-password account profile metadata during Supabase signup", () => {
    const profile = {
      ...createEmptyProfile(),
      username: "chori",
      displayName: "Chori",
      legalName: "Christian Carrera",
      legalFirstName: "Christian",
      legalLastName: "Carrera",
      roleTags: "Artist, Producer",
      phoneCountryCode: "+1",
      phoneNumber: "2168578164",
      emailAddress: "chori@example.com",
      addressLine: "123 Music Row",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "United States",
      proAffiliation: "ASCAP",
      ipiNumber: "123456789",
      publishingStatus: "Co-published",
      publisherName: "SPLIT Songs",
      publisherIpi: "987654321",
      publisherPro: "ASCAP",
      publishingShare: "50",
      termsAcceptedAt: "2026-08-12T20:00:00.000Z",
      termsVersion: "2026-08-12",
      privacyAcknowledgedAt: "2026-08-12T20:00:00.000Z",
      privacyPolicyVersion: "2026-08-12",
    };

    const metadata = profileSignupMetadata(profile);

    expect(metadata.username).toBe("chori");
    expect(metadata.legal_name).toBe("Christian Carrera");
    expect(metadata.legal_first_name).toBe("Christian");
    expect(metadata.legal_last_name).toBe("Carrera");
    expect(metadata.role_tags).toBe("Artist, Producer");
    expect(metadata.phone_country_code).toBe("+1");
    expect(metadata.phone_number).toBe("216-857-8164");
    expect(metadata.full_phone_number).toBe("+1 216-857-8164");
    expect(metadata.email).toBe("chori@example.com");
    expect(metadata.address_line).toBe("123 Music Row");
    expect(metadata.city).toBe("New York");
    expect(metadata.pro_affiliation).toBe("ASCAP");
    expect(metadata.ipi_number).toBe("123456789");
    expect(metadata.publishing_status).toBe("Co-published");
    expect(metadata.publisher_name).toBe("SPLIT Songs");
    expect(metadata.publisher_ipi).toBe("987654321");
    expect(metadata.terms_accepted_at).toBe("2026-08-12T20:00:00.000Z");
    expect(metadata.privacy_acknowledged_at).toBe("2026-08-12T20:00:00.000Z");
    expect(metadata.profile_data).toMatchObject({
      legalName: "Christian Carrera",
      roleTags: "Artist, Producer",
      proAffiliation: "ASCAP",
      ipiNumber: "123456789",
    });
  });

  it("adds account consent columns through the auth trigger", () => {
    expect(consentMigrationSql).toContain("add column if not exists terms_accepted_at timestamptz");
    expect(consentMigrationSql).toContain("add column if not exists terms_version text");
    expect(consentMigrationSql).toContain("add column if not exists privacy_acknowledged_at timestamptz");
    expect(consentMigrationSql).toContain("add column if not exists privacy_policy_version text");
    expect(consentMigrationSql).toContain("metadata_terms_accepted_at::timestamptz");
    expect(consentMigrationSql).toContain("drop trigger if exists on_auth_user_created on auth.users");
  });

  it("updates the auth trigger to unpack full profile metadata into normal columns", () => {
    expect(fullProfileSignupMigrationSql).toContain("metadata_with_payload jsonb := profile_payload || metadata");
    expect(fullProfileSignupMigrationSql).toContain("public.split_meta_text(metadata_with_payload, 'legal_name', 'legalName')");
    expect(fullProfileSignupMigrationSql).toContain("public.split_meta_text(metadata_with_payload, 'pro_affiliation', 'proAffiliation')");
    expect(fullProfileSignupMigrationSql).toContain("public.split_meta_text(metadata_with_payload, 'ipi_number', 'ipiNumber')");
    expect(fullProfileSignupMigrationSql).toContain("public.split_meta_text(metadata_with_payload, 'address_line', 'addressLine')");
    expect(fullProfileSignupMigrationSql).toContain("public.split_meta_timestamptz(metadata_with_payload, 'terms_accepted_at', 'termsAcceptedAt')");
    expect(fullProfileSignupMigrationSql).toContain("where profile_data <> '{}'::jsonb");
    expect(fullProfileSignupMigrationSql).toContain("drop trigger if exists on_auth_user_created on auth.users");
  });
});
