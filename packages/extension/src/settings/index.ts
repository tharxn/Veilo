import { THEME_TOKENS, escapeHtml } from '../ui/theme';
import { AI_SITES, DEFAULT_PREFERENCES, DETECTION_LABELS, normalizePreferences, VeiloPreferences } from './preferences';
import css from './settings.css?inline';

const style = document.createElement('style');
style.textContent = THEME_TOKENS.replace(':host([data-theme="developer"])', ':root[data-theme="developer"]').replace(':host', ':root') + css;
document.head.append(style);

const siteOptions = document.querySelector<HTMLDivElement>('#site-options')!;
const labelOptions = document.querySelector<HTMLDivElement>('#label-options')!;
const status = document.querySelector<HTMLParagraphElement>('#save-state')!;
let preferences = normalizePreferences(DEFAULT_PREFERENCES as unknown as Record<string, unknown>);
let saving = false;
let ready = false;

function option(id: string, name: string, description: string, kind: string): string {
  return `<label class="option"><span><span class="row-title">${escapeHtml(name)}</span><span class="description">${escapeHtml(description)}</span></span><span class="switch"><input type="checkbox" role="switch" data-kind="${kind}" data-id="${id}" aria-label="${escapeHtml(`Enable ${name}`)}"><span class="track"></span></span></label>`;
}

siteOptions.innerHTML = AI_SITES.map(site => option(site.id, site.name, site.domains.length ? site.domains.join(' · ') : 'Additional AI chats recognized by Veilo', 'site')).join('');
labelOptions.innerHTML = [...new Set(DETECTION_LABELS.map(label => label.group))].map(group => `<div class="label-group"><h3>${escapeHtml(group)}</h3><div class="option-grid">${DETECTION_LABELS.filter(label => label.group === group).map(label => option(label.id, label.name, label.description, 'label')).join('')}</div></div>`).join('');

function render(): void {
  document.documentElement.dataset.theme = preferences.theme;
  document.querySelector<HTMLImageElement>('footer img')!.src = preferences.theme === 'developer'
    ? 'icons/veilo-32.png'
    : 'icons/veilo-light-32.png';
  document.querySelector<HTMLInputElement>('#protection-toggle')!.checked = preferences.protectionEnabled;
  document.querySelector<HTMLInputElement>('#toast-toggle')!.checked = preferences.showStatusToast;
  document.querySelector('#protection-description')!.textContent = preferences.protectionEnabled
    ? 'Check prompts and supported uploads on your selected AI sites.'
    : 'Veilo is off. Prompts and attachments will be sent without Veilo checks.';
  document.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach(input => { input.checked = input.value === preferences.theme; });
  document.querySelectorAll<HTMLInputElement>('[data-kind]').forEach(input => {
    const disabled = input.dataset.kind === 'site' ? preferences.disabledSites : preferences.disabledLabels;
    input.checked = !disabled.includes(input.dataset.id!);
  });
  document.querySelector('#sites-count')!.textContent = `${AI_SITES.length - preferences.disabledSites.length} of ${AI_SITES.length} site groups enabled`;
  document.querySelector('#labels-count')!.textContent = `${DETECTION_LABELS.length - preferences.disabledLabels.length} of ${DETECTION_LABELS.length} labels enabled`;
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button').forEach(input => { input.disabled = saving || !ready; });
}

async function save(patch: Partial<VeiloPreferences>): Promise<void> {
  if (saving || !ready) return;
  saving = true;
  status.dataset.error = 'false';
  status.textContent = 'Saving…';
  render();
  try {
    await chrome.storage.local.set(patch);
    // Re-read to include changes made in another settings page or the popup.
    preferences = normalizePreferences(await chrome.storage.local.get(DEFAULT_PREFERENCES));
    status.textContent = 'All changes saved';
  } catch {
    status.dataset.error = 'true';
    status.textContent = 'Could not save. Please try again.';
  } finally {
    saving = false;
    render();
  }
}

document.addEventListener('change', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input.id === 'protection-toggle') void save({ protectionEnabled: input.checked });
  else if (input.id === 'toast-toggle') void save({ showStatusToast: input.checked });
  else if (input.name === 'theme' && input.checked) void save({ theme: input.value === 'developer' ? 'developer' : 'everyday' });
  else if (input.dataset.kind) {
    const key = input.dataset.kind === 'site' ? 'disabledSites' : 'disabledLabels';
    const selected = new Set(preferences[key]);
    if (input.checked) selected.delete(input.dataset.id!);
    else selected.add(input.dataset.id!);
    void save({ [key]: [...selected] });
  }
});
document.querySelector('#enable-sites')!.addEventListener('click', () => void save({ disabledSites: [] }));
document.querySelector('#enable-labels')!.addEventListener('click', () => void save({ disabledLabels: [] }));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const next = { ...preferences };
  for (const key of Object.keys(DEFAULT_PREFERENCES)) {
    if (changes[key]) Object.assign(next, { [key]: changes[key].newValue });
  }
  preferences = normalizePreferences(next as unknown as Record<string, unknown>);
  render();
});
render();
void chrome.storage.local.get(DEFAULT_PREFERENCES).then(value => {
  preferences = normalizePreferences(value);
  ready = true;
  status.textContent = 'Settings saved on this device';
  render();
}).catch(() => {
  status.dataset.error = 'true';
  status.textContent = 'Could not load settings. Reload this page to try again.';
});
