export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { renderAdminNewListingEmail } from '@/lib/email/adminNewListing';
import { renderAdminFeaturedProofEmail, renderSellerFeaturedReviewEmail, renderSellerFeaturedSubmittedEmail } from '@/lib/email/featuredPromotion';
import { renderAdminSponsoredProofEmail, renderSellerSponsoredReviewEmail, renderSellerSponsoredSubmittedEmail } from '@/lib/email/sponsoredPromotion';
import { renderFeedbackEmail } from '@/lib/email/feedback';
import { renderListingPublishedEmail } from '@/lib/email/listingPublished';
import { renderListingRenewalEmail } from '@/lib/email/listingRenewal';
import { renderAdminListingViewsReportEmail, renderListingViewLifetimeMilestoneEmail, renderListingViewMilestoneEmail } from '@/lib/email/listingViewEmails';
import { renderDonationRequestEmail, renderOfferEmail, renderRequestStatusChangeEmail, renderSellerNoteEmail, renderShopOrderEmail } from '@/lib/email/offerNotification';
import { renderSavedSearchAlertEmail } from '@/lib/email/savedSearchAlerts';
import { renderWishlistLeadNotificationEmail } from '@/lib/email/wishlistLeadNotification';
import { renderReactivationBlastEmail } from '@/lib/email/reactivationBlast';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) redirect('/');
}

const siteUrl = 'https://gopairph.com';
const listingUrl = `${siteUrl}/listings/sample-alphafly-3`;
const now = new Date().toISOString();

