import { BaseChatAdapter, isLocalMockHost } from './base';

/** Grok uses a combobox on its home page and a textbox in existing chats. */
export class GrokAdapter extends BaseChatAdapter {
  public id = 'grok';

  protected SELECTORS = {
    composer: [
      '[contenteditable="true"][role="combobox"]',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][aria-label*="ask grok" i]',
      'textarea[placeholder*="ask grok" i]',
      'textarea[aria-label*="ask grok" i]',
      'main [contenteditable="true"]',
      'textarea:not([disabled]):not([readonly])',
    ],
    sendButton: [
      'button[aria-label="Submit" i]',
      'button[aria-label="Submit prompt" i]',
      'button[aria-label*="send" i]',
      'button[title*="send" i]',
      'button[data-testid*="send" i]',
      'button[type="submit"]',
      '[role="button"][aria-label="Submit" i]',
      '[role="button"][aria-label*="send" i]',
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
    return host === 'grok.com' || host.endsWith('.grok.com') ||
      (host === 'x.com' && url.pathname.toLowerCase().startsWith('/i/grok')) ||
      (isLocalMockHost(url) && /\/grok(?:[/.?]|$)/i.test(url.pathname));
  }

}
