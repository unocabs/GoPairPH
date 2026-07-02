import { createServiceClient } from '@/lib/supabase/server';
import type { BuybackInventoryItem, BuybackInventoryPhoto, Condition } from '@/types';

const CONDITION_LABELS: Record<Condition, string> = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
};

function ageLabel(purchaseDate: string | null): string {
  if (!purchaseDate) return 'Not confirmed';
  const purchased = new Date(`${purchaseDate}T00:00:00+08:00`).getTime();
  if (!Number.isFinite(purchased)) return 'Not confirmed';
  const days = Math.max(0, Math.floor((Date.now() - purchased) / 86_400_000));
  if (days < 90) return 'Under 3 months';
  if (days < 365) return '3-12 months';
  if (days < 730) return '1-2 years';
  return 'Over 2 years';
}

function usageLabel(mileage: unknown): string {
  const value = Number(mileage);
  if (!Number.isFinite(value)) return 'Not tracked';
  if (value === 0) return 'Unused';
  return `${Math.max(0, Math.round(value)).toLocaleString('en-PH')} km`;
}

function peso(value: unknown): string {
  const number = Number(value);
  return `PHP ${Number.isFinite(number) ? Math.round(number).toLocaleString('en-PH') : '—'}`;
}

export function buildBuybackRelistDescription(snapshot: Record<string, unknown>): string {
  const condition = snapshot.condition as Condition;
  return [
    `Original retail price: ${peso(snapshot.srp_php)}`,
    `Condition: ${CONDITION_LABELS[condition] ?? 'Not confirmed'}`,
    `Usage: ${usageLabel(snapshot.mileage_km)}`,
    `Age: ${ageLabel(typeof snapshot.purchase_date === 'string' ? snapshot.purchase_date : null)}`,
    `Box included: ${snapshot.has_box === true ? 'Yes' : 'No'}`,
    `Receipt/proof available: ${snapshot.has_receipt === true ? 'Yes' : 'No'}`,
    '',
    'Go Pair PH inspection notes:',
  ].join('\n');
}

function extension(path: string): string {
  const value = path.split('.').pop()?.toLowerCase();
  return value && /^[a-z0-9]{2,5}$/.test(value) ? value : 'webp';
}

export async function copyBuybackInventoryPhotos(inventoryId: string, actorProfileId: string | null): Promise<BuybackInventoryItem | null> {
  const service = createServiceClient();
  const { data: itemData } = await service.from('buyback_inventory_items').select('*').eq('id', inventoryId).maybeSingle();
  if (!itemData) return null;

  const { data: photoData } = await service
    .from('buyback_inventory_photos')
    .select('*')
    .eq('inventory_id', inventoryId)
    .order('display_order');
  const photos = (photoData ?? []) as BuybackInventoryPhoto[];
  if (photos.length === 0) {
    const { data } = await service.from('buyback_inventory_items').update({
      photo_copy_status: 'failed',
      photo_copy_error: 'The source listing has no photos to copy.',
    }).eq('id', inventoryId).select('*').single();
    return data as BuybackInventoryItem;
  }

  await service.from('buyback_inventory_items').update({ photo_copy_status: 'copying', photo_copy_error: null }).eq('id', inventoryId);
  const failures: string[] = [];

  for (const photo of photos) {
    if (photo.copy_status === 'ready' && photo.copied_storage_path) continue;
    const target = `buyback-inventory/${inventoryId}/${photo.view_type}-${photo.id}.${extension(photo.source_storage_path)}`;
    const { error } = await service.storage.from('shoe-images').copy(photo.source_storage_path, target);
    const duplicate = error && /already exists|duplicate/i.test(error.message);
    if (error && !duplicate) {
      failures.push(`${photo.view_type}: ${error.message}`);
      await service.from('buyback_inventory_photos').update({ copy_status: 'failed', error_message: error.message }).eq('id', photo.id);
    } else {
      await service.from('buyback_inventory_photos').update({
        copied_storage_path: target,
        copy_status: 'ready',
        error_message: null,
      }).eq('id', photo.id);
    }
  }

  const { data: refreshedPhotos } = await service
    .from('buyback_inventory_photos')
    .select('view_type, copy_status, copied_storage_path')
    .eq('inventory_id', inventoryId);
  const ready = refreshedPhotos ?? [];
  const hasTop = ready.some(photo => photo.view_type === 'top' && photo.copy_status === 'ready');
  const hasSole = ready.some(photo => photo.view_type === 'sole' && photo.copy_status === 'ready');
  const status = hasTop && hasSole ? 'ready' : 'failed';
  const errorMessage = status === 'ready'
    ? failures.length > 0 ? `Optional photo warning: ${failures.join(' | ')}` : null
    : failures.join(' | ') || 'Clear top and sole photos are required before publishing.';

  const { data: updated } = await service.from('buyback_inventory_items').update({
    photo_copy_status: status,
    photo_copy_error: errorMessage,
  }).eq('id', inventoryId).select('*').single();

  await service.from('buyback_inventory_events').insert({
    inventory_id: inventoryId,
    actor_profile_id: actorProfileId,
    event_type: status === 'ready' ? 'photos_copied' : 'photo_copy_failed',
    note: errorMessage,
    metadata: { photo_count: ready.length },
  });
  return updated as BuybackInventoryItem;
}
