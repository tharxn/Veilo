import { describe, it, expect } from 'vitest';
import { DetectionEngine } from './engine';
import { validateVerhoeff, generateVerhoeff } from './validators/verhoeff';
import { validateLuhn } from './validators/luhn';
import { validatePAN } from './validators/pan';

describe('Detection Engine & Rule Suite', () => {
  const engine = new DetectionEngine();
  const validAadhaar = generateVerhoeff('23456789012');
  const invalidAadhaarCheckDigit = validAadhaar.slice(0, 11) + ((parseInt(validAadhaar.slice(11), 10) + 1) % 10);

  it('validates Verhoeff checksum for Aadhaar', () => {
    expect(validateVerhoeff(validAadhaar)).toBe(true);
    expect(validateVerhoeff('123456789012')).toBe(false);
    expect(validateVerhoeff(invalidAadhaarCheckDigit)).toBe(false);
  });

  it('validates Luhn checksum for Credit Cards', () => {
    expect(validateLuhn('4532015112830366')).toBe(true);
    expect(validateLuhn('4532015112830367')).toBe(false);
  });

  it('validates PAN holder letters', () => {
    expect(validatePAN('ABCDE1234F')).toBe(false);
    expect(validatePAN('ABCPB1234F')).toBe(true);
    expect(validatePAN('ABCXB1234F')).toBe(false);
  });

  it('detects Aadhaar, PAN, and Email in a single string', () => {
    const text = `My Aadhaar is ${validAadhaar}, PAN is ABCPB1234F and email is test@domain.com.`;
    const result = engine.detectAndRedact(text);

    expect(result.entities).toHaveLength(3);
    expect(result.redactedText).toContain('[AADHAAR_1]');
    expect(result.redactedText).toContain('[PAN_1]');
    expect(result.redactedText).toContain('[EMAIL_1]');
  });

  it('redacts explicitly labeled credentials at different numeric lengths', () => {
    for (const value of ['6048219703574', '6048219703574254']) {
      const result = new DetectionEngine().detectAndRedact(`My Claude API key is ${value}.`);

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('API Key');
      expect(result.redactedText).toContain(result.entities[0].placeholder!);
      expect(result.redactedText).not.toContain(value);
    }
  });

  it('redacts short values with an explicit secret label', () => {
    const result = new DetectionEngine().detectAndRedact('The secret is x7.');

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe('Secret');
    expect(result.redactedText).toContain('[SECRET_1]');
    expect(result.redactedText).not.toContain('x7');
  });

  it('redacts labeled names, formatted API keys, and non-Indian phone numbers', () => {
    const text = 'my name is testeraon, the api key that i used is 1039325435-04543435439, my email id is [EMAIL_1] and my phone number is 1234567890';
    const result = new DetectionEngine().detectAndRedact(text);

    expect(result.entities.map(entity => entity.type)).toEqual(['Person', 'API Key', 'Phone Number']);
    expect(result.redactedText).toContain('[PERSON_1]');
    expect(result.redactedText).toContain('[API_KEY_1]');
    expect(result.redactedText).toContain('[PHONE_1]');
    expect(result.redactedText).toContain('[EMAIL_1]');
    expect(result.redactedText).not.toContain('testeraon');
    expect(result.redactedText).not.toContain('1039325435-04543435439');
    expect(result.redactedText).not.toContain('1234567890');
  });

  it('redacts a malformed Aadhaar value when explicitly labeled, including the common spelling variant', () => {
    const result = new DetectionEngine().detectAndRedact("My friend's aadhar number is 19000000000000.");

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe('Aadhaar');
    expect(result.redactedText).toContain('[AADHAAR_1]');
    expect(result.redactedText).not.toContain('19000000000000');
  });

  it('recognizes common one-character and transposition typos in sensitive labels', () => {
    const text = 'my emial id is typo@example.com, my phne number is 1234567890, my passwrod is DemoOnly42';
    const result = new DetectionEngine().detectAndRedact(text);

    expect(result.entities.map(entity => entity.type)).toEqual(['Email', 'Phone Number', 'Password']);
    expect(result.redactedText).not.toContain('typo@example.com');
    expect(result.redactedText).not.toContain('1234567890');
    expect(result.redactedText).not.toContain('DemoOnly42');
  });

  it('does not infer a sensitive field from unrelated prose near a value separator', () => {
    const result = new DetectionEngine().detectAndRedact('The weather is sunny.');
    expect(result.entities).toHaveLength(0);
  });

  it('merges NER entities (Person, Location)', () => {
    const text = 'Hello Rahul Sharma from Mumbai!';
    const nerEntities = [
      { type: 'Person', value: 'Rahul Sharma', start: 6, end: 18, confidence: 0.85, tier: 'ner' as const },
      { type: 'Location', value: 'Mumbai', start: 24, end: 30, confidence: 0.90, tier: 'ner' as const },
    ];
    const result = engine.detectAndRedact(text, nerEntities);

    expect(result.entities).toHaveLength(2);
    expect(result.redactedText).toContain('[PERSON_1]');
    expect(result.redactedText).toContain('[LOCATION_1]');
  });

  it('filters out allowlist terms', () => {
    const customEngine = new DetectionEngine(undefined, ['rahul@example.com']);
    const text = 'Email rahul@example.com or test@domain.com';
    const result = customEngine.detectAndRedact(text);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].value).toBe('test@domain.com');
    expect(result.redactedText).toContain('rahul@example.com');
  });

  it('meets performance target (< 10ms for 2,000 characters)', () => {
    const baseText = `Hello assistant! Contact user@example.com or 9876543210. Aadhaar ${validAadhaar}, PAN ABCPB1234F. `;
    const text2000 = baseText.repeat(25);

    const start = performance.now();
    const result = engine.detectAndRedact(text2000);
    const duration = performance.now() - start;

    console.log(`[Perf Benchmark] Processed ${text2000.length} chars in ${duration.toFixed(2)} ms (${result.entities.length} entities found)`);
    expect(duration).toBeLessThan(10);

  });
});
