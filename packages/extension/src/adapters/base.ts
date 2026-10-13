import { AdapterHealth, SiteAdapter } from './types';
import { readDraft } from '../intercept/richComposer';
import { PS_CHANNEL } from '../intercept/protocol';

export interface AdapterSelectors {
  composer: string[];
  sendButton: string[];
  assistantMessages: string[];
}

export abstract class BaseChatAdapter implements SiteAdapter {
  public abstract id: string;
  protected abstract SELECTORS: AdapterSelectors;
  protected isInternalTrigger = false;

  public abstract matches(url: URL): boolean;

  public getSelectors(): AdapterSelectors {
    return this.SELECTORS;
  }

  public selfTest(): AdapterHealth {
    const composer = this.getComposer();
    const sendButton = this.getSendButton();
    const assistantNodes = this.getAssistantMessageNodes();

    const missing: string[] = [];
    if (!composer) missing.push('composer');
    if (!sendButton) missing.push('sendButton');

    return {
      ok: Boolean(composer),
      hasComposer: Boolean(composer),
      hasSendButton: Boolean(sendButton),
      hasMessageContainer: assistantNodes.length > 0,
      missingSelectors: missing,
    };
  }

  public getComposer(): HTMLElement | null {
    return this.queryFirstVisible(this.SELECTORS.composer);
  }

  public getSendButton(): HTMLElement | null {
    return this.queryFirstVisible(this.SELECTORS.sendButton);
  }

  public isSendControl(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const btn = target.closest('button, [role="button"], input[type="submit"]');
    if (!btn) return false;
    for (const sel of this.SELECTORS.sendButton) {
      try {
        if (btn.matches(sel) || btn.closest(sel)) return true;
      } catch {
        /* ignore invalid selector */
      }
    }
    const composer = this.getComposer();
    if (composer) {
      const root = composer.closest('form, fieldset') || composer.parentElement;
      if (root && root.contains(btn)) {
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (aria.includes('send') || aria.includes('submit')) return true;
      }
    }
    return false;
  }

  public readComposerText(): string {
    const composer = this.getComposer();
    return composer ? readDraft(composer) : '';
  }

  public async writeComposerText(text: string): Promise<void> {
    const composer = this.getComposer();
    if (!composer) throw new Error('composer-unavailable');
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      composer.focus();
      const proto = composer instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(composer, text);
      else composer.value = text;
      composer.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText', data: text }));
      composer.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return;
    }

    const requestId = crypto.randomUUID();
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('replacement-timeout'));
      }, 1800);
      const onMessage = (event: MessageEvent) => {
        const data = event.data;
        if (event.source !== window || data?.channel !== PS_CHANNEL || data.dir !== 'main-to-iso' ||
            data.type !== 'draft-replaced' || data.requestId !== requestId) return;
        window.clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        if (data.ok) resolve();
        else reject(new Error('replacement-not-accepted'));
      };
      window.addEventListener('message', onMessage);
      window.postMessage({ channel: PS_CHANNEL, dir: 'iso-to-main', type: 'replace-draft',
        requestId, text, expectedText: readDraft(composer) }, '*');
    });
  }
  /**
   * Isolated-world fallback. The MAIN-world page hook is what actually stops
   * Claude/Gemini; these listeners still cover the mock page and ChatGPT cases
   * where preventDefault is enough.
   */
  public onSendAttempt(cb: (cancel: () => void, via: 'enter' | 'click' | 'submit') => void): () => void {
    const handleSend = (e: Event, via: 'enter' | 'click' | 'submit') => {
      if (this.isInternalTrigger && !e.isTrusted) return;

      let canceled = false;
      const cancelFn = () => {
        canceled = true;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      cb(cancelFn, via);
      if (canceled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    const keydownHandler = (e: KeyboardEvent) => {
      if (this.isInternalTrigger && !e.isTrusted) return;
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const target = e.target;
      const composer = this.getComposer();
      if (!composer) return;
      if (target instanceof Node && !composer.contains(target) && target !== composer) return;
      handleSend(e, 'enter');
    };

    const clickHandler = (e: MouseEvent) => {
      if (this.isInternalTrigger && !e.isTrusted) return;
      if (!this.isSendControl(e.target)) return;
      handleSend(e, 'click');
    };

    const submitHandler = (e: Event) => {
      if (this.isInternalTrigger && !e.isTrusted) return;
      handleSend(e, 'submit');
    };

    window.addEventListener('keydown', keydownHandler, true);
    window.addEventListener('click', clickHandler, true);
    window.addEventListener('submit', submitHandler, true);

    return () => {
      window.removeEventListener('keydown', keydownHandler, true);
      window.removeEventListener('click', clickHandler, true);
      window.removeEventListener('submit', submitHandler, true);
    };
  }

  public beginInternalSend(): void {
    this.isInternalTrigger = true;
    window.setTimeout(() => {
      this.isInternalTrigger = false;
    }, 400);
  }

  public triggerSend(): void {
    this.beginInternalSend();
    try {
      const sendBtn = this.getSendButton();
      if (sendBtn) {
        sendBtn.click();
        return;
      }
      const composer = this.getComposer();
      if (composer) {
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
    } catch {
      /* send control may have unmounted */
    }
  }

  public getAssistantMessageNodes(): HTMLElement[] {
    const nodes: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();
    for (const sel of this.SELECTORS.assistantMessages) {
      document.querySelectorAll<HTMLElement>(sel).forEach(el => {
        if (!seen.has(el)) {
          seen.add(el);
          nodes.push(el);
        }
      });
    }
    return nodes;
  }

  public observeAssistantMessages(cb: (node: HTMLElement) => void): () => void {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          if (!(addedNode instanceof HTMLElement)) continue;
          for (const sel of this.SELECTORS.assistantMessages) {
            if (addedNode.matches(sel)) {
              cb(addedNode);
            } else {
              const childMatch = addedNode.querySelector<HTMLElement>(sel);
              if (childMatch) cb(childMatch);
            }
          }
        }
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }

  protected queryFirstVisible(selectors: string[]): HTMLElement | null {
    for (const sel of selectors) {
      try {
        const nodes = document.querySelectorAll<HTMLElement>(sel);
        for (const el of nodes) {
          if (el.getClientRects().length > 0 && !el.closest('[hidden], [aria-hidden="true"]') && getComputedStyle(el).visibility !== 'hidden') return el;
        }

      } catch {
        /* invalid selector */
      }
    }
    return null;
  }
}

export function isLocalMockHost(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}
