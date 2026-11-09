'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { useStore } from '@/lib/store'
import { CompanyCatalog } from '@/components/company/CompanyCatalog'
import { COMPANIES } from '@/lib/company/catalog'
import { breadcrumbLd, graph, url } from '@/lib/seo'

/**
 * Public catalogue of every company mock, grouped by company tag.
 *
 * Browsing is deliberately open: a crawler cannot sign in, so gating this
 * page made all 60+ company URLs invisible to search and to answer engines.
 * Starting an actual attempt still requires an account — that check lives on
 * the individual company page.
 */
export default function Page() {
  const { user, hydrated } = useStore()
  const signedIn = hydrated && !!user

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            graph(
              breadcrumbLd([
                { name: 'Home', path: '/' },
                { name: 'Company mock tests', path: '/company-assessments' },
              ]),
              {
                '@type': 'CollectionPage',
                '@id': url('/company-assessments#page'),
                url: url('/company-assessments'),
                name: `${COMPANIES.length}+ company-specific mock tests`,
                isPartOf: { '@id': url('/#website') },
                about: { '@id': url('/#app') },
                inLanguage: 'en-IN',
                mainEntity: {
                  '@type': 'ItemList',
                  numberOfItems: COMPANIES.length,
                  itemListElement: COMPANIES.map((c, i) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    name: `${c.name} mock test`,
                    url: url(`/company-assessments/${c.slug}`),
                  })),
                },
              },
            ),
          ),
        }}
      />
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Link
          href={signedIn ? '/dashboard/student' : '/'}
          className="inline-flex min-h-[32px] items-center text-xs font-semibold text-indigo-600"
        >
          ← {signedIn ? 'Back to dashboard' : 'Back to home'}
        </Link>

        {/* One real H1. The page previously had none, so search engines had
            nothing to match "<company> mock test" against. */}
        <header className="mt-3">
          <h1 className="text-[1.6rem] xs:text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white text-balance">
            {COMPANIES.length}+ company mock tests on{' '}
            <span className="upx-gradient">real hiring patterns.</span>
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            Each mock reproduces that company&apos;s actual recruitment process — the same round
            order, sectional timers, negative marking and cut-offs. Scored instantly, with a
            section-wise report.
          </p>
        </header>

        {!signedIn && (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4 dark:border-indigo-800/70 dark:bg-indigo-950/50 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
              Browse every pattern for free. Sign in to attempt one and get a scored report.
            </p>
            <Link href="/login" className="btn-primary group w-full shrink-0 !py-2.5 !text-xs sm:w-auto">
              Start free
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </Link>
          </div>
        )}

        <div className="mt-4 glass-card animate-fade-up">
          <CompanyCatalog />
        </div>
      </main>
      <Footer />
    </div>
  )
}
