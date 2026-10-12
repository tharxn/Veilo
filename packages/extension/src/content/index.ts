import { DetectionEngine } from '@veilo/engine';
import { ChatGPTAdapter } from '../adapters/chatgpt';
import { ClaudeAdapter } from '../adapters/claude';
import { GeminiAdapter } from '../adapters/gemini';
import { GenericChatAdapter } from '../adapters/genericChat';
import { CopilotAdapter } from '../adapters/copilot';
import { SiteAdapter } from '../adapters/types';
import { BaseChatAdapter } from '../adapters/base';
import { ReviewModal } from '../ui/reviewModal';
import { StatusBadge } from '../ui/statusBadge';
import { PS_CHANNEL, SendVia, isVeiloMessage } from '../intercept/protocol';
import { AttachmentWarning } from '../ui/attachmentWarning';
import { AttachmentGuard } from '../intercept/attachmentGuard';
import { setActiveTheme } from '../ui/theme';

console.log('[Veilo] Content script initialized.');

class VeiloExtension {
  private engine: DetectionEngine;
  private modal: ReviewModal;
  private badge: StatusBadge;
  private attachmentWarning = new AttachmentWarning();
  private attachmentGuard = new AttachmentGuard(this.attachmentWarning);
  private activeAdapter: SiteAdapter | null = null;
  private activeRedactionsCount = 0;
  private showStatusToast = true;
  private protectionEnabled = true;
  private toastPreferenceReady = false;
  private isInterceptionAttached = false;
  private handlingSend = false;
  private interceptLock = false;
  private lastVia: SendVia = 'enter';

  constructor() {
    this.engine = new DetectionEngine();
    this.modal = new ReviewModal();
    this.badge = new StatusBadge();
  }