function getSamples() {
  return [
    {
      name: 'Listing published',
      html: renderListingPublishedEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
      }),
    },
    {
      name: 'Listing renewal',
      html: renderListingRenewalEmail({
        sellerName: 'Gian',
        brand: 'Nike',
        model: 'Alphafly 3',
        listingUrl,
        renewUrl: `${listingUrl}?renew=1`,
        updateAndRenewUrl: `${listingUrl}/edit?renew=1`,
      }),
    },
    {
      name: 'Offer notification',
      html: renderOfferEmail({
        seller_name: 'Gian',
        listing_title: 'Nike Alphafly 3',
        shoe_size: 'US M 9',
        condition: 'Good',
        mileage: '80 km',
        offer_amount: '6,500',
        listed_price: '7,000',
        buyer_name: 'Marco',
        buyer_message: 'Available this weekend for meetup?',
        offer_link: `${siteUrl}/profile?tab=requests`,
      }),
    },
    {
      name: 'Shop order',
      html: renderShopOrderEmail({
        shop_name: 'Stride Supply',
        listing_title: 'Adidas Boston 12',
        selected_size: 'US M 9.5',
        listed_price: '4,800',
        buyer_name: 'Ina',
        buyer_message: 'Can you confirm if this size is still available?',
        order_link: `${siteUrl}/shop/dashboard`,
      }),
    },
    {
      name: 'Request accepted',
      html: renderRequestStatusChangeEmail({
        buyer_name: 'Marco',
        listing_title: 'Nike Alphafly 3',
        seller_name: 'Gian',
        status: 'accepted',
        price_label: 'PHP 6,500',
        request_link: `${siteUrl}/profile?tab=sent`,
        messenger_link: null,
        seller_message: 'Meetup works on Saturday afternoon.',
      }),
    },
    {
      name: 'Free Shoes request',
      html: renderDonationRequestEmail({
        donor_name: 'Gian',
        listing_title: 'Brooks Ghost 15',
        shoe_size: 'US M 9',
        condition: 'Good',
        requester_name: 'Paolo',
        requester_message: 'I can pick this up near Clark.',
        request_link: `${siteUrl}/profile?tab=requests`,
      }),
    },
    {
      name: 'Seller note',
      html: renderSellerNoteEmail({
        buyer_name: 'Marco',
        seller_name: 'Gian',
        listing_title: 'Nike Alphafly 3',
        seller_message: 'I can include the original box.',
        request_link: `${siteUrl}/profile?tab=sent`,
      }),
    },
    {
      name: 'Saved search alert',
      html: renderSavedSearchAlertEmail({
        displayName: 'runner',
        browseUrl: `${siteUrl}/browse?size_us=9`,
        manageUrl: `${siteUrl}/profile?tab=saved-searches`,
        matches: [
          {
            searchKeyword: 'daily trainer US 9',
            listingName: 'Asics Novablast 4',
            listingUrl,
            pricePhp: 4200,
            size: 'US M 9',
            condition: 'good',
            location: 'San Fernando, Pampanga',
          },
        ],
      }),
    },
    {
      name: 'Looking For lead',
      html: renderWishlistLeadNotificationEmail({
        requestTitle: 'New Balance 1080v13',
        requestUrl: `${siteUrl}/looking-for?item=sample`,
        leadUrl: 'https://example.com/listing',
        leadPricePhp: 5200,
        leadNote: 'Saw this from a local shop, size looks close.',
        offererName: 'Ana',
        sizeLabel: 'US W 8',
      }),
    },
    {
      name: 'View milestone',
      html: renderListingViewMilestoneEmail({
        sellerName: 'Gian',
        brand: 'Nike',
        model: 'Alphafly 3',
        milestone: 25,
        listingUrl,
      }),
    },
    {
      name: 'Lifetime milestone',
      html: renderListingViewLifetimeMilestoneEmail({
        sellerName: 'Gian',
        brand: 'Nike',
        model: 'Alphafly 3',
        milestone: 100,
        listingUrl,
      }),
    },
    {
      name: 'Featured submitted',
      html: renderSellerFeaturedSubmittedEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
        sellerName: 'Gian',
        durationDays: 7,
        pricePhp: 50,
        scheduledStartAt: now,
        scheduledEndAt: now,
      }),
    },
    {
      name: 'Top Pick approved',
      html: renderSellerSponsoredReviewEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
        sellerName: 'Gian',
        durationDays: 7,
        pricePhp: 50,
        scheduledStartAt: now,
        scheduledEndAt: now,
        approved: true,
        notes: null,
      }),
    },
    {
      name: 'Featured admin proof',
      html: renderAdminFeaturedProofEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
        sellerName: 'Gian',
        durationDays: 7,
        pricePhp: 50,
        scheduledStartAt: now,
        scheduledEndAt: now,
        adminUrl: `${siteUrl}/admin`,
        paymentMethod: 'gcash',
        transactionReference: 'ABC123',
        proofUrl: `${siteUrl}/sample-proof.jpg`,
        queuePosition: 1,
        status: 'pending_review',
        coinsUsed: 0,
        coinDiscountPhp: 0,
        cashAmountPhp: 50,
        paymentMode: 'Cash only',
      }),
    },
    {
      name: 'Top Pick admin proof',
      html: renderAdminSponsoredProofEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
        sellerName: 'Gian',
        durationDays: 7,
        pricePhp: 50,
        scheduledStartAt: now,
        scheduledEndAt: now,
        adminUrl: `${siteUrl}/admin`,
        paymentMethod: 'gcash',
        transactionReference: 'XYZ789',
        proofUrl: `${siteUrl}/sample-proof.jpg`,
        status: 'pending_review',
      }),
    },
    {
      name: 'Featured approved',
      html: renderSellerFeaturedReviewEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
        sellerName: 'Gian',
        durationDays: 7,
        pricePhp: 50,
        scheduledStartAt: now,
        scheduledEndAt: now,
        approved: true,
        notes: null,
      }),
    },
    {
      name: 'Top Pick submitted',
      html: renderSellerSponsoredSubmittedEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
        sellerName: 'Gian',
        durationDays: 7,
        pricePhp: 50,
        scheduledStartAt: now,
        scheduledEndAt: now,
      }),
    },
    {
      name: 'Marketing reactivation',
      html: renderReactivationBlastEmail({
        recipientName: 'Gian',
        siteUrl,
        unsubscribeUrl: `${siteUrl}/api/email/unsubscribe/sample`,
      }),
    },
    {
      name: 'Admin new listing',
      html: renderAdminNewListingEmail({
        listingName: 'Nike Alphafly 3',
        listingUrl,
        sellerName: 'Gian',
        shopName: 'Stride Supply',
        pricePhp: 7000,
        srpPhp: 16995,
        listingType: 'for_sale',
        condition: 'good',
        sizeLabel: 'US M 9',
        photoCount: 5,
        createdAt: now,
      }),
    },
    {
      name: 'Admin feedback',
      html: renderFeedbackEmail({
        category: 'suggestion',
        message: 'It would help if sellers could save listing drafts.',
        contactEmail: 'runner@example.com',
        profileName: 'Gian',
        listingTitle: 'Nike Alphafly 3',
        listingUrl,
        pagePath: '/listings/new',
      }),
    },
    {
      name: 'Admin listing views report',
      html: renderAdminListingViewsReportEmail({
        windowStart: 'June 24, 2026',
        windowEnd: 'June 30, 2026',
        totalViews: 248,
        listings: [
          {
            listingName: 'Nike Alphafly 3',
            listingUrl,
            sellerName: 'Gian',
            shopName: 'Stride Supply',
            totalViews: 72,
            dailyViews: [
              { date: '2026-06-29', views: 31 },
              { date: '2026-06-30', views: 41 },
            ],
          },
        ],
      }),
    },
  ];
}

export default async function EmailPreviewPage() {
  await requireAdmin();
  const samples = getSamples();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-100">Email previews</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
          Representative renders for Go Pair PH transactional and marketing emails.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {samples.map(sample => (
          <section key={sample.name} className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
            <div className="border-b border-gray-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-100">{sample.name}</h2>
            </div>
            <iframe
              title={sample.name}
              srcDoc={sample.html}
              className="h-[640px] w-full bg-white"
              sandbox=""
            />
          </section>
        ))}
      </div>
    </div>
  );
}
