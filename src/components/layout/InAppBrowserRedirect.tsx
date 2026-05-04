'use client';

import { useEffect } from 'react';

export function InAppBrowserRedirect() {
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const url = window.location.href;

    const inAppBrowsers = [
      'linkedinapp',
      'fban',   // Facebook App
      'fbav',   // Facebook App
      'instagram',
      'line',
      'wv',     // WebView
      'fb_iab', // Facebook in-app browser
    ];

    const isInAppBrowser = inAppBrowsers.some(app => userAgent.includes(app));
    const isMobileDevice = /iphone|ipad|android/i.test(userAgent);

    if (!isMobileDevice || !isInAppBrowser) return;

    if (/iphone|ipad/i.test(userAgent)) {
      window.location.href = 'x-safari-' + url;
    } else if (/android/i.test(userAgent)) {
      window.location.href =
        'intent://' +
        url.replace(/^https?:\/\//, '') +
        '#Intent;scheme=https;package=com.android.chrome;end';
    }
  }, []);

  return null;
}
