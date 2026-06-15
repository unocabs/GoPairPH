import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const reportSchema = z.object({
  reason: z.enum([
    'misleading_photos',
    'suspicious_or_scam',
    'already_sold',
    'wrong_price_or_details',
    'seller_unreachable',
    'duplicate_or_spam',
    'other',
  ]),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: { listingId: string } }) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid report' }, { status: 400 });
  }

  const supabase = createClient();
  const service = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  let reporterId: string | null = null;
  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    reporterId = profile?.id ?? null;
  }

  const { data: listing } = await service
    .from('shoes')
    .select('id')
    .eq('id', params.listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const { error } = await service.from('listing_reports').insert({
    listing_id: params.listingId,
    reason: parsed.data.reason,
    note: parsed.data.note ? parsed.data.note : null,
    reporter_id: reporterId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
