import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { buildBuybackRelistDescription } from '@/lib/buybackInventory';

const schema = z.object({
  shop_id: z.string().uuid(),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  color: z.string().trim().min(1).max(120),
  price_php: z.number().positive(),
  srp_php: z.number().positive(),
  size_eu: z.number().positive(),
  size_us: z.number().positive().nullable(),
  size_cm: z.number().positive().nullable(),
  us_size_type: z.enum(['mens', 'womens', 'unisex', 'unknown']),
  condition: z.enum(['new', 'like_new', 'good', 'fair']),
  mileage_km: z.number().nonnegative().nullable(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  has_box: z.boolean(),
  has_receipt: z.boolean(),
  description: z.string().trim().max(3000).optional(),
  listed_in_main_feed: z.boolean().default(true),
  photos_confirmed: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: admin } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
  if (!admin?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the relisting details.' }, { status: 400 });

  const snapshot = {
    ...parsed.data,
    description: parsed.data.description || buildBuybackRelistDescription(parsed.data),
  };
  const { data, error } = await supabase.rpc('admin_assign_buyback_inventory', {
    p_inventory_id: params.id,
    p_shop_id: parsed.data.shop_id,
    p_relist_snapshot: snapshot,
  });
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not save the relisting draft.' }, { status: 400 });
  return NextResponse.json({ inventory: data });
}
