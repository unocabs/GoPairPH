import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ enabled: z.boolean() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid setting.' }, { status: 400 });
  const { data, error } = await supabase.rpc('admin_set_buyback_receiving_shop', {
    p_shop_id: params.id,
    p_enabled: parsed.data.enabled,
  });
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not update the shop.' }, { status: 400 });
  return NextResponse.json({ setting: data });
}
