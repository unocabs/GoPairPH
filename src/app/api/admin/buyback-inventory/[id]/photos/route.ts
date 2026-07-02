import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { ViewType } from '@/types';

const VIEWS = new Set<ViewType>(['top', 'sole', 'front', 'left', 'right', 'back']);
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extension(file: File): string {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: admin } = await supabase.from('profiles').select('id, is_admin').eq('user_id', user.id).single();
  if (!admin?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const viewType = form?.get('view_type');
  const file = form?.get('file');
  if (typeof viewType !== 'string' || !VIEWS.has(viewType as ViewType) || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose a valid listing photo.' }, { status: 400 });
  }
  if (!TYPES.has(file.type) || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image under 8 MB.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: item } = await service.from('buyback_inventory_items').select('id, status').eq('id', params.id).single();
  if (!item || !['ready_to_assign', 'preparing'].includes(item.status)) return NextResponse.json({ error: 'This inventory item cannot be edited.' }, { status: 400 });
  const path = `buyback-inventory/${params.id}/${viewType}-admin-${crypto.randomUUID()}.${extension(file)}`;
  const { error: uploadError } = await service.storage.from('shoe-images').upload(path, new Uint8Array(await file.arrayBuffer()), {
    contentType: file.type, cacheControl: '31536000', upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { data: existing } = await service.from('buyback_inventory_photos').select('*').eq('inventory_id', params.id).eq('view_type', viewType).order('display_order').limit(1).maybeSingle();
  let photo;
  if (existing) {
    const previous = existing.copied_storage_path as string | null;
    const { data, error } = await service.from('buyback_inventory_photos').update({ copied_storage_path: path, copy_status: 'ready', error_message: null }).eq('id', existing.id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    photo = data;
    if (previous?.startsWith(`buyback-inventory/${params.id}/`)) await service.storage.from('shoe-images').remove([previous]);
  } else {
    const { count } = await service.from('buyback_inventory_photos').select('id', { count: 'exact', head: true }).eq('inventory_id', params.id);
    const { data, error } = await service.from('buyback_inventory_photos').insert({
      inventory_id: params.id, source_storage_path: `admin-upload:${crypto.randomUUID()}`, copied_storage_path: path,
      view_type: viewType, display_order: count ?? 0, copy_status: 'ready', error_message: null,
    }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    photo = data;
  }

  const { data: photos } = await service.from('buyback_inventory_photos').select('view_type, copy_status, copied_storage_path').eq('inventory_id', params.id);
  const hasTop = (photos ?? []).some(row => row.view_type === 'top' && row.copy_status === 'ready' && row.copied_storage_path);
  const hasSole = (photos ?? []).some(row => row.view_type === 'sole' && row.copy_status === 'ready' && row.copied_storage_path);
  const photoStatus = hasTop && hasSole ? 'ready' : 'failed';
  const { data: inventory } = await service.from('buyback_inventory_items').update({
    photo_copy_status: photoStatus,
    photo_copy_error: photoStatus === 'ready' ? null : 'Replace any failed photos and confirm clear top and sole views.',
  }).eq('id', params.id).select('*').single();
  await service.from('buyback_inventory_events').insert({ inventory_id: params.id, actor_profile_id: admin.id, event_type: 'inventory_photo_replaced', metadata: { view_type: viewType } });
  return NextResponse.json({ inventory, photo });
}
