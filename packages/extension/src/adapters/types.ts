export interface AdapterHealth {
  ok: boolean;
  hasComposer: boolean;
  hasSendButton: boolean;
  hasMessageContainer: boolean;
  missingSelectors: string[];
}

export interface SiteAdapter {
  id: string;
  matches(url: URL): boolean;
  selfTest(): AdapterHealth;
  getComposer(): HTMLElement | null;
  readComposerText(): string;
  writeComposerText(text: string): void | Promise<void>;
  onSendAttempt(cb: (cancel: () => void, via: 'enter' | 'click' | 'submit') => void): () => void;
  beginInternalSend(): void;
  triggerSend(): void;
  getAssistantMessageNodes(): HTMLElement[];
  observeAssistantMessages(cb: (node: HTMLElement) => void): () => void;
}
