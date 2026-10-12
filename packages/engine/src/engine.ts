import { RawEntityMatch, RuleTier, detectRuleEntities } from './rules/index';
import { PlaceholderVault } from './vault';

export interface DetectedEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  source: RuleTier;
  placeholder?: string;
}

export interface DetectionResult {
  originalText: string;
  redactedText: string;
  entities: DetectedEntity[];
}

const TIER_PRIORITY: Record<RuleTier, number> = {
  explicit_context_rule: 4,
  validated_rule: 3,
  context_rule: 2,
  ner: 1,
};

/**
 * Resolves overlapping entity spans and filters allowlisted terms.
 * Rule Priority: explicit_context_rule > validated_rule > context_rule > ner.
 * On tie: longer span wins.
 */
export function resolveOverlaps(matches: RawEntityMatch[], allowlist: Set<string> = new Set()): RawEntityMatch[] {
  // Filter out terms present in allowlist (case-insensitive)
  const filteredMatches = matches.filter(
    m => !allowlist.has(m.value.trim().toLowerCase())
  );

  // Sort candidate spans by:
  // 1. Higher Tier Priority (descending)
  // 2. Longer length (descending)
  // 3. Earlier start index (ascending)
  const sorted = [...filteredMatches].sort((a, b) => {
    const pA = TIER_PRIORITY[a.tier] || 0;
    const pB = TIER_PRIORITY[b.tier] || 0;
    if (pA !== pB) return pB - pA;

    const lenA = a.end - a.start;
    const lenB = b.end - b.start;
    if (lenA !== lenB) return lenB - lenA;

    return a.start - b.start;
  });

  const selected: RawEntityMatch[] = [];

  for (const candidate of sorted) {
    const overlaps = selected.some(
      existing => candidate.start < existing.end && candidate.end > existing.start
    );

    if (!overlaps) {
      selected.push(candidate);
    }
  }

  // Final sort by start index for clean left-to-right processing
  return selected.sort((a, b) => a.start - b.start);
}

export class DetectionEngine {
  private vault: PlaceholderVault;
  private allowlist: Set<string> = new Set();

  constructor(vault?: PlaceholderVault, allowlistTerms: string[] = []) {
    this.vault = vault || new PlaceholderVault();
    this.setAllowlist(allowlistTerms);
  }

  public setAllowlist(terms: string[]): void {
    this.allowlist = new Set(terms.map(t => t.trim().toLowerCase()));
  }

  public getVault(): PlaceholderVault {
    return this.vault;
  }

  /**
   * Runs entity detection (rules + optional NER) and returns redacted text with placeholder mappings.
   */
  public detectAndRedact(text: string, nerEntities: RawEntityMatch[] = []): DetectionResult {
    const ruleEntities = detectRuleEntities(text);
    const allCandidates = [...ruleEntities, ...nerEntities];
    const resolvedSpans = resolveOverlaps(allCandidates, this.allowlist);

    // Build redacted string by iterating spans in reverse order to preserve indices
    let redactedText = text;
    const entities: DetectedEntity[] = [];

    for (let i = resolvedSpans.length - 1; i >= 0; i--) {
      const match = resolvedSpans[i];
      const placeholder = this.vault.getOrCreatePlaceholder(match.type, match.value);

      redactedText =
        redactedText.slice(0, match.start) +
        placeholder +
        redactedText.slice(match.end);

      entities.unshift({
        ...match,
        source: match.tier,
        placeholder,
      });
    }

    return {
      originalText: text,
      redactedText,
      entities,
    };
  }
}
