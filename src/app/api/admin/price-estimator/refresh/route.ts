import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchRetailOffer,
  type RetailSource,
} from '@/lib/pricing/retailImport';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const service = createServiceClient();
  const claimed = await service.rpc('claim_estimator_sources');
  if (claimed.error)
    return NextResponse.json(
      { error: 'Could not claim reference sources.' },
      { status: 503 },
    );
  const results = await Promise.all(
    (claimed.data ?? []).map(async (source: RetailSource) => {
      try {
        const offer = await fetchRetailOffer(source);
        const inserted = await service
          .from('estimator_retail_references')
          .insert({
            source_id: source.id,
            model_id: source.model_id,
            source_url: source.url,
            source_name: source.source_name,
            variant: source.variant,
            regular_price_php: offer.price,
            price_php: offer.price,
            observed_at: new Date().toISOString(),
            valid_until: offer.validUntil,
            availability: offer.availability,
            published: false,
            method: 'json_ld',
          });
        if (inserted.error) throw Error('Could not stage retail reference.');
        const updated = await service
          .from('estimator_sources')
          .update({
            lease_until: null,
            last_success_at: new Date().toISOString(),
            last_error: null,
            next_due_at: new Date(
              Date.UTC(
                new Date().getUTCFullYear(),
                new Date().getUTCMonth() + 1,
                1,
                1,
              ),
            ).toISOString(),
          })
          .eq('id', source.id)
          .eq('lease_until', source.lease_until);
        if (updated.error) throw Error('Could not finish source refresh.');
        return { id: source.id, status: 'staged_for_review' };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'Refresh failed.';
        await service
          .from('estimator_sources')
          .update({
            lease_until: null,
            last_error: message.slice(0, 250),
            next_due_at: new Date(Date.now() + 86400000).toISOString(),
          })
          .eq('id', source.id)
          .eq('lease_until', source.lease_until);
        return { id: source.id, status: 'manual_review_needed' };
      }
    }),
  );
  return NextResponse.json({ results });
}
