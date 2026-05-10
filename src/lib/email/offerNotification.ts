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

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderOfferEmail(data: OfferEmailData): string {
  const v = {
    seller_name: escape(data.seller_name),
    listing_title: escape(data.listing_title),
    shoe_size: escape(data.shoe_size),
    condition: escape(data.condition),
    mileage: escape(data.mileage),
    offer_amount: escape(data.offer_amount),
    listed_price: escape(data.listed_price),
    buyer_name: escape(data.buyer_name),
    buyer_message: data.buyer_message ? escape(data.buyer_message) : null,
    offer_link: encodeURI(data.offer_link),
  };

  const messageBlock = v.buyer_message
    ? `
            <tr>
              <td class="mobile-padding" style="padding: 0 40px 24px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdfa; border-left: 4px solid #0d9488; border-radius: 6px;">
                  <tr>
                    <td style="padding: 16px 20px;">
                      <p style="color: #0f766e; font-size: 13px; font-weight: 600; margin: 0 0 6px 0; font-family: 'Segoe UI', Arial, sans-serif;">💬 Message from buyer</p>
                      <p style="color: #134e4a; font-size: 14px; line-height: 22px; margin: 0; font-style: italic; font-family: 'Segoe UI', Arial, sans-serif;">"${v.buyer_message}"</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>You've Got an Offer! - Go Pair PH</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      @media screen and (max-width: 600px) {
          .mobile-padding { padding: 20px !important; }
          .mobile-center { text-align: center !important; }
          .mobile-full { width: 100% !important; display: block !important; }
          .mobile-hide { display: none !important; }
          .h1-mobile { font-size: 24px !important; line-height: 32px !important; }
          .h2-mobile { font-size: 18px !important; line-height: 26px !important; }
          .button-mobile {
            box-sizing: border-box !important;
            display: block !important;
            max-width: 280px !important;
            width: auto !important;
            margin: 0 auto !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
      }
      .cta-button:hover { background-color: #0f766e !important; transform: translateY(-1px); }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Arial, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
      Great news! A fellow runner is interested in your pair. Review the offer and respond now.
    </div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8;">
      <tr>
        <td align="center" style="padding: 30px 15px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td align="center" style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 30px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <h1 style="color: #ffffff; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: 0.5px; font-family: 'Segoe UI', Arial, sans-serif;">
                        Go Pair <span style="color: #fde047;">PH</span>
                      </h1>
                      <p style="color: #ccfbf1; font-size: 12px; margin: 6px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500;">
                        Running Shoes · Pampanga Runners
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" class="mobile-padding" style="padding: 40px 40px 20px 40px;">
                <div style="width: 80px; height: 80px; background-color: #ccfbf1; border-radius: 50%; display: inline-block; line-height: 80px; text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 40px;">👟</span>
                </div>
                <h2 class="h1-mobile" style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 36px; font-family: 'Segoe UI', Arial, sans-serif;">
                  You've Got an Offer!
                </h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                  A fellow runner is interested in your pair on Go Pair PH.
                </p>
              </td>
            </tr>
            <tr>
              <td class="mobile-padding" style="padding: 10px 40px;">
                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 16px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                  Hi <strong>${v.seller_name}</strong>,
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                  Someone just made an offer on one of your active listings. Review the details below and respond
                  through your dashboard to keep the conversation going — your pair could find its next runner soon.
                </p>
              </td>
            </tr>
            <tr>
              <td class="mobile-padding" style="padding: 24px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
                  <tr>
                    <td style="padding: 24px;">
                      <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif;">Listing</p>
                      <h3 class="h2-mobile" style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 6px 0; line-height: 28px; font-family: 'Segoe UI', Arial, sans-serif;">
                        ${v.listing_title}
                      </h3>
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        ${v.shoe_size} · ${v.condition} · ${v.mileage}
                      </p>
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0; font-family: 'Segoe UI', Arial, sans-serif;">Offered Amount</p>
                                  <p style="color: #0d9488; font-size: 22px; font-weight: 700; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                                    ₱${v.offer_amount}
                                  </p>
                                </td>
                                <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0; font-family: 'Segoe UI', Arial, sans-serif;">Your Asking Price</p>
                                  <p style="color: #111827; font-size: 22px; font-weight: 700; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                                    ₱${v.listed_price}
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td colspan="2" style="padding-top: 8px;">
                                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0; font-family: 'Segoe UI', Arial, sans-serif;">From</p>
                                  <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                                    ${v.buyer_name}
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>${messageBlock}
            <tr>
              <td align="center" class="mobile-padding" style="padding: 10px 40px 30px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius: 8px; background-color: #0d9488;">
                      <a href="${v.offer_link}" target="_blank" class="cta-button button-mobile" style="box-sizing: border-box; display: inline-block; max-width: 280px; padding: 16px 32px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; line-height: 20px; font-weight: 600; color: #ffffff; text-align: center; text-decoration: none; border-radius: 8px; background-color: #0d9488; transition: all 0.2s ease;">
                        View Offer & Respond →
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="color: #9ca3af; font-size: 13px; margin: 16px 0 0 0; font-family: 'Segoe UI', Arial, sans-serif;">
                  Tip: Respond within 24 hours to keep buyers engaged.
                </p>
              </td>
            </tr>
            <tr>
              <td class="mobile-padding" style="padding: 0 40px 30px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e5e7eb;">
                  <tr>
                    <td style="padding-top: 24px;">
                      <p style="color: #111827; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        Quick reminders for safe pairing:
                      </p>
                      <p style="color: #6b7280; font-size: 14px; line-height: 22px; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        ✓ Always communicate through Go Pair PH's trusted channels
                      </p>
                      <p style="color: #6b7280; font-size: 14px; line-height: 22px; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        ✓ Verify buyer details before discussing meet-up
                      </p>
                      <p style="color: #6b7280; font-size: 14px; line-height: 22px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        ✓ Meet in safe, public spots around Pampanga for in-person handovers
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <p style="color: #6b7280; font-size: 13px; line-height: 20px; margin: 0 0 12px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        You're receiving this email because you have an active listing on <strong>Go Pair PH</strong>.
                      </p>
                      <p style="color: #6b7280; font-size: 13px; line-height: 20px; margin: 0 0 16px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        <a href="https://gopairph.com/browse" style="color: #0d9488; text-decoration: none; font-weight: 500;">Browse</a>
                        &nbsp;·&nbsp;
                        <a href="https://gopairph.com/safety" style="color: #0d9488; text-decoration: none; font-weight: 500;">Safety Guide</a>
                        &nbsp;·&nbsp;
                        <a href="https://gopairph.com/contact" style="color: #0d9488; text-decoration: none; font-weight: 500;">Contact</a>
                      </p>
                      <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        © 2026 Go Pair PH. Built for Pampanga runners. To God be the glory.<br />
                        <a href="https://gopairph.com/privacy" style="color: #9ca3af; text-decoration: underline;">Privacy</a>
                        ·
                        <a href="https://gopairph.com/terms" style="color: #9ca3af; text-decoration: underline;">Terms</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderShopOrderEmail(data: ShopOrderEmailData): string {
  const v = {
    shop_name: escape(data.shop_name),
    listing_title: escape(data.listing_title),
    selected_size: escape(data.selected_size),
    listed_price: escape(data.listed_price),
    buyer_name: escape(data.buyer_name),
    buyer_message: data.buyer_message ? escape(data.buyer_message) : null,
    order_link: encodeURI(data.order_link),
  };

  const messageBlock = v.buyer_message
    ? `
            <tr>
              <td class="mobile-padding" style="padding: 0 40px 24px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px;">
                  <tr>
                    <td style="padding: 16px 20px;">
                      <p style="color: #1d4ed8; font-size: 13px; font-weight: 600; margin: 0 0 6px 0; font-family: 'Segoe UI', Arial, sans-serif;">Order details from buyer</p>
                      <p style="color: #1e3a8a; font-size: 14px; line-height: 22px; margin: 0; font-style: italic; font-family: 'Segoe UI', Arial, sans-serif;">"${v.buyer_message}"</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>New Shop Order - Go Pair PH</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      @media screen and (max-width: 600px) {
        .mobile-padding { padding: 20px !important; }
        .button-mobile {
          box-sizing: border-box !important;
          display: block !important;
          max-width: 260px !important;
          width: auto !important;
          margin: 0 auto !important;
          padding-left: 20px !important;
          padding-right: 20px !important;
        }
        .h1-mobile { font-size: 24px !important; line-height: 32px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Arial, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
      A buyer placed an order from your Go Pair PH shop. Review it and confirm availability.
    </div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8;">
      <tr>
        <td align="center" style="padding: 30px 15px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <tr>
              <td align="center" style="background: linear-gradient(135deg, #111827 0%, #0d9488 100%); padding: 30px 20px;">
                <h1 style="color: #ffffff; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: 0.5px; font-family: 'Segoe UI', Arial, sans-serif;">
                  Go Pair <span style="color: #5eead4;">PH</span>
                </h1>
                <p style="color: #ccfbf1; font-size: 12px; margin: 6px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500;">
                  Shop Order
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" class="mobile-padding" style="padding: 40px 40px 20px 40px;">
                <h2 class="h1-mobile" style="color: #111827; font-size: 28px; font-weight: 700; margin: 0 0 12px 0; line-height: 36px; font-family: 'Segoe UI', Arial, sans-serif;">
                  New Shop Order
                </h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                  A buyer placed an order from <strong>${v.shop_name}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td class="mobile-padding" style="padding: 10px 40px;">
                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                  Review the order details, confirm availability with the buyer, then coordinate payment, shipping, delivery, or meetup through your preferred shop channel. Once the order is fulfilled, mark the sale complete in Go Pair PH so stock updates correctly.
                </p>
              </td>
            </tr>
            <tr>
              <td class="mobile-padding" style="padding: 24px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
                  <tr>
                    <td style="padding: 24px;">
                      <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0; font-family: 'Segoe UI', Arial, sans-serif;">Order</p>
                      <h3 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 6px 0; line-height: 28px; font-family: 'Segoe UI', Arial, sans-serif;">
                        ${v.listing_title}
                      </h3>
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        Size: ${v.selected_size}
                      </p>
                      <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0; font-family: 'Segoe UI', Arial, sans-serif;">Price</p>
                      <p style="color: #0d9488; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; font-family: 'Segoe UI', Arial, sans-serif;">₱${v.listed_price}</p>
                      <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0; font-family: 'Segoe UI', Arial, sans-serif;">Buyer</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">${v.buyer_name}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>${messageBlock}
            <tr>
              <td class="mobile-padding" style="padding: 0 40px 24px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff7ed; border: 1px solid #fdba74; border-radius: 10px;">
                  <tr>
                    <td style="padding: 16px 20px;">
                      <p style="color: #9a3412; font-size: 13px; font-weight: 700; margin: 0 0 6px 0; font-family: 'Segoe UI', Arial, sans-serif;">IMPORTANT</p>
                      <p style="color: #7c2d12; font-size: 14px; line-height: 22px; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        Ask buyers to send payment only after you confirm order details directly. Keep screenshots of payment and delivery conversations for your records. Review the <a href="https://gopairph.com/safety" style="color: #0f766e; font-weight: 600;">Go Pair PH Safety Guide</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" class="mobile-padding" style="padding: 10px 40px 34px 40px;">
                <a href="${v.order_link}" target="_blank" class="button-mobile" style="box-sizing: border-box; display: inline-block; max-width: 260px; padding: 16px 32px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; line-height: 20px; font-weight: 600; color: #ffffff; text-align: center; text-decoration: none; border-radius: 8px; background-color: #0d9488;">
                  Review Order →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
