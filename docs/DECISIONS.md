# Architectural Decision Log (DECISIONS.md)

This document records key design and architectural decisions made for **Veilo**, along with their rationale and trade-offs.

---

## ADR 001: Monorepo Architecture with `npm` Workspaces

- **Date**: 2026-10-10
- **Status**: Accepted
- **Context**: Veilo consists of a pure detection engine, an MV3 Chrome extension, an evaluation harness, and E2E tests.
- **Decision**: Use `npm` workspaces under `packages/*` (`packages/engine`, `packages/extension`, `packages/eval`).
- **Rationale**:
  - `packages/engine` must remain a pure TypeScript library with zero DOM or browser extension API dependencies, making it directly testable via Vitest and reusable in CLI or eval tools.
  - `packages/extension` handles MV3 packaging, DOM interception, offscreen inference, and content scripts.
  - Clean separation prevents browser runtime code from leaking into core validation logic.

---

## ADR 002: Manifest V3 with Offscreen Document for WASM/NER Inference

- **Date**: 2026-10-10
- **Status**: Accepted
- **Context**: Chromium Manifest V3 disallows arbitrary code evaluation inside content scripts and host page contexts under strict Content Security Policies (CSP).
- **Decision**: Run local NER model inference using Transformers.js inside a dedicated `chrome.offscreen` document.
- **Rationale**:
  - `chrome.offscreen` documents operate in an extension-owned context with `wasm-unsafe-eval` privileges, isolating inference from host page CSP restrictions.
  - The content script sends raw text spans over runtime messaging (`chrome.runtime.sendMessage`) and receives detected entities without introducing network requests.

---

## ADR 003: In-Memory Only Redaction Vault

- **Date**: 2026-10-10
- **Status**: Accepted
- **Context**: Sensitive values (passwords, Aadhaar, credit card numbers, API keys) must never leak or persist.
- **Decision**: Keep the `PlaceholderVault` mapping exclusively in volatile tab memory.
- **Rationale**:
  - No `localStorage`, `indexedDB`, or `chrome.storage.local` persistence for real sensitive values.
  - Closing or refreshing the tab completely wipes all original values from memory.

---

## ADR 004: MAIN-world page hook for send interception

- **Date**: 2026-10-11
- **Status**: Accepted
- **Context**: Phase 6 adapters for Claude and Gemini attached capture listeners from the isolated content script. Those listeners cannot stop page-world handlers (`stopPropagation` does not cross Chrome isolated worlds). Claude and Gemini register Enter/Send in the page world, often on `window` in capture phase, so the raw prompt was sent and the model (not Veilo) "handled" PII.
- **Decision**: Inject `pageHook.js` as a `world: "MAIN"` content script at `document_start`. It pauses Enter / Send / submit, posts a message to the isolated script, which runs detection and shows the review modal. After the user chooses Send Redacted, the isolated script writes placeholders into the composer and the page hook re-triggers send with a bypass flag.
- **Rationale**: Registering in the page world before site JS is the only reliable way to beat ProseMirror/React send handlers. Isolated-world listeners remain as a fallback for the local mock page.

---

## ADR 005: Inspect selected images locally before releasing them to chat sites

- **Date**: 2026-10-11
- **Status**: Accepted
- **Context**: Phase 7 needs to inspect image content before an AI site can receive it. Many chat sites upload attachments as soon as they are added, before the user presses Enter.
- **Decision**: Hold supported selected image files in extension memory and run bundled, local English OCR plus the existing sensitive-data detector. If matches are found, show their types and require an explicit Send Anyway choice before returning the original file to the site. Cancel discards it. Keep unsupported attachment paths blocked.
- **Rationale**: This obtains consent before the site receives a detected sensitive image. The image is not edited, OCR can miss sensitive text, and the first implementation supports printed English only; the modal must not imply otherwise.
