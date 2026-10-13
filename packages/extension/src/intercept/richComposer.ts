/** Public DOM editing APIs only; no framework stores or editor internals. */
export function readDraft(composer: HTMLElement): string {
  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) return composer.value;
  const blocks = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE)$/;
  function read(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (!(node instanceof HTMLElement)) return '';
    if (node.getAttribute('aria-hidden') === 'true' || node.hidden) return '';
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return '';
    if (node.tagName === 'BR') return '\n';
    const value = Array.from(node.childNodes).map(read).join('');
    return blocks.test(node.tagName) && value ? value.replace(/\n$/, '') + '\n' : value;
  }
  return Array.from(composer.childNodes).map(read).join('').replace(/\n$/, '').replace(/\u00a0/g, ' ');
}

export function normalizeDraft(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n').normalize('NFC').replace(/\s+/g, ' ').trim();
}

function selectDraft(composer: HTMLElement): Range {
  composer.focus();
  const walker = document.createTreeWalker(composer, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent?.closest('[aria-hidden="true"], [hidden], [contenteditable="false"]')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  let first: Node | null = null;
  let last: Node | null = null;
  while (walker.nextNode()) {
    if (!first) first = walker.currentNode;
    last = walker.currentNode;
  }
  const range = document.createRange();
  if (first && last) {
    range.setStart(first, 0);
    range.setEnd(last, last.textContent?.length || 0);
  } else range.selectNodeContents(composer);
  const selection = window.getSelection();
  if (!selection) throw new Error('selection-unavailable');
  selection.removeAllRanges();
  selection.addRange(range);
  // Controlled editors listen here to update their own selection model.
  document.dispatchEvent(new Event('selectionchange'));
  return range;
}

async function settled(composer: HTMLElement, text: string): Promise<boolean> {
  let matchingSince = 0;
  const deadline = performance.now() + 700;
  while (performance.now() < deadline) {
    if (!composer.isConnected) return false;
    if (normalizeDraft(readDraft(composer)) === normalizeDraft(text)) {
      matchingSince ||= performance.now();
      if (performance.now() - matchingSince >= 150) return true;
    } else matchingSince = 0;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  return false;
}

export async function replaceRichDraft(composer: HTMLElement, text: string): Promise<boolean> {
  const original = readDraft(composer);
  selectDraft(composer);
  // selectionchange and framework reconciliation are queued, not synchronous.
  await new Promise(resolve => setTimeout(resolve, 0));
  if (!composer.isConnected || normalizeDraft(readDraft(composer)) !== normalizeDraft(original)) return false;
  const range = selectDraft(composer);
  const beforeInput = new InputEvent('beforeinput', {
    bubbles: true, composed: true, cancelable: true,
    inputType: 'insertText', data: text,
    targetRanges: [new StaticRange({
      startContainer: range.startContainer, startOffset: range.startOffset,
      endContainer: range.endContainer, endOffset: range.endOffset,
    })],
  });
  composer.dispatchEvent(beforeInput);
  // A prevented event means the editor owns the replacement. Never insert twice.
  if (beforeInput.defaultPrevented) return settled(composer, text);
  const inserted = document.execCommand('insertText', false, text);
  if (inserted || normalizeDraft(readDraft(composer)) !== normalizeDraft(original)) return settled(composer, text);

  // Paste is a last resort only when native insertion did not modify anything.
  selectDraft(composer);
  await new Promise(resolve => setTimeout(resolve, 0));
  if (!composer.isConnected || normalizeDraft(readDraft(composer)) !== normalizeDraft(original)) return false;
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  composer.dispatchEvent(new ClipboardEvent('paste', {
    bubbles: true, composed: true, cancelable: true, clipboardData,
  }));
  return settled(composer, text);
}
