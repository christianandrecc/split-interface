const DEFAULT_PHONE_DIGIT_LIMIT = 15;

const phoneDigitLimits: Record<string, number> = {
  "+1": 10,
  "+1 CA": 10,
  "+1 DO": 10,
  "+1 JM": 10,
  "+1 PR": 10,
  "+27": 9,
  "+33": 9,
  "+34": 9,
  "+39": 10,
  "+41": 9,
  "+44": 10,
  "+46": 9,
  "+49": 11,
  "+51": 9,
  "+52": 10,
  "+54": 10,
  "+55": 11,
  "+56": 9,
  "+57": 10,
  "+58": 10,
  "+61": 9,
  "+81": 10,
  "+82": 10,
  "+86": 11,
  "+91": 10,
  "+351": 9,
  "+353": 9,
  "+502": 8,
  "+503": 8,
  "+504": 8,
  "+505": 8,
  "+506": 8,
  "+507": 8,
  "+593": 9,
  "+598": 8,
  "+971": 9,
};

export function getPhoneDigitLimit(countryCode: string) {
  return phoneDigitLimits[countryCode] ?? DEFAULT_PHONE_DIGIT_LIMIT;
}

export function getPhoneInputMaxLength(countryCode: string) {
  const limit = getPhoneDigitLimit(countryCode);
  return limit + (limit > 3 ? 1 : 0) + (limit > 6 ? 1 : 0);
}

export function getPhoneDigits(value: string, countryCode: string) {
  return value.replace(/\D/g, "").slice(0, getPhoneDigitLimit(countryCode));
}

export function formatNationalPhoneNumber(value: string, countryCode: string) {
  const digits = getPhoneDigits(value, countryCode);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
