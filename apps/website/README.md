# Veilo website

Veilo's responsive website uses React, TypeScript, Next.js, and Motion for React. It shares the extension's Everyday palette, Veilo logo, and locally bundled Inter font. The feedback form sends email through a server-side TypeScript endpoint using Resend.

## Run locally

Use Node.js 22.13 or newer. The website has its own dependencies and lockfile, separate from the extension.

```sh
cd apps/website
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` for the copy step. Fill in the three server settings in `.env.local` to enable feedback. Open [localhost:5173](http://localhost:5173).

```sh
npm run build
npm start
```

The production build is generated in `.next/`. `npm start` serves it on port 3000 by default. The feedback route requires a server; this app is not a static export.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import `tharxn/Veilo` from GitHub.
2. Set **Root Directory** to `apps/website`.
3. Select the **Next.js** framework preset and Node.js **22.x**. Keep the default output directory. The install command is `npm ci`; the build command is `npm run build`.
4. Add these environment variables to the deployment environments that will use feedback:

   | Variable | Value to provide privately in Vercel |
   | --- | --- |
   | `RESEND_API_KEY` | Your Resend API key. |
   | `FEEDBACK_FROM_EMAIL` | An allowed sender, for example `Veilo <feedback@your-verified-domain.com>`. |
   | `FEEDBACK_TO_EMAIL` | The inbox that should receive feedback. |

5. Click **Deploy**. When environment variables change later, redeploy so the new settings take effect.

Keep all three settings server-side. Do not add `NEXT_PUBLIC_` to their names. The repository includes only an empty `.env.example`; real `.env.local` and `.dev.vars` files are ignored.

The form submits to `/api/feedback` on the same deployment, so no separate backend URL is needed. Vercel runs that route as a Node.js function. See [Vercel's monorepo setup](https://vercel.com/docs/monorepos) and [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables).

### Resend sender setup

For production, verify a sender domain in Resend and use an address on that domain for `FEEDBACK_FROM_EMAIL`. The test sender `onboarding@resend.dev` can send only to the email associated with your Resend account. See [Resend's sender restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

The visitor's email is required and appears in the feedback body and Reply-To header. Replying in your inbox addresses that visitor. It is a self-reported address, not verified identity. Mail is sent from Veilo's configured sender, rather than impersonating the visitor's address.

## Main files

- `src/App.tsx`: navigation, landing-page sections, previews, FAQ, and installation instructions.
- `src/PromptDemo.tsx`: interactive redaction illustration using made-up values.
- `src/styles.css`: typography, colors, responsive layout, and animations.
- `src/FeedbackModal.tsx` and `src/feedback.css`: feedback dialog and submission states.
- `app/layout.tsx` and `app/page.tsx`: metadata and page entry point.
- `app/api/feedback/route.ts`: Next.js API route and server environment access.
- `server/feedback.ts`: validation, Resend delivery, timeouts, idempotency, and rate limiting.
- `shared/feedbackValidation.ts`: shared field validation.
- `public/`: logos and the local Inter font, including its license.

The website's interactive examples illustrate the extension. They do not scan files, send AI prompts, or change extension settings. Real prompt detection and OCR run in the Chrome extension.

## Feedback behavior

Messages must contain 1–3,000 nonblank characters and a valid email. The form reads current field values at submission, including browser autofill. It keeps an unsuccessful draft while the dialog is open and confirms submission only after Resend accepts the email. Acceptance does not guarantee inbox delivery.

The server checks request origin, actual body size, fields, a hidden spam-check field, and a per-submission idempotency key. It reads a client IP only from Vercel's forwarding headers when running on Vercel. Rate limiting is best effort per server instance (5 attempts per 10 minutes), not a global quota; local development uses a shared local bucket. A larger public deployment should use a distributed limiter. Feedback delivery is separate from the extension's local privacy checks.

## Platform artwork

Platform marks belong to their respective owners and identify the platforms discussed. They do not imply endorsement or partnership. Source artwork:

- ChatGPT: https://cdn.oaistatic.com/assets/favicon-l4nq08hd.svg
- Claude: https://assets.claude.com/95a868946ac8a31e5ff832e2899f294aa368b836.png
- Gemini: https://storage.googleapis.com/gweb-gemini-cdn/gemini/uploads/c546a20243c57b297546630cf76e417a2483acb8.svg
- Copilot: https://res.cdn.office.net/officehub/images/content/images/unauth-copilotcom/copilot-mobile-logo-static-286643fc8c.png
- Perplexity: https://www.perplexity.ai/favicon.svg
- Grok: https://grok.com/images/favicon.svg

Veilo is released under the repository's [MIT License](../../LICENSE).
