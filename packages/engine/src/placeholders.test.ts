import { describe, expect, it } from 'vitest';
import { DetectionEngine } from './engine';

describe('Existing redaction placeholders', () => {
  it.each([
    'My password is [PASSWORD_1]',
    'password: [PASSWORD_1].',
    'pwd=[PASSWORD_2]',
    'passcode: "[PASSWORD_3]"',
    'Email: [EMAIL_1], password: [PASSWORD_1], API key: [API_KEY_1].',
  ])('does not re-detect a placeholder in %s', text => {
    const result = new DetectionEngine().detectAndRedact(text);
    expect(result.entities).toHaveLength(0);
    expect(result.redactedText).toBe(text);
  });

  it('still detects a new real value alongside an existing placeholder', () => {
    const result = new DetectionEngine().detectAndRedact('password: [PASSWORD_1], API key: demo-key-42.');
    expect(result.entities.map(entity => entity.type)).toEqual(['API Key']);
    expect(result.redactedText).toContain('[PASSWORD_1]');
    expect(result.redactedText).not.toContain('demo-key-42');
  });
});
