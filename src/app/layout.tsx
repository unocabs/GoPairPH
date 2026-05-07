import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { InAppBrowserRedirect } from '@/components/layout/InAppBrowserRedirect';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gopairph.com';
const SITE_NAME = 'Go Pair PH';
const SITE_DESCRIPTION =
  'A community marketplace for runners in Pampanga, Philippines. Buy, sell, and donate pre-loved running shoes with fellow Kapampangan.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Pampanga Running Shoe Marketplace`,
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
    'pre-loved shoes',
    'second hand running shoes',
    'used running shoes',
    'angeles city',
    'san fernando pampanga',
    'buy running shoes pampanga',
    'sell running shoes pampanga',
    'gopairph',
    'go pair ph',
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
    title: `${SITE_NAME} — Pampanga Running Shoe Marketplace`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Pampanga Running Shoe Marketplace`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Pampanga Running Shoe Marketplace`,
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
  icons: { icon: '/icon.svg' },
  category: 'marketplace',
  verification: {
    google: 'QHkPELcZgx22-fYojuvxkycrjlQo4VyCDPPKfqY19ZU',
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
        <SessionProvider>
          <InAppBrowserRedirect />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
