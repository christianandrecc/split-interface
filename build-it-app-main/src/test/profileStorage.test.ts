import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  phoneNumberForStorage,
  phoneNumberFromRow,
  stripStoredCountryCode,
} from "@/lib/profileStorage";
import { createEmptyProfile } from "@/lib/userProfile";

const phoneMigrationSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260812152000_profile_phone_storage.sql"),
  "utf8",
);

describe("profile phone storage", () => {
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

  it("updates the auth signup trigger to save phone metadata into profiles", () => {
    expect(phoneMigrationSql).toContain("metadata_phone_country_code");
    expect(phoneMigrationSql).toContain("metadata_phone_number");
    expect(phoneMigrationSql).toContain("phone_country_code");
    expect(phoneMigrationSql).toContain("profile_data");
    expect(phoneMigrationSql).toContain("drop trigger if exists on_auth_user_created on auth.users");
  });

  it("keeps phone-based split invites working with separated phone columns", () => {
    expect(phoneMigrationSql).toContain("profiles_phone_full_digits_lookup_idx");
    expect(phoneMigrationSql).toContain("concat_ws(' ', profile.phone_country_code, profile.phone_number)");
    expect(phoneMigrationSql).toContain("after insert or update of username, email, phone_number, phone_country_code");
  });
});
