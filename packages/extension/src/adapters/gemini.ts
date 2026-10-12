import { BaseChatAdapter, isLocalMockHost } from './base';

export class GeminiAdapter extends BaseChatAdapter {
  public id = 'gemini';

  protected SELECTORS = {
    composer: [
      'rich-textarea .ql-editor',
      '.ql-editor[contenteditable="true"]',
      'div.ql-editor.textarea',
      '[aria-label*="Enter a prompt"]',
      '[aria-label*="Enter your prompt"]',
      '.input-area div[contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
    ],
    sendButton: [
      'button.send-button',
      'button[aria-label="Send message"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Submit"]',
      '#send-btn',
      'button[aria-label*="prompt"]',
    ],
    assistantMessages: [
      'message-content',
      'model-response',
      '.model-response-text',
      '.markdown',
      '[data-message-author-role="assistant"]',
    ],
  };

  public matches(url: URL): boolean {
    if (url.hostname === 'gemini.google.com' || url.hostname.endsWith('.gemini.google.com')) return true;
    if (isLocalMockHost(url) && url.pathname.toLowerCase().includes('gemini')) return true;
    return false;
  }
}
