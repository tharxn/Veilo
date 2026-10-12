# Threat Model (THREAT_MODEL.md)

## Goal & Protection Scope

**Veilo** is designed to reduce accidental leakage of personally identifiable information (PII) and secret credentials when pasting text into public or third-party AI chatbots (e.g. ChatGPT, Claude, Gemini).

---

## What Veilo Protects Against

1. **Accidental Submissions**: Accidental inclusion of emails, phone numbers, credit card numbers, national IDs (Aadhaar, PAN), passwords, JWTs, and API keys in user prompts.
2. **Third-Party Data Logging**: Intercepts text at the client side *before* network requests leave the browser, ensuring third-party LLM providers only receive tokenized placeholders (e.g., `[EMAIL_1]`, `[SECRET_1]`).
3. **Data Persistence Risk**: Ensures no sensitive original values are stored on disk, logged to devtools console, or transmitted to any remote telemetry service.

---

## What Is Out of Scope (Non-Goals & Limitations)

1. **Compromised Endpoints**: If the user's browser or device is infected with malware or keyloggers, Veilo cannot guarantee security.
2. **Malicious Extensions**: Extensions with broad permissions (`<all_urls>`, `webRequest`) running in the same browser profile could theoretically observe DOM changes or content script memory.
3. **Active Adversarial Evasion**: Veilo is an automated helper against accidental leakage; it is not a cryptographic enforcement tool against an end-user intentionally obfuscating sensitive data to bypass detection.
4. **Side-Channel & Length Analysis**: The total prompt character count or placeholder length could give statistical clues about payload size to an observing network party, though raw values remain hidden.

---

## Security Guarantees

- **Zero Remote Requests**: Veilo contains zero analytics, tracking, or network API calls.
- **Volatile Storage**: The placeholder-to-value dictionary lives strictly in ephemeral JS memory and is cleared upon tab closure.

## Image Attachments (Phase 7, in progress)

Selected PNG, JPEG, WebP, BMP, and TIFF files are held in the extension content-script memory and scanned locally with bundled English Tesseract OCR before being handed back to the chat site's upload control. Detected secret types are shown without displaying OCR'd secret values. The original image is shared only after the user chooses **Send Anyway**. Cancel discards the selected image. OCR can miss content, especially handwriting, low-quality, rotated, occluded, very small, or non-English text; no-match is not a safety guarantee. The current flow does not redact image pixels. Pasted and dropped files remain blocked pending equivalent local inspection.
