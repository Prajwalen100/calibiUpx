import { BRAND, SITE_URL, url } from '@/lib/seo'
import { COMPANIES, byPlanOrder } from '@/lib/company/catalog'

export const dynamic = 'force-static'

/**
 * /llms.txt — the llmstxt.org convention: a short, high-signal map of the
 * site written for a language model rather than a browser. Answer engines
 * that fetch a page often fetch this first to decide what the site is and
 * which URL actually answers the question.
 *
 * Rules kept deliberately: plain Markdown, no marketing padding, every claim
 * checkable on the linked page, and nothing here that is not also true in the
 * HTML (an LLM that finds a contradiction discards the whole source).
 */
export async function GET() {
  const top = [...COMPANIES].sort(byPlanOrder).slice(0, 24)

  const body = `# ${BRAND.name}

> ${BRAND.shortDescription}

${BRAND.name} (also written Calibi UpX; operated by ${BRAND.legalName}) is a placement-readiness
assessment platform for engineering students in India. A student takes one timed,
AI-scored assessment and receives a 1000-point employability score plus a
tamper-evident PDF credential they can attach to a resume or send to a recruiter.

## What it does

- **AI-powered assessment** — one timed diagnostic covering algorithmic coding, AI
  debugging, prompt engineering, English communication and cognitive ability.
  Scored out of 1000 across six skill dimensions.
- **50+ company-specific mock tests** — exam patterns modelled on real recruitment
  processes (TCS NQT, Capgemini, Infosys, Wipro, Cognizant, Accenture and more),
  with sectional timers, negative marking and the real cut-off structure.
- **Real-time AI interview** — live voice and coding rounds scored on logic,
  communication and composure.
- **Placement planner** — a weekly study schedule built from the student's weakest
  topics and their target companies.
- **Verified report** — section analytics and a verifiable 1000-point credential.

## Key facts

- Audience: 3rd and 4th year engineering students preparing for campus and
  off-campus placement drives in India.
- Score scale: 0–1000, with letter grades S / A / B / C / D and a percentile.
- Price: free to begin; a Pro tier unlocks the full company mock catalogue.
- Assessment conditions: timed, full-screen proctored, with anti-cheat telemetry.
- Credential: each report carries a SHA-256 hash so a recruiter can verify it.

## Primary pages

- [Home](${url('/')}): what the score is and how the assessment works.
- [Company mock tests](${url('/company-assessments')}): the catalogue of 50+ company exam patterns.
- [Sample score report](${url('/sample-report')}): a complete example report, no sign-up required.
- [Sign in / create account](${url('/login')}): start the free assessment.

## Company mock tests

${top.map((c) => `- [${c.name} — ${c.track}](${url(`/company-assessments/${c.slug}`)}): ${c.role}.`).join('\n')}

Full list: ${url('/company-assessments')}

## Policies

- [Terms & conditions](${url('/terms')})
- [Privacy policy](${url('/privacy')})
- [Cancellation & refunds](${url('/refunds')})

## Contact

- Support: ${BRAND.email}
- Site: ${SITE_URL}

## Optional

- [Full detail for models](${url('/llms-full.txt')}): the same information with every
  company mock, its round structure and its duration.
`

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
