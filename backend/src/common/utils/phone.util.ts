import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface NormalizedPhone {
  countryCode: string;
  mobileNumber: string;
  fullPhoneNumber: string;
}

/**
 * Normalizes Indian and international mobile numbers into canonical formats:
 * - countryCode: '+91'
 * - mobileNumber: '9876543210' (10-digit national number)
 * - fullPhoneNumber: '+919876543210' (E.164 format)
 */
export function normalizePhoneNumber(
  rawPhone: string,
  defaultCountryCode = '+91',
): NormalizedPhone | null {
  let raw = String(rawPhone || '').trim();
  let code = String(defaultCountryCode || '+91').trim();
  if (!code.startsWith('+')) code = '+' + code;

  if (!raw) return null;

  // Try parsing direct E.164 if starts with +
  if (raw.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed && parsed.isValid()) {
      return {
        countryCode: '+' + parsed.countryCallingCode,
        mobileNumber: String(parsed.nationalNumber),
        fullPhoneNumber: parsed.format('E.164'),
      };
    }
  }

  // Strip all non-digits
  const digits = raw.replace(/\D/g, '');

  // If 10 digits, prepend default country code (e.g. +91)
  if (digits.length === 10) {
    const full = `${code}${digits}`;
    const parsed = parsePhoneNumberFromString(full);
    if (parsed && parsed.isValid()) {
      return {
        countryCode: '+' + parsed.countryCallingCode,
        mobileNumber: String(parsed.nationalNumber),
        fullPhoneNumber: parsed.format('E.164'),
      };
    }
  }

  // If 12 digits starting with 91, try with +
  if (digits.length === 12 && digits.startsWith('91')) {
    const full = `+${digits}`;
    const parsed = parsePhoneNumberFromString(full);
    if (parsed && parsed.isValid()) {
      return {
        countryCode: '+' + parsed.countryCallingCode,
        mobileNumber: String(parsed.nationalNumber),
        fullPhoneNumber: parsed.format('E.164'),
      };
    }
  }

  // Fallback try code + digits
  const fallback = `${code}${digits}`;
  const parsed = parsePhoneNumberFromString(fallback);
  if (parsed && parsed.isValid()) {
    return {
      countryCode: '+' + parsed.countryCallingCode,
      mobileNumber: String(parsed.nationalNumber),
      fullPhoneNumber: parsed.format('E.164'),
    };
  }

  return null;
}
