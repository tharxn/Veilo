import { applyActiveTheme, REDUCED_MOTION, THEME_COMPONENTS, THEME_TOKENS, ensureThemeFont, escapeHtml, formatEntityLabel, veiloLoadingSvg, veiloMarkSvg } from './theme';

export interface AttachmentFinding {
  type: string;
  placeholder: string;
}

export type AttachmentKind = 'image' | 'file' | 'attachments';

export class AttachmentWarning {
  private container: HTMLDivElement | null = null;
  private resolveChoice: ((sendAnyway: boolean) => void) | null = null;

  public showLoading(kind: AttachmentKind): void {
    this.removeContainer();
    this.resolveChoice = null;
    ensureThemeFont();
    this.container = document.createElement('div');
    this.container.id = 'veilo-attachment-warning';
    applyActiveTheme(this.container);
    const shadow = this.container.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = this.styles();
    const stage = document.createElement('div');
    stage.className = 'loading-stage';
    stage.setAttribute('role', 'status');
    stage.setAttribute('aria-live', 'polite');
    stage.setAttribute('aria-busy', 'true');
    stage.setAttribute('aria-label', `Veilo is checking your ${kind} locally`);
    stage.innerHTML = veiloLoadingSvg(68, this.loadingSurface());
    shadow.append(style, stage);
    document.documentElement.append(this.container);
  }

  public hideLoading(): void {
    this.removeContainer();
  }

