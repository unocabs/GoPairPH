import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const service = createServiceClient();
  if (!cronAuthorized(request)) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { data: expired, error } = await service.rpc('reconcile_expired_buyback_offers');
  if (error) return NextResponse.json({ error: 'Could not reconcile buyback offers.' }, { status: 500 });
  const { data: queued, error: queueError } = await service.rpc('queue_buyback_shipping_reminders');
  if (queueError) return NextResponse.json({ error: 'Could not queue shipping reminders.' }, { status: 500 });
  return NextResponse.json({ expired: Number(expired ?? 0), remindersQueued: Number(queued ?? 0) });
}
