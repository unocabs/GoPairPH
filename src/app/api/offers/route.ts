import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { messagingError, sameOrigin, smallJson } from '@/lib/messaging/server';

const bodySchema = z.object({
  listing_id: z.string().uuid(), client_id: z.string().uuid().optional(),
  message: z.string().trim().max(2000).optional().nullable(),
  offer_price_php: z.number().positive().finite().optional().nullable(),
  variant_id: z.string().uuid().optional().nullable(), request_id: z.string().uuid().optional().nullable(),
  version: z.number().int().positive().optional().nullable(),
});
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to send a request.' }, { status: 401 });
  const parsed = bodySchema.safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Please check your request details.' }, { status: 400 });
  const p = parsed.data;
  const { data, error } = await supabase.rpc('marketplace_submit_offer', {
    p_listing: p.listing_id, p_client: p.client_id ?? randomUUID(), p_message: p.message ?? null,
    p_price: p.offer_price_php ?? null, p_variant: p.variant_id ?? null,
    p_request: p.request_id ?? null, p_expected_version: p.version ?? null,
  });
  if (error) return messagingError(error);
  return NextResponse.json({ ok: true, id: data.id, request: data, conversation_id: data.conversation_id });
}
