/**
 * Veilo UI theme.
 *
 * Warm beige surfaces, near-black brown ink and one solid terracotta accent.
 * The dialogs themselves are flat and opaque: no gradients, no tinted
 * transparency. The layer behind a dialog is a plain, colourless blur with no
 * dimming, so the page text stays faintly readable underneath.
 *
 * Terracotta marks the safe, primary action. Risky actions use a deep red.
 */

const FONT_STYLE_ID = 'veilo-font-face';
const FONT_FAMILY = 'Veilo Inter';
export type VeiloTheme = 'everyday' | 'developer';
let activeTheme: VeiloTheme = 'everyday';

export function setActiveTheme(theme: unknown): void {
  activeTheme = theme === 'developer' ? 'developer' : 'everyday';
  for (const id of ['veilo-modal-root', 'veilo-attachment-warning', 'veilo-status-badge']) {
    const host = document.getElementById(id);
    if (host) host.dataset.theme = activeTheme;
  }
}

export function applyActiveTheme(host: HTMLElement): void {
  host.dataset.theme = activeTheme;
}

export const FONT_STACK = `'${FONT_FAMILY}', Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const MONO_STACK = `ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`;

/**
 * @font-face rules inside a shadow root are ignored by browsers, so the font is
 * declared once in the host document instead. A unique family name avoids
 * clashing with any Inter the page itself loads.
 *
 * Requires "fonts/InterVariable.woff2" to be listed in web_accessible_resources
 * for the supported chat sites. If the font is blocked, the stack falls back to
 * the system UI font and nothing breaks.
 */
export function ensureThemeFont(): void {
  if (document.getElementById(FONT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FONT_STYLE_ID;
  style.textContent = `@font-face{font-family:'${FONT_FAMILY}';src:url("${chrome.runtime.getURL('fonts/InterVariable.woff2')}") format('woff2');font-style:normal;font-weight:100 900;font-display:swap;}`;
  (document.head || document.documentElement).append(style);
}

export function veiloMarkSvg(size = 18, className = ''): string {
  const classAttr = className ? ' class="' + className + '"' : '';
  return '<svg' + classAttr + ' viewBox="0 0 32 32" width="' + size + '" height="' + size + '" fill="none" aria-hidden="true"><path d="M5.5 8.5 13.9 25c.8 1.6 3.1 1.6 3.9 0l8.7-17" stroke="#b9502b" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><path d="m13.4 14.1 2.3 4.2 4.8-9.1" stroke="#f3ebdb" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function formatEntityLabel(type: string): string {
  const words = type.replace(/[_-]+/g, ' ').toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());
  return words.replace(/\b(Api|Upi|Ssn|Ifsc|Pan|Id|Jwt|Url|Ip|Otp|Pin)\b/g, match => match.toUpperCase());
}

/** Design tokens. Custom properties are not reset by `all: initial`. */
export const THEME_TOKENS = `
  :host {
    --ps-font: ${FONT_STACK};
    --ps-mono: ${MONO_STACK};
    --ps-ink: #2a2118;
    --ps-bar: #2a2118;
    --ps-shadow-color: #2a2118;
    --ps-bg: #f3ebdb;
    --ps-panel: #faf5ea;
    --ps-raised: #e8dec9;
    --ps-line: #d3c5a8;
    --ps-text: #2a2118;
    --ps-muted: #6b5d4b;
    --ps-accent: #b9502b;
    --ps-accent-hover: #9e4323;
    --ps-accent-text: #9e4323;
    --ps-accent-on-ink: #e58a63;
    --ps-on-accent: #ffffff;
    --ps-on-ink: #f3ebdb;
    --ps-on-ink-muted: #bfb29a;
    --ps-ok: #6fcf8e;
    --ps-danger: #a12b2b;
    --ps-danger-solid: #a12b2b;
    --ps-on-danger-muted: #f5ddd6;
    --ps-danger-bg: #f5ddd6;
    --ps-danger-line: #d49a8e;
    --ps-danger-text: #7a2323;
    --ps-disabled-bg: #d9cdb6;
    --ps-disabled-text: #8a7c66;
    --ps-scrim: transparent;
    --ps-scrim-blur: blur(3px);
    --ps-radius: 10px;
  }
  :host([data-theme="developer"]) {
    --ps-ink: #f3ebdb;
    --ps-bar: #14100c;
    --ps-shadow-color: #000000;
    --ps-bg: #211b15;
    --ps-panel: #2b241c;
    --ps-raised: #3a3027;
    --ps-line: #43382d;
    --ps-text: #f3ebdb;
    --ps-muted: #b3a58f;
    --ps-accent: #e0784a;
    --ps-accent-hover: #ec8c61;
    --ps-accent-text: #ee9a73;
    --ps-accent-on-ink: #ee9a73;
    --ps-on-accent: #1f140c;
    --ps-on-ink: #f3ebdb;
    --ps-on-ink-muted: #a89a85;
    --ps-ok: #6fcf8e;
    --ps-danger: #f08a78;
    --ps-danger-solid: #b3342b;
    --ps-danger-bg: #3b211d;
    --ps-danger-line: #7d4037;
    --ps-danger-text: #f4b3a6;
    --ps-on-danger-muted: #f8d2c9;
    --ps-disabled-bg: #3a3027;
    --ps-disabled-text: #7d6f5c;
  }