  public showFindings(
    findings: AttachmentFinding[],
    onChoice: (sendAnyway: boolean) => void,
    kind: AttachmentKind = 'image',
    unsupportedCount = 0,
  ): void {
    this.removeContainer();
    this.resolveChoice = null;
    ensureThemeFont();
    this.container = document.createElement('div');
    this.container.id = 'veilo-attachment-warning';
    applyActiveTheme(this.container);
    const shadow = this.container.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = this.styles();
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    const card = document.createElement('section');
    card.className = 'card';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    const subject = kind === 'image' ? 'image' : kind === 'file' ? 'file' : 'attachments';
    const filesSubject = kind === 'attachments' ? 'files' : subject;
    const checkedLabel = kind === 'image' ? 'Image' : kind === 'file' ? 'File' : 'Attachments';
    card.setAttribute('aria-label', `Sensitive information found in ${subject}`);
    const rows = findings
      .map(item => `<div class="row"><span class="row-label">${escapeHtml(formatEntityLabel(item.type))}</span><span class="chip">${escapeHtml(item.placeholder)}</span></div>`)
      .join('');
    const unsupportedNote = unsupportedCount
      ? ` Veilo could not inspect ${unsupportedCount} unsupported attachment${unsupportedCount === 1 ? '' : 's'}.`
      : '';
    card.innerHTML = `<div class="bar">${veiloMarkSvg(16)}<span>Veilo</span><span class="bar-note">${checkedLabel} checked on this device</span></div><div class="body"><h2 class="title">Sensitive information found in ${subject}</h2><p class="subtitle">Found ${findings.length} possible item${findings.length === 1 ? '' : 's'}.</p><div class="list">${rows}</div><div class="notice"><span class="notice-mark" aria-hidden="true">!</span><span>The ${filesSubject} have not been shared.${unsupportedNote} Send Anyway shares the original, unmodified ${filesSubject} with this AI site.</span></div><div class="actions"><button class="btn btn-danger send" type="button">Send Anyway</button><button class="btn btn-primary cancel" type="button">Cancel</button></div></div>`;
    shadow.append(style, backdrop);
    backdrop.append(card);
    card.querySelector('.cancel')?.addEventListener('click', () => this.close(false));
    card.querySelector('.send')?.addEventListener('click', () => this.close(true));
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) this.close(false);
    });
    this.resolveChoice = onChoice;
    document.documentElement.append(this.container);
    card.querySelector<HTMLButtonElement>('.cancel')?.focus();
  }

  public showUnsupported(
    unsupportedCount: number,
    onChoice: (sendAnyway: boolean) => void,
    totalAttachments = unsupportedCount,
  ): void {
    this.removeContainer();
    this.resolveChoice = null;
    ensureThemeFont();
    this.container = document.createElement('div');
    this.container.id = 'veilo-attachment-warning';
    applyActiveTheme(this.container);
    const shadow = this.container.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = this.styles();
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    const card = document.createElement('section');
    card.className = 'card';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Attachment could not be inspected');
    const countText = totalAttachments > unsupportedCount
      ? `${unsupportedCount} of ${totalAttachments} selected attachments use unsupported file formats.`
      : `${unsupportedCount} attachment${unsupportedCount === 1 ? '' : 's'} use an unsupported file format.`;
    card.innerHTML = `<div class="bar danger">${veiloMarkSvg(16)}<span>Veilo</span><span class="bar-note">Not inspected</span></div><div class="body"><h2 class="title">This file could not be inspected</h2><p class="subtitle">${countText} Veilo could not scan its contents, so it cannot tell whether it contains sensitive information.</p><div class="notice"><span class="notice-mark" aria-hidden="true">!</span><span>The attachment has not been shared. Send Anyway shares the original, uninspected file with this AI site.</span></div><div class="actions"><button class="btn btn-danger send" type="button">Send Anyway</button><button class="btn btn-primary cancel" type="button">Cancel</button></div></div>`;
    shadow.append(style, backdrop);
    backdrop.append(card);
    card.querySelector('.cancel')?.addEventListener('click', () => this.close(false));
    card.querySelector('.send')?.addEventListener('click', () => this.close(true));
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) this.close(false);
    });
    this.resolveChoice = onChoice;
    document.documentElement.append(this.container);
    card.querySelector<HTMLButtonElement>('.cancel')?.focus();
  }

  public showBlocked(message = 'Veilo could not inspect this attachment. It was blocked and was not shared.'): void {
    this.removeContainer();
    this.resolveChoice = null;
    ensureThemeFont();
    this.container = document.createElement('div');
    this.container.id = 'veilo-attachment-warning';
    applyActiveTheme(this.container);
    const shadow = this.container.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = this.styles();
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    const card = document.createElement('section');
    card.className = 'card';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Attachment not shared');
    const bar = document.createElement('div');
    bar.className = 'bar danger';
    bar.innerHTML = `${veiloMarkSvg(16)}<span>Veilo</span><span class="bar-note">Attachment blocked</span>`;
    const body = document.createElement('div');
    body.className = 'body';
    const heading = document.createElement('h2');
    heading.className = 'title';
    heading.textContent = 'Attachment not shared';
    const text = document.createElement('p');
    text.className = 'notice';
    text.textContent = message;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const close = document.createElement('button');
    close.className = 'btn btn-primary';
    close.type = 'button';
    close.textContent = 'Close';
    close.addEventListener('click', () => this.removeContainer());
    actions.append(close);
    body.append(heading, text, actions);
    card.append(bar, body);
    shadow.append(style, backdrop);
    backdrop.append(card);
    document.documentElement.append(this.container);
    close.focus();
  }

  /** Match the actual chat surface, which may differ from Veilo's UI theme. */
  private loadingSurface(): 'light' | 'dark' {
    const seen = new Set<Element>();
    let element = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    while (element) {
      seen.add(element);
      element = element.parentElement;
    }
    if (document.body) seen.add(document.body);
    seen.add(document.documentElement);
    for (const surface of seen) {
      const color = getComputedStyle(surface).backgroundColor;
      if (!/^rgba?\(/.test(color)) continue;
      const channels = color.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3 || (channels[3] ?? 1) < .9) continue;
      const brightness = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
      return brightness > 150 ? 'light' : 'dark';
    }
    const scheme = getComputedStyle(document.documentElement).colorScheme;
    if (scheme === 'light' || scheme === 'dark') return scheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private styles(): string {
    return `
      ${THEME_TOKENS}
      :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; }
      ${THEME_COMPONENTS}
      .loading-stage { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none; background: transparent; }
      .loader-mark { display: block; width: 68px; height: 68px; }
      .loader-trace { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0; }
      .loader-fold-trace { animation: veiloPaintFold 1.8s cubic-bezier(.35, 0, .25, 1) infinite; }
      .loader-orange-trace { animation: veiloPaintOrange 1.8s cubic-bezier(.35, 0, .25, 1) infinite; }
      .loader-artwork { animation: veiloResetV 1.8s ease-in-out infinite; }
      @keyframes veiloPaintFold {
        0%, 5% { stroke-dashoffset: 100; opacity: 0; }
        6% { stroke-dashoffset: 100; opacity: 1; }
        52%, 100% { stroke-dashoffset: 0; opacity: 1; }
      }
      @keyframes veiloPaintOrange {
        0%, 52% { stroke-dashoffset: 100; opacity: 0; }
        53% { stroke-dashoffset: 100; opacity: 1; }
        82%, 100% { stroke-dashoffset: 0; opacity: 1; }
      }
      @keyframes veiloResetV {
        0%, 88% { opacity: 1; }
        98%, 100% { opacity: 0; }
      }${REDUCED_MOTION}
      @media (prefers-reduced-motion: reduce) {
        .loader-trace { animation: none !important; stroke-dashoffset: 0; opacity: 1; }
        .loader-artwork { animation: none !important; opacity: 1; }
      }
    `;
  }

  private close(sendAnyway: boolean): void {
    this.removeContainer();
    const callback = this.resolveChoice;
    this.resolveChoice = null;
    callback?.(sendAnyway);
  }

  private removeContainer(): void {
    this.container?.remove();
    this.container = null;
  }
}
