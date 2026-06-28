import { NextResponse } from 'next/server';
import { makeAdminNewListingEmailInput, renderAdminNewListingEmail } from '@/lib/email/adminNewListing';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAbsoluteListingUrl } from '@/lib/utils';

export const runtime = 'nodejs';

interface RequestBody {
  listingId?: string;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as RequestBody;
  if (!body.listingId) {
    return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { data: listing, error: listingError } = await service
    .from('shoes')
    .select('*, profiles!shoes_seller_id_fkey(display_name, user_id), shops(name), shoe_images(id), shoe_variants(size_eu, size_us, size_cm, us_size_type, quantity)')
    .eq('id', body.listingId)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listing.seller_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const emails = await getAdminEmails(service);
  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'No admin emails found' });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
  const inStockVariant = Array.isArray(listing.shoe_variants)
    ? listing.shoe_variants.find((variant: { quantity?: number | null }) => (variant.quantity ?? 0) > 0) ?? listing.shoe_variants[0]
    : null;
  const emailInput = makeAdminNewListingEmailInput({
    brand: listing.brand,
    model: listing.model,
    listingUrl: getAbsoluteListingUrl(siteUrl, listing),
    sellerName: listing.profiles?.display_name ?? 'Go Pair PH seller',
    shopName: listing.shops?.name ?? null,
    pricePhp: listing.price_php,
    srpPhp: listing.srp_php,
    listingType: listing.listing_type,
    condition: listing.condition,
    sizeEu: listing.shop_id ? inStockVariant?.size_eu ?? null : listing.size_eu,
    sizeUs: listing.shop_id ? inStockVariant?.size_us ?? null : listing.size_us,
    sizeCm: listing.shop_id ? inStockVariant?.size_cm ?? null : listing.size_cm,
    usSizeType: listing.shop_id ? inStockVariant?.us_size_type ?? null : listing.us_size_type,
    photoCount: Array.isArray(listing.shoe_images) ? listing.shoe_images.length : 0,
    createdAt: listing.created_at,
  });

  const html = renderAdminNewListingEmail(emailInput);
  await sendTransactionalEmail({
    category: 'admin_notification',
    to: emails,
    subject: `New listing: ${emailInput.listingName}`,
    html,
  });

  return NextResponse.json({ sent: emails.length });
}

async function getAdminEmails(service: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const emails = new Set<string>();

  const configured = process.env.ADMIN_NOTIFICATION_EMAILS
    ?.split(',')
    .map(email => email.trim())
    .filter(Boolean) ?? [];
  for (const email of configured) emails.add(email);

  const { data: admins } = await service
    .from('profiles')
    .select('user_id')
    .eq('is_admin', true);

  for (const admin of admins ?? []) {
    const { data } = await service.auth.admin.getUserById(admin.user_id);
    if (data.user?.email) emails.add(data.user.email);
  }

  return Array.from(emails);
}
