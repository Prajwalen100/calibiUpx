import type { Metadata } from 'next'
import { getCompany, companyMockFacts } from '@/lib/company/catalog'
import { breadcrumbLd, graph, url } from '@/lib/seo'

type Props = { children: React.ReactNode; params: { slug: string } }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = getCompany(params.slug)
  if (!c) return { title: 'Company mock test', robots: { index: false, follow: true } }

  const f = companyMockFacts(c)
  const shape = f.minutes ? `${f.rounds} rounds · ${f.questions} questions · ${f.minutes} minutes.` : ''
  const title = `${c.name} mock test ${new Date().getFullYear() + 1} — ${c.track}`
  const description =
    `Free ${c.name} online assessment practice built on the real ${c.track} pattern for the ${c.role} role. ${shape} Sectional cut-offs, negative marking and an instant AI-scored report.`.replace(/\s+/g, ' ').trim()

  return {
    title: { absolute: `${title} | CalibiUpX` },
    description,
    alternates: { canonical: `/company-assessments/${c.slug}` },
    openGraph: { title: `${title} | CalibiUpX`, description, url: `/company-assessments/${c.slug}`, type: 'article' },
    twitter: { title: `${title} | CalibiUpX`, description },
  }
}

export default function CompanyLayout({ children, params }: Props) {
  const c = getCompany(params.slug)
  if (!c) return <>{children}</>

  const f = companyMockFacts(c)
  const ld = graph(
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Company mock tests', path: '/company-assessments' },
      { name: c.name, path: `/company-assessments/${c.slug}` },
    ]),
    {
      // A mock test is a course-like learning resource, which is the schema
      // type answer engines map to "practice test for X".
      '@type': 'LearningResource',
      '@id': url(`/company-assessments/${c.slug}#resource`),
      url: url(`/company-assessments/${c.slug}`),
      name: `${c.name} mock test — ${c.track}`,
      description: `A timed mock assessment reproducing the ${c.name} ${c.track} hiring pattern for the ${c.role} role.`,
      learningResourceType: 'Practice test',
      educationalLevel: 'Undergraduate',
      inLanguage: 'en-IN',
      teaches: c.focus,
      isPartOf: { '@id': url('/#app') },
      provider: { '@id': url('/#organization') },
      ...(f.minutes ? { timeRequired: `PT${f.minutes}M` } : {}),
      ...(f.questions ? { numberOfItems: f.questions } : {}),
      about: { '@type': 'Thing', name: `${c.name} recruitment process` },
    },
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {children}
    </>
  )
}
