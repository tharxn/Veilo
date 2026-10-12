/**
 * Indian PAN (Permanent Account Number) Validator
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter.
 * 4th character represents holder category: P, C, H, F, A, T, B, L, J, G.
 */

const VALID_HOLDER_TYPES = new Set(['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G']);

export function validatePAN(panStr: string): boolean {
  const clean = panStr.trim().toUpperCase();
  if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(clean)) {
    return false;
  }

  const holderType = clean.charAt(3);
  return VALID_HOLDER_TYPES.has(holderType);
}
