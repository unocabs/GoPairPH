'use client';

import { allowsKeeplyAnalytics, KEEPLY_AD_PARAMS } from './keeplyAd';

type AnalyticsValue = string | number | boolean | null | undefined;

type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (
      command: 'event',
      eventName: string,
      params?: Record<string, string | number | boolean>,
    ) => void;
  }
}

function cleanParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ) as Record<string, string | number | boolean>;
}

export function trackEvent(eventName: string, params?: AnalyticsParams) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, cleanParams(params));
}

export function trackMarketplaceAction(action: string, params?: AnalyticsParams) {
  trackEvent(`marketplace_${action}`, params);
}

export function trackKeeplyAdClick() {
  try {
    if (typeof window === 'undefined') return;
    const analyticsWindow = window as Window & {
      dataLayer?: unknown;
      'ga-disable-G-LH99NEKGMC'?: boolean;
    };
    const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
    const disabled = analyticsWindow['ga-disable-G-LH99NEKGMC'] === true
      || privacyNavigator.doNotTrack === '1'
      || privacyNavigator.globalPrivacyControl === true;
    if (!allowsKeeplyAnalytics(analyticsWindow.dataLayer, disabled)) return;
    trackEvent('keeply_ad_click', KEEPLY_AD_PARAMS);
  } catch {
    // Tracking must never cancel or delay the native outbound navigation.
  }
}
