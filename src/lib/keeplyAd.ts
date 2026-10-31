// This campaign uses the site's existing GA tag and consent queue only.
export const KEEPLY_AD_URL = 'https://www.keeplyph.com/demo?utm_source=gopairph&utm_medium=referral&utm_campaign=gopair_home_banner';
export const KEEPLY_AD_LABEL = 'Keeply: organise bills, home maintenance and purchase records. Explore a sample account.';

export const KEEPLY_AD_PARAMS = {
  advertiser: 'keeply',
  placement: 'homepage_promo_first',
  campaign: 'gopair_home_banner',
  link_domain: 'www.keeplyph.com',
} as const;

// gtag queues consent commands as Arguments objects. Read the latest explicit
// analytics choice on every activation, including updates after page load.
// The current site has no CMP/default consent command; preserve that policy.
export function allowsKeeplyAnalytics(dataLayer: unknown, disabled: boolean) {
  if (disabled) return false;
  let consent: unknown;
  if (Array.isArray(dataLayer)) {
    for (const entry of dataLayer) {
      if (!entry || typeof entry !== 'object') continue;
      const command = entry as Record<number, unknown>;
      if (command[0] !== 'consent' || !['default', 'update'].includes(String(command[1]))) continue;
      const settings = command[2] as { analytics_storage?: unknown } | undefined;
      if (settings?.analytics_storage !== undefined) consent = settings.analytics_storage;
    }
  }
  return consent === undefined || consent === 'granted';
}

export function isKeeplyActivation(type: string, button: number, trusted: boolean) {
  return trusted && ((type === 'click' && button === 0) || (type === 'auxclick' && button === 1));
}
