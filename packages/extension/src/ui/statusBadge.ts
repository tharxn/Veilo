import { applyActiveTheme, REDUCED_MOTION, THEME_TOKENS, ensureThemeFont, veiloMarkSvg } from './theme';

export class StatusBadge {
  private host: HTMLDivElement | null = null;
  private label: HTMLSpanElement | null = null;
  private detail: HTMLSpanElement | null = null;
  private dot: HTMLSpanElement | null = null;

  public render(activeRedactionsCount = 0, isHealthy = true): void {
    if (!this.host) this.create();
    if (!this.label || !this.detail || !this.dot || !this.host) return;

    this.host.dataset.state = isHealthy ? 'active' : 'warning';
    this.label.textContent = isHealthy ? 'Veilo' : 'Protection paused';
    this.detail.textContent = !isHealthy
      ? 'Composer unavailable'
      : activeRedactionsCount > 0
        ? `${activeRedactionsCount} item${activeRedactionsCount === 1 ? '' : 's'} protected`
        : 'Watching this chat';
    this.dot.setAttribute('aria-label', isHealthy ? 'Protection active' : 'Protection paused');
    this.host.title = isHealthy
      ? `Veilo · ${activeRedactionsCount > 0 ? `${activeRedactionsCount} item(s) protected` : 'watching this chat'}`
      : 'Veilo is paused because it cannot find this chat’s message box.';
  }

  public hide(): void {
    this.host?.remove();
    this.host = null;
    this.label = null;
    this.detail = null;
    this.dot = null;
  }
  private create(): void {
    ensureThemeFont();
    this.host = document.createElement('div');
    this.host.id = 'veilo-status-badge';
    applyActiveTheme(this.host);
    const shadow = this.host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      ${THEME_TOKENS}
      :host { all: initial; position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; pointer-events: none; font-family: var(--ps-font); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
      *, *::before, *::after { box-sizing: border-box; }
      .pill { display: flex; align-items: center; gap: 10px; min-width: 176px; padding: 9px 12px 9px 11px; border: 1.5px solid var(--ps-bar); border-radius: 9px; background: var(--ps-bar); color: var(--ps-on-ink); box-shadow: 3px 3px 0 var(--ps-bg); animation: fadeIn .2s ease-out both; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .mark { display: grid; place-items: center; flex: 0 0 auto; color: var(--ps-accent-on-ink); }
      .copy { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
      .label { overflow: hidden; color: var(--ps-on-ink); font-size: 13px; font-weight: 600; letter-spacing: -.005em; text-overflow: ellipsis; white-space: nowrap; }
      .detail { overflow: hidden; color: var(--ps-on-ink-muted); font-size: 12px; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
      .dot { flex: 0 0 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--ps-ok); }
      :host([data-state="warning"]) .pill { border-color: var(--ps-danger-solid); background: var(--ps-danger-solid); color: #fff; }
      :host([data-state="warning"]) .mark, :host([data-state="warning"]) .label { color: var(--ps-on-danger-muted); }
      :host([data-state="warning"]) .detail { color: var(--ps-on-danger-muted); }
      :host([data-state="warning"]) .dot { background: #fff; }
      @media (max-width: 600px) { :host { right: 12px; bottom: 12px; } .pill { min-width: 0; padding: 8px 10px; } .detail { display: none; } }
      ${REDUCED_MOTION}
    `;
    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.setAttribute('role', 'status');
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = veiloMarkSvg(18);
    const copy = document.createElement('span');
    copy.className = 'copy';
    this.label = document.createElement('span');
    this.label.className = 'label';
    this.detail = document.createElement('span');
    this.detail.className = 'detail';
    copy.append(this.label, this.detail);
    this.dot = document.createElement('span');
    this.dot.className = 'dot';
    this.dot.setAttribute('aria-hidden', 'true');
    pill.append(mark, copy, this.dot);
    shadow.append(style, pill);
    document.documentElement.append(this.host);
  }
}