`;

export const REDUCED_MOTION = `
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  }
`;

/** Shared component styles used by the review modal and the attachment warning. */
export const THEME_COMPONENTS = `
  *, *::before, *::after { box-sizing: border-box; }
  .backdrop { position: fixed; inset: 0; display: grid; place-items: center; padding: 16px; pointer-events: auto; background: var(--ps-scrim); -webkit-backdrop-filter: var(--ps-scrim-blur); backdrop-filter: var(--ps-scrim-blur); font-family: var(--ps-font); color: var(--ps-text); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; animation: fadeIn .12s ease-out both; }
  .card { display: flex; flex-direction: column; width: min(92vw, 520px); max-height: min(88vh, 760px); overflow: hidden; background: var(--ps-bg); border: 1.5px solid var(--ps-ink); border-radius: var(--ps-radius); box-shadow: 6px 6px 0 var(--ps-shadow-color); animation: pop .16s ease-out both; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  .bar { display: flex; align-items: center; gap: 9px; padding: 11px 20px; background: var(--ps-bar); color: var(--ps-on-ink); font-size: 13px; font-weight: 600; letter-spacing: -.005em; }
  .bar svg { flex: 0 0 auto; color: var(--ps-accent-on-ink); }
  .bar-note { margin-left: auto; color: var(--ps-on-ink-muted); font-size: 12px; font-weight: 500; }
  .bar.danger { background: var(--ps-danger-solid); color: #fff; }
  .bar.danger svg, .bar.danger .bar-note { color: var(--ps-on-danger-muted); }

  .body { padding: 22px 22px 22px; overflow: auto; scrollbar-color: var(--ps-line) transparent; }
  .title { margin: 0 0 7px; color: var(--ps-text); font-size: 21px; line-height: 1.25; font-weight: 650; letter-spacing: -.02em; }
  .subtitle { margin: 0; color: var(--ps-muted); font-size: 14.5px; line-height: 1.55; }

  .list { margin: 18px 0 0; max-height: 260px; overflow-y: auto; background: var(--ps-panel); border: 1px solid var(--ps-ink); border-radius: 8px; scrollbar-color: var(--ps-line) transparent; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; border-top: 1px solid var(--ps-line); }
  .row:first-child { border-top: 0; }
  .row-label { color: var(--ps-text); font-size: 14.5px; font-weight: 600; line-height: 1.3; }
  .chip { max-width: 52%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 3px 8px; border-radius: 5px; background: var(--ps-raised); color: var(--ps-ink); font-family: var(--ps-mono); font-size: 12.5px; font-weight: 500; }

  .notice { display: flex; align-items: flex-start; gap: 10px; margin: 16px 0 0; padding: 12px 14px; border: 1px solid var(--ps-danger-line); border-radius: 8px; background: var(--ps-danger-bg); color: var(--ps-danger-text); font-size: 14px; line-height: 1.5; }
  .notice-mark { display: grid; place-items: center; flex: 0 0 18px; height: 18px; margin-top: 1px; border-radius: 50%; background: var(--ps-danger-solid); color: var(--ps-on-danger-muted); font-size: 11px; font-weight: 700; }

  .actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 22px; }
  .btn { padding: 11px 16px; border: 1px solid transparent; border-radius: 8px; font: 600 14px/1 var(--ps-font); cursor: pointer; transition: background .12s ease, color .12s ease; }
  .btn:focus-visible { outline: 2px solid var(--ps-ink); outline-offset: 2px; }
  .btn-primary { background: var(--ps-accent); color: var(--ps-on-accent); }
  .btn-primary:hover { background: var(--ps-accent-hover); }
  .btn-primary:disabled { background: var(--ps-disabled-bg); color: var(--ps-disabled-text); cursor: not-allowed; }
  .btn-secondary { background: var(--ps-panel); border-color: var(--ps-ink); color: var(--ps-ink); }
  .btn-secondary:hover { background: var(--ps-raised); }
  .btn-ghost { background: transparent; color: var(--ps-muted); }
  .btn-ghost:hover { color: var(--ps-ink); }
  .btn-danger { background: var(--ps-panel); border-color: var(--ps-danger); color: var(--ps-danger); }
  .btn-danger:hover { background: var(--ps-danger-bg); }

  @media (max-width: 520px) {
    .body { padding: 18px; }
    .row { padding: 10px 12px; }
    .actions { flex-wrap: wrap; }
    .btn-primary { flex: 1 1 100%; order: -1; }
  }
`;
