import { escapeHtml, paragraph, renderButton, renderCallout, renderEmailShell, renderInfoRows } from './template';

interface BuybackBase {
  sellerName: string;
  listingTitle: string;
  quoteLabel: string;
  listingUrl: string;
}

export function renderBuybackSubmittedEmail(data: BuybackBase & { attemptNumber: number; adminUrl: string }): string {
  return renderEmailShell({
    eyebrow: 'Buyback request',
    title: `New buyback request: ${data.listingTitle}`,
    preheader: `${data.sellerName} submitted a ${data.quoteLabel} buyback request.`,
    children: `
      ${paragraph(`<strong style="color:#f8fafc">${escapeHtml(data.sellerName)}</strong> submitted a direct-sale request for review.`)}
      ${renderInfoRows([
        { label: 'Automatic quote', value: data.quoteLabel },
        { label: 'Attempt', value: `#${data.attemptNumber}` },
      ])}
      <div style="margin-top:20px">${renderButton(data.adminUrl, 'Review buyback request')}</div>
    `,
  });
}

export function renderBuybackSellerSubmittedEmail(data: BuybackBase & { attemptNumber: number; proposedShipDate: string }): string {
  return renderEmailShell({
    eyebrow: 'Offer received',
    title: 'We received your Go Pair PH offer',
    preheader: `Your ${data.quoteLabel} offer for ${data.listingTitle} is under review.`,
    children: `
      ${paragraph(`We received your direct-sale request for <strong style="color:#f8fafc">${escapeHtml(data.listingTitle)}</strong>. Go Pair PH will review your receipt, listing details, and proof photos before making a decision.`)}
      ${renderInfoRows([
        { label: 'Automatic quote', value: data.quoteLabel },
        { label: 'Attempt', value: `#${data.attemptNumber}` },
        { label: 'Proposed send date', value: data.proposedShipDate },
      ])}
      ${renderCallout('What happens next', 'If accepted, your listing becomes Reserved and we will email the confirmed shipping date plus recipient details. J&T COD booking starts only after acceptance.')}
      <div style="margin-top:20px">${renderButton(data.listingUrl, 'Open your listing')}</div>
    `,
    footerReason: 'You received this because you sent a buyback request to Go Pair PH.',
  });
}

export function renderBuybackAcceptedEmail(data: BuybackBase & {
  shipDate: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  adminNote?: string | null;
}): string {
  return renderEmailShell({
    eyebrow: 'Offer accepted',
    title: `Your Go Pair PH offer was accepted`,
    preheader: `Shipping details for ${data.listingTitle}.`,
    children: `
      ${paragraph(`Your offer for <strong style="color:#f8fafc">${escapeHtml(data.listingTitle)}</strong> has been accepted. Your listing is now reserved.`)}
      ${renderInfoRows([
        { label: 'J&T COD amount', value: data.quoteLabel },
        { label: 'Confirmed send date', value: data.shipDate },
        { label: 'Recipient', value: data.recipientName },
        { label: 'Phone', value: data.recipientPhone },
        { label: 'Address', value: data.recipientAddress },
      ])}
      ${renderCallout('J&T COD instructions', `Book the shipment using the exact COD amount of <strong>${escapeHtml(data.quoteLabel)}</strong>. You shoulder the shipping fee. Pack the exact shoes and receipt shown in your request, keep your waybill, and submit the tracking number on your listing.`)}
      ${data.adminNote ? renderCallout('Note from Go Pair PH', escapeHtml(data.adminNote)) : ''}
      <div style="margin-top:20px">${renderButton(data.listingUrl, 'Open your listing')}</div>
    `,
    footerReason: 'You received this because you sent a buyback request to Go Pair PH.',
  });
}

export function renderBuybackDeclinedEmail(data: BuybackBase & { reason: string; adminNote: string }): string {
  return renderEmailShell({
    eyebrow: 'Offer update',
    title: `Update on your Go Pair PH offer`,
    preheader: `Review the note for ${data.listingTitle}.`,
    children: `
      ${paragraph(`We could not accept the current request for <strong style="color:#f8fafc">${escapeHtml(data.listingTitle)}</strong>. Your marketplace listing remains active.`)}
      ${renderInfoRows([{ label: 'Reason', value: data.reason }, { label: 'Quoted amount', value: data.quoteLabel }])}
      ${renderCallout('Review note', escapeHtml(data.adminNote))}
      ${paragraph('You can update the information and send a new request when ready.')}
      <div style="margin-top:20px">${renderButton(data.listingUrl, 'Open your listing')}</div>
    `,
    footerReason: 'You received this because you sent a buyback request to Go Pair PH.',
  });
}

export function renderBuybackShippingReminderEmail(data: BuybackBase & { shipDate: string }): string {
  return renderEmailShell({
    eyebrow: 'Shipping reminder',
    title: 'Submit your J&T tracking number',
    preheader: `Shipping reminder for ${data.listingTitle}.`,
    children: `
      ${paragraph(`Your confirmed send date for <strong style="color:#f8fafc">${escapeHtml(data.listingTitle)}</strong> is ${escapeHtml(data.shipDate)}.`)}
      ${renderInfoRows([{ label: 'Exact J&T COD amount', value: data.quoteLabel }, { label: 'Send date', value: data.shipDate }])}
      ${renderCallout('After booking', 'Open your listing and upload the J&T booking confirmation and tracking number. You shoulder the shipping fee.')}
      <div style="margin-top:20px">${renderButton(data.listingUrl, 'Submit tracking')}</div>
    `,
    footerReason: 'You received this because Go Pair PH accepted your buyback request.',
  });
}

export function renderBuybackLifecycleEmail(data: BuybackBase & { status: 'completed' | 'disputed' | 'expired'; note?: string | null }): string {
  const copy = data.status === 'completed'
    ? { title: 'Buyback completed', body: 'The delivered shoes passed the final receiving checks and the transaction is complete.' }
    : data.status === 'expired'
      ? { title: 'Buyback offer expired', body: 'Tracking was not submitted by the shipping deadline, so the listing is active again.' }
      : { title: 'Buyback delivery needs review', body: 'Go Pair PH found an issue during receiving inspection. Please review the note below.' };
  return renderEmailShell({
    eyebrow: 'Buyback update',
    title: copy.title,
    children: `
      ${paragraph(`${copy.body} <strong style="color:#f8fafc">${escapeHtml(data.listingTitle)}</strong>`)}
      ${data.note ? renderCallout('Go Pair PH note', escapeHtml(data.note)) : ''}
      <div style="margin-top:20px">${renderButton(data.listingUrl, 'Open listing')}</div>
    `,
    footerReason: 'You received this because you sent a buyback request to Go Pair PH.',
  });
}
