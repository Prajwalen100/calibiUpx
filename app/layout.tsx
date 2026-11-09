import './globals.css'
import type { Metadata, Viewport } from 'next'
import { BRAND, OG, SITE_URL, graph, organizationLd, softwareApplicationLd, webSiteLd } from '@/lib/seo'
import { StoreProvider } from '@/lib/store'
import { ThemeProvider } from '@/components/ThemeProvider'
import CookieConsent from '@/components/CookieConsent'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CalibiUpX — Your verified employability score for placements',
    // Every child page becomes "<page> | CalibiUpX", which keeps the brand in
    // every SERP line without each page having to repeat it.
    template: '%s | CalibiUpX',
  },
  description:
    'CalibiUpX scores engineering students out of 1000 on coding, AI skills, communication and cognition — then issues a verifiable credential. 50+ company mock tests built on real hiring patterns. Free to begin.',
  applicationName: BRAND.name,
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  keywords: [
    'CalibiUpX', 'Calibi UpX', 'CalibiAI', 'employability score', 'placement readiness test',
    'campus placement preparation', 'TCS NQT mock test', 'Capgemini mock test', 'Infosys mock test',
    'company specific mock test', 'AI mock interview', 'engineering placement assessment India',
    'verified skill credential', 'aptitude and coding assessment',
  ],
  authors: [{ name: BRAND.legalName, url: SITE_URL }],
  creator: BRAND.legalName,
  publisher: BRAND.legalName,
  category: 'education',
  alternates: {
    canonical: '/',
    languages: { 'en-IN': '/', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: 'en_IN',
    url: '/',
    title: 'CalibiUpX — Your verified employability score for placements',
    description:
      'One timed, AI-scored assessment. A 1000-point employability score, 50+ company mock tests on real hiring patterns, and a credential recruiters can verify.',
    images: [{ url: '/opengraph-image', width: OG.width, height: OG.height, alt: OG.alt }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CalibiUpX — Your verified employability score',
    description:
      'A 1000-point AI-scored employability credential for engineering students. 50+ company mock tests on real hiring patterns.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google show full-length previews, large image thumbnails and
      // unlimited video — anything less shrinks the result on the SERP.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [
      { url: '/favicon.ico?v=5', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  // Fill these in from Search Console / Bing Webmaster when the properties
  // are claimed; an empty string is simply not rendered.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximum-scale / user-scalable=no: pinch zoom must keep working.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef1fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  colorScheme: 'light dark',
}

import { ProProvider } from '@/lib/pro/context'
import { UpgradeModal } from '@/components/pro/UpgradeModal'
import { InvoiceModal } from '@/components/pro/InvoiceModal'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* Site-wide entity graph. One script, one @graph: Organization,
            WebSite (with the sitelinks search box) and the product itself,
            cross-referenced by @id so no entity is ever described twice. */}
        <script
          type="application/ld+json"
          // The payload is built from our own constants, never user input.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(graph(organizationLd(), webSiteLd(), softwareApplicationLd())),
          }}
        />
        {/* Speed up the first paint of the webfonts the whole site uses:
            Core Web Vitals are a ranking input, and LCP is usually text. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-screen text-slate-800 dark:text-slate-100 antialiased transition-colors duration-300">
        {/* Anti-flash script to apply dark theme immediately before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('calibi_theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var r of regs) r.unregister();
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(keys) {
                    for (var k of keys) caches.delete(k);
                  });
                }
              } catch (_) {}
            `,
          }}
        />
        {/* Animated ambient blobs behind the frosted glass */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="blob-a absolute -top-24 -left-24 h-[26rem] w-[26rem] rounded-full bg-indigo-300/40 dark:bg-indigo-600/20 blur-3xl" />
          <div className="blob-b absolute top-1/3 -right-28 h-[28rem] w-[28rem] rounded-full bg-fuchsia-300/30 dark:bg-purple-600/15 blur-3xl" />
          <div className="blob-a absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-sky-300/30 dark:bg-sky-600/15 blur-3xl" />
        </div>
        <ThemeProvider>
          <StoreProvider>
            <ProProvider>
              {children}
              <UpgradeModal />
              <InvoiceModal />
              <CookieConsent />
            </ProProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
