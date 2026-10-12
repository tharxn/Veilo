/**
 * Ephemeral In-Memory Placeholder Vault
 * Maintains a consistent mapping per tab/session between original sensitive values and placeholders.
 */

export class PlaceholderVault {
  private valueToPlaceholder: Map<string, string> = new Map();
  private placeholderToValue: Map<string, string> = new Map();
  private counters: Map<string, number> = new Map();

  /**
   * Clears all in-memory redaction mappings.
   */
  public clear(): void {
    this.valueToPlaceholder.clear();
    this.placeholderToValue.clear();
    this.counters.clear();
  }

  /**
   * Normalizes values for consistent mapping keying.
   */
  private normalizeValue(value: string): string {
    return value.trim();
  }

  /**
   * Normalizes entity type names for placeholder tags (e.g., "Indian Mobile" -> "PHONE").
   */
  private formatTypeTag(type: string): string {
    const clean = type.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    if (clean.includes('AADHAAR')) return 'AADHAAR';
    if (clean.includes('PAN')) return 'PAN';
    if (clean.includes('EMAIL')) return 'EMAIL';
    if (clean.includes('MOBILE') || clean.includes('PHONE')) return 'PHONE';
    if (clean.includes('CARD')) return 'CARD';
    if (clean.includes('IFSC')) return 'IFSC';
    if (clean.includes('UPI')) return 'UPI';
    if (clean.includes('BANK') || clean.includes('ACCOUNT')) return 'BANK_ACCOUNT';
    if (clean.includes('PRIVATE_KEY')) return 'PRIVATE_KEY';
    if (clean.includes('SECRET')) return 'SECRET';
    if (clean.includes('TOKEN')) return 'TOKEN';
    if (clean.includes('CREDENTIAL')) return 'CREDENTIAL';
    if (clean.includes('KEY') || clean.includes('API')) return 'API_KEY';
    if (clean.includes('JWT')) return 'JWT';
    if (clean.includes('PASSWORD') || clean.includes('PWD')) return 'PASSWORD';
    if (clean.includes('PIN')) return 'PIN';
    return clean || 'SENSITIVE';
  }

  /**
   * Retrieves existing placeholder or creates a new consistent assignment.
   */
  public getOrCreatePlaceholder(type: string, rawValue: string): string {
    const key = this.normalizeValue(rawValue);
    if (this.valueToPlaceholder.has(key)) {
      return this.valueToPlaceholder.get(key)!;
    }

    const tag = this.formatTypeTag(type);
    const count = (this.counters.get(tag) || 0) + 1;
    this.counters.set(tag, count);

    const placeholder = `[${tag}_${count}]`;
    this.valueToPlaceholder.set(key, placeholder);
    this.placeholderToValue.set(placeholder, rawValue);
    return placeholder;
  }

  /**
   * Restores placeholders in assistant replies back to original values.
   * Tolerates markdown wrappers, case differences, and missing brackets.
   */
  public restore(text: string): string {
    let restored = text;

    for (const [placeholder, original] of this.placeholderToValue.entries()) {
      // 1. Direct exact replacement
      restored = restored.replaceAll(placeholder, original);

      // 2. Case-insensitive / missing bracket fallback regex
      // e.g. EMAIL_1 or [email_1]
      const rawTag = placeholder.replace(/^\[|\]$/g, '');
      const regex = new RegExp(`\\[?${rawTag}\\]?`, 'gi');
      restored = restored.replace(regex, original);
    }

    return restored;
  }

  /**
   * Returns copy of active placeholder mappings.
   */
  public getSnapshot(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [p, v] of this.placeholderToValue.entries()) {
      obj[p] = v;
    }
    return obj;
  }
}
