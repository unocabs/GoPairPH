import { NextResponse } from 'next/server';
import { processNotifications } from '@/lib/notifications';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Transactional email is not configured.' }, { status: 503 });
  try { return NextResponse.json(await processNotifications()); }
  catch { return NextResponse.json({ error: 'Could not process notifications.' }, { status: 500 }); }
}
