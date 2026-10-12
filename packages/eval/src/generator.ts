import { fakerEN_IN as faker } from '@faker-js/faker';
import { generateVerhoeff } from '@veilo/engine';

export interface GroundTruthEntity {
  type: string;
  value: string;
}

export interface SyntheticSample {
  id: string;
  text: string;
  isBenign: boolean;
  expectedEntities: GroundTruthEntity[];
}

export function generateSyntheticDataset(piiCount = 100, benignCount = 100): SyntheticSample[] {
  const dataset: SyntheticSample[] = [];

  // 1. Generate PII samples
  for (let i = 0; i < piiCount; i++) {
    const email = faker.internet.email();
    const phone = faker.string.numeric({ length: 10, allowLeadingZeros: false });
    const fullPhone = `+91 ${phone}`;

    // Valid Verhoeff Aadhaar
    const aadhaarPrefix = faker.string.numeric({ length: 11, allowLeadingZeros: false });
    // Ensure starts with 2-9
    const safeAadhaarPrefix = (Math.floor(Math.random() * 8) + 2).toString() + aadhaarPrefix.slice(1);
    const aadhaar = generateVerhoeff(safeAadhaarPrefix);

    // Valid PAN format (5 letters, 4 digits, 1 letter)
    const pan = 'ABCPB' + faker.string.numeric({ length: 4 }) + 'F';

    // Valid UPI
    const upi = faker.internet.userName().toLowerCase() + '@okaxis';

    const text = `Hi, my name is ${faker.person.fullName()}. Email me at ${email} or call ${fullPhone}. My Aadhaar is ${aadhaar}, PAN is ${pan}, and UPI is ${upi}.`;

    dataset.push({
      id: `pii-${i + 1}`,
      text,
      isBenign: false,
      expectedEntities: [
        { type: 'Email', value: email },
        { type: 'Indian Mobile', value: fullPhone },
        { type: 'Aadhaar', value: aadhaar },
        { type: 'PAN', value: pan },
        { type: 'UPI ID', value: upi },
      ],
    });
  }

  // 2. Generate Benign samples (code, math, recipes, essays, logs)
  const benignTemplates = [
    'Write a Python function to sort a list of numbers using quicksort.',
    'Calculate the integral of f(x) = x^2 + 3x - 5 from x = 0 to x = 10.',
    'Explain the differences between REST and GraphQL APIs in web development.',
    'LOG 2026-10-10 14:00:00 [INFO] System process initialized on port 8080.',
    'Recipe for Butter Chicken: 500g chicken, 2 tbsp butter, 1 cup tomato puree, 1/2 cup cream.',
    'The quick brown fox jumps over the lazy dog in a quiet forest.',
    'In React, useEffect is used to handle side effects in functional components.',
  ];

  for (let i = 0; i < benignCount; i++) {
    const text = benignTemplates[i % benignTemplates.length] + ` [Sample ${i + 1}]`;
    dataset.push({
      id: `benign-${i + 1}`,
      text,
      isBenign: true,
      expectedEntities: [],
    });
  }

  return dataset;
}
