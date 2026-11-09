import type { Metadata } from 'next'

/**
 * Dashboard is a signed-in area: it holds candidate data and has no value in a
 * search result. `noindex` here is what actually removes it from an index —
 * the robots.txt Disallow only stops the crawl.
 */
export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
