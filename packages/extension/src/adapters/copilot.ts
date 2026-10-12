import { GenericChatAdapter } from './genericChat';
import { isLocalMockHost } from './base';

/** Copilot uses a span-based contenteditable with controlled framework state. */
export class CopilotAdapter extends GenericChatAdapter {
  public id = 'copilot';

  public matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'copilot.microsoft.com' || host === 'copilot.com' ||
      host.endsWith('.copilot.com') ||
      (isLocalMockHost(url) && /copilot/i.test(url.pathname));
  }

  public getComposer(): HTMLElement | null {
    const matched = super.getComposer();
    if (!matched) return null;

    // Copilot may put a contenteditable span inside the actual editable root.
    // Prefer the nearest explicit editable ancestor so selection covers the
    // complete draft rather than only the currently rendered text span.
    let ancestor = matched.parentElement;
    while (ancestor && ancestor !== document.body) {
      if (ancestor.getAttribute('contenteditable')?.toLowerCase() === 'true') {
        return ancestor;
      }
      ancestor = ancestor.parentElement;
    }
    return matched;
  }

  public async writeComposerText(text: string): Promise<void> {
    const composer = this.getComposer();
    if (!composer || composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      super.writeComposerText(text);
      return;
    }

    const selectContents = (element: HTMLElement, collapse = false) => {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(element);
      if (collapse) range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    };

    // Replace the current selection in a single browser editing transaction.
    // A clear-then-insert sequence lets Copilot restore stale controlled state
    // between the two operations; select-all plus insert avoids that gap.
    composer.focus();
    document.execCommand('selectAll');
    selectContents(composer);
    const inserted = document.execCommand('insertText', false, text);
    const currentText = (composer.innerText || composer.textContent || '').trim();
    if (inserted && currentText === text.trim()) return;

    // A single direct replacement is the only fallback; do not dispatch a
    // second insertion event that could append a duplicate prompt.
    composer.textContent = text;
    composer.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      inputType: 'insertReplacementText',
      data: text,
    }));
  }

}
