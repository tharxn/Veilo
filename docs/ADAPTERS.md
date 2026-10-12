# Site adapters

Veilo keeps all site-specific DOM knowledge in `packages/extension/src/adapters`. The detection engine is shared and unchanged across sites.

| Site | Adapter id | Hosts | Composer (primary) | Send |
| --- | --- | --- | --- | --- |
| ChatGPT | `chatgpt` | chatgpt.com, chat.openai.com, local mock `/` | `#prompt-textarea` | `button[data-testid="send-button"]` |
| Claude | `claude` | claude.ai, local mock `/claude` | `div.ProseMirror[contenteditable="true"]` | `button[aria-label*="Send"]` |
| Gemini | `gemini` | gemini.google.com, local mock `/gemini` | `rich-textarea .ql-editor` | `button.send-button` |

## How send is intercepted

1. `pageHook.js` runs in the **page JS world** at `document_start` and listens on `window` (capture) for Enter-without-Shift, send-button click/pointerdown, and form submit.
2. On a send attempt it calls `preventDefault` / `stopImmediatePropagation` and notifies the isolated content script.
3. The content script reads the live composer, runs `@veilo/engine`, and if anything is found shows the Shadow DOM review modal.
4. **Send Redacted** writes `[EMAIL_1]`-style placeholders into the composer (via `execCommand('insertText')` / input events), verifies the composer now contains the redacted text, then asks the page hook to send. If verification fails, the send is stopped and the review modal stays open.
5. **Send Original** re-triggers send with the unchanged text. **Cancel** leaves the composer as-is.

Assistant replies remain in placeholder form. Veilo does not currently restore original values into chatbot replies, so a reply cannot make it appear that the model received the originals.

If `selfTest()` cannot find a composer, the badge shows `Veilo is not protecting this page`. Chat sites change markup often; when that happens, update selectors in the adapter file only.

## Local mocks

`npm run mock` serves:

- http://localhost:3000 — ChatGPT-like composer
- http://localhost:3000/claude — Claude-like ProseMirror + window-capture send
- http://localhost:3000/gemini — Gemini-like `ql-editor` + window-capture send
