import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function verifiedPhoneFields(user: { phone?: string | null; phone_confirmed_at?: string | null }) {
  if (!user.phone_confirmed_at || !user.phone) return {};
  const parsed = parsePhoneNumberFromString(`+${user.phone.replace(/\D/g, "")}`);
  return parsed?.isValid() ? { phoneCountryCode: `+${parsed.countryCallingCode}`, phoneNumber: String(parsed.nationalNumber) } : {};
}
