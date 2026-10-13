import { BaseChatAdapter, isLocalMockHost } from './base';

/** Read the visible Meta editor, rather than its stale textarea backing node. */
export class MetaAdapter extends BaseChatAdapter {
  public id = 'meta';

  protected SELECTORS = {
    composer: [
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][data-lexical-editor="true"]',
      '[contenteditable="true"][aria-label*="ask meta" i]',
      'textarea[placeholder*="ask meta ai" i]',
      'textarea[aria-label*="ask meta ai" i]',
      'main [contenteditable="true"]',
      'textarea:not([disabled]):not([readonly])',
    ],
    sendButton: [
      'button[aria-label*="send" i]',
      '[role="button"][aria-label*="send" i]',
      'button[aria-label="Submit" i]',
      'button[title*="send" i]',
      'button[data-testid*="send" i]',
      'button[type="submit"]',
    ],
    assistantMessages: [
      '[data-message-author-role="assistant"]',
      '[data-testid*="assistant-message"]',
      '[data-role="assistant"]',
      '.assistant-message',
    ],
  };

  public matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'meta.ai' || host.endsWith('.meta.ai') ||
      (isLocalMockHost(url) && /\/meta(?:[/.?]|$)/i.test(url.pathname));
  }

}
