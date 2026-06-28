import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { feedbackSchema } from '@/lib/validations';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { renderFeedbackEmail } from '@/lib/email/feedback';
import { formatListingName, getAbsoluteListingUrl } from '@/lib/utils';

const FEEDBACK_TO_EMAIL = process.env.FEEDBACK_TO_EMAIL ?? 'rgiancabrera@gmail.com';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');

export async function POST(request: Request) {
  const supabase = createClient();
  const service = createServiceClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const currentUser = authError ? null : user;

  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
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
    user_id: currentUser?.id ?? null,
    profile_id: profile?.id ?? null,
    listing_id: listing?.id ?? null,
    category: parsed.data.category,
    message: parsed.data.message,
    contact_email: parsed.data.contact_email ?? currentUser?.email ?? null,
    page_path: parsed.data.page_path,
  };

  const { error: insertError } = await service.from('feedback_messages').insert(row);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  try {
    await sendTransactionalEmail({
      category: 'feedback',
      to: FEEDBACK_TO_EMAIL,
      subject: `Go Pair PH feedback: ${row.category.replaceAll('_', ' ')}`,
      html: renderFeedbackEmail({
        category: row.category,
        message: row.message,
        contactEmail: row.contact_email,
        profileName: profile?.display_name ?? null,
        listingTitle: listing ? formatListingName(listing.brand, listing.model) : null,
        listingUrl: listing ? getAbsoluteListingUrl(SITE_URL, listing) : null,
        pagePath: row.page_path,
      }),
    });
  } catch (error) {
    console.error('[feedback] email send failed', error);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
