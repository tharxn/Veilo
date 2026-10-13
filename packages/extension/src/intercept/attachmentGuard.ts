import { DetectionEngine } from '@veilo/engine';
import { AttachmentWarning, AttachmentFinding } from '../ui/attachmentWarning';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff']);
const SUPPORTED_TEXT_EXTENSIONS = new Set([
  'txt', 'text', 'csv', 'tsv', 'md', 'markdown', 'rst', 'log',
  'json', 'jsonc', 'jsonl', 'ndjson', 'yaml', 'yml', 'toml', 'xml',
  'html', 'htm', 'css', 'scss', 'less', 'js', 'jsx', 'mjs', 'cjs',
  'ts', 'tsx', 'vue', 'svelte', 'py', 'pyw', 'ipynb', 'java', 'kt',
  'kts', 'go', 'rs', 'rb', 'php', 'phtml', 'cs', 'c', 'h', 'cc',
  'cpp', 'hpp', 'swift', 'sql', 'sh', 'bash', 'zsh', 'fish', 'ps1',
  'psm1', 'bat', 'cmd', 'env', 'properties', 'ini', 'conf', 'config',
  'gradle', 'tf', 'tfvars', 'dockerignore', 'gitignore', 'pem', 'key',
  'pub', 'crt', 'cer', 'asc', 'graphql', 'gql', 'proto', 'make', 'mk',
]);
const SUPPORTED_TEXT_MIME_TYPES = new Set([
  'application/json', 'application/ld+json', 'application/xml', 'text/xml',
  'application/yaml', 'application/x-yaml', 'text/yaml', 'text/csv',
  'text/tab-separated-values', 'application/javascript', 'text/javascript',
  'application/typescript', 'text/typescript', 'application/sql', 'text/x-sql',
  'application/rtf', 'text/rtf',
]);
const BINARY_FORMAT_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
  'zip', '7z', 'rar', 'gz', 'tgz', 'bz2', 'xz', 'tar', 'sqlite', 'db',
  'exe', 'dll', 'so', 'dylib', 'class', 'jar', 'wasm', 'mp3', 'mp4', 'mov',
  'avi', 'wav', 'ogg', 'webm', 'p12', 'pfx',
]);

type AttachmentKind = 'image' | 'text' | 'unsupported';

/** Keeps selected attachments inside the extension until local inspection completes. */
export class AttachmentGuard {
  private readonly watchedInputs = new WeakSet<HTMLInputElement>();
  private readonly observedRoots = new WeakSet<Node>();
  private readonly replayCounts = new WeakMap<HTMLInputElement, number>();
  private readonly inputPlacement = new WeakMap<HTMLInputElement, { parent: Node; nextSibling: Node | null }>();
  private busyCount = 0;
  private enabled = true;
  private disabledTypes = new Set<string>();

  constructor(private readonly warning: AttachmentWarning) {}

  public attach(): void {
    this.watchRoot(document);
  }

