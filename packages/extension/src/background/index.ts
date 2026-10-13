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
    reasons: [chrome.offscreen.Reason.WORKERS, chrome.offscreen.Reason.MATCH_MEDIA],

    justification: 'Run local NER/OCR workers and observe the browser color preference for the toolbar logo',
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'VEILO_BROWSER_APPEARANCE') {
    if (_sender.url !== chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
      || (message.scheme !== 'light' && message.scheme !== 'dark')) {
      sendResponse({ updated: false });
      return;
    }
    void setToolbarLogo(message.scheme)
      .then(() => sendResponse({ updated: true }))
      .catch(() => sendResponse({ updated: false }));
    return true;
  }
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

/** Toolbar colors follow the browser/system preference, independently of Veilo's popup theme. */
async function setToolbarLogo(scheme: 'light' | 'dark'): Promise<void> {
  const prefix = scheme === 'light' ? 'veilo-light' : 'veilo';
  await chrome.action.setIcon({ path: {
    16: 'icons/' + prefix + '-16.png',
    32: 'icons/' + prefix + '-32.png',
    48: 'icons/' + prefix + '-48.png',
  } });
}

async function syncToolbarLogo(): Promise<void> {
  try {
    await ensureOffscreenDocument();
    const appearance = await chrome.runtime.sendMessage({ type: 'OFFSCREEN_BROWSER_APPEARANCE' });
    if (appearance?.scheme === 'light' || appearance?.scheme === 'dark') await setToolbarLogo(appearance.scheme);
  } catch (error) {
    console.warn('[Veilo] Could not update toolbar appearance:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => { void syncToolbarLogo(); });
chrome.runtime.onStartup.addListener(() => { void syncToolbarLogo(); });
void syncToolbarLogo();
