import type { Metadata } from 'next'
import { COMPANIES } from '@/lib/company/catalog'

const TITLE = `${COMPANIES.length}+ company-specific mock tests — real hiring patterns`
const DESC =
  `Practise the exact recruitment pattern of ${COMPANIES.length}+ companies — TCS NQT, Capgemini, Infosys, Wipro, Cognizant, Accenture and more. Sectional timers, negative marking and real cut-offs, scored instantly.`

/**
 * Metadata only. The CollectionPage / ItemList JSON-LD deliberately lives in
 * page.tsx rather than here: this layout also wraps /[slug], and emitting the
 * catalogue schema from the layout made every individual company page claim
 * to be a 60-item collection as well as a practice test, with two competing
 * BreadcrumbLists. Conflicting schema is worse than none.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: '/company-assessments' },
  openGraph: { title: `${TITLE} | CalibiUpX`, description: DESC, url: '/company-assessments', type: 'website' },
  twitter: { title: `${TITLE} | CalibiUpX`, description: DESC },
}

export default function CompanyAssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
