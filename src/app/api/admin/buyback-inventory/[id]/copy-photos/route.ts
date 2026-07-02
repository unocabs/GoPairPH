import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { copyBuybackInventoryPhotos } from '@/lib/buybackInventory';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: admin } = await supabase.from('profiles').select('id, is_admin').eq('user_id', user.id).single();
  if (!admin?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const inventory = await copyBuybackInventoryPhotos(params.id, admin.id);
  if (!inventory) return NextResponse.json({ error: 'Inventory item not found.' }, { status: 404 });
  return NextResponse.json({ inventory }, { status: inventory.photo_copy_status === 'ready' ? 200 : 409 });
}
