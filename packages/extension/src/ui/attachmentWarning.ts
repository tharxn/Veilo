import { applyActiveTheme, REDUCED_MOTION, THEME_COMPONENTS, THEME_TOKENS, ensureThemeFont, escapeHtml, formatEntityLabel, veiloMarkSvg } from './theme';

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
    stage.innerHTML = '<svg class="loader-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><g class="loader-symbol"><path class="loader-big" d="M5.5 8.5 13.9 25c.8 1.6 3.1 1.6 3.9 0l8.7-17"/><path class="loader-small" d="m13.4 14.1 2.3 4.2 4.8-9.1"/></g></svg>';
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

  private styles(): string {
    return `
      ${THEME_TOKENS}
      :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; }
      ${THEME_COMPONENTS}
      .loading-stage { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none; background: transparent; }
      .loader-mark { display: block; width: 68px; height: 68px; overflow: visible; }
      .loader-symbol { transform-origin: 16px 16px; }
      .loader-big { stroke: #b9502b; stroke-width: 4.2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 48; stroke-dashoffset: 48; opacity: 0; animation: veiloCycleBig 1.8s ease-in-out infinite; }
      .loader-small { stroke: #f3ebdb; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 18; stroke-dashoffset: 18; opacity: 0; animation: veiloCycleSmall 1.8s ease-in-out infinite; }
      @keyframes veiloCycleBig {
        0%, 4% { stroke-dashoffset: 48; opacity: 0; }
        5% { opacity: 1; }
        46%, 84% { stroke-dashoffset: 0; opacity: 1; }
        94%, 100% { stroke-dashoffset: 48; opacity: 0; }
      }
      @keyframes veiloCycleSmall {
        0%, 26% { stroke-dashoffset: 18; opacity: 0; }
        27% { opacity: 1; }
        70%, 84% { stroke-dashoffset: 0; opacity: 1; }
        94%, 100% { stroke-dashoffset: 18; opacity: 0; }
      }${REDUCED_MOTION}
      @media (prefers-reduced-motion: reduce) { .loader-symbol, .loader-big, .loader-small { animation: none !important; stroke-dashoffset: 0; } }
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
