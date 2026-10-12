import { BaseChatAdapter, isLocalMockHost } from './base';

export class ClaudeAdapter extends BaseChatAdapter {
  public id = 'claude';

  protected SELECTORS = {
    composer: [
      'div.ProseMirror[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      '[data-testid="chat-input-container"] div[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      '[enterkeyhint="enter"][contenteditable="true"]',
    ],
    sendButton: [
      'button[aria-label="Send message"]',
      'button[aria-label="Send Message"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      '#send-btn',
      'fieldset button[type="button"]',
      'button[type="submit"]',
    ],
    assistantMessages: [
      'div.font-claude-message',
      '[data-testid="assistant-message"]',
      'div[data-is-streaming]',
      '.markdown',
      '[data-message-author-role="assistant"]',
    ],
  };

  public matches(url: URL): boolean {
    if (url.hostname === 'claude.ai' || url.hostname.endsWith('.claude.ai')) return true;
    if (isLocalMockHost(url) && url.pathname.toLowerCase().includes('claude')) return true;
    return false;
  }
}
