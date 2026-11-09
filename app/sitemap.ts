import type { MetadataRoute } from 'next'
import { COMPANIES, byPlanOrder } from '@/lib/company/catalog'
import { url } from '@/lib/seo'

/**
 * sitemap.xml — only URLs that return 200, are indexable and are canonical.
 * Priorities are relative to each other (they are a hint, not a ranking):
 * the home page leads, then the mock catalogue, then each company page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const core: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: url('/company-assessments'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: url('/sample-report'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: url('/login'), lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: url('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/refunds'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Every company mock is its own landing page and its own search intent
  // ("TCS NQT mock test", "Capgemini pseudocode practice", …).
  const companies: MetadataRoute.Sitemap = [...COMPANIES]
    .sort(byPlanOrder)
    .map((c) => ({
      url: url(`/company-assessments/${c.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: c.priority === 1 ? 0.8 : c.priority === 2 ? 0.7 : 0.6,
    }))

  return [...core, ...companies]
}
