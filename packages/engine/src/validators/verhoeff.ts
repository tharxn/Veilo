/**
 * Verhoeff Algorithm Checksum Validator & Check Digit Generator
 * Used for Indian Aadhaar number validation (12 digits, starting with 2-9).
 */

const d: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const inv: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function validateVerhoeff(numStr: string): boolean {
  const clean = numStr.replace(/[\s-]/g, '');
  if (!/^[2-9]\d{11}$/.test(clean)) {
    return false;
  }

  let c = 0;
  const myArray = clean.split('').map(Number).reverse();

  for (let i = 0; i < myArray.length; i++) {
    c = d[c][p[i % 8][myArray[i]]];
  }

  return c === 0;
}

export function generateVerhoeff(prefix11: string): string {
  const clean = prefix11.replace(/[\s-]/g, '');
  let c = 0;
  const myArray = clean.split('').map(Number).reverse();

  for (let i = 0; i < myArray.length; i++) {
    c = d[c][p[(i + 1) % 8][myArray[i]]];
  }

  const checkDigit = inv[c];
  return clean + checkDigit;
}
