import { DetectionEngine } from '@veilo/engine';
import { generateSyntheticDataset, SyntheticSample } from './generator';
import { writeEvalReport } from './reportWriter';

export interface EntityMetrics {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface EvalReport {
  timestamp: string;
  totalSamples: number;
  piiSamplesCount: number;
  benignSamplesCount: number;
  latencyP50: number;
  latencyP95: number;
  falsePositivesPer1000Benign: number;
  entityMetrics: Record<string, EntityMetrics>;
}

export function runEvaluation(samples?: SyntheticSample[]): EvalReport {
  const dataset = samples || generateSyntheticDataset(100, 100);
  const engine = new DetectionEngine();

  const latencies: number[] = [];
  let benignFalsePositivesCount = 0;

  const metricsMap: Record<string, { tp: number; fp: number; fn: number }> = {};

  function getMetricTracker(type: string) {
    if (!metricsMap[type]) {
      metricsMap[type] = { tp: 0, fp: 0, fn: 0 };
    }
    return metricsMap[type];
  }

  for (const sample of dataset) {
    const start = performance.now();
    const result = engine.detectAndRedact(sample.text);
    const duration = performance.now() - start;
    latencies.push(duration);

    if (sample.isBenign) {
      if (result.entities.length > 0) {
        benignFalsePositivesCount += result.entities.length;
      }
    } else {
      // Evaluate PII detections against ground truth
      const detectedValues = new Map(result.entities.map(e => [e.value, e.type]));
      const expectedValues = new Map(sample.expectedEntities.map(e => [e.value, e.type]));

      for (const expected of sample.expectedEntities) {
        const tracker = getMetricTracker(expected.type);
        if (detectedValues.has(expected.value)) {
          tracker.tp++;
        } else {
          tracker.fn++;
        }
      }

      for (const detected of result.entities) {
        if (!expectedValues.has(detected.value)) {
          const tracker = getMetricTracker(detected.type);
          tracker.fp++;
        }
      }
    }
  }

  // Sort latencies to compute percentiles
  latencies.sort((a, b) => a - b);
  const latencyP50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const latencyP95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

  const benignSamplesCount = dataset.filter(s => s.isBenign).length;
  const falsePositivesPer1000Benign = benignSamplesCount > 0
    ? (benignFalsePositivesCount / benignSamplesCount) * 1000
    : 0;

  // Compute Precision, Recall, F1 for each entity type
  const entityMetrics: Record<string, EntityMetrics> = {};
  for (const [type, counts] of Object.entries(metricsMap)) {
    const precision = counts.tp + counts.fp > 0 ? counts.tp / (counts.tp + counts.fp) : 1;
    const recall = counts.tp + counts.fn > 0 ? counts.tp / (counts.tp + counts.fn) : 1;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    entityMetrics[type] = {
      tp: counts.tp,
      fp: counts.fp,
      fn: counts.fn,
      precision,
      recall,
      f1,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    totalSamples: dataset.length,
    piiSamplesCount: dataset.filter(s => !s.isBenign).length,
    benignSamplesCount,
    latencyP50,
    latencyP95,
    falsePositivesPer1000Benign,
    entityMetrics,
  };
}

if (process.argv[1] && process.argv[1].endsWith('runner.ts')) {
  console.log('[Veilo Eval] Running evaluation benchmark...');
  const report = runEvaluation();
  writeEvalReport(report);
}
