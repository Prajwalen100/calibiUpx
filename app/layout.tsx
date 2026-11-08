import './globals.css'
import type { Metadata } from 'next'
import { StoreProvider } from '@/lib/store'
import { ThemeProvider } from '@/components/ThemeProvider'
import CookieConsent from '@/components/CookieConsent'

export const metadata: Metadata = {
  title: 'CalibiUpX — Your verified employability score',
  description: 'One 1000-point CalibiUpX score: communication, problem solving, AI skills and cognition — assessed and verified.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=5', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
      { url: '/logo.png', sizes: '192x192' },
    ],
  },
}

import { ProProvider } from '@/lib/pro/context'
import { UpgradeModal } from '@/components/pro/UpgradeModal'
import { InvoiceModal } from '@/components/pro/InvoiceModal'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
