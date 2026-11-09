import type { Metadata } from 'next'

/** Per-attempt page for a signed-in candidate — never a search result. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function CompanyTestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
