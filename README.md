# Veilo

**A browser extension that checks prompts and selected attachments for personal information and developer secrets before they reach supported AI chat sites.**

Veilo runs its text checks and image OCR on your device. When it detects possible sensitive values in a typed prompt, you can choose which ones to replace with placeholders such as `[EMAIL_1]` or `[API_KEY_1]` before sending. Veilo does not need a Veilo server to scan your content.

> Veilo is a privacy aid, not a guarantee. Detection can miss unusual formats, and some file types cannot currently be inspected. Always review the information you choose to send.

## Try Veilo in Chrome

Veilo is currently installed as an unpacked developer extension; it is not yet listed in the Chrome Web Store.

1. Install [Node.js 18 or newer](https://nodejs.org/).
2. Download this repository using GitHub’s **Code → Download ZIP**, then extract it, or clone it:

   ```sh
   git clone https://github.com/tharxn/Veilo.git
   cd Veilo
   ```

3. Build the extension:

   ```sh
   npm install
   npm run build
   ```

4. In Chrome, open `chrome://extensions` and turn on **Developer mode**.
5. Choose **Load unpacked** and select the `packages/extension/dist` folder inside the project.
6. Open a supported AI chat website. Pin Veilo from Chrome’s Extensions menu if you want quick access to its on/off switch, status indicator setting, and Everyday/Developer themes.

After rebuilding, open `chrome://extensions` and click Veilo’s **Reload** button. Reload the AI chat tab too.

## Make Veilo work your way

Click Veilo’s extension icon, then **All settings**, or use **Extension options** in Chrome. Preferences save automatically on this device and update open AI chat pages.

- **Protection** turns Veilo on or off globally.
- **On-page status** shows or hides the small protection indicator.
- **Theme** chooses the existing Everyday or Developer appearance.
- **AI sites** lets you turn Veilo checks off for individual platforms. Other recognized AI chats have their own setting.
- **Detection labels** lets you disable labels such as emails or names while keeping other checks enabled. Disabled labels pass through unchanged and do not trigger a review. These preferences apply to prompts, supported text files, and image OCR findings.

To make an exception for one prompt, use the individual checkboxes in its review window.

## What happens when you send a prompt

1. Veilo watches the prompt composer on supported AI chat pages.
2. When you press Enter or click Send, Veilo checks the text locally using written TypeScript detection rules.
3. If it finds possible sensitive values, a review window lets you choose what to redact.
4. Selected values are replaced in the prompt with placeholders. Veilo verifies the replacement before allowing the page to send.
5. The AI site receives the resulting prompt. Selected originals are replaced by placeholders; unchecked values remain as written.

**Send original** sends the unchanged prompt. Use it only when you intend to share its contents with that AI provider.

## Attachments

Veilo checks supported image uploads with bundled English OCR and supported text/developer files with its text detector. If it finds possible sensitive content, it shows a warning. Attachments are not edited or redacted: **Send Anyway** shares the original file, and **Cancel** cancels the upload.

Supported image formats include PNG, JPEG, WebP, BMP, and TIFF. Supported text-based formats include TXT, CSV, JSON, YAML, source code, `.env`, and other formats listed in `packages/extension/src/intercept/attachmentGuard.ts`.

For unsupported file formats, Veilo says it could not inspect the attachment and offers **Send Anyway** or **Cancel**. Sending anyway shares that file without inspection. File pastes and drag-and-drop are not supported; use the chat site’s upload control. OCR can miss or misread handwriting, blurry, rotated, small, low-contrast, obscured, or non-English text. No warning does not prove an image is safe.

## Supported AI chat sites

Veilo has site-specific adapters for ChatGPT, Claude, and Gemini, plus a Copilot adapter and a best-effort generic adapter for other recognizable AI chat pages. Chat sites can change their page structure, so support can break until an adapter is updated. Check that Veilo’s on-page badge reports protection as active before relying on it.

Chrome may ask you to grant the extension access to websites. Veilo requests broad host access so it can run on supported and future AI chat sites; the extension only enables its chat interception on sites it recognizes. You can manage access in `chrome://extensions` → Veilo → **Site access**.

## Privacy and limitations

- Prompt detection, text-file scanning, and image OCR are designed to run locally in the browser.
- The AI provider still receives content the user chooses to send. **Send original**, unchecked prompt findings, **Send Anyway**, and unsupported file formats can send original sensitive content.
- File attachments are warned about, not rewritten. The extension does not remove text from image pixels or alter document contents.
- Detection is based on patterns, context, and some format/checksum validators. A plausible format does not prove that an identifier is real.
- Veilo cannot protect against malware, other extensions that read page content, a compromised device, or an AI website whose page behavior changes unexpectedly.
- If Veilo reports that a page is not protected, do not assume the prompt was intercepted.

For privacy checks, use fake test values and inspect the AI site’s outgoing request in the browser’s Network panel. The outgoing request is better evidence of what the site received than the AI’s reply.

## Try the local mock chat and checks

From the project folder:

```sh
npm run mock
```

Open `http://localhost:3000` to try the local mock chat without sending data to an AI provider.

Common development commands:

```sh
npm run build       # Build the extension and packages
npm run typecheck   # Check TypeScript types
npm run test        # Run package unit tests
npm run test:e2e    # Run Playwright browser tests
npm run eval        # Run detector evaluation
```

The E2E tests use Playwright. If its Chromium browser is not installed yet, run `npx playwright install chromium` first.

## Project layout

```text
packages/engine/       Text detection rules, validators, and placeholders
packages/extension/    Chrome extension, site adapters, UI, OCR, upload guard
packages/eval/         Detector evaluation tools
tests/                 Mock chat pages and browser tests
docs/                  Architecture, privacy model, manual tests, and guides
```

## License

Veilo is released under the MIT License. See [`LICENSE`](LICENSE).
