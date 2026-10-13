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

}
