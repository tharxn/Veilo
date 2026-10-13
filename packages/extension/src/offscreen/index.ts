/**
 * Veilo Offscreen NER Runner
 * Runs ONNX / Token Classification inference in an extension-owned context with wasm-unsafe-eval privileges.
 */

import Tesseract from 'tesseract.js';
import { detectRuleEntities, resolveOverlaps } from '@veilo/engine';

export interface NEREntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
  tier: 'ner';
}

console.log('[Veilo] Offscreen document loaded.');

let imageOcrWorker: ReturnType<typeof Tesseract.createWorker> | null = null;

async function inspectImage(dataUrl: string): Promise<Array<{ type: string; count: number }>> {
  if (!imageOcrWorker) {
    const root = chrome.runtime.getURL('ocr/');
    imageOcrWorker = Tesseract.createWorker('eng', 1, {
      workerPath: `${root}worker.min.js`,
      corePath: `${root}core/tesseract-core-lstm.wasm.js`,
      langPath: `${root}lang`,
      workerBlobURL: false,
      gzip: true,
      logger: () => undefined,
    });
  }
  const worker = await imageOcrWorker;
  const result = await worker.recognize(dataUrl);
  const counts = new Map<string, number>();
  for (const entity of resolveOverlaps(detectRuleEntities(result.data.text))) {
    counts.set(entity.type, (counts.get(entity.type) || 0) + 1);
  }
  // Discard OCR text and matched values in this extension-owned context.
  return Array.from(counts, ([type, count]) => ({ type, count }));
}

// Heuristic & Dictionary-assisted NER runner for on-device fallback
export function runLocalNER(text: string): NEREntity[] {
  const entities: NEREntity[] = [];

  // 1. Common Name Patterns (e.g. "Rahul Sharma", "John Doe", "Priya Patel")
  const nameRegex = /\b([A-Z][a-z]{2,15}\s+[A-Z][a-z]{2,15})\b/g;
  let m: RegExpExecArray | null;

  const BENIGN_TITLE_WORDS = new Set(['Veilo', 'Bank Account', 'Credit Card', 'Debit Card', 'Indian Mobile', 'API Key', 'Private Key']);

  while ((m = nameRegex.exec(text)) !== null) {
    const candidate = m[0];
    if (!BENIGN_TITLE_WORDS.has(candidate)) {
      entities.push({
        type: 'Person',
        value: candidate,
        start: m.index,
        end: m.index + candidate.length,
        confidence: 0.85,
        tier: 'ner',
      });
    }
  }

  // 2. Common Location Patterns (e.g. "Mumbai", "Bangalore", "Delhi", "San Francisco")
  const locationKeywords = ['Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];
  for (const loc of locationKeywords) {
    const locRegex = new RegExp(`\\b${loc}\\b`, 'gi');
    while ((m = locRegex.exec(text)) !== null) {
      entities.push({
        type: 'Location',
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
        confidence: 0.90,
        tier: 'ner',
      });
    }
  }

  return entities;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'OFFSCREEN_BROWSER_APPEARANCE') {
      sendResponse({ scheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' });
      return;
    }
    if (message.type === 'OFFSCREEN_RUN_NER') {
      try {
        const entities = runLocalNER(message.text || '');
        sendResponse({ entities });
      } catch (err) {
        console.warn('[Veilo] NER inference error:', err);
        sendResponse({ entities: [] });
      }
    }
    if (message.type === 'OFFSCREEN_OCR_IMAGE') {
      if (typeof message.dataUrl !== 'string' || !message.dataUrl.startsWith('data:image/')) {
        sendResponse({ error: 'OCR_FAILED' });
        return;
      }
      void inspectImage(message.dataUrl)
        .then(findings => sendResponse({ findings }))
        .catch(() => sendResponse({ error: 'OCR_FAILED' }));
      return true;
    }
  });
}

/** Only the color preference is sent; no page or prompt data is involved. */
const browserColorPreference = window.matchMedia('(prefers-color-scheme: dark)');
function reportBrowserAppearance(): void {
  void chrome.runtime.sendMessage({
    type: 'VEILO_BROWSER_APPEARANCE',
    scheme: browserColorPreference.matches ? 'dark' : 'light',
  }).catch(() => undefined);
}
browserColorPreference.addEventListener('change', reportBrowserAppearance);
reportBrowserAppearance();
