import { isFeedbackEmail, MAX_FEEDBACK_MESSAGE_LENGTH } from '../shared/feedbackValidation';

export interface FeedbackEnvironment {
  RESEND_API_KEY?: string;
  FEEDBACK_FROM_EMAIL?: string;
  FEEDBACK_TO_EMAIL?: string;
}

type FeedbackCategory = 'bug' | 'feature' | 'general';

interface FeedbackSubmission {
  category: FeedbackCategory;
  message: string;
  email: string;
  submissionId: string;
}

type FeedbackValidationResult =
  | { ok: true; submission: FeedbackSubmission }
  | { ok: false; message: string };

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_BODY_BYTES = 20 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 5;
const MAX_RATE_ENTRIES = 10_000;
const rateLimits = new Map<string, RateLimitEntry>();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVALID_REQUEST_MESSAGE = 'This feedback request is invalid. Please reload the page and try again.';

const SUBJECTS: Record<FeedbackCategory, string> = {
  bug: 'Veilo feedback: Bug report',
  feature: 'Veilo feedback: Feature idea',
  general: 'Veilo feedback: General feedback',
};

class BodyTooLargeError extends Error {}

function jsonResponse(
  status: number,
  body: { ok: boolean; message?: string },
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateSubmission(value: unknown): FeedbackValidationResult {
  if (!isRecord(value)) return { ok: false, message: INVALID_REQUEST_MESSAGE };
  const { category, message, email, website, submissionId } = value;
  if (category !== 'bug' && category !== 'feature' && category !== 'general') {
    return { ok: false, message: INVALID_REQUEST_MESSAGE };
  }
  if (typeof message !== 'string' || !message.trim()) {
    return { ok: false, message: 'Please write a message before sending.' };
  }
  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
    return { ok: false, message: 'Please keep your message within 3,000 characters.' };
  }
  if (website !== undefined && website !== '') return { ok: false, message: INVALID_REQUEST_MESSAGE };
  if (typeof email !== 'string' || !email.trim()) {
    return { ok: false, message: 'Please enter your email so we can reply.' };
  }
  const trimmedEmail = email.trim();
  if (!isFeedbackEmail(trimmedEmail)) {
    return { ok: false, message: 'Please enter a valid email address, such as you@example.com.' };
  }
  if (typeof submissionId !== 'string' || !UUID_PATTERN.test(submissionId)) {
    return { ok: false, message: INVALID_REQUEST_MESSAGE };
  }
  return {
    ok: true,
    submission: {
      category,
      message: trimmedMessage,
      email: trimmedEmail,
      submissionId: submissionId.toLowerCase(),
    },
  };
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null && /^\d+$/.test(declaredLength)
    && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }
  if (!request.body) throw new SyntaxError('Missing request body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(decoded) as unknown;
}

function rateLimit(trustedClientAddress: string | undefined, now: number): number | null {
  // Best-effort per-instance limit; production should also enforce a distributed edge limit.
  // Only the deployment adapter supplies a trusted address; never trust client headers here.
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }
  const normalizedAddress = trustedClientAddress?.trim().toLowerCase();
  const address = normalizedAddress && /^[0-9a-f:.]{3,45}$/i.test(normalizedAddress)
    ? normalizedAddress
    : 'loopback';
  const existing = rateLimits.get(address);
  if (existing) {
    if (existing.count >= RATE_MAX_REQUESTS) return Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    existing.count += 1;
    return null;
  }
  // Preserve existing limits instead of allowing a flood of unique addresses to evict them.
  if (rateLimits.size >= MAX_RATE_ENTRIES) return Math.ceil(RATE_WINDOW_MS / 1000);
  rateLimits.set(address, { count: 1, resetAt: now + RATE_WINDOW_MS });
  return null;
}

export async function handleFeedback(
  request: Request,
  env: FeedbackEnvironment,
  trustedClientAddress?: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Please submit feedback using the form.' }, { Allow: 'POST' });
  }
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return jsonResponse(400, { ok: false, message: 'This feedback request is invalid.' });
  }
  if (request.headers.get('origin') !== requestOrigin) {
    return jsonResponse(403, { ok: false, message: 'Please submit feedback from the Veilo website.' });
  }
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return jsonResponse(415, { ok: false, message: 'This feedback format is not supported.' });
  }
  const retryAfter = rateLimit(trustedClientAddress, Date.now());
  if (retryAfter !== null) {
    return jsonResponse(429, {
      ok: false,
      message: 'You have submitted several times. Please wait a few minutes and try again.',
    }, { 'Retry-After': String(retryAfter) });
  }

  let parsed: unknown;
  try {
    parsed = await readJsonBody(request);
  } catch (error: unknown) {
    return error instanceof BodyTooLargeError
      ? jsonResponse(413, { ok: false, message: 'This message is too large. Please shorten it and try again.' })
      : jsonResponse(400, { ok: false, message: 'This feedback request could not be read. Please try again.' });
  }
  const validation = validateSubmission(parsed);
  if (!validation.ok) {
    return jsonResponse(400, { ok: false, message: validation.message });
  }
  const submission = validation.submission;

  const apiKey = env.RESEND_API_KEY?.trim();
  const fromEmail = env.FEEDBACK_FROM_EMAIL?.trim();
  const toEmail = env.FEEDBACK_TO_EMAIL?.trim() || '';
  if (!apiKey || !fromEmail || fromEmail.length > 320 || /[\r\n\u0000]/.test(fromEmail)
    || !isFeedbackEmail(toEmail)) {
    return jsonResponse(503, {
      ok: false,
      message: 'Feedback is temporarily unavailable. Your message has not been sent. Please try again later.',
    });
  }

  const payload: Record<string, string | string[]> = {
    from: fromEmail,
    to: [toEmail],
    subject: SUBJECTS[submission.category],
    text: [
      `Feedback type: ${submission.category}`,
      `Submitted email: ${submission.email}`,
      '',
      submission.message,
    ].join('\n'),
  };
  payload.reply_to = submission.email;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `veilo-${submission.submissionId}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return jsonResponse(502, {
        ok: false,
        message: 'Feedback could not be accepted right now. Your message is still here; please try again.',
      });
    }
    const result: unknown = await response.json();
    if (!isRecord(result) || typeof result.id !== 'string' || result.id.length === 0) {
      return jsonResponse(502, {
        ok: false,
        message: 'Feedback could not be confirmed. Your message is still here; please try again.',
      });
    }
    // Accepted by the email service; this does not guarantee inbox delivery.
    return jsonResponse(202, { ok: true });
  } catch {
    return jsonResponse(502, {
      ok: false,
      message: 'Feedback could not be confirmed. Your message is still here; please try again.',
    });
  }
}