  public async start(): Promise<void> {
    const url = new URL(window.location.href);

    const adapters: SiteAdapter[] = [
      new ChatGPTAdapter(),
      new ClaudeAdapter(),
      new GeminiAdapter(),
      new CopilotAdapter(),
      new GenericChatAdapter(),
    ];
    this.listenToPageHook();
    await this.loadPreferences();
    this.activeAdapter = adapters.find(a => a.matches(url)) || null;
    if (!this.activeAdapter) {
      window.postMessage({ channel: PS_CHANNEL, dir: 'iso-to-main', type: 'disable' }, '*');
      return;
    }
    this.attachmentGuard.attach();
    this.attachmentGuard.setEnabled(this.protectionEnabled);
    if (this.protectionEnabled) this.enablePageHook();
    else window.postMessage({ channel: PS_CHANNEL, dir: 'iso-to-main', type: 'disable' }, '*');

    const checkAndInitialize = (): boolean => {
      if (!this.activeAdapter) return false;

      const health = this.activeAdapter.selfTest();
      this.renderBadge(health.ok);

      if (health.ok) this.attachInterception();

      return health.ok;
    };

    if (!checkAndInitialize()) {
      const observer = new MutationObserver(() => {
        this.enablePageHook();
        if (checkAndInitialize()) observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  private async loadPreferences(): Promise<void> {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.protectionEnabled) {
        this.protectionEnabled = changes.protectionEnabled.newValue !== false;
        this.attachmentGuard.setEnabled(this.protectionEnabled);
        if (this.protectionEnabled && this.activeAdapter) this.enablePageHook();
        else window.postMessage({ channel: PS_CHANNEL, dir: 'iso-to-main', type: 'disable' }, '*');
      }
      if (changes.showStatusToast) this.showStatusToast = changes.showStatusToast.newValue !== false;
      if (changes.theme) setActiveTheme(changes.theme.newValue);
      this.toastPreferenceReady = true;
      this.renderBadge(this.activeAdapter?.selfTest().ok ?? false);
    });

    try {
      const { protectionEnabled, showStatusToast, theme } = await chrome.storage.local.get({
        protectionEnabled: true,
        showStatusToast: true,
        theme: 'everyday',
      });
      this.protectionEnabled = protectionEnabled !== false;
      this.showStatusToast = showStatusToast !== false;
      setActiveTheme(theme);
      this.toastPreferenceReady = true;
    } catch {
      this.protectionEnabled = true;
      this.showStatusToast = true;
      setActiveTheme('everyday');
      this.toastPreferenceReady = true;
    }
  }

  private renderBadge(isHealthy: boolean): void {
    if (!this.toastPreferenceReady || !this.protectionEnabled || !this.showStatusToast) {
      this.badge.hide();
      return;
    }
    this.badge.render(this.activeRedactionsCount, isHealthy);
  }
  private listenToPageHook(): void {
    window.addEventListener('message', event => {
      if (event.source !== window) return;
      if (!isVeiloMessage(event.data)) return;
      if (event.data.dir !== 'main-to-iso') return;

      if (event.data.type === 'page-hook-ready') {
        if (this.protectionEnabled) this.enablePageHook();
        else window.postMessage({ channel: PS_CHANNEL, dir: 'iso-to-main', type: 'disable' }, '*');
      }

      if (event.data.type === 'file-attachment-blocked') {
        this.attachmentWarning.showBlocked('Pasting or dropping files is not supported yet. The file was blocked and was not shared. Use the chat’s upload button to inspect supported images or text files.');
      }

      if (event.data.type === 'send-attempt') {
        this.lastVia = event.data.via;
        this.handleSendAttempt(() => undefined, true);
      }
    });
  }

  private enablePageHook(): void {
    const adapter = this.activeAdapter;
    if (!adapter || !this.protectionEnabled) {
      window.postMessage({ channel: PS_CHANNEL, dir: 'iso-to-main', type: 'disable' }, '*');
      return;
    }
    const selectors =
      adapter instanceof BaseChatAdapter
        ? adapter.getSelectors()
        : { composer: [], sendButton: [] };

    window.postMessage(
      {
        channel: PS_CHANNEL,
        dir: 'iso-to-main',
        type: 'configure',
        composerSelectors: selectors.composer,
        sendButtonSelectors: selectors.sendButton,
      },
      '*',
    );
    window.postMessage({ channel: PS_CHANNEL, dir: 'iso-to-main', type: 'enable' }, '*');
  }

  private attachInterception(): void {
    if (!this.activeAdapter || this.isInterceptionAttached) return;
    this.isInterceptionAttached = true;

    this.activeAdapter.onSendAttempt((cancelFn, via) => {
      this.lastVia = via;
      this.handleSendAttempt(cancelFn, false);
    });
  }

  private handleSendAttempt(cancelFn: () => void, alreadyBlocked: boolean): void {
    if (!this.activeAdapter) return;
    if (!this.protectionEnabled) {
      if (alreadyBlocked) this.proceedWithSend();
      return;
    }
    if (this.handlingSend) {
      cancelFn();
      return;
    }
    if (this.interceptLock) {
      return;
    }

    this.interceptLock = true;
    window.setTimeout(() => {
      this.interceptLock = false;
    }, 350);

    const text = this.activeAdapter.readComposerText();
    if (!text || !text.trim()) return;

    const detection = this.engine.detectAndRedact(text);
    if (detection.entities.length === 0) {
      if (alreadyBlocked) {
        this.proceedWithSend();
      }
      return;
    }

    this.handlingSend = true;
    cancelFn();

    this.modal.show({
      entities: detection.entities,
      onSendRedacted: async selectedEntityIndexes => {
        const adapter = this.activeAdapter!;
        const selectedIndexes = new Set(selectedEntityIndexes);
        const selectedEntities = detection.entities.filter((_entity, index) => selectedIndexes.has(index));
        if (selectedEntities.length === 0) return 'Select at least one item to redact, or choose Send Original.';
        let selectedRedactedText = detection.originalText;
        for (let index = detection.entities.length - 1; index >= 0; index -= 1) {
          if (!selectedIndexes.has(index)) continue;
          const entity = detection.entities[index];
          selectedRedactedText = selectedRedactedText.slice(0, entity.start) + entity.placeholder + selectedRedactedText.slice(entity.end);
        }
        const normalize = (value: string) => value
          .replace(/\u00a0/g, ' ')
          .replace(/\r\n/g, '\n')
          .normalize('NFC')
          // Rich text editors can serialize the same prompt with paragraph
          // boundaries or repeated whitespace. Compare visible text semantics.
          .replace(/\s+/g, ' ')
          .trim();

        let lastObserved = '';
        try {
          await adapter.writeComposerText(selectedRedactedText);
          // Copilot and some React rich-text editors reconcile input after
          // dispatching their input event. Verify the settled composer value,
          // with short retries, before allowing the page's send handler.
          for (let attempt = 0; attempt < 8; attempt += 1) {
            lastObserved = adapter.readComposerText();
            if (normalize(lastObserved) === normalize(selectedRedactedText)) {
              this.activeRedactionsCount += selectedEntities.length;
              this.renderBadge(true);
              window.setTimeout(() => this.proceedWithSend(), 60);
              return true;
            }
            await new Promise(resolve => window.setTimeout(resolve, 50));
          }
        } catch (error) {
          if (adapter.id === 'copilot') {
            console.info('[Veilo] Copilot redaction blocked; editor metadata only:', {
              editor: adapter.getComposer()?.tagName.toLowerCase() || 'not-found',
              reason: error instanceof Error ? error.name : 'unknown',
            });
            return 'Copilot would not accept the redacted replacement, so Veilo stopped. Nothing was sent. Your draft may still contain sensitive details; cancel and clear it before continuing. “Send Original” sends the unredacted message.';
          }
          return 'Veilo could not verify the redacted text, so it stopped. Nothing was sent. Review the draft before trying again.';
        }

        // Diagnostics intentionally report only metadata and booleans. Never
        // put the prompt or matched values in the UI or console.
        const composer = adapter.getComposer();
        const actual = normalize(lastObserved);
        const redactedDraft = normalize(selectedRedactedText);
        const placeholdersFound = selectedEntities.filter(entity =>
          entity.placeholder && actual.includes(normalize(entity.placeholder)),
        ).length;
        const sourceMatchesRemaining = selectedEntities.filter(entity => {
          const source = normalize(entity.value);
          // Ignore matches that naturally remain elsewhere in the intended
          // redacted draft (for example, a short value repeated in normal text).
          return source && !redactedDraft.includes(source) && actual.includes(source);
        }).length;
        const matchesRedactedDraft = actual === redactedDraft;
        const editorKind = composer
          ? `${composer.tagName.toLowerCase()}${composer.isContentEditable ? '[contenteditable]' : ''}${composer instanceof HTMLTextAreaElement ? '[textarea]' : composer instanceof HTMLInputElement ? '[input]' : ''}`
          : 'not-found';
        if (adapter.id === 'copilot') {
          console.info('[Veilo] Copilot redaction blocked; safe verification metadata:', {
            editorKind,
            placeholdersFound,
            placeholderCount: selectedEntities.length,
            sourceMatchesRemaining,
            redactedDraftMatches: matchesRedactedDraft,
            currentLength: actual.length,
            expectedLength: redactedDraft.length,
          });
          return 'Veilo could not safely replace the sensitive text in Copilot, so it stopped. Nothing was sent. Your draft may still contain sensitive details; cancel and clear it before continuing. “Send Original” sends the unredacted message.';
        }
        return 'Redaction could not be verified, so nothing was sent. Please review the draft before trying again.';
      },
      onSendOriginal: () => {
        window.setTimeout(() => this.proceedWithSend(), 30);
      },
      onCancel: () => {
        this.handlingSend = false;
      },
    });
  }

  private proceedWithSend(): void {
    let acked = false;
    const onAck = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!isVeiloMessage(event.data)) return;
      if (event.data.dir === 'main-to-iso' && event.data.type === 'allow-send-ack') {
        acked = true;
      }
    };
    window.addEventListener('message', onAck);

    this.activeAdapter?.beginInternalSend();
    window.postMessage(
      { channel: PS_CHANNEL, dir: 'iso-to-main', type: 'allow-send', via: this.lastVia },
      '*',
    );

    window.setTimeout(() => {
      window.removeEventListener('message', onAck);
      if (!acked) {
        this.activeAdapter?.triggerSend();
      }
      this.handlingSend = false;
    }, 80);
  }

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new VeiloExtension().start());
} else {
  new VeiloExtension().start();
}
