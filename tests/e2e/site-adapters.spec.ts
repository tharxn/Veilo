import { test as base, chromium, expect, type BrowserContext } from '@playwright/test';
import { clickSendRedacted, extensionDistPath } from './helpers';

const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extensionDistPath}`, `--load-extension=${extensionDistPath}`],
    });
    await use(context);
    await context.close();
  },
});

function fixture(role: 'combobox' | 'textbox', label: string, submit: string): string {
  return `<!doctype html><html><head><title>AI chat editor regression fixture</title></head><body>
  <textarea placeholder="${label}" style="display:none">password: stale-backup-42</textarea>
  <main><div contenteditable="true" role="${role}" aria-label="${label}" style="min-height:60px;border:1px solid;padding:16px"></div>
  <button type="button" aria-label="${submit}">Send</button></main><pre id="sent-log"></pre>
  <script>
    const editor = document.querySelector('[contenteditable]');
    const send = document.querySelector('button');
    const log = document.querySelector('#sent-log');
    const backing = document.querySelector('textarea');
    function submitMessage() {
      const text = editor.innerText;
      if (!text.trim()) return;
      log.textContent += text + '\\n';
      backing.value = text;
      editor.textContent = '';
      editor.setAttribute('role', 'textbox');
    }
    send.addEventListener('click', submitMessage);
    editor.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitMessage(); }
    });
  </script></body></html>`;
}

test('Grok protects its home combobox and existing-chat textbox on Submit and Enter', async ({ context, page }) => {
  await context.route('**/generic-ai/grok', route => route.fulfill({
    contentType: 'text/html', body: fixture('combobox', 'Ask Grok anything', 'Submit'),
  }));
  await page.goto('http://localhost:3000/generic-ai/grok');
  await expect(page.locator('#veilo-status-badge')).toHaveAttribute('data-state', 'active');
  await page.getByRole('combobox').fill('My password is DemoOnly42 and my API key is demo-key-42.');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('#veilo-modal-root')).toBeVisible();
  await clickSendRedacted(page);
  await expect(page.locator('#sent-log')).toContainText('[PASSWORD_1]');
  await expect(page.locator('#sent-log')).toContainText('[API_KEY_1]');
  await expect(page.locator('#sent-log')).not.toContainText('DemoOnly42');
  await expect(page.locator('#sent-log')).not.toContainText('demo-key-42');

  const followup = page.getByRole('textbox');
  await followup.fill('My password is NextDemoOnly42.');
  await followup.press('Enter');
  await expect(page.locator('#veilo-modal-root')).toBeVisible();
  await clickSendRedacted(page);
  await expect(page.locator('#sent-log')).toContainText('[PASSWORD_2]');
  await expect(page.locator('#sent-log')).not.toContainText('NextDemoOnly42');
});

test('Meta scans the current rich draft after the textarea backing value becomes stale', async ({ context, page }) => {
  await context.route('**/generic-ai/meta', route => route.fulfill({
    contentType: 'text/html', body: fixture('textbox', 'Ask Meta AI...', 'Send message'),
  }));
  await page.goto('http://localhost:3000/generic-ai/meta');
  await expect(page.locator('#veilo-status-badge')).toHaveAttribute('data-state', 'active');
  const editor = page.getByRole('textbox');
  await editor.fill('My password is DemoOnly42.');
  await editor.press('Enter');
  await expect(page.locator('#veilo-modal-root')).toContainText('Password');
  await clickSendRedacted(page);
  await expect(page.locator('#sent-log')).toContainText('[PASSWORD_1]');

  await editor.fill('My API key is next-demo-key-42.');
  await editor.press('Enter');
  await expect(page.locator('#veilo-modal-root')).toContainText('API Key');
  await expect(page.locator('#veilo-modal-root')).not.toContainText('Password');
  await clickSendRedacted(page);
  await expect(page.locator('#sent-log')).toContainText('[API_KEY_1]');
  await expect(page.locator('#sent-log')).not.toContainText('next-demo-key-42');

  await editor.fill('The weather is sunny.');
  await editor.press('Enter');
  await expect(page.locator('#sent-log')).toContainText('The weather is sunny.');
  await expect(page.locator('#veilo-modal-root')).toHaveCount(0);
});
