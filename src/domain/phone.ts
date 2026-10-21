/**
 * Ghana phone numbers. Stored as E.164 (+233XXXXXXXXX); the database enforces
 * ^\+233[235][0-9]{8}$ (mobile 02x/05x and fixed-line 03x ranges).
 */

/** Returns the E.164 form, or null if the input is not a valid Ghana number. */
export function normalizeGhanaPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  let national: string | null = null;

  if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\+233\d{9}$/.test(digits)) national = digits.slice(4);
  else if (/^233\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^\+2330\d{9}$/.test(digits)) national = digits.slice(5); // +233 0XX… typed by mistake

  if (!national || !/^[235]\d{8}$/.test(national)) return null;
  return `+233${national}`;
}

export const isValidGhanaPhone = (input: string) => normalizeGhanaPhone(input) !== null;

/** "+233241234567" → "024 123 4567" for display. */
export function formatGhanaPhone(e164: string): string {
  const m = /^\+233(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}

export const telUrl = (e164: string) => `tel:${e164}`;