  public get isChecking(): boolean {
    return this.busyCount > 0;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setDisabledTypes(types: string[]): void {
    this.disabledTypes = new Set(types);
  }

  private watchRoot(root: Node & ParentNode): void {
    if (this.observedRoots.has(root)) return;
    this.observedRoots.add(root);
    this.scan(root as Node);
    const observer = new MutationObserver(records => {
      for (const record of records) record.addedNodes.forEach(node => this.scan(node));
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  private scan(node: Node): void {
    if (node instanceof HTMLInputElement && node.type === 'file') this.watchInput(node);
    // The first scan starts at `document`, while later scans usually start at
    // newly added Elements. Document and ShadowRoot are ParentNodes too; scan
    // them so upload inputs that exist before Veilo initializes are observed.
    const root = node as Node & ParentNode;
    if (typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach(input => this.watchInput(input));
    if (node instanceof Element && node.shadowRoot) this.watchRoot(node.shadowRoot);
    root.querySelectorAll('*').forEach(element => {
      if (element.shadowRoot) this.watchRoot(element.shadowRoot);
    });
  }

  private watchInput(input: HTMLInputElement): void {
    if (this.watchedInputs.has(input)) return;
    this.watchedInputs.add(input);
    input.addEventListener('change', event => void this.onFilesSelected(event), true);
    input.addEventListener('input', event => void this.onFilesSelected(event), true);
  }

  private async onFilesSelected(event: Event): Promise<void> {
    if (!this.enabled) return;
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    const replayCount = this.replayCounts.get(input) || 0;
    if (replayCount > 0) {
      this.replayCounts.set(input, replayCount - 1);
      return;
    }
    const files = Array.from(input.files || []);
    if (!files.length) return;

    const parent = input.parentNode;
    if (parent) this.inputPlacement.set(input, { parent, nextSibling: input.nextSibling });
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    input.value = '';
    this.busyCount += 1;
    try {
      const kinds = files.map(file => this.classify(file));
      const unsupportedCount = kinds.filter(kind => kind === 'unsupported').length;
      if (unsupportedCount === files.length) {
        this.warning.showUnsupported(unsupportedCount, sendAnyway => {
          if (sendAnyway) this.replayFiles(input, files);
        });
        return;
      }
      if (files.some((file, index) => kinds[index] !== 'unsupported' && file.size > (kinds[index] === 'image' ? MAX_IMAGE_BYTES : MAX_TEXT_BYTES))) {
        this.warning.showBlocked('This attachment is too large for local inspection. It was blocked and was not shared.');
        return;
      }

      const uniqueKinds = new Set(kinds);
      const loadingKind = uniqueKinds.size > 1 ? 'attachments' : kinds[0] === 'image' ? 'image' : 'file';
      this.warning.showLoading(loadingKind);

      const findings = new Map<string, number>();
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (kinds[index] === 'image') {
          await this.inspectImage(file, findings);
        } else if (kinds[index] === 'text') {
          await this.inspectTextFile(file, findings);
        }
      }

      const findingRows = this.toFindings(findings);
      if (findingRows.length) {
        this.warning.showFindings(findingRows, sendAnyway => {
          if (sendAnyway) this.replayFiles(input, files);
        }, loadingKind, unsupportedCount);
      } else if (unsupportedCount) {
        this.warning.showUnsupported(unsupportedCount, sendAnyway => {
          if (sendAnyway) this.replayFiles(input, files);
        }, files.length);
      } else {
        this.warning.hideLoading();
        this.replayFiles(input, files);
      }
    } catch {
      this.warning.showBlocked('Veilo could not finish inspecting this attachment. It was blocked and was not shared. Try a supported image or text-based file, then retry.');
    } finally {
      this.busyCount = Math.max(0, this.busyCount - 1);
    }
  }

  private classify(file: File): AttachmentKind {
    if (this.isSupportedImage(file)) return 'image';
    if (this.isSupportedText(file)) return 'text';
    const mime = file.type.toLowerCase();
    const extension = file.name.toLowerCase().split('.').pop() || '';
    if (BINARY_FORMAT_EXTENSIONS.has(extension) || mime === 'application/pdf' || mime === 'application/zip' || mime.startsWith('application/vnd.')) {
      return 'unsupported';
    }
    // Unknown names are still inspected as text when the browser cannot identify
    // a binary format. The strict decoder below blocks unreadable/binary data.
    if (!mime || mime === 'application/octet-stream') return 'text';
    return 'unsupported';
  }

  private isSupportedImage(file: File): boolean {
    if (SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase())) return true;
    return /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file.name);
  }

  private isSupportedText(file: File): boolean {
    const name = file.name.toLowerCase();
    const basename = name.split(/[\\/]/).pop() || name;
    if (/^(\.env(?:\..+)?|dockerfile|makefile|jenkinsfile|procfile|gemfile|rakefile|license|readme)(?:\.|$)/.test(basename)) return true;
    const extension = basename.includes('.') ? basename.split('.').pop()! : '';
    return file.type.toLowerCase().startsWith('text/') ||
      SUPPORTED_TEXT_MIME_TYPES.has(file.type.toLowerCase()) ||
      SUPPORTED_TEXT_EXTENSIONS.has(extension);
  }

  private async inspectImage(file: File, findings: Map<string, number>): Promise<void> {
    const dataUrl = await this.readAsDataUrl(file);
    const response = await chrome.runtime.sendMessage({ type: 'OCR_IMAGE', dataUrl });
    if (!response || response.error || !Array.isArray(response.findings)) throw new Error('OCR_FAILED');
    for (const finding of response.findings as Array<{ type: string; count: number }>) {
      if (typeof finding.type === 'string' && !this.disabledTypes.has(finding.type) && Number.isInteger(finding.count) && finding.count > 0) {
        findings.set(finding.type, (findings.get(finding.type) || 0) + finding.count);
      }
    }
  }

  private async inspectTextFile(file: File, findings: Map<string, number>): Promise<void> {
    const bytes = await file.arrayBuffer();
    const text = this.decodeText(bytes);
    const engine = new DetectionEngine();
    engine.setDisabledTypes([...this.disabledTypes]);
    const entities = engine.detectAndRedact(text).entities;
    for (const entity of entities) findings.set(entity.type, (findings.get(entity.type) || 0) + 1);
  }

  private decodeText(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let decoder: TextDecoder;
    let offset = 0;
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      decoder = new TextDecoder('utf-8', { fatal: true });
      offset = 3;
    } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      decoder = new TextDecoder('utf-16le', { fatal: true });
      offset = 2;
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      decoder = new TextDecoder('utf-16be', { fatal: true });
      offset = 2;
    } else {
      decoder = new TextDecoder('utf-8', { fatal: true });
    }
    const text = decoder.decode(bytes.subarray(offset));
    if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) {
      throw new Error('UNREADABLE_ATTACHMENT');
    }
    return text;
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('IMAGE_READ_FAILED'));
      reader.onerror = () => reject(new Error('IMAGE_READ_FAILED'));
      reader.readAsDataURL(file);
    });
  }

  private toFindings(found: Map<string, number>): AttachmentFinding[] {
    const rows: AttachmentFinding[] = [];
    for (const [type, count] of found) {
      const tokenType = type.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      for (let index = 1; index <= count; index += 1) {
        rows.push({ type, placeholder: `[${tokenType}_${index}]` });
      }
    }
    return rows;
  }

  private replayFiles(input: HTMLInputElement, files: File[]): void {
    if (!input.isConnected) {
      const placement = this.inputPlacement.get(input);
      if (placement?.parent.isConnected) {
        try {
          const before = placement.nextSibling?.parentNode === placement.parent ? placement.nextSibling : null;
          placement.parent.insertBefore(input, before);
        } catch {
          // The connected-input path below reports an unsuccessful restoration.
        }
      }
      if (!input.isConnected) {
        this.warning.showBlocked('The chat site removed its upload control while Veilo was checking. The attachment was not shared. Choose the file again to retry.');
        return;
      }
    }
    try {
      const transfer = new DataTransfer();
      files.forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      this.replayCounts.set(input, 2);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {
      this.replayCounts.delete(input);
      this.warning.showBlocked('Veilo could not safely return the inspected attachment to the chat. It was not shared.');
    }
  }
}
