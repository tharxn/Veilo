import path from 'path';
import type { Page } from '@playwright/test';

export const contentJsPath = path.resolve(__dirname, '../../packages/extension/dist/content.js');
export const pageHookPath = path.resolve(__dirname, '../../packages/extension/dist/pageHook.js');
export const extensionDistPath = path.resolve(__dirname, '../../packages/extension/dist');

export const PII_PROMPT =
  'My email is rahul@example.com, PAN is ABCPB1234F, Aadhaar is 234567890124.';

export async function injectIsolatedScripts(page: Page): Promise<void> {
  await page.addScriptTag({ path: pageHookPath });
  await page.addScriptTag({ path: contentJsPath });
}

export async function clickSendRedacted(page: Page): Promise<void> {
  const modalHost = page.locator('#veilo-modal-root');
  await modalHost.evaluate(el => {
    const btn = el.shadowRoot?.querySelector('#btn-redacted') as HTMLButtonElement | null;
    if (btn) btn.click();
  });
}
