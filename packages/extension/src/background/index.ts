/**
 * Veilo Background Service Worker
 * Manages offscreen document lifecycle for local WASM NER inference.
 */

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.WORKERS],

    justification: 'Run local NER and image OCR workers without host page CSP restrictions',
  });

  await creatingOffscreen;
  creatingOffscreen = null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'RUN_NER') {
    ensureOffscreenDocument()
      .then(() => {
        // Route message to offscreen document
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_RUN_NER', text: message.text }, response => {
          sendResponse(response || { entities: [] });
        });
      })
      .catch(err => {
        console.warn('[Veilo] Failed to initialize offscreen NER:', err);
        sendResponse({ entities: [] });
      });

    return true; // Keep channel open for async response
  }
  if (message.type === 'OCR_IMAGE') {
    const dataUrl = message.dataUrl;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      sendResponse({ error: 'OCR_FAILED' });
      return;
    }
    ensureOffscreenDocument()
      .then(() => chrome.runtime.sendMessage({ type: 'OFFSCREEN_OCR_IMAGE', dataUrl }, response => {
        sendResponse(response || { error: 'OCR_FAILED' });
      }))
      .catch(() => sendResponse({ error: 'OCR_FAILED' }));
    return true;
  }
});
