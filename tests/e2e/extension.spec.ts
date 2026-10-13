import { test as base, chromium, expect, type BrowserContext } from '@playwright/test';
import { clickSendRedacted, extensionDistPath, PII_PROMPT } from './helpers';

export const test = base.extend<{
  context: BrowserContext;
  extensionPage: void;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium', headless: true,
      args: [
        `--disable-extensions-except=${extensionDistPath}`,
        `--load-extension=${extensionDistPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
});

async function redactionFlow(page: import('@playwright/test').Page, composerSelector: string) {
  await page.waitForSelector(composerSelector, { timeout: 15_000 });
  await page.waitForSelector('#veilo-status-badge', { timeout: 15_000 });

  const composer = page.locator(composerSelector).first();
  await composer.click();
  await composer.fill(PII_PROMPT);
  await composer.press('Enter');

  await expect(page.locator('#veilo-modal-root')).toBeVisible();
  await clickSendRedacted(page);

  const sentPayloadLog = page.locator('#sent-payload-log');
  await expect(sentPayloadLog).toContainText('[EMAIL_1]');
  await expect(sentPayloadLog).toContainText('[PAN_1]');
  await expect(sentPayloadLog).toContainText('[AADHAAR_1]');
  await expect(sentPayloadLog).not.toContainText('rahul@example.com');
  await expect(sentPayloadLog).not.toContainText('ABCPB1234F');
  await expect(sentPayloadLog).not.toContainText('234567890124');

  const assistantReply = page.locator('[data-message-author-role="assistant"]').last();
  await expect(assistantReply).toContainText('[EMAIL_1]');
  await expect(assistantReply).toContainText('[PAN_1]');
  await expect(assistantReply).toContainText('[AADHAAR_1]');
  await expect(assistantReply).not.toContainText('rahul@example.com');
  await expect(assistantReply).not.toContainText('ABCPB1234F');
  await expect(assistantReply).not.toContainText('234567890124');
}

test.describe('Loaded extension vs mock sites', () => {
  test('ChatGPT mock: Enter shows modal and sends placeholders', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await redactionFlow(page, '#prompt-textarea');
  });

  test('ChatGPT mock: an upload input present at startup is inspected before sharing', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.locator('#attachment-input').setInputFiles({
      name: 'synthetic.env',
      mimeType: 'text/plain',
      buffer: Buffer.from('OPENAI_API_KEY=sk-test-DO_NOT_USE-00000000000000000000000000000000'),
    });

    const warning = page.locator('#veilo-attachment-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('API Key');
    await warning.evaluate(el => {
      const send = el.shadowRoot?.querySelector<HTMLButtonElement>('.send');
      send?.click();
    });
    await expect(page.locator('#sent-payload-log')).toContainText('Uploaded: synthetic.env');
  });

  test('ChatGPT mock: unsupported uploads ask before sharing and respect Cancel or Send Anyway', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    const upload = page.locator('#attachment-input');
    const warning = page.locator('#veilo-attachment-warning');
    const log = page.locator('#sent-payload-log');
    const pdf = { name: 'synthetic-report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 synthetic fixture') };

    await upload.setInputFiles(pdf);
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('unsupported file format');
    await warning.evaluate(el => el.shadowRoot?.querySelector<HTMLButtonElement>('.cancel')?.click());
    await expect(log).toContainText('Waiting for prompt submission');

    await upload.setInputFiles(pdf);
    await expect(warning).toBeVisible();
    await warning.evaluate(el => el.shadowRoot?.querySelector<HTMLButtonElement>('.send')?.click());
    await expect(log).toContainText('Uploaded: synthetic-report.pdf');
  });

  test('Popup settings apply the selected theme and master switch to an open AI page', async ({ context, page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('#veilo-status-badge', { timeout: 15_000 });

    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const popup = await context.newPage();
    await popup.goto(new URL('popup.html', worker.url()).href);
    await popup.locator('.theme-choice').nth(1).click();
    await expect.poll(() => page.locator('#veilo-status-badge').getAttribute('data-theme')).toBe('developer');

    await popup.locator('label.switch').nth(0).click();
    await expect(page.locator('#veilo-status-badge')).toHaveCount(0);
    const composer = page.locator('#prompt-textarea');
    await composer.fill(PII_PROMPT);
    await composer.press('Enter');
    await expect(page.locator('#veilo-modal-root')).toHaveCount(0);
    await expect(page.locator('#sent-payload-log')).toContainText('rahul@example.com');
  });

  test('Claude mock: Enter is blocked by MAIN-world hook', async ({ page }) => {
    await page.goto('http://localhost:3000/claude');
    await redactionFlow(page, 'div.ProseMirror');
  });

  test('Gemini mock: Enter is blocked by MAIN-world hook', async ({ page }) => {
    await page.goto('http://localhost:3000/gemini');
    await redactionFlow(page, '.ql-editor');
  });

  test('Generic AI chat mock: fallback adapter intercepts Enter and redacts before send', async ({ page }) => {
    await page.goto('http://localhost:3000/generic-ai');
    await redactionFlow(page, '#prompt-textarea');
  });

  test('Copilot mock: redaction verification accepts rich-text whitespace serialization', async ({ page }) => {
    await page.goto('http://localhost:3000/copilot');
    await redactionFlow(page, '#prompt-textarea');
  });
});
