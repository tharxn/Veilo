import { BaseChatAdapter, isLocalMockHost } from './base';

/**
 * Best-effort adapter for AI chat products without a site-specific adapter.
 * It only activates on known AI hosts or pages with both AI/chat signals and
 * a recognizable chat composer, avoiding ordinary web forms.
 */
export class GenericChatAdapter extends BaseChatAdapter {
  public id = 'generic-ai-chat';

  protected SELECTORS = {
    composer: [
      '#userInput',
      '[data-testid*="composer" i] [contenteditable="true"]',
      'textarea[placeholder*="message copilot" i]',
      '[contenteditable="true"][aria-label*="message copilot" i]',
      '#prompt-textarea',
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="ask" i]',
      'textarea[aria-label*="message" i]',
      'textarea[aria-label*="prompt" i]',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"][data-lexical-editor="true"]',
      'textarea:not([disabled]):not([readonly])',
      '[contenteditable="true"]',
      '[role="textbox"]',
      'main textarea:not([disabled])',
      'main [contenteditable="true"]',
      'main [role="textbox"]',
    ],
    sendButton: [
      'button[aria-label*="send" i]',
      'button[title*="send" i]',
      'button[data-testid*="send" i]',
      'button[type="submit"]',
      '[role="button"][aria-label*="send" i]',
    ],
    assistantMessages: [
      '[data-message-author-role="assistant"]',
      '[data-testid*="assistant-message"]',
      '[data-testid*="model-response"]',
      '[data-role="assistant"]',
      '.assistant-message',
      '.model-response',
    ],
  };

  public matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    const knownHosts = [
      'copilot.microsoft.com', 'copilot.com', 'perplexity.ai', 'grok.com', 'deepseek.com',
      'poe.com', 'qwen.ai', 'mistral.ai', 'you.com', 'meta.ai', 'character.ai',
      'huggingface.co', 'huggingchat.com', 'kimi.com', 'kimi.ai', 'pi.ai', 'z.ai',
      'openrouter.ai', 'aistudio.google.com',
    ];
    const knownHost = knownHosts.some(domain => host === domain || host.endsWith(`.${domain}`));
    const grokOnX = host === 'x.com' && url.pathname.toLowerCase().startsWith('/i/grok');
    if (knownHost || grokOnX) return true;

    // Local mock path is used by automated tests.
    if (isLocalMockHost(url) && /generic-ai|copilot/i.test(url.pathname)) return true;

    const titleAndHost = `${document.title} ${host}`.toLowerCase();
    const aiSignal = /\b(ai|assistant|chat|chatbot|copilot|gpt|llm|model)\b/.test(titleAndHost);
    const hasComposer = this.SELECTORS.composer.some(selector => {
      try {
        return Array.from(document.querySelectorAll<HTMLElement>(selector)).some(el => el.getClientRects().length > 0);
      } catch {
        return false;
      }
    });
    const hasConversation = this.SELECTORS.assistantMessages.some(selector => document.querySelector(selector));
    return hasComposer && (aiSignal || hasConversation);
  }
}
