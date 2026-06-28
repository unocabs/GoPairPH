import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyMarketingUnsubscribeToken } from '@/lib/email/unsubscribe';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const result = await unsubscribe(params.token);
  const title = result.ok ? 'You are unsubscribed' : 'This unsubscribe link is invalid';
  const message = result.ok
    ? 'You will no longer receive promotional Go Pair PH emails. Essential marketplace notifications are unchanged.'
    : 'This link could not be verified. You can still update email preferences from your Go Pair PH profile.';

  return new NextResponse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#020617;color:#e2e8f0;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:20px;box-sizing:border-box">
  <main style="width:100%;max-width:520px;border:1px solid #1e293b;border-radius:18px;background:#0f172a;padding:28px;box-sizing:border-box">
    <p style="margin:0 0 10px;color:#5eead4;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Go Pair PH</p>
    <h1 style="margin:0;font-size:26px;line-height:1.25">${title}</h1>
    <p style="margin:14px 0 0;color:#94a3b8;line-height:1.65">${message}</p>
    <a href="https://gopairph.com/profile" style="display:inline-block;margin-top:22px;color:#5eead4;font-weight:700">Open your profile</a>
  </main>
</body></html>`, {
    status: result.ok ? 200 : 400,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function POST(_request: Request, { params }: { params: { token: string } }) {
  const result = await unsubscribe(params.token);
  return new NextResponse(null, { status: result.ok ? 200 : 400 });
}

async function unsubscribe(token: string): Promise<{ ok: boolean }> {
  let payload;
  try {
    payload = verifyMarketingUnsubscribeToken(token);
  } catch (error) {
    console.error('[email-unsubscribe] configuration error', error);
    return { ok: false };
  }
  if (!payload) return { ok: false };

  const service = createServiceClient();
  const { data: authData, error: authError } = await service.auth.admin.getUserById(payload.userId);
  if (authError || authData.user?.email?.trim().toLowerCase() !== payload.email) return { ok: false };

  const { error } = await service
    .from('profiles')
    .update({
      marketing_email_enabled: false,
      marketing_email_unsubscribed_at: new Date().toISOString(),
    })
    .eq('user_id', payload.userId);

  if (error) {
    console.error('[email-unsubscribe] profile update failed', error);
    return { ok: false };
  }
  return { ok: true };
}
