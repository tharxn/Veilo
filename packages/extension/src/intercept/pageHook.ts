/**
 * MAIN-world interceptor.
 *
 * Chat sites (Claude, Gemini, ChatGPT) register send handlers in the page JS world.
 * Isolated-world content-script listeners cannot stop those handlers with
 * stopPropagation. This script runs in the page world (manifest world: MAIN)
 * and is the only reliable way to pause Enter / Send before the prompt leaves.
 *
 * Keep this file free of shared-module imports so Vite emits a single classic
 * script with no ES `import` statements.
 */

const PS_CHANNEL = '__VEILO__';

declare global {
  interface Window {
    __veiloPageHook?: boolean;
  }
}

if (!window.__veiloPageHook) {
  window.__veiloPageHook = true;
  install();
}

function install(): void {
  let enabled = false;
  let bypass = 0;
  let composerSelectors: string[] = [];
  let sendButtonSelectors: string[] = [];
  let lastAttemptAt = 0;
  let lastAttemptVia: string | null = null;

  function postToIso(payload: { type: string; via?: string }): void {
    window.postMessage({ channel: PS_CHANNEL, dir: 'main-to-iso', ...payload }, '*');
  }

  function block(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function fromShieldUi(e: Event): boolean {
    return e.composedPath().some(
      node =>
        node instanceof Element &&
        (node.id === 'veilo-modal-root' || node.id === 'veilo-status-badge' || node.id === 'veilo-attachment-warning'),
    );
  }

  function safeMatches(el: Element, selector: string): boolean {
    try {
      return el.matches(selector);
    } catch {
      return false;
    }
  }

  function closestSelector(el: Element, selectors: string[]): Element | null {
    for (const sel of selectors) {
      try {
        const hit = el.closest(sel);
        if (hit) return hit;
      } catch {
        /* invalid selector */
      }
    }
    return null;
  }

  function queryFirst(selectors: string[]): HTMLElement | null {
    for (const sel of selectors) {
      try {
        const nodes = document.querySelectorAll<HTMLElement>(sel);
        for (const el of nodes) {
          if (el.getClientRects().length > 0) return el;
        }
        if (nodes[0]) return nodes[0];
      } catch {
        /* invalid selector */
      }
    }
    return null;
  }

  function isInComposer(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    if (composerSelectors.length && closestSelector(target, composerSelectors)) return true;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return true;
    const el = target as HTMLElement;
    return Boolean(
      el.isContentEditable || el.closest('[contenteditable="true"], textarea, [role="textbox"]'),
    );
  }

  function isSendControl(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const btn = target.closest('button, [role="button"], input[type="submit"]');
    if (!btn) return false;

    if (sendButtonSelectors.length) {
      for (const sel of sendButtonSelectors) {
        if (safeMatches(btn, sel) || btn.closest(sel)) return true;
      }
    }

    const testId = btn.getAttribute('data-testid') || '';
    const id = (btn.id || '').toLowerCase();
    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
    const cls = typeof btn.className === 'string' ? btn.className.toLowerCase() : '';

    if (testId === 'send-button' || id === 'send-btn' || id === 'send-button') return true;
    if (cls.includes('send-button') || cls.includes('send-btn')) return true;
    if (/\bsend (message|prompt)\b/.test(aria)) return true;
    if (aria === 'send' || aria === 'submit' || aria === 'submit prompt') return true;
    return false;
  }

  function emitAttempt(via: string, e: Event): void {
    const now = Date.now();
    if (via === 'click' && lastAttemptVia === 'click' && now - lastAttemptAt < 250) {
      block(e);
      return;
    }
    lastAttemptAt = now;
    lastAttemptVia = via;
    block(e);
    postToIso({ type: 'send-attempt', via });
  }

  function blockFileAttachment(event: Event): void {
    if (!enabled || fromShieldUi(event)) return;
    const fileFound = event instanceof ClipboardEvent
      ? Boolean(event.clipboardData?.files.length || Array.from(event.clipboardData?.items || []).some(item => item.kind === 'file'))
      : event instanceof DragEvent
        ? Boolean(event.dataTransfer?.files.length || Array.from(event.dataTransfer?.items || []).some(item => item.kind === 'file'))
        : false;
    if (!fileFound) return;
    block(event);
    postToIso({ type: 'file-attachment-blocked' });
  }

  window.addEventListener('paste', blockFileAttachment, true);
  window.addEventListener('drop', blockFileAttachment, true);

  window.addEventListener(
    'keydown',
    e => {
      if (!enabled || (bypass > 0 && !e.isTrusted)) return;
      if (fromShieldUi(e)) return;
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
      if (!isInComposer(e.target)) return;
      emitAttempt('enter', e);
    },
    true,
  );

  window.addEventListener(
    'click',
    e => {
      if (!enabled || (bypass > 0 && !e.isTrusted)) return;
      if (fromShieldUi(e)) return;
      if (!isSendControl(e.target)) return;
      emitAttempt('click', e);
    },
    true,
  );

  window.addEventListener(
    'pointerdown',
    e => {
      if (!enabled || (bypass > 0 && !e.isTrusted)) return;
      if (fromShieldUi(e)) return;
      if (!isSendControl(e.target)) return;
      emitAttempt('click', e);
    },
    true,
  );

  window.addEventListener(
    'submit',
    e => {
      if (!enabled || (bypass > 0 && !e.isTrusted)) return;
      if (fromShieldUi(e)) return;
      emitAttempt('submit', e);
    },
    true,
  );

  window.addEventListener('message', event => {
    if (event.source !== window) return;
    const data = event.data as {
      channel?: string;
      dir?: string;
      type?: string;
      via?: string;
      composerSelectors?: string[];
      sendButtonSelectors?: string[];
    } | null;
    if (!data || data.channel !== PS_CHANNEL || data.dir !== 'iso-to-main') return;

    if (data.type === 'enable') enabled = true;
    if (data.type === 'disable') enabled = false;

    if (data.type === 'configure') {
      composerSelectors = data.composerSelectors || [];
      sendButtonSelectors = data.sendButtonSelectors || [];
    }

    if (data.type === 'allow-send') {
      bypass += 1;
      postToIso({ type: 'allow-send-ack' });
      try {
        if (data.via === 'click' || data.via === 'submit') {
          const btn = queryFirst(sendButtonSelectors);
          if (btn) {
            btn.click();
          } else {
            dispatchEnter();
          }
        } else {
          dispatchEnter();
        }
      } finally {
        window.setTimeout(() => {
          bypass = Math.max(0, bypass - 1);
        }, 400);
      }
    }
  });

  function dispatchEnter(): void {
    const composer = queryFirst(composerSelectors);
    if (!composer) return;
    composer.focus();
    composer.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  postToIso({ type: 'page-hook-ready' });
}

export {};
