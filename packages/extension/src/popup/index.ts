const protectionToggle = document.querySelector<HTMLInputElement>('#protection-toggle')!;
const protectionLabel = document.querySelector<HTMLSpanElement>('#protection-label')!;
const toastToggle = document.querySelector<HTMLInputElement>('#toast-toggle')!;
const statusDescription = document.querySelector<HTMLParagraphElement>('#status-description')!;
const saveState = document.querySelector<HTMLDivElement>('#save-state')!;
const themeOptions = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="theme"]'));

let protectionEnabled = true;
let showStatusToast = true;
let selectedTheme = 'everyday';

interface SettingsSnapshot {
  protectionEnabled: boolean;
  showStatusToast: boolean;
  selectedTheme: string;
}

function render(saving = false): void {
  protectionToggle.checked = protectionEnabled;
  protectionLabel.textContent = protectionEnabled ? 'On' : 'Off';
  toastToggle.checked = showStatusToast;
  statusDescription.textContent = !protectionEnabled
    ? 'Veilo is off. Prompts and attachments will not be checked.'
    : showStatusToast
      ? 'Show a small protection indicator on supported AI chat pages.'
      : 'Protection stays on; the on-page indicator is hidden.';
  themeOptions.forEach(option => { option.checked = option.value === selectedTheme; });
  document.body.dataset.theme = selectedTheme;
  document.querySelector<HTMLImageElement>('.brand img')!.src = selectedTheme === 'developer'
    ? 'icons/veilo-32.png'
    : 'icons/veilo-light-32.png';
  saveState.textContent = saving ? 'Saving setting…' : 'Settings apply to supported AI sites';
}

async function save(patch: Record<string, unknown>, previous: SettingsSnapshot): Promise<void> {
  render(true);
  try {
    await chrome.storage.local.set(patch);
  } catch {
    protectionEnabled = previous.protectionEnabled;
    showStatusToast = previous.showStatusToast;
    selectedTheme = previous.selectedTheme;
    render();
    saveState.textContent = 'Could not save. Please try again.';
    return;
  }
  render();
}

void chrome.storage.local.get({ protectionEnabled: true, showStatusToast: true, theme: 'everyday' }).then(settings => {
  protectionEnabled = settings.protectionEnabled !== false;
  showStatusToast = settings.showStatusToast !== false;
  selectedTheme = settings.theme === 'developer' ? 'developer' : 'everyday';
  render();
}).catch(() => render());

protectionToggle.addEventListener('change', () => {
  const previous = { protectionEnabled, showStatusToast, selectedTheme };
  protectionEnabled = protectionToggle.checked;
  void save({ protectionEnabled }, previous);
});

toastToggle.addEventListener('change', () => {
  const previous = { protectionEnabled, showStatusToast, selectedTheme };
  showStatusToast = toastToggle.checked;
  void save({ showStatusToast }, previous);
});

themeOptions.forEach(option => option.addEventListener('change', () => {
  if (!option.checked) return;
  const previous = { protectionEnabled, showStatusToast, selectedTheme };
  selectedTheme = option.value === 'developer' ? 'developer' : 'everyday';
  void save({ theme: selectedTheme }, previous);
}));

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.protectionEnabled) protectionEnabled = changes.protectionEnabled.newValue !== false;
  if (changes.showStatusToast) showStatusToast = changes.showStatusToast.newValue !== false;
  if (changes.theme) selectedTheme = changes.theme.newValue === 'developer' ? 'developer' : 'everyday';
  render();
});

document.querySelector('#open-settings')!.addEventListener('click', () => {
  void chrome.runtime.openOptionsPage();
});
