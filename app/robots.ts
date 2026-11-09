import type { MetadataRoute } from 'next'
import { AI_CRAWLERS, PRIVATE_PATHS, SITE_URL, url } from '@/lib/seo'

/**
 * robots.txt
 *
 * Three groups, deliberately:
 *  1. `*`            — the default for every classic crawler.
 *  2. each AI bot    — named explicitly, because several answer engines only
 *                      obey a rule that names their token, and an explicit
 *                      Allow is what makes a site eligible to be cited.
 *  3. known scrapers — denied, so content theft bots are not treated as
 *                      answer engines.
 *
 * Private routes are listed here AND carry a noindex tag, since robots.txt
 * only stops the crawl, it does not remove a URL someone else has linked.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE_PATHS.map((p) => `${p}/`)

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      // Answer engines — explicitly welcome.
      ...AI_CRAWLERS.map((ua) => ({
        userAgent: ua,
        allow: '/',
        disallow,
      })),
      // Bulk scrapers and SEO-tool crawlers that add nothing and cost bandwidth.
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot', 'DataForSeoBot', 'BLEXBot'],
        disallow: '/',
      },
    ],
    sitemap: url('/sitemap.xml'),
    host: SITE_URL,
  }
}
