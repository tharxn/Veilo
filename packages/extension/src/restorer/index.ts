import { PlaceholderVault } from '@veilo/engine';

export class ResponseRestorer {
  private vault: PlaceholderVault;

  constructor(vault: PlaceholderVault) {
    this.vault = vault;
  }

  /**
   * Scans text nodes inside an element and replaces placeholders with original values.
   */
  public restoreElement(element: HTMLElement): void {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeValue) {
        const originalText = node.nodeValue;
        const restoredText = this.vault.restore(originalText);
        if (originalText !== restoredText) {
          node.nodeValue = restoredText;
        }
      }
    }
  }

  /**
   * Attaches a MutationObserver to target assistant message containers.
   */
  public observeAndRestore(container: HTMLElement): () => void {
    // Initial scan
    this.restoreElement(container);

    const observer = new MutationObserver(() => {
      this.restoreElement(container);
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }
}
