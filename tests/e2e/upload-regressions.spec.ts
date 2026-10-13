import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { extensionDistPath } from './helpers';

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

const fixture = readFileSync(path.resolve(__dirname, '../mock-chat/detached-upload.html'), 'utf8');
const secretText = { name: 'demo.env', mimeType: 'text/plain', buffer: Buffer.from('PASSWORD=DemoOnly42\nAPI_KEY=demo-key-42') };

async function openMock(page: Page): Promise<void> {
  await page.route('http://localhost:3000/generic-ai-upload', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  await page.goto('http://localhost:3000/generic-ai-upload');
  await expect(page.locator('#veilo-status-badge')).toHaveAttribute('data-state', 'active');
}

async function chooseDetached(page: Page, files: Parameters<import('@playwright/test').FileChooser['setFiles']>[0]): Promise<void> {
  await page.getByRole('button', { name: 'Add to message', exact: true }).click();
  const nextPicker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Attach files', exact: true }).click();
  const picker = await nextPicker;
  await picker.setFiles(files);
}

test('detached picker stops secrets before upload and Cancel releases no file', async ({ page }) => {
  await openMock(page);
  await chooseDetached(page, secretText);
  const warning = page.locator('#veilo-attachment-warning');
  await expect(warning).toContainText('Password');
  await expect(warning).toContainText('API Key');
  await expect(page.locator('#upload-count')).toHaveText('0');
  await expect(page.locator('#upload-handler-calls')).toHaveText('0');
  await warning.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(warning).toHaveCount(0);
  await expect(page.locator('#uploaded-files li')).toHaveCount(0);
});

test('detached picker scans text and image together then replays exactly one change', async ({ page }) => {
  await openMock(page);
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000; canvas.height = 180;
    const drawing = canvas.getContext('2d')!;
    drawing.fillStyle = '#fff'; drawing.fillRect(0, 0, 1000, 180);
    drawing.fillStyle = '#000'; drawing.font = '44px Arial';
    drawing.fillText('Email: demo@example.com', 30, 95);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await chooseDetached(page, [secretText, { name: 'demo.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') }]);
  const warning = page.locator('#veilo-attachment-warning');
  await expect(warning).toContainText('Email', { timeout: 25000 });
  await expect(warning).toContainText('Password');
  await expect(page.locator('#upload-count')).toHaveText('0');
  await expect(page.locator('#upload-handler-calls')).toHaveText('0');
  await warning.getByRole('button', { name: 'Send Anyway', exact: true }).click();
  await expect(page.locator('#uploaded-files li')).toHaveText(['demo.env', 'demo.png']);
  await expect(page.locator('#upload-count')).toHaveText('1');
  await expect(page.locator('#upload-handler-calls')).toHaveText('1');
  await expect(warning).toHaveCount(0);
});

test('connected input capture cannot upload before approval or retrigger inspection during replay', async ({ page }) => {
  await openMock(page);
  const input = page.locator('#connected-input');
  const warning = page.locator('#veilo-attachment-warning');
  await input.setInputFiles(secretText);
  await expect(warning).toContainText('Password');
  await expect(page.locator('#upload-count')).toHaveText('0');
  await warning.getByRole('button', { name: 'Send Anyway', exact: true }).click();
  await expect(page.locator('#upload-count')).toHaveText('1');
  await expect(warning).toHaveCount(0);
  await input.setInputFiles({ ...secretText, name: 'second.env' });
  await expect(warning).toContainText('Password');
  await expect(page.locator('#upload-count')).toHaveText('1');
});

test('detached clean files are inspected and replayed without a warning', async ({ page }) => {
  await openMock(page);
  await chooseDetached(page, { name: 'readme.txt', mimeType: 'text/plain', buffer: Buffer.from('This is a harmless project overview.') });
  await expect(page.locator('#uploaded-files li')).toHaveText(['readme.txt']);
  await expect(page.locator('#upload-count')).toHaveText('1');
  await expect(page.locator('#veilo-attachment-warning')).toHaveCount(0);
});

test('connected picker removed during inspection is restored before delegated upload replay', async ({ page }) => {
  await openMock(page);
  await page.locator('#remove-input').check();
  await page.locator('#connected-input').setInputFiles(secretText);
  const warning = page.locator('#veilo-attachment-warning');
  await expect(warning).toContainText('Password');
  await expect(page.locator('#connected-input')).toHaveCount(0);
  await expect(page.locator('#upload-count')).toHaveText('0');
  await warning.getByRole('button', { name: 'Send Anyway', exact: true }).click();
  await expect(page.locator('#connected-parent #connected-input + #upload-anchor')).toHaveCount(1);
  await expect(page.locator('#uploaded-files li')).toHaveText(['demo.env']);
  await expect(page.locator('#upload-count')).toHaveText('1');
});

test('connected picker with a removed parent stays blocked instead of replaying outside delegated listeners', async ({ page }) => {
  await openMock(page);
  await page.locator('#remove-parent').check();
  await page.locator('#connected-input').setInputFiles(secretText);
  const warning = page.locator('#veilo-attachment-warning');
  await expect(warning).toContainText('Password');
  await expect(page.locator('#connected-parent')).toHaveCount(0);
  await warning.getByRole('button', { name: 'Send Anyway', exact: true }).click();
  await expect(warning).toContainText('Nothing was shared');
  await expect(page.locator('#upload-count')).toHaveText('0');
  await expect(page.locator('#uploaded-files li')).toHaveCount(0);
});

test('unsupported detached files retain the existing Cancel and Send Anyway choice', async ({ page }) => {
  await openMock(page);
  await chooseDetached(page, { name: 'demo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 synthetic sample') });
  const warning = page.locator('#veilo-attachment-warning');
  await expect(warning).toContainText('could not be inspected');
  await expect(page.locator('#upload-count')).toHaveText('0');
  await warning.getByRole('button', { name: 'Send Anyway', exact: true }).click();
  await expect(page.locator('#uploaded-files li')).toHaveText(['demo.pdf']);
  await expect(page.locator('#upload-count')).toHaveText('1');
});
