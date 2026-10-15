import { handleFeedback } from '../../../server/feedback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  // Vercel sets these forwarding headers at its trusted edge; ignore them locally.
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  const trustedClientAddress = process.env.VERCEL === '1'
    ? (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for'))
      ?.split(',')[0]?.trim()
    : undefined;

  return handleFeedback(request, {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FEEDBACK_FROM_EMAIL: process.env.FEEDBACK_FROM_EMAIL,
    FEEDBACK_TO_EMAIL: process.env.FEEDBACK_TO_EMAIL,
  }, trustedClientAddress);
}
