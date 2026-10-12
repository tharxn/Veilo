import { DetectedEntity } from '@veilo/engine';
import { applyActiveTheme, REDUCED_MOTION, THEME_COMPONENTS, THEME_TOKENS, ensureThemeFont, escapeHtml, formatEntityLabel, veiloMarkSvg } from './theme';

export interface ReviewModalOptions {
  entities: DetectedEntity[];
  onSendRedacted: (selectedEntityIndexes: number[]) => boolean | string | Promise<boolean | string>;
  onSendOriginal: () => void;
  onCancel: () => void;
}

export class ReviewModal {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  public show(options: ReviewModalOptions): void {
    this.close();
    ensureThemeFont();

    this.container = document.createElement('div');
    this.container.id = 'veilo-modal-root';
    applyActiveTheme(this.container);
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      ${THEME_TOKENS}
      :host { all: initial; display: block; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999999; pointer-events: none; }
      ${THEME_COMPONENTS}

      .choice { display: flex; align-items: center; gap: 12px; min-width: 0; cursor: pointer; }
      .choice input { appearance: none; flex: 0 0 18px; width: 18px; height: 18px; margin: 0; display: grid; place-content: center; border: 1.5px solid var(--ps-ink); border-radius: 4px; background: var(--ps-panel); cursor: pointer; }
      .choice input:checked { border-color: var(--ps-accent); background: var(--ps-accent); }
      .choice input:checked::after { content: ''; width: 5px; height: 9px; margin-top: -2px; border: solid var(--ps-on-accent); border-width: 0 2px 2px 0; transform: rotate(45deg); }
      .choice input:focus-visible { outline: 2px solid var(--ps-ink); outline-offset: 2px; }

      .selection-tools { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; }
      .hint { margin: 0; color: var(--ps-muted); font-size: 13px; line-height: 1.45; }
      .links { display: flex; gap: 14px; }
      .link-btn { padding: 2px 0; border: 0; background: transparent; color: var(--ps-accent-text); font: 600 13px/1.3 var(--ps-font); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
      .link-btn:hover { color: var(--ps-ink); }
      .link-btn:focus-visible { outline: 2px solid var(--ps-ink); outline-offset: 2px; }
      .send-error { margin: 14px 0 0; color: var(--ps-danger); font-size: 14px; font-weight: 600; line-height: 1.5; }
      .send-error[hidden] { display: none; }
      @media (max-width: 520px) { .chip { max-width: 42vw; } }
      ${REDUCED_MOTION}
    `;

    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';

    const modal = document.createElement('div');
    modal.className = 'card';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Review before sending');

    const count = options.entities.length;
    modal.innerHTML = `
      <div class="bar">${veiloMarkSvg(16)}<span>Veilo</span><span class="bar-note">Checked on this device</span></div>
      <div class="body">
        <h3 class="title">Review before sending</h3>
        <p class="subtitle">Found ${count} sensitive item${count === 1 ? '' : 's'} in your message. Checked items are swapped for placeholders before anything is sent.</p>
        <div class="list">
          ${options.entities
            .map(
              (e, index) => `
            <div class="row">
              <label class="choice">
                <input type="checkbox" id="redact-${index}" data-entity-index="${index}" checked aria-label="Redact ${escapeHtml(e.type)}">
                <span class="row-label">${escapeHtml(formatEntityLabel(e.type))}</span>
              </label>
              <span class="chip">${escapeHtml(e.placeholder || e.type)}</span>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="selection-tools">
          <p class="hint">Unchecked items are sent exactly as written.</p>
          <div class="links"><button class="link-btn" type="button" id="select-all">Select all</button><button class="link-btn" type="button" id="select-none">Clear</button></div>
        </div>
        <p class="send-error" id="send-error" role="alert" hidden></p>
        <div class="actions">
          <button class="btn btn-ghost" type="button" id="btn-cancel">Cancel</button>
          <button class="btn btn-secondary" type="button" id="btn-original">Send original</button>
          <button class="btn btn-primary" type="button" id="btn-redacted">Send with selections</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(backdrop);
    backdrop.appendChild(modal);
    document.body.appendChild(this.container);

    const getChecks = () => Array.from(this.shadowRoot?.querySelectorAll<HTMLInputElement>('[data-entity-index]') || []);
    const updateSendButton = () => {
      const button = this.shadowRoot?.querySelector<HTMLButtonElement>('#btn-redacted');
      if (button) button.disabled = !getChecks().some(check => check.checked);
    };
    getChecks().forEach(check => check.addEventListener('change', updateSendButton));
    this.shadowRoot.querySelector('#select-all')?.addEventListener('click', () => {
      getChecks().forEach(check => { check.checked = true; });
      updateSendButton();
    });
    this.shadowRoot.querySelector('#select-none')?.addEventListener('click', () => {
      getChecks().forEach(check => { check.checked = false; });
      updateSendButton();
    });

    // Event listeners
    this.shadowRoot.querySelector('#btn-redacted')?.addEventListener('click', async () => {
      const button = this.shadowRoot?.querySelector<HTMLButtonElement>('#btn-redacted');
      if (button) button.disabled = true;
      const selectedEntityIndexes = getChecks()
        .filter(check => check.checked)
        .map(check => Number(check.dataset.entityIndex));
      const result = await options.onSendRedacted(selectedEntityIndexes);
      if (result === true) {
        this.close();
      } else {
        const error = this.shadowRoot?.querySelector('#send-error');
        if (error) {
          error.textContent = typeof result === 'string'
            ? result
            : 'Redaction could not be verified in the composer. Nothing was sent.';
          error.removeAttribute('hidden');
        }
        if (button) button.disabled = false;
      }
    });

    this.shadowRoot.querySelector('#btn-original')?.addEventListener('click', () => {
      this.close();
      options.onSendOriginal();
    });

    this.shadowRoot.querySelector('#btn-cancel')?.addEventListener('click', () => {
      this.close();
      options.onCancel();
    });
  }

  public close(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }
}
