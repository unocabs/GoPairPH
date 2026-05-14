import { Resend } from 'resend';

let cached: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email send');
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'Go Pair PH <offers@gopairph.com>';

  const { error } = await client.emails.send({ from, to, subject, html });
  if (error) {
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
}

export const sendOfferEmail = sendEmail;
