import { describe, it, expect } from 'vitest';
import { DetectionEngine } from './index';

describe('Engine initialization', () => {
  it('instantiates DetectionEngine correctly', () => {
    const engine = new DetectionEngine();
    const result = engine.detectAndRedact("Test string");
    expect(result.redactedText).toBe("Test string");
  });
});

describe('Detection preferences', () => {
  it('lets disabled names and emails pass through while protecting passwords', () => {
    const engine = new DetectionEngine();
    engine.setDisabledTypes(['Email', 'Person']);
    const result = engine.detectAndRedact('My name is Jamie, my email is demo@example.com, password: DemoOnly42');
    expect(result.entities.map(entity => entity.type)).toEqual(['Password']);
    expect(result.redactedText).toContain('Jamie');
    expect(result.redactedText).toContain('demo@example.com');
    expect(result.redactedText).not.toContain('DemoOnly42');
  });

  it('does not reclassify a disabled API key as an overlapping mobile number', () => {
    const engine = new DetectionEngine();
    engine.setDisabledTypes(['API Key']);
    const text = 'My API key is 9876543210';
    expect(engine.detectAndRedact(text).redactedText).toBe(text);
    expect(engine.detectAndRedact(text).entities).toHaveLength(0);
    engine.setDisabledTypes([]);
    expect(engine.detectAndRedact(text).entities[0].type).toBe('API Key');
  });
});
