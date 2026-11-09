/**
 * One source of truth for everything search engines and AI answer engines
 * read about CalibiUpX: canonical origin, brand facts, the public route map,
 * and the JSON-LD builders.
 *
 * Why it is centralised: a canonical URL that disagrees with the sitemap, or
 * an Organization block whose name differs from the <title>, is the single
 * most common reason a brand loses its own branded query. Keeping all of it
 * in one file means those can never drift apart.
 */

/**
 * Canonical origin — the one hostname every canonical tag, sitemap entry,
 * OG URL and JSON-LD @id points at.
 *
 * calibiupx.com is the brand's own domain, so it is the canonical home: a
 * branded search for "CalibiUpX" is far easier to win on a domain that
 * carries the brand than on a subdomain of another one. assessment.calibiai.com
 * stays alive but must 301 here (see infra/nginx.conf) — two hostnames serving
 * identical HTML splits link equity and lets Google pick the canonical itself.
 *
 * NEXT_PUBLIC_* is inlined at BUILD time, so this must be set in the .env the
 * server builds from, not just at runtime. Never leave a trailing slash.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://calibiupx.com'
).replace(/\/+$/, '')

export const BRAND = {
  /** Exact legal/product spelling — must match every <title> and JSON-LD name. */
  name: 'CalibiUpX',
  legalName: 'CalibiAI',
  /** Spellings people and LLMs actually type. Used for `alternateName`. */
  alternateNames: ['Calibi UpX', 'CalibiUpx', 'Calibi UpX Assessment', 'CalibiAI Score', 'Calibi Assessment'],
  tagline: 'Assess · Elevate · Get Hired',
  shortDescription:
    'CalibiUpX is an AI placement-readiness platform that scores engineering students out of 1000 across communication, problem solving, AI skills and cognition, and issues a verifiable credential.',
  email: 'support@calibiai.com',
  logo: `${SITE_URL}/logo.png`,
  sameAs: [
    'https://www.linkedin.com/company/calibiai/',
    'https://www.instagram.com/calibiai/',
  ],
  foundingCountry: 'IN',
} as const

export const OG = {
  width: 1200,
  height: 630,
  alt: 'CalibiUpX — the verified employability score for engineering students',
} as const

/** Absolute URL for a path; every canonical and sitemap entry goes through this. */
export function url(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Routes behind sign-in, holding personal data, or duplicating a public page.
 * These are disallowed in robots.txt AND carry a noindex tag — robots.txt
 * alone does not deindex a URL that is already linked from somewhere else.
 */
export const PRIVATE_PATHS = [
  '/admin',
  '/api',
  '/assessment',
  '/assessment2',
  '/confirmation',
  '/dashboard',
  '/edit-profile',
  '/feedback',
  '/instructions',
  '/instructions2',
  '/onboarding',
  '/profile',
  '/result',
  '/resume',
  '/tracking',
  '/auth',
] as const

/**
 * AI / answer-engine crawlers given an explicit allow. Being named rather than
 * relying on `*` matters: several of these only honour a rule that names them,
 * and an explicit allow is what makes a site quotable in AI answers.
 */
export const AI_CRAWLERS = [
  'GPTBot',              // OpenAI — ChatGPT training & browsing index
  'OAI-SearchBot',       // OpenAI — ChatGPT Search index
  'ChatGPT-User',        // OpenAI — live fetch when a user asks
  'ClaudeBot',           // Anthropic — Claude index
  'Claude-User',         // Anthropic — live fetch for a user's question
  'Claude-SearchBot',    // Anthropic — search index
  'anthropic-ai',        // Anthropic — legacy token
  'PerplexityBot',       // Perplexity — index
  'Perplexity-User',     // Perplexity — live fetch
  'Google-Extended',     // Google — Gemini / AI Overviews grounding
  'GoogleOther',         // Google — product & research crawls
  'Applebot',            // Apple — Siri / Spotlight
  'Applebot-Extended',   // Apple — Apple Intelligence
  'Bingbot',             // Microsoft — Bing index (feeds Copilot)
  'CCBot',               // Common Crawl — the base corpus for most open models
  'Amazonbot',           // Amazon — Alexa / Rufus
  'DuckAssistBot',       // DuckDuckGo AI
  'YouBot',              // You.com
  'cohere-ai',           // Cohere
  'Meta-ExternalAgent',  // Meta AI
  'MistralAI-User',      // Le Chat
  'Bytespider',          // ByteDance / Doubao
] as const

/* ------------------------------------------------------------------ */
/* JSON-LD builders                                                     */
/* ------------------------------------------------------------------ */

/**
 * The Organization node. `@id` is a stable IRI so every other node can point
 * at this one entity instead of repeating (and risking contradicting) it.
 */
export function organizationLd() {
  return {
    '@type': 'Organization',
    '@id': url('/#organization'),
    name: BRAND.name,
    legalName: BRAND.legalName,
    alternateName: [...BRAND.alternateNames],
    url: url('/'),
    logo: { '@type': 'ImageObject', '@id': url('/#logo'), url: BRAND.logo, caption: BRAND.name },
    image: { '@id': url('/#logo') },
    description: BRAND.shortDescription,
    email: BRAND.email,
    slogan: BRAND.tagline,
    sameAs: [...BRAND.sameAs],
    areaServed: { '@type': 'Country', name: 'India' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: BRAND.email,
        availableLanguage: ['en', 'hi'],
        areaServed: 'IN',
      },
    ],
  }
}

/** The WebSite node, with the sitelinks search box Google may surface. */
export function webSiteLd() {
  return {
    '@type': 'WebSite',
    '@id': url('/#website'),
    url: url('/'),
    name: BRAND.name,
    alternateName: [...BRAND.alternateNames],
    description: BRAND.shortDescription,
    inLanguage: 'en-IN',
    publisher: { '@id': url('/#organization') },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: url('/company-assessments?q={search_term_string}') },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** The product itself, so it can appear as a software entity rather than a page. */
export function softwareApplicationLd() {
  return {
    '@type': 'SoftwareApplication',
    '@id': url('/#app'),
    name: BRAND.name,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'Placement readiness assessment',
    operatingSystem: 'Web browser',
    url: url('/'),
    description: BRAND.shortDescription,
    publisher: { '@id': url('/#organization') },
    featureList: [
      'AI-scored 1000-point employability assessment',
      '50+ company-specific mock tests with real hiring patterns',
      'Real-time AI interview with voice and coding rounds',
      'Personalised placement preparation planner',
      'Verifiable, tamper-evident PDF score credential',
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      description: 'Free to begin; Pro upgrade available for full company mock access.',
    },
  }
}

export function breadcrumbLd(trail: Array<{ name: string; path: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: url(c.path),
    })),
  }
}

export function faqLd(items: Array<{ q: string; a: string }>) {
  return {
    '@type': 'FAQPage',
    '@id': url('/#faq'),
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

/** Wrap any set of nodes into a single @graph — one script tag, no duplicates. */
export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes }
}
