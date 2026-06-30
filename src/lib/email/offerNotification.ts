import { escapeHtml, paragraph, renderButton, renderCallout, renderEmailShell, renderInfoRows } from '@/lib/email/template';

interface OfferEmailData {
  seller_name: string;
  listing_title: string;
  shoe_size: string;
  condition: string;
  mileage: string;
  offer_amount: string;
  listed_price: string;
  buyer_name: string;
  buyer_message: string | null;
  offer_link: string;
}

interface ShopOrderEmailData {
  shop_name: string;
  listing_title: string;
  selected_size: string;
  listed_price: string;
  buyer_name: string;
  buyer_message: string | null;
  order_link: string;
}

interface DonationRequestEmailData {
  donor_name: string;
  listing_title: string;
  shoe_size: string;
  condition: string;
  requester_name: string;
  requester_message: string | null;
  request_link: string;
}

interface RequestStatusChangeEmailData {
  buyer_name: string;
  listing_title: string;
  seller_name: string;
  status: 'accepted' | 'declined';
  price_label: string;
  request_link: string;
  messenger_link: string | null;
  seller_message?: string | null;
}

interface SellerNoteEmailData {
  buyer_name: string;
  seller_name: string;
  listing_title: string;
  seller_message: string;
  request_link: string;
}

function messageCallout(label: string, message: string | null): string {
  if (!message) return '';
  return renderCallout(label, `"${escapeHtml(message)}"`);
}

export function renderOfferEmail(data: OfferEmailData): string {
  return renderEmailShell({
    title: 'New offer on your listing',
    preheader: `${data.buyer_name} sent an offer for ${data.listing_title}.`,
    footerReason: 'You are receiving this because you have an active listing on Go Pair PH.',
    children: `
      ${paragraph(`Hi ${escapeHtml(data.seller_name)}, someone sent an offer for your <strong>${escapeHtml(data.listing_title)}</strong> listing.`)}
      ${paragraph('Review the offer details in your dashboard before coordinating next steps. Clear listing details help buyers decide faster, but you still control the final sale.')}
      ${renderInfoRows([
        { label: 'Listing', value: data.listing_title },
        { label: 'Size', value: data.shoe_size },
        { label: 'Condition', value: data.condition },
        { label: 'Mileage', value: data.mileage },
        { label: 'Offer', value: `PHP ${data.offer_amount}` },
        { label: 'Listed price', value: `PHP ${data.listed_price}` },
        { label: 'Buyer', value: data.buyer_name },
      ])}
      ${messageCallout('Buyer message', data.buyer_message)}
      <p style="margin:22px 0 0;">${renderButton(data.offer_link, 'Review offer')}</p>
    `,
  });
}

export function renderShopOrderEmail(data: ShopOrderEmailData): string {
  return renderEmailShell({
    title: 'New shop order',
    preheader: `A buyer placed an order from ${data.shop_name}.`,
    footerReason: 'You are receiving this because your shop has an active listing on Go Pair PH.',
    children: `
      ${paragraph(`A buyer placed an order from <strong>${escapeHtml(data.shop_name)}</strong>. Confirm availability before asking for payment or arranging delivery.`)}
      ${paragraph('After the order is fulfilled, mark the sale complete in Go Pair PH so your stock stays accurate.')}
      ${renderInfoRows([
        { label: 'Listing', value: data.listing_title },
        { label: 'Selected size', value: data.selected_size },
        { label: 'Price', value: `PHP ${data.listed_price}` },
        { label: 'Buyer', value: data.buyer_name },
      ])}
      ${messageCallout('Buyer note', data.buyer_message)}
      ${renderCallout('Safety note', 'Ask buyers to send payment only after you confirm order details directly. Keep screenshots of payment and delivery conversations for your records.')}
      <p style="margin:22px 0 0;">${renderButton(data.order_link, 'Review order')}</p>
    `,
  });
}

export function renderDonationRequestEmail(data: DonationRequestEmailData): string {
  return renderEmailShell({
    title: 'Someone requested your free shoes',
    preheader: `${data.requester_name} asked to claim ${data.listing_title}.`,
    footerReason: 'You are receiving this because your Go Pair PH listing is set to Free Shoes.',
    children: `
      ${paragraph(`Hi ${escapeHtml(data.donor_name)}, a runner asked to claim the running shoes you are giving away.`)}
      ${renderInfoRows([
        { label: 'Listing', value: data.listing_title },
        { label: 'Size', value: data.shoe_size },
        { label: 'Condition', value: data.condition },
        { label: 'Requested by', value: data.requester_name },
      ])}
      ${messageCallout('Requester message', data.requester_message)}
      <p style="margin:22px 0 0;">${renderButton(data.request_link, 'View request')}</p>
    `,
  });
}

export function renderRequestStatusChangeEmail(data: RequestStatusChangeEmailData): string {
  const accepted = data.status === 'accepted';
  const ctaLabel = accepted && data.messenger_link ? `Contact ${data.seller_name}` : 'View request';
  const ctaHref = accepted && data.messenger_link ? data.messenger_link : data.request_link;

  return renderEmailShell({
    title: accepted ? 'Your request was accepted' : 'Your request was declined',
    preheader: accepted
      ? `${data.seller_name} accepted your request for ${data.listing_title}.`
      : `${data.seller_name} declined your request for ${data.listing_title}.`,
    footerReason: 'You are receiving this because you have an active request on Go Pair PH.',
    children: `
      ${accepted
        ? paragraph(`Hi ${escapeHtml(data.buyer_name)}, <strong>${escapeHtml(data.seller_name)}</strong> accepted your request. Coordinate meetup, shipping, or delivery directly with the seller.`)
        : paragraph(`Hi ${escapeHtml(data.buyer_name)}, <strong>${escapeHtml(data.seller_name)}</strong> declined your request. You can keep browsing running shoes on Go Pair PH.`)}
      ${renderInfoRows([
        { label: 'Listing', value: data.listing_title },
        { label: 'Price', value: data.price_label },
        { label: 'Seller', value: data.seller_name },
      ])}
      ${data.seller_message ? renderCallout('Seller note', escapeHtml(data.seller_message)) : ''}
      <p style="margin:22px 0 0;">${renderButton(ctaHref, ctaLabel)}</p>
    `,
  });
}

export function renderSellerNoteEmail(data: SellerNoteEmailData): string {
  return renderEmailShell({
    title: 'Seller added a note',
    preheader: `${data.seller_name} added a note to your Go Pair PH offer.`,
    footerReason: 'You are receiving this because you sent an offer on Go Pair PH.',
    children: `
      ${paragraph(`Hi ${escapeHtml(data.buyer_name)}, <strong>${escapeHtml(data.seller_name)}</strong> added a one-time note to your offer. This is not a chat thread, so check the offer status on Go Pair PH.`)}
      ${renderInfoRows([
        { label: 'Listing', value: data.listing_title },
        { label: 'Seller', value: data.seller_name },
      ])}
      ${renderCallout('Seller note', escapeHtml(data.seller_message))}
      <p style="margin:22px 0 0;">${renderButton(data.request_link, 'View request')}</p>
    `,
  });
}
