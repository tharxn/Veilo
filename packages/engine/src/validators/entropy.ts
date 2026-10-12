/**
 * Shannon Entropy Calculator
 * Measures randomness/entropy of strings to detect API keys and random secret tokens.
 */

export function calculateShannonEntropy(str: string): number {
  if (!str) return 0;

  const frequencies: Map<string, number> = new Map();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;

  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Validates if a string is a high-entropy secret (typically > 3.8 for mixed random strings).
 */
export function isHighEntropySecret(str: string, minLength = 16, minEntropy = 3.5): boolean {
  if (str.length < minLength) return false;
  return calculateShannonEntropy(str) >= minEntropy;
}
