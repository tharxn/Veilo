import { test, expect } from '@playwright/test';
import { clickSendRedacted, injectIsolatedScripts, PII_PROMPT } from './helpers';

test.describe('Veilo Interception & Restoration', () => {
  test('intercepts sensitive prompt on click, sends placeholders, keeps reply placeholders visible', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000');
    await injectIsolatedScripts(page);

    const composer = page.locator('#prompt-textarea');
    await composer.fill('Contact rahul@example.com regarding Aadhaar 234567890124.');
    await page.click('#send-btn');

    const modalHost = page.locator('#veilo-modal-root');
    await expect(modalHost).toBeVisible();
    await clickSendRedacted(page);

    const sentPayloadLog = page.locator('#sent-payload-log');
    await expect(sentPayloadLog).toContainText('[EMAIL_1]');
    await expect(sentPayloadLog).toContainText('[AADHAAR_1]');
    await expect(sentPayloadLog).not.toContainText('rahul@example.com');
    await expect(sentPayloadLog).not.toContainText('234567890124');

    const assistantMsg = page.locator('div[data-message-author-role="assistant"]');
    await expect(assistantMsg).toContainText('[EMAIL_1]');
    await expect(assistantMsg).toContainText('[AADHAAR_1]');
    await expect(assistantMsg).not.toContainText('rahul@example.com');
    await expect(assistantMsg).not.toContainText('234567890124');
  });

  test('intercepts Enter key and redacts before send', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await injectIsolatedScripts(page);

    const composer = page.locator('#prompt-textarea');
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
  });
});
