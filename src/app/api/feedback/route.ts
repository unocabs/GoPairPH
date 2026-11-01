import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { feedbackSchema } from '@/lib/validations';
import { randomUUID } from 'node:crypto';
import { processFeedbackEmails, saveProductFeedback } from '@/lib/feedbackServer';
import { sameOrigin, smallJson } from '@/lib/messaging/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const supabase = createClient();
  const service = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const currentUser = authError ? null : user;

  const parsed = feedbackSchema.safeParse(await smallJson(request).catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid feedback' }, { status: 400 });
  }

  let profile: { id: string; display_name: string | null } | null = null;
  if (currentUser) {
    const { data: profileData } = await service
      .from('profiles')
      .select('id, display_name')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    profile = profileData ?? null;
  }

  let listing: { id: string; slug: string | null; seller_id: string; brand: string; model: string } | null = null;
  if (parsed.data.listing_id) {
    if (!currentUser || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: listingData, error: listingError } = await service
      .from('shoes')
      .select('id, slug, seller_id, brand, model')
      .eq('id', parsed.data.listing_id)
      .single();

    if (listingError || !listingData) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (listingData.seller_id !== profile.id) {
      return NextResponse.json({ error: 'You can only attach feedback to your own listing' }, { status: 403 });
    }
    listing = listingData;
  }

  const row = {
    submission_id: parsed.data.submission_id ?? randomUUID(),
    user_id: currentUser?.id ?? null,
    profile_id: profile?.id ?? null,
    listing_id: listing?.id ?? null,
    category: parsed.data.category,
    message: parsed.data.message,
    contact_email: parsed.data.contact_email ?? currentUser?.email ?? null,
    page_path: parsed.data.page_path,
  };

  const { data: feedbackId, error: insertError } = await saveProductFeedback(request, row, currentUser?.id ?? null, service);
  if (insertError) {
    const limited = insertError.message === 'Please try again later';
    return NextResponse.json({ error: limited ? 'Please wait a little before sending more feedback.' : 'Could not save feedback. Please try again later.' }, { status: limited ? 429 : 503 });
  }

  try {
    await processFeedbackEmails(feedbackId as string, service);
  } catch (error) {
    console.error('[feedback] email send failed', error);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
