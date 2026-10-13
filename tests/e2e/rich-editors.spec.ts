import fs from 'node:fs';
import path from 'node:path';
import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';

// Intended destination: tests/e2e/rich-editors.spec.ts; HTML fixture belongs in
// tests/mock-chat/rich-controlled.html. Tests load the built extension exactly
// like extension.spec.ts, but serve this model-backed fixture by route.
const extensionDistPath = path.resolve(__dirname, '../../packages/extension/dist');
const fixtureHtml = fs.readFileSync(path.resolve(__dirname, '../mock-chat/rich-controlled.html'), 'utf8');
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

async function openFixture(page: Page, route: string, mode: string) {
  await page.route('http://localhost:3000/**', request => request.fulfill({
    contentType: 'text/html', body: fixtureHtml,
  }));
  await page.goto(`http://localhost:3000/${route}?mode=${mode}`);
  await page.waitForSelector('#veilo-status-badge[data-state="active"]');
}

async function requestRedaction(page: Page) {
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const modal = page.locator('#veilo-modal-root');
  await expect(modal).toBeVisible();
  await modal.evaluate(element => element.shadowRoot?.querySelector<HTMLButtonElement>('#btn-redacted')?.click());
  return modal;
}

for (const route of ['copilot', 'generic-ai/perplexity', 'generic-ai/kimi']) {
  test(`${route}: controlled selection replaces rather than appends`, async ({ page }) => {
    await openFixture(page, route, 'controlled');
    await requestRedaction(page);
    const log = page.locator('#sent-payload-log');
    await expect(log).toContainText('[EMAIL_1]');
    await expect(log).toContainText('[PASSWORD_1]');
    await expect(log).toContainText('[API_KEY_1]');
    await expect(log).not.toContainText('demo@example.com');
    await expect(log).not.toContainText('DemoOnly42');
    await expect(log).not.toContainText('demo-key-42');
    await expect(log).toHaveText('My email is [EMAIL_1], password: [PASSWORD_1], API key: [API_KEY_1].');
  });
}

test('Copilot: beforeinput-owned model accepts one replacement', async ({ page }) => {
  await openFixture(page, 'copilot', 'beforeinput');
  await requestRedaction(page);
  await expect(page.locator('#sent-payload-log')).toHaveText(
    'My email is [EMAIL_1], password: [PASSWORD_1], API key: [API_KEY_1].',
  );
});

test('controlled editor: rejection never submits the old model', async ({ page }) => {
  await openFixture(page, 'copilot', 'reject');
  const modal = await requestRedaction(page);
  await expect(modal).toContainText('Nothing was sent');
  await expect(page.locator('#sent-payload-log')).toHaveText('');
});

test('controlled editor: delayed rollback cannot pass transient verification', async ({ page }) => {
  await openFixture(page, 'copilot', 'reconcile-late');
  const modal = await requestRedaction(page);
  await expect(modal).toContainText('Nothing was sent');
  await expect(page.locator('#sent-payload-log')).toHaveText('');
});
