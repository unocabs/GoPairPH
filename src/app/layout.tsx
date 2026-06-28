import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { InAppBrowserRedirect } from '@/components/layout/InAppBrowserRedirect';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { RouteLoadingIndicator } from '@/components/layout/RouteLoadingIndicator';
import { BuySellFloatingAction } from '@/components/layout/BuySellFloatingAction';
import { SOCIAL_URLS } from '@/lib/socialLinks';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const SITE_NAME = 'Go Pair PH';
const SITE_DESCRIPTION =
  'Go Pair PH is a running shoe marketplace where runners can buy, sell, and share brand-new, pre-loved, and second-hand running shoes from Central Luzon and NCR.';
const ADSENSE_CLIENT = 'ca-pub-5353988777781174';
const shouldLoadAdsense = process.env.NODE_ENV === 'production';

const siteJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description: SITE_DESCRIPTION,
    sameAs: SOCIAL_URLS,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/browse?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Buy and Sell Running Shoes`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  generator: 'Next.js',
  keywords: [
    'running shoes',
    'pampanga',
    'philippines',
    'marketplace',
    'running shoes pampanga',
    'pampanga running shoes',
    'new running shoes',
    'pre-loved shoes',
    'pre-loved running shoes',
    'second hand running shoes',
    'used running shoes',
    'running shoe deals',
    'running shoe sellers',
    'central luzon running shoe sellers',
    'ncr running shoe sellers',
    'central luzon running shoes',
    'ncr running shoes',
    'local sellers',
    'runner sellers',
    'local running shoe marketplace',
    'angeles city',
    'san fernando pampanga',
    'buy running shoes pampanga',
    'sell running shoes pampanga',
    'gopairph',
    'go pair ph',
    'go pair',
    'gopair',
  ],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Buy and Sell Running Shoes`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Buy and Sell Running Shoes`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Buy and Sell Running Shoes`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  category: 'marketplace',
  verification: {
    google: 'QHkPELcZgx22-fYojuvxkycrjlQo4VyCDPPKfqY19ZU',
    other: {
    'facebook-domain-verification': 'mm74xngm7nr8e9v1wfudew9na0dtbf',
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0d9488', // teal-600
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {shouldLoadAdsense ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        ) : null}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LH99NEKGMC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LH99NEKGMC');
          `}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
        <Script
          id="site-json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <SessionProvider>
          <InAppBrowserRedirect />
          <AnnouncementBar />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <BuySellFloatingAction />
          <RouteLoadingIndicator />
        </SessionProvider>
      </body>
    </html>
  );
}
