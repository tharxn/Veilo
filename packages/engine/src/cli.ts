/**
 * Veilo Engine CLI Test Script
 * Usage: npx tsx src/cli.ts "Text to test"
 */

import { DetectionEngine } from './engine';

const input = process.argv[2] || "Hello, send email to rahul@example.com or call +91 9876543210. Aadhaar is 2345 6789 0123. API Key: sk-proj12345678901234567890123456789012";

console.log("\n--- Veilo CLI Redaction Test ---");
console.log("Original Input:\n", input);

const engine = new DetectionEngine();
const result = engine.detectAndRedact(input);

console.log("\nRedacted Result:\n", result.redactedText);
console.log("\nDetected Entities:", result.entities.length);
console.table(
  result.entities.map(e => ({
    Type: e.type,
    Value: e.value,
    Placeholder: e.placeholder,
    Source: e.source,
  }))
);
