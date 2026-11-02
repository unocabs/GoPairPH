import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sameOrigin, smallJson } from '@/lib/messaging/server';

export async function POST(request: Request, { params }: { params: { listingId: string } }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!z.string().uuid().safeParse(params.listingId).success) return NextResponse.json({ error: 'Invalid listing.' }, { status: 400 });
  const body = z.object({ action: z.enum(['appeal', 'flag', 'approve', 'keep_flagged']), note: z.string().trim().max(1000).default('') })
    .safeParse(await smallJson(request).catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Check your review and try again.' }, { status: 400 });
  const client = createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });
  // Ownership and admin authorization are enforced again inside the RPC.
  const { error } = await client.rpc('review_running_shoe', { p_listing: params.listingId, p_action: body.data.action, p_note: body.data.note });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  for (const tag of ['homepage-listings', 'homepage-featured-listing', 'homepage-recently-sold-listings']) revalidateTag(tag);
  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath('/listings/[id]', 'page');
  return NextResponse.json({ ok: true });
}
