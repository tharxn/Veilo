/**
 * Luhn Algorithm Checksum Validator
 * Used for Credit / Debit Card numbers (13 to 19 digits).
 */

export function validateLuhn(numStr: string): boolean {
  const clean = numStr.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(clean)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
