import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: admin } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
  if (!admin?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const { data, error } = await supabase.rpc('admin_publish_buyback_inventory', { p_inventory_id: params.id });
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not publish the listing.' }, { status: 400 });
  return NextResponse.json({ inventory: data });
}
