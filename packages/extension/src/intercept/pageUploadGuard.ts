/**
 * File pickers may use an input that is never attached to the document (for
 * example OpenRouter's "Attach files" action). Capture in the page world,
 * before the site's upload handler, and keep the original Files here until
 * the isolated-world scanner returns the user's decision.
 *
 * This module is statically bundled into the classic MAIN-world page hook.
 */
export function installPageUploadGuard(isEnabled: () => boolean): void {
  const channel = '__VEILO__';
  const replayAttribute = 'data-veilo-upload-replay';
  const watched = new WeakSet<HTMLInputElement>();
  const replaying = new WeakSet<HTMLInputElement>();
  type InputPlacement = { parent: Node; nextSibling: Node | null };
  const pickerPlacement = new WeakMap<HTMLInputElement, InputPlacement>();
  type PendingUpload = {
    input: HTMLInputElement;
    files: File[];
    timeout: number;
    placement: InputPlacement | null;
  };
  const pending = new Map<string, PendingUpload>();
  const requestByInput = new WeakMap<HTMLInputElement, string>();

  function post(payload: Record<string, unknown>): void {
    window.postMessage({ channel, dir: 'main-to-iso', ...payload }, '*');
  }

  function clearRequest(requestId: string): PendingUpload | undefined {
    const request = pending.get(requestId);
    if (!request) return undefined;
    window.clearTimeout(request.timeout);
    pending.delete(requestId);
    if (requestByInput.get(request.input) === requestId) requestByInput.delete(request.input);
    return request;
  }

  function captureSelection(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if (!isEnabled() || replaying.has(input) || input.hasAttribute(replayAttribute)) return;
    const files = Array.from(input.files || []);
    if (!files.length) {
      // Browsers emit input, then change for one file selection. The input
      // event above cleared FileList while inspection waits; its following
      // empty change must also be stopped. Otherwise a site's once:onchange
      // callback can be consumed before the approved replay arrives.
      if (requestByInput.has(input)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
      return;
    }
    if (input.isConnected && input.parentNode) {
      pickerPlacement.set(input, { parent: input.parentNode, nextSibling: input.nextSibling });
    }
    const placement = pickerPlacement.get(input) || null;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // The following native change event must see an empty FileList too.
    // Provider selection handlers do not receive Files before inspection.
    input.value = '';
    const previous = requestByInput.get(input);
    if (previous) {
      clearRequest(previous);
      post({ type: 'file-upload-expired', requestId: previous });
    }
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      if (!clearRequest(requestId)) return;
      post({ type: 'file-upload-expired', requestId });
    }, 5 * 60 * 1000);
    pending.set(requestId, { input, files, timeout, placement });
    requestByInput.set(input, requestId);
    try {
      // File objects are structured-cloned; no OCR text or secret values are
      // placed in DOM attributes or logged to the console.
      post({ type: 'file-upload-selected', requestId, files });
    } catch {
      clearRequest(requestId);
      post({ type: 'file-upload-replay-failed', requestId });
    }
  }

  function watch(input: HTMLInputElement): void {
    if (input.type !== 'file') return;
    // Remember where a connected picker lived before opening the native
    // dialog; some sites close its menu before the selection event arrives.
    if (input.isConnected && input.parentNode) {
      pickerPlacement.set(input, { parent: input.parentNode, nextSibling: input.nextSibling });
    } else {
      pickerPlacement.delete(input);
    }
    if (watched.has(input)) return;
    watched.add(input);
    // Detached inputs never bubble to window/document. Target capture runs
    // before ordinary onchange/input handlers installed by the chat site.
    input.addEventListener('input', captureSelection, true);
    input.addEventListener('change', captureSelection, true);
  }

  // Connected inputs are intercepted before React's root capture listeners.
  window.addEventListener('input', captureSelection, true);
  window.addEventListener('change', captureSelection, true);
  window.addEventListener('click', event => {
    if (event.target instanceof HTMLInputElement) watch(event.target);
  }, true);

  const nativeClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function (): void {
    watch(this);
    nativeClick.call(this);
  };
  const nativeShowPicker = HTMLInputElement.prototype.showPicker;
  if (typeof nativeShowPicker === 'function') {
    HTMLInputElement.prototype.showPicker = function (): void {
      watch(this);
      nativeShowPicker.call(this);
    };
  }

  window.addEventListener('message', event => {
    if (event.source !== window) return;
    const data = event.data as { channel?: string; dir?: string; type?: string; requestId?: string; allow?: boolean } | null;
    if (!data || data.channel !== channel || data.dir !== 'iso-to-main' || data.type !== 'file-upload-decision') return;
    if (typeof data.requestId !== 'string' || typeof data.allow !== 'boolean') return;
    const request = clearRequest(data.requestId);
    if (!request || !data.allow) return;

    const { input, files } = request;
    const previousMarker = input.getAttribute(replayAttribute);
    try {
      if (request.placement && !input.isConnected) {
        // A connected picker usually relies on delegated React listeners.
        // Restore it to the same live parent before bubbling the replay.
        // Genuinely detached pickers keep their direct onchange replay path.
        const { parent, nextSibling } = request.placement;
        if (!parent.isConnected) throw new Error('UPLOAD_PARENT_REMOVED');
        const before = nextSibling?.parentNode === parent ? nextSibling : null;
        parent.insertBefore(input, before);
        if (!input.isConnected) throw new Error('UPLOAD_INPUT_NOT_RESTORED');
      }
      const transfer = new DataTransfer();
      files.forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      // The isolated DOM-listener fallback must not inspect this replay again.
      replaying.add(input);
      input.setAttribute(replayAttribute, data.requestId);
      // Replaying on the original input works for both restored connected
      // pickers and never-connected pickers with their own onchange handler.
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    } catch {
      input.value = '';
      post({ type: 'file-upload-replay-failed', requestId: data.requestId });
    } finally {
      replaying.delete(input);
      if (previousMarker === null) input.removeAttribute(replayAttribute);
      else input.setAttribute(replayAttribute, previousMarker);
    }
  });

  window.addEventListener('pagehide', () => {
    for (const requestId of pending.keys()) clearRequest(requestId);
  });
}
