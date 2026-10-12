import { describe, it, expect } from 'vitest';
import { DetectionEngine } from './index';

describe('Engine initialization', () => {
  it('instantiates DetectionEngine correctly', () => {
    const engine = new DetectionEngine();
    const result = engine.detectAndRedact("Test string");
    expect(result.redactedText).toBe("Test string");
  });
});
