# Changelog

All notable changes to **Veilo** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Phase 7 first OCR slice: inspect selected PNG, JPEG, WebP, BMP, and TIFF images locally with bundled English Tesseract data and the existing secret detector. When matches are detected, list their types and offer Cancel or Send Anyway; the original image is shared only after Send Anyway.
- Bundle OCR worker, WebAssembly core, and English trained data with the extension so OCR requires no remote OCR request.

### Changed
- Added a generic AI-chat adapter for common AI platforms and recognizable chat interfaces, with all-site host access for broader coverage; ordinary pages without AI-chat signals stay inactive.
- Expanded ChatGPT composer selectors and updated the extension version to 0.1.6.
- Assistant replies remain in placeholder form instead of locally expanding placeholders to original sensitive values.
- **Send Redacted** verifies the composer contains the redacted prompt before it triggers submission; failed verification keeps the review modal open and stops the send.
- Added mock-site assertions that assistant replies show placeholders and do not show the original values.

## [1.0.0] - 2026-10-10

### Added
- **Pure Core Detection Engine (`@veilo/engine`)**:
  - 13 entity detection rules: Aadhaar (Verhoeff checksum), Card Numbers (Luhn checksum), PAN (Holder type check), API Keys & Secret Tokens (Provider prefixes + Shannon entropy), UPI IDs (Known handles), Emails, Indian Mobile, IFSC, Bank Accounts, JWTs, Private Keys, Passwords, and PIN Codes.
  - Ephemeral `PlaceholderVault` with zero disk persistence.
  - Span overlap resolver prioritizing `validated_rule` > `context_rule` > `ner`.
  - Engine execution speed benchmark (< 10ms for 2,000 characters).
- **ChatGPT Interception MVP (`@veilo/extension`)**:
  - Site adapter interface (`SiteAdapter`) for ChatGPT composer and send buttons with self-test health checks.
  - Isolated Shadow DOM Review Modal allowing users to Send Redacted, Send Original, or Cancel.
  - ProseMirror contenteditable editor write-back via `insertText` / `InputEvent`.
  - Streaming-safe response restorer using `MutationObserver` on text nodes.
  - Floating status badge indicator.
- **On-Device Local NER (`chrome.offscreen`)**:
  - `chrome.offscreen` document executing WASM token classification without violating host CSP.
  - Background service worker managing offscreen lifecycle.
  - Allowlist term filtering support.
- **Evaluation Harness & Benchmark (`@veilo/eval`)**:
  - Synthetic dataset generator using `@faker-js/faker` with `en_IN` locale.
  - Precision, Recall, F1 score, FPR per 1k benign prompts, and $p50$/$p95$ latency benchmark generator writing to [docs/EVAL.md](docs/EVAL.md).
- **Local Dev Server & Playwright E2E Suite**:
  - Standalone mock chat server (`tests/mock-chat/index.html`) running on `http://localhost:3000`.
  - Playwright E2E integration test suite (`tests/e2e/interception.spec.ts`).
