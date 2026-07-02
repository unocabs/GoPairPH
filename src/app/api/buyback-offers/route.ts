import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { calculateBuybackQuote, buildBuybackProofCode, getBuybackShipDateBounds } from '@/lib/pricing/buyback';
import { toSellerBuybackOffer } from '@/lib/buyback';
import { formatListingName, formatPrice, getListingPath } from '@/lib/utils';
import { renderBuybackSellerSubmittedEmail, renderBuybackSubmittedEmail } from '@/lib/email/buybackOffer';
import { sendTransactionalEmail } from '@/lib/email/resend';
import type { BuybackOffer, BuybackProofKind, Shoe } from '@/types';

export const runtime = 'nodejs';

const REQUIRED_FILES: BuybackProofKind[] = ['receipt'];
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function textValue(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function boolValue(form: FormData, key: string): boolean {
  return textValue(form, key) === 'true';
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to send an offer.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });

  const listingId = textValue(form, 'listing_id');
  const purchaseDate = textValue(form, 'purchase_date');
  const proposedShipDate = textValue(form, 'proposed_ship_date');
  const hasBox = boolValue(form, 'has_box');
  const hasVisibleFlaws = boolValue(form, 'has_visible_flaws');
  const flawNotes = textValue(form, 'flaw_notes').slice(0, 1000) || null;
  const sellerNote = textValue(form, 'seller_note').slice(0, 1000) || null;
  const ownsShoes = boolValue(form, 'ack_ownership');
  const authentic = boolValue(form, 'ack_authenticity');
  const accurate = boolValue(form, 'ack_accuracy');
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) {
    return NextResponse.json({ error: 'Check the listing and try again.' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) || !/^\d{4}-\d{2}-\d{2}$/.test(proposedShipDate)) {
    return NextResponse.json({ error: 'Add valid purchase and shipping dates.' }, { status: 400 });
  }
  const today = new Date();
  const purchaseTime = new Date(`${purchaseDate}T00:00:00+08:00`).getTime();
  if (!Number.isFinite(purchaseTime) || purchaseTime > today.getTime()) {
    return NextResponse.json({ error: 'Purchase date cannot be in the future.' }, { status: 400 });
  }
  const bounds = getBuybackShipDateBounds(today);
  if (proposedShipDate < bounds.min || proposedShipDate > bounds.max) {
    return NextResponse.json({ error: `Choose a shipping date from ${bounds.min} to ${bounds.max}.` }, { status: 400 });
  }
  if (!ownsShoes || !authentic || !accurate) {
    return NextResponse.json({ error: 'Confirm all seller declarations.' }, { status: 400 });
  }
  if (hasVisibleFlaws && !flawNotes) {
    return NextResponse.json({ error: 'Describe the visible flaws.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: profile } = await service.from('profiles').select('id, display_name, is_verified').eq('user_id', user.id).single();
  if (!profile?.is_verified) return NextResponse.json({ error: 'Profile verification is required.' }, { status: 403 });

  const { data: listingData } = await service
    .from('shoes')
    .select('*, shoe_images(*)')
    .eq('id', listingId)
    .single();
  const listing = listingData as Shoe | null;
  if (!listing || listing.seller_id !== profile.id || listing.status !== 'active' || listing.listing_type !== 'for_sale' || listing.shop_id) {
    return NextResponse.json({ error: 'This listing is not eligible for buyback.' }, { status: 400 });
  }
  if (listing.srp_php == null || Number(listing.srp_php) <= 0 || listing.price_php == null || Number(listing.price_php) <= 0) {
    return NextResponse.json({ error: 'Add the original price before requesting a quote.' }, { status: 400 });
  }
  const hasTop = listing.shoe_images?.some(image => image.view_type === 'top');
  const hasSole = listing.shoe_images?.some(image => image.view_type === 'sole');
  if (!hasTop || !hasSole) return NextResponse.json({ error: 'Clear top and sole listing photos are required.' }, { status: 400 });

  const [{ count: acceptedBuyerCount }, { data: active }, { count: attempts }] = await Promise.all([
    service.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('listing_id', listingId).eq('status', 'accepted'),
    service.from('buyback_offers').select('id').eq('listing_id', listingId).in('status', ['pending', 'accepted', 'shipped', 'delivered', 'disputed']).maybeSingle(),
    service.from('buyback_offers').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
  ]);
  if ((acceptedBuyerCount ?? 0) > 0) return NextResponse.json({ error: 'This listing already has an accepted buyer transaction.' }, { status: 400 });
  if (active) return NextResponse.json({ error: 'This listing already has an active buyback request.' }, { status: 409 });

  const files = new Map<BuybackProofKind, File>();
  for (const kind of REQUIRED_FILES) {
    const value = form.get(kind);
    if (!(value instanceof File) || value.size === 0) {
      return NextResponse.json({ error: `Upload the required ${kind.replaceAll('_', ' ')} file.` }, { status: 400 });
    }
    if (!ACCEPTED_TYPES.has(value.type) || value.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${kind.replaceAll('_', ' ')} must be a JPG, PNG, WebP, or PDF under 8 MB.` }, { status: 400 });
    }
    files.set(kind, value);
  }

  const quote = calculateBuybackQuote({
    originalPricePhp: Number(listing.srp_php),
    listingPricePhp: Number(listing.price_php),
    purchaseDate,
    condition: listing.condition,
    mileageKm: listing.mileage_km,
    hasBox,
    hasVisibleFlaws,
  });
  if (!quote.eligible) return NextResponse.json({ error: 'This request falls below the current ₱500 minimum buyback quote.' }, { status: 400 });

  const offerId = crypto.randomUUID();
  const proofCode = buildBuybackProofCode(listingId);
  const uploadedPaths: string[] = [];
  const proofRows: Array<Record<string, string>> = [];
  try {
    for (const [kind, file] of Array.from(files.entries())) {
      const path = `${profile.id}/${offerId}/${kind}.${fileExtension(file)}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error } = await service.storage.from('buyback-proofs').upload(path, bytes, { contentType: file.type, upsert: false });
      if (error) throw error;
      uploadedPaths.push(path);
      proofRows.push({ offer_id: offerId, kind, storage_path: path, original_name: file.name, mime_type: file.type });
    }

    const { data: inserted, error: insertError } = await service.from('buyback_offers').insert({
      id: offerId,
      listing_id: listingId,
      seller_id: profile.id,
      attempt_number: (attempts ?? 0) + 1,
      original_price_php: Number(listing.srp_php),
      purchase_date: purchaseDate,
      has_box: hasBox,
      has_visible_flaws: hasVisibleFlaws,
      flaw_notes: flawNotes,
      seller_note: sellerNote,
      proposed_ship_date: proposedShipDate,
      retail_basis_php: quote.retailBasisPhp,
      fast_sale_estimate_php: quote.fastSaleEstimatePhp,
      quoted_price_php: quote.quotedPricePhp,
      pricing_version: quote.pricingVersion,
      pricing_snapshot: quote.snapshot,
      proof_code: proofCode,
      acknowledgements: { ownership: ownsShoes, authenticity: authentic, accuracy: accurate },
    }).select('*').single();
    if (insertError || !inserted) throw insertError ?? new Error('Could not save the offer.');
    const { error: proofError } = await service.from('buyback_offer_proofs').insert(proofRows);
    if (proofError) throw proofError;
    await service.from('buyback_offer_events').insert({ offer_id: offerId, actor_profile_id: profile.id, event_type: 'submitted' });

    try {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com').replace(/\/$/, '');
      const listingTitle = formatListingName(listing.brand, listing.model);
      const listingUrl = `${siteUrl}${getListingPath(listing)}`;
      const attemptNumber = (attempts ?? 0) + 1;
      if (user.email) {
        await sendTransactionalEmail({
          category: 'buyback_offer',
          to: user.email,
          subject: `We received your Go Pair PH offer — ${listingTitle}`,
          html: renderBuybackSellerSubmittedEmail({
            sellerName: profile.display_name,
            listingTitle,
            quoteLabel: formatPrice(quote.quotedPricePhp),
            attemptNumber,
            proposedShipDate,
            listingUrl,
          }),
        });
      }
      const { data: admins } = await service.from('profiles').select('user_id').eq('is_admin', true);
      const adminEmails: string[] = [];
      for (const admin of admins ?? []) {
        const { data } = await service.auth.admin.getUserById(admin.user_id);
        if (data.user?.email) adminEmails.push(data.user.email);
      }
      if (adminEmails.length > 0) {
        await sendTransactionalEmail({
          category: 'buyback_offer',
          to: adminEmails,
          subject: `New buyback request: ${listingTitle}`,
          html: renderBuybackSubmittedEmail({
            sellerName: profile.display_name,
            listingTitle,
            quoteLabel: formatPrice(quote.quotedPricePhp),
            attemptNumber,
            listingUrl,
            adminUrl: `${siteUrl}/admin?tab=buyback`,
          }),
        });
      }
    } catch (emailError) {
      console.error('[buyback] admin email failed:', emailError);
    }

    return NextResponse.json({ offer: toSellerBuybackOffer(inserted as BuybackOffer) }, { status: 201 });
  } catch (error) {
    if (uploadedPaths.length > 0) await service.storage.from('buyback-proofs').remove(uploadedPaths);
    await service.from('buyback_offers').delete().eq('id', offerId);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not submit the offer.' }, { status: 400 });
  }
}
