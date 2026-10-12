/**
 * UPI ID Validator
 * Format: name@handle
 * Validated against known Indian UPI handle list to avoid false positive email matches.
 */

export const KNOWN_UPI_HANDLES = new Set([
  'okaxis', 'okhdfcbank', 'okicici', 'oksbi', 'paytm', 'ybl', 'ibl', 'axl',
  'upi', 'sbi', 'icici', 'hdfcbank', 'axisbank', 'barodampay', 'kvb', 'kotak',
  'indus', 'federal', 'aubank', 'pnb', 'canarabank', 'unionbank', 'idfcbank',
  'postbank', 'rbl', 'dlb', 'dbs', 'equitas', 'vijayabank', 'yesbank'
]);

export function validateUPI(upiStr: string): boolean {
  const parts = upiStr.toLowerCase().trim().split('@');
  if (parts.length !== 2) return false;

  const [name, handle] = parts;
  if (!name || name.length < 2 || !/^[a-z0-9._-]+$/.test(name)) {
    return false;
  }

  return KNOWN_UPI_HANDLES.has(handle);
}
