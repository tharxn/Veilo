import { test as base, chromium, expect, type BrowserContext } from '@playwright/test';
import { extensionDistPath, clickSendRedacted } from './helpers';

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

async function openSettings(context: BrowserContext) {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const page = await context.newPage();
  await page.goto(new URL('settings.html', worker.url()).href);
  await expect(page.locator('#save-state')).toContainText('Settings saved on this device');
  return page;
}

test('settings persist, switch themes, and leave disabled labels unchanged on open chats', async ({ context, page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('#veilo-status-badge')).toBeVisible();
  const settings = await openSettings(context);
  await expect(settings.locator('[data-kind="site"]')).toHaveCount(20);
  await expect(settings.locator('[data-kind="label"]')).toHaveCount(24);
  await settings.locator('[data-id="email"]').uncheck();
  await expect(settings.locator('#save-state')).toHaveText('All changes saved');
  await settings.locator('[data-id="person"]').uncheck();
  await expect(settings.locator('#save-state')).toHaveText('All changes saved');
  await settings.getByText('Deep brown and warm orange. Easy on the eyes.').click();
  await expect(page.locator('#veilo-status-badge')).toHaveAttribute('data-theme', 'developer');
  await settings.reload();
  await expect(settings.locator('[data-id="email"]')).not.toBeChecked();
  await expect(settings.locator('html')).toHaveAttribute('data-theme', 'developer');
  await settings.screenshot({ path: 'test-results/veilo-settings-dark.png', fullPage: true });

  const composer = page.locator('#prompt-textarea');
  await composer.fill('My name is Jamie, my email is demo@example.com, password: DemoOnly42');
  await composer.press('Enter');
  await expect(page.locator('#veilo-modal-root')).toBeVisible();
  await expect(page.locator('#veilo-modal-root')).toContainText('Password');
  await expect(page.locator('#veilo-modal-root')).not.toContainText('Email');
  await clickSendRedacted(page);
  await expect(page.locator('#sent-payload-log')).toContainText('demo@example.com');
  await expect(page.locator('#sent-payload-log')).toContainText('Jamie');
  await expect(page.locator('#sent-payload-log')).toContainText('[PASSWORD_1]');
  await expect(page.locator('#sent-payload-log')).not.toContainText('DemoOnly42');

  await settings.locator('#toast-toggle').uncheck();
  await expect(page.locator('#veilo-status-badge')).toHaveCount(0);
  await composer.fill('password: SecondDemo42');
  await composer.press('Enter');
  await expect(page.locator('#veilo-modal-root')).toBeVisible();
  await page.locator('#veilo-modal-root').evaluate(el => el.shadowRoot?.querySelector<HTMLButtonElement>('#btn-cancel')?.click());
});

test('site preferences bypass both sends and uploads and can be re-enabled without a page reload', async ({ context, page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('#veilo-status-badge')).toBeVisible();
  const settings = await openSettings(context);
  await settings.locator('[data-kind="site"][data-id="chatgpt"]').uncheck();
  await expect(page.locator('#veilo-status-badge')).toHaveCount(0);
  await page.locator('#prompt-textarea').fill('my email is demo@example.com');
  await page.locator('#prompt-textarea').press('Enter');
  await expect(page.locator('#sent-payload-log')).toContainText('demo@example.com');
  await expect(page.locator('#veilo-modal-root')).toHaveCount(0);
  await page.locator('#attachment-input').setInputFiles({ name: 'demo.txt', mimeType: 'text/plain', buffer: Buffer.from('password: DemoOnly42') });
  await expect(page.locator('#sent-payload-log')).toContainText('Uploaded: demo.txt');
  await expect(page.locator('#veilo-attachment-warning')).toHaveCount(0);
  await settings.locator('[data-kind="site"][data-id="chatgpt"]').check();
  await expect(page.locator('#veilo-status-badge')).toBeVisible();
  await page.locator('#prompt-textarea').fill('my email is demo@example.com');
  await page.locator('#prompt-textarea').press('Enter');
  await expect(page.locator('#veilo-modal-root')).toBeVisible();
});

test('text files respect label preferences and the popup opens full settings', async ({ context, page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('#veilo-status-badge')).toBeVisible();
  const settings = await openSettings(context);
  await settings.locator('[data-id="email"]').uncheck();
  await expect(settings.locator('#save-state')).toHaveText('All changes saved');
  await page.locator('#attachment-input').setInputFiles({ name: 'email.txt', mimeType: 'text/plain', buffer: Buffer.from('my email is demo@example.com') });
  await expect(page.locator('#sent-payload-log')).toContainText('Uploaded: email.txt');
  await expect(page.locator('#veilo-attachment-warning')).toHaveCount(0);
  await page.locator('#attachment-input').setInputFiles({ name: 'mixed.env', mimeType: 'text/plain', buffer: Buffer.from('EMAIL=demo@example.com\nPASSWORD=DemoOnly42') });
  await expect(page.locator('#veilo-attachment-warning')).toContainText('Password');
  await expect(page.locator('#veilo-attachment-warning')).not.toContainText('Email');

  const popup = await context.newPage();
  await popup.goto(settings.url().replace('settings.html', 'popup.html'));
  await expect(popup.locator('body')).toHaveAttribute('data-theme', 'everyday');
  await settings.close();
  const extensionOptions = context.waitForEvent('page');
  await popup.getByRole('button', { name: 'All settings' }).click();
  const options = await extensionOptions;
  await expect(options).toHaveURL(/settings\.html$/);
  await options.screenshot({ path: 'test-results/veilo-settings-light.png', fullPage: true });
  await options.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => options.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await options.screenshot({ path: 'test-results/veilo-settings-mobile.png', fullPage: true });
});

test('image findings respect the same disabled email label', async ({ context, page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('#veilo-status-badge')).toBeVisible();
  const settings = await openSettings(context);
  await settings.locator('[data-id="email"]').uncheck();
  await expect(settings.locator('#save-state')).toHaveText('All changes saved');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 180;
    const drawing = canvas.getContext('2d')!;
    drawing.fillStyle = '#fff'; drawing.fillRect(0, 0, 900, 180);
    drawing.fillStyle = '#000'; drawing.font = '40px Arial';
    drawing.fillText('Email: demo@example.com', 35, 95);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#attachment-input').setInputFiles({ name: 'email.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await expect(page.locator('#sent-payload-log')).toContainText('Uploaded: email.png', { timeout: 25000 });
  await expect(page.locator('#veilo-attachment-warning')).toHaveCount(0);
  await settings.locator('[data-id="email"]').check();
  await expect(settings.locator('#save-state')).toHaveText('All changes saved');
  await page.locator('#attachment-input').setInputFiles({ name: 'email-checked.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await expect(page.locator('#veilo-attachment-warning')).toContainText('Email', { timeout: 15000 });
});
