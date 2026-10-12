import { validateVerhoeff } from '../validators/verhoeff';
import { validateLuhn } from '../validators/luhn';
import { validatePAN } from '../validators/pan';
import { isHighEntropySecret } from '../validators/entropy';
import { validateUPI } from '../validators/upi';

export type RuleTier = 'explicit_context_rule' | 'validated_rule' | 'context_rule' | 'ner';

export interface RawEntityMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  tier: RuleTier;
}

export function detectRuleEntities(text: string): RawEntityMatch[] {
  const matches: RawEntityMatch[] = [];

  // Helper to check context words within a window
  function hasContext(start: number, end: number, keywords: string[], windowSize = 50): boolean {
    const min = Math.max(0, start - windowSize);
    const max = Math.min(text.length, end + windowSize);
    const snippet = text.slice(min, max).toLowerCase();
    return keywords.some(kw => snippet.includes(kw.toLowerCase()));
  }

  // 1. Aadhaar (12 digits, Verhoeff checksum)
  const aadhaarRegex = /\b[2-9]\d{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g;
  let m: RegExpExecArray | null;
  while ((m = aadhaarRegex.exec(text)) !== null) {
    if (validateVerhoeff(m[0])) {
      matches.push({
        type: 'Aadhaar',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.99,
        tier: 'validated_rule',
      });
    }
  }

  // 2. PAN (5 letters, 4 digits, 1 letter, valid 4th char)
  const panRegex = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
  while ((m = panRegex.exec(text)) !== null) {
    if (validatePAN(m[0])) {
      matches.push({
        type: 'PAN',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.98,
        tier: 'validated_rule',
      });
    }
  }

  // 3. Indian Mobile / Phone
  const mobileRegex = /(?:\+91|0)?[\s-]?[6-9]\d{4}[\s-]?\d{5}\b/g;


  while ((m = mobileRegex.exec(text)) !== null) {
    matches.push({
      type: 'Indian Mobile',
      value: m[0],
      start: m.index,
      end: m.index + m[0].length,
      confidence: 0.90,
      tier: 'validated_rule',
    });
  }

  // 4. UPI ID (name@handle)
  const upiRegex = /\b[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\b/g;
  while ((m = upiRegex.exec(text)) !== null) {
    if (validateUPI(m[0])) {
      matches.push({
        type: 'UPI ID',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.95,
        tier: 'validated_rule',
      });
    }
  }

  // 5. Email (not part of UPI or URL parameter)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  while ((m = emailRegex.exec(text)) !== null) {
    if (!validateUPI(m[0])) {
      matches.push({
        type: 'Email',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.95,
        tier: 'validated_rule',
      });
    }
  }

  // 6. Credit / Debit Card Number (Luhn checksum)
  const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  while ((m = cardRegex.exec(text)) !== null) {
    if (validateLuhn(m[0])) {
      matches.push({
        type: 'Card Number',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.99,
        tier: 'validated_rule',
      });
    }
  }

  // 7. IFSC Code
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  while ((m = ifscRegex.exec(text)) !== null) {
    matches.push({
      type: 'IFSC',
      value: m[0],
      start: m.index,
      end: m.index + m[0].length,
      confidence: 0.95,
      tier: 'validated_rule',
    });
  }

  // 8. Bank Account Number (Context required)
  const bankAccountRegex = /\b\d{9,18}\b/g;
  while ((m = bankAccountRegex.exec(text)) !== null) {
    if (hasContext(m.index, m.index + m[0].length, ['account', 'a/c', 'acct', 'bank'])) {
      matches.push({
        type: 'Bank Account',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.85,
        tier: 'context_rule',
      });
    }
  }

  // 9. API Keys and Tokens (Provider prefixes & High Entropy)
  const apiKeyPrefixes = [
    /\bAKIA[0-9A-Z]{16}\b/g, // AWS Access Key
    /\bghp_[a-zA-Z0-9]{36}\b/g, // GitHub Personal Access Token
    /\bgithub_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}\b/g, // GitHub PAT fine-grained
    /\bsk-[a-zA-Z0-9]{32,}\b/g, // OpenAI API Key
    /\bAIza[0-9A-Za-z-_]{35}\b/g, // Google API Key
    /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g // Slack Token
  ];

  for (const pattern of apiKeyPrefixes) {
    while ((m = pattern.exec(text)) !== null) {
      matches.push({
        type: 'API Key',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.99,
        tier: 'validated_rule',
      });
    }
  }

  // Environment files and source configs commonly place the secret label in a
  // compound variable name (for example OPENAI_API_KEY or DB_PASSWORD). Treat
  // the assigned value as sensitive even when it is short or low entropy.
  const compoundSecretAssignmentRegex = /\b([A-Za-z_][A-Za-z0-9_]*(?:API_KEY|ACCESS_KEY|CLIENT_SECRET|SECRET(?:_KEY)?|TOKEN|PASSWORD|PASSWD|PWD|PASSCODE|CREDENTIALS?|AUTH(?:_TOKEN)?|BEARER|PRIVATE_KEY|DATABASE_URL|CONNECTION_STRING|DSN))\s*[:=]\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|`([^`\r\n]*)`|([^\s#;,]+))/gi;
  while ((m = compoundSecretAssignmentRegex.exec(text)) !== null) {
    const label = m[1].toLowerCase();
    const rawValue = m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    const value = rawValue.trim();
    if (!value || /^\[[A-Z][A-Z0-9_]*\]$/.test(value)) continue;
    const type = label.includes('password') || label.includes('passwd') || label.includes('passcode') || label.endsWith('_pwd')
      ? 'Password'
      : label.includes('secret') || label.includes('database_url') || label.includes('connection_string') || label.endsWith('_dsn')
        ? 'Secret'
        : label.includes('token') || label.includes('auth') || label.includes('bearer')
          ? 'Token'
          : label.includes('credential')
            ? 'Credential'
            : 'API Key';
    const start = m.index + m[0].lastIndexOf(rawValue);
    matches.push({ type, value, start, end: start + value.length, confidence: 0.99, tier: 'explicit_context_rule' });
  }

  // Generic High Entropy Token Detection near secret keywords
  const tokenCandidateRegex = /\b[A-Za-z0-9_\-]{16,64}\b/g;
  while ((m = tokenCandidateRegex.exec(text)) !== null) {
    const candidate = m[0];
    if (
      isHighEntropySecret(candidate, 16, 3.8) &&
      hasContext(m.index, m.index + candidate.length, ['key', 'token', 'secret', 'auth', 'bearer'])
    ) {
      matches.push({
        type: 'API Key',
        value: candidate,
        start: m.index,
        end: m.index + candidate.length,
        confidence: 0.85,
        tier: 'context_rule',
      });
    }
  }

  // Explicit secret labels identify their value even when it is numeric,
  // short, or low entropy. This rule also outranks incidental matches such as
  // a phone-number pattern inside a longer labeled API key.
  const labeledSecretRegex = /\b(api(?:[\s_-]*key)?|access[\s_-]*key|client[\s_-]*secret|secret|token|password|pwd|passcode|credential|auth(?:entication)?(?:[\s_-]*token)?|bearer|private[\s_-]*key)\b(?:\s+(?!(?:is|are|equals?)\b)[A-Za-z][A-Za-z0-9._-]*){0,5}\s*(?:is|are|equals?|:|=)\s*["'`]?([^\s,;"'<>]+)/gi;
  while ((m = labeledSecretRegex.exec(text)) !== null) {
    const label = m[1].toLowerCase().replace(/[\s_-]+/g, ' ');
    const rawValue = m[2];
    const value = rawValue.replace(/[.!?]+$/, '');
    if (!value || /^\[[A-Z][A-Z0-9_]*\]$/.test(value)) continue;

    const type = label.includes('password') || label === 'pwd' || label === 'passcode'
      ? 'Password'
      : label.includes('secret')
        ? 'Secret'
        : label.includes('token') || label === 'bearer'
          ? 'Token'
          : label.includes('credential')
            ? 'Credential'
            : 'API Key';
    const start = m.index + m[0].lastIndexOf(rawValue);
    matches.push({
      type,
      value,
      start,
      end: start + value.length,
      confidence: 0.99,
      tier: 'explicit_context_rule',
    });
  }

  // Explicit identity-document labels override format validators. This catches
  // misspellings such as "aadhar" and protects the supplied value even when
  // it is malformed or checksum-invalid.
  const labeledIdRegex = /\b(aadhaar|aadhar|pan|ssn|social\s+security(?:\s+number)?|passport(?:\s+number)?|driver'?s?\s+license(?:\s+number)?|national\s+id(?:\s+number)?|tax\s+id(?:\s+number)?)\b(?:\s+(?!(?:is|are|equals?)\b)[A-Za-z][A-Za-z0-9._-]*){0,5}\s*(?:is|are|equals?|:|=)\s*[#:]?\s*["'`]?([^\s,;"'<>]+)/gi;
  while ((m = labeledIdRegex.exec(text)) !== null) {
    const label = m[1].toLowerCase();
    const rawValue = m[2];
    const value = rawValue.replace(/[.!?]+$/, '');
    if (!value || /^\[[A-Z][A-Z0-9_]*\]$/.test(value)) continue;

    const type = label === 'aadhaar' || label === 'aadhar'
      ? 'Aadhaar'
      : label === 'pan'
        ? 'PAN'
        : label === 'ssn' || label.startsWith('social')
          ? 'SSN'
          : label.startsWith('passport')
            ? 'Passport'
            : label.includes('license')
              ? "Driver's License"
              : label.startsWith('national')
                ? 'National ID'
                : 'Tax ID';
    const start = m.index + m[0].lastIndexOf(rawValue);
    matches.push({
      type,
      value,
      start,
      end: start + value.length,
      confidence: 0.99,
      tier: 'explicit_context_rule',
    });
  }

  // Explicitly labeled names and phone numbers should be protected even when
  // they do not match a locale-specific pattern or the optional NER model.
  const labeledNameRegex = /\b(?:full\s+name|first\s+name|last\s+name|name)\b(?:\s+(?!(?:is|are|equals?)\b)[A-Za-z][A-Za-z0-9._-]*){0,5}\s*(?:is|are|equals?|:|=)\s*([A-Za-z][A-Za-z'.-]*(?:\s+(?!and\b|or\b|but\b)[A-Za-z][A-Za-z'.-]*){0,2})/gi;
  while ((m = labeledNameRegex.exec(text)) !== null) {
    const value = m[1].replace(/[.!?]+$/, '').trim();
    if (!value || /^\[[A-Z][A-Z0-9_]*\]$/.test(value)) continue;
    const start = m.index + m[0].lastIndexOf(m[1]);
    matches.push({
      type: 'Person',
      value,
      start,
      end: start + value.length,
      confidence: 0.99,
      tier: 'explicit_context_rule',
    });
  }

  const labeledPhoneRegex = /\b(?:phone(?:\s+number)?|mobile(?:\s+number)?|cell(?:\s+phone)?(?:\s+number)?)\b(?:\s+(?!(?:is|are|equals?)\b)[A-Za-z][A-Za-z0-9._-]*){0,5}\s*(?:is|are|equals?|:|=)\s*([+()0-9][+()0-9().\- ]{0,30})/gi;
  while ((m = labeledPhoneRegex.exec(text)) !== null) {
    const value = m[1].replace(/[\s.,;!?]+$/, '');
    if (!value || /^\[[A-Z][A-Z0-9_]*\]$/.test(value)) continue;
    const start = m.index + m[0].lastIndexOf(m[1]);
    matches.push({
      type: 'Phone Number',
      value,
      start,
      end: start + value.length,
      confidence: 0.99,
      tier: 'explicit_context_rule',
    });
  }

  // Catch common misspellings in sensitive-field labels (for example, "emial",
  // "passwrod", or "aadhraar"). Only redact a value when a known label appears
  // close to an explicit value separator, which limits accidental matches.
  const fuzzyLabels: Array<{ word: string; type: string }> = [
    { word: 'aadhaar', type: 'Aadhaar' }, { word: 'aadhar', type: 'Aadhaar' }, { word: 'adhar', type: 'Aadhaar' },
    { word: 'pan', type: 'PAN' }, { word: 'email', type: 'Email' }, { word: 'mail', type: 'Email' },
    { word: 'phone', type: 'Phone Number' }, { word: 'mobile', type: 'Phone Number' }, { word: 'telephone', type: 'Phone Number' },
    { word: 'name', type: 'Person' }, { word: 'person', type: 'Person' },
    { word: 'apikey', type: 'API Key' }, { word: 'api', type: 'API Key' }, { word: 'key', type: 'API Key' },
    { word: 'secret', type: 'Secret' }, { word: 'token', type: 'Token' }, { word: 'password', type: 'Password' },
    { word: 'credential', type: 'Credential' }, { word: 'auth', type: 'API Key' }, { word: 'bearer', type: 'Token' },
    { word: 'account', type: 'Bank Account' }, { word: 'bank', type: 'Bank Account' }, { word: 'ifsc', type: 'IFSC' },
    { word: 'upi', type: 'UPI ID' }, { word: 'card', type: 'Card Number' }, { word: 'ssn', type: 'SSN' },
    { word: 'passport', type: 'Passport' }, { word: 'license', type: "Driver's License" }, { word: 'licence', type: "Driver's License" },
    { word: 'national', type: 'National ID' }, { word: 'tax', type: 'Tax ID' }, { word: 'address', type: 'Address' },
    { word: 'birth', type: 'Date of Birth' }, { word: 'dob', type: 'Date of Birth' },
    { word: 'pincode', type: 'PIN Code' }, { word: 'pin', type: 'PIN Code' },
  ];

  function labelDistance(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const d = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
    for (let i = 0; i < rows; i++) d[i][0] = i;
    for (let j = 0; j < cols; j++) d[0][j] = j;
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }

  const valueSeparatorRegex = /\b(?:is|are|equals?)\b|[:=]/gi;
  while ((m = valueSeparatorRegex.exec(text)) !== null) {
    const prefixStart = Math.max(0, m.index - 140);
    const prefix = (text.slice(prefixStart, m.index).split(/[\r\n,;.!?]/).pop() || '');
    const labelTokens = [...prefix.matchAll(/[A-Za-z][A-Za-z0-9_-]*/g)];
    let best: { type: string; distance: number; position: number } | undefined;
    for (const token of labelTokens.slice(-10)) {
      const normalized = token[0].toLowerCase().replace(/[_-]/g, '');
      for (const label of fuzzyLabels) {
        const distance = labelDistance(normalized, label.word);
        const maxDistance = 1;
        if (distance <= maxDistance && (!best || distance < best.distance || (distance === best.distance && token.index! > best.position))) {
          best = { type: label.type, distance, position: token.index! };
        }
      }
    }
    if (!best) continue;

    let valueStart = m.index + m[0].length;
    while (valueStart < text.length && /[\s:=#"'`]/.test(text[valueStart])) valueStart++;
    let value = '';
    if (best.type === 'Phone Number') {
      const phoneMatch = text.slice(valueStart).match(/^[+()0-9][+()0-9().\- ]{0,30}/);
      value = phoneMatch?.[0].replace(/[\s.,;!?]+$/, '') || '';
    } else if (best.type === 'Person') {
      const nameMatch = text.slice(valueStart).match(/^[A-Za-z][A-Za-z'.-]*(?:\s+(?!and\b|or\b|but\b)[A-Za-z][A-Za-z'.-]*){0,2}/i);
      value = nameMatch?.[0].replace(/[.!?]+$/, '').trim() || '';
    } else {
      value = text.slice(valueStart).match(/^[^\s,;"'<>]+/)?.[0].replace(/[.!?]+$/, '') || '';
    }
    if (!value || /^\[[A-Z][A-Z0-9_]*\]$/.test(value)) continue;
    matches.push({
      type: best.type,
      value,
      start: valueStart,
      end: valueStart + value.length,
      confidence: 0.90,
      tier: 'explicit_context_rule',
    });
  }

  // 10. JWT
  const jwtRegex = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
  while ((m = jwtRegex.exec(text)) !== null) {
    try {
      const parts = m[0].split('.');
      const header = JSON.parse(atob(parts[0]));
      if (header && typeof header === 'object') {
        matches.push({
          type: 'JWT',
          value: m[0],
          start: m.index,
          end: m.index + m[0].length,
          confidence: 0.99,
          tier: 'validated_rule',
        });
      }
    } catch {
      // Invalid JWT header decoding
    }
  }

  // 11. Private Keys
  const privateKeyRegex = /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g;
  while ((m = privateKeyRegex.exec(text)) !== null) {
    matches.push({
      type: 'Private Key',
      value: m[0],
      start: m.index,
      end: m.index + m[0].length,
      confidence: 1.0,
      tier: 'validated_rule',
    });
  }

  // 12. Passwords (Context rule)
  const passwordRegex = /\b(?:password|pwd|passcode)\s*(?:is|=|:)\s*([^\s,;]+)/gi;
  while ((m = passwordRegex.exec(text)) !== null) {
    if (m[1]) {
      const val = m[1];
      const valStart = m.index + m[0].lastIndexOf(val);
      matches.push({
        type: 'Password',
        value: val,
        start: valStart,
        end: valStart + val.length,
        confidence: 0.90,
        tier: 'context_rule',
      });
    }
  }

  // 13. PIN Code (Context rule)
  const pinRegex = /\b[1-9][0-9]{5}\b/g;
  while ((m = pinRegex.exec(text)) !== null) {
    if (hasContext(m.index, m.index + m[0].length, ['pincode', 'pin', 'zip', 'postal', 'address'])) {
      matches.push({
        type: 'PIN Code',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.85,
        tier: 'context_rule',
      });
    }
  }

  return matches;
}
