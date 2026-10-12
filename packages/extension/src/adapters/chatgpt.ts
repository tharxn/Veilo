import { BaseChatAdapter, isLocalMockHost } from './base';

export class ChatGPTAdapter extends BaseChatAdapter {
  public id = 'chatgpt';

  protected SELECTORS = {
    composer: [
      '#prompt-textarea',
      'div.ProseMirror#prompt-textarea',
      'div[contenteditable="true"]#prompt-textarea',
      'textarea[name="prompt-textarea"]',
      'div[contenteditable="true"][id="prompt-textarea"]',
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="ask" i]',
      'textarea[aria-label*="message" i]',
      'textarea[aria-label*="prompt" i]',
      '[contenteditable="true"][data-lexical-editor="true"]',
      '[contenteditable="true"][role="textbox"]',
      'form textarea',
      'form [contenteditable="true"]',
      'main textarea:not([disabled])',
      'main [contenteditable="true"]',
      'main [role="textbox"]',
      'textarea:not([disabled]):not([readonly])',
      '[contenteditable="true"]',
    ],
    sendButton: [
      'button[data-testid="send-button"]',
      'button[data-testid*="send"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[aria-label*="Send"]',
      '#send-btn',
      'form button[type="submit"]',
    ],
    assistantMessages: ['div[data-message-author-role="assistant"]', '.agent-turn', '.markdown'],
  };

  public matches(url: URL): boolean {
    if (url.hostname === 'chatgpt.com' || url.hostname.endsWith('.chatgpt.com')) return true;
    if (url.hostname === 'chat.openai.com') return true;
    if (isLocalMockHost(url)) {
      const path = url.pathname.toLowerCase();
      return !path.includes('claude') && !path.includes('gemini') && !path.includes('generic-ai');
    }
    return false;
  }
}
