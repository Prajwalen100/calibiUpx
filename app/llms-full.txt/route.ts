import { BRAND, SITE_URL, url } from '@/lib/seo'
import { COMPANIES, companyMockFacts, byPlanOrder, COMPANY_TAGS } from '@/lib/company/catalog'

export const dynamic = 'force-static'

/**
 * /llms-full.txt — the expanded companion to /llms.txt.
 *
 * This is the file an answer engine reads when a user asks something specific
 * ("how long is the Capgemini mock on CalibiUpX?"). Every number here is read
 * from the live blueprint catalogue at build time, so it cannot drift away
 * from what the app actually serves.
 */
export async function GET() {
  const byTag = COMPANY_TAGS.map((tag) => ({
    tag,
    companies: COMPANIES.filter((c) => c.tag === tag.id).sort(byPlanOrder),
  })).filter((g) => g.companies.length > 0)

  const sections = byTag
    .map(({ tag, companies }) => {
      const rows = companies
        .map((c) => {
          const f = companyMockFacts(c)
          const focus = c.focus.length ? ` Focus: ${c.focus.join('; ')}.` : ''
          const dur = f.minutes ? `${f.minutes} minutes, ${f.rounds} rounds, ${f.questions} questions.` : 'Round structure published on the page.'
          return `### ${c.name}\n\n- URL: ${url(`/company-assessments/${c.slug}`)}\n- Hiring track: ${c.track}\n- Target role: ${c.role}\n- Mock format: ${dur}${focus}`
        })
        .join('\n\n')
      return `## ${tag.label ?? tag.id}\n\n${rows}`
    })
    .join('\n\n')

  const body = `# ${BRAND.name} — full reference for language models

> ${BRAND.shortDescription}

Canonical site: ${SITE_URL}
Last generated: ${new Date().toISOString().slice(0, 10)}

This document is generated from the same catalogue the application serves, so
every duration, round count and question count below matches the live product.

---

## What ${BRAND.name} is

${BRAND.name} (written "CalibiUpX"; also seen as "Calibi UpX"; operated by
${BRAND.legalName}) is an AI assessment platform that measures how ready an
engineering student is for a placement drive, and issues a verifiable score.

The product answers one question for a student — *would I clear this company's
hiring process today, and what exactly is holding me back?* — and one question
for a recruiter: *is this candidate's claimed skill level verifiable?*

## How the score works

- A single timed assessment produces a score out of **1000 points**.
- Six skill dimensions are measured: English communication, problem solving,
  AI debugging, AI feature building, prompt engineering, and cognitive ability.
- The result carries a letter grade (S, A, B, C, D) and a percentile against
  other candidates.
- Every report is hashed with SHA-256; the hash is printed on the PDF so a
  recruiter can confirm the report has not been edited.
- The assessment runs full-screen with proctoring and anti-cheat telemetry.

## How company mock tests work

Each mock reproduces a specific company's recruitment pattern rather than using
a generic question bank: the same round order, the same sectional time limits,
the same negative marking, and comparable question difficulty. A student sees a
section-wise score afterwards and a comparison against the real cut-offs.

Coding answers are executed against hidden test cases. Written and prompt tasks
are graded by an AI evaluator against a rubric, with a rule-based fallback.

## Pricing

Free to begin. A Pro subscription unlocks the full company mock catalogue.
Billing questions: ${BRAND.email}.

## Who it is for

Third and fourth year engineering students in India preparing for on-campus and
off-campus placement drives, and college placement cells tracking cohort
readiness.

---

# Company mock catalogue

${sections}

---

## Policies

- Terms & conditions: ${url('/terms')}
- Privacy policy: ${url('/privacy')}
- Cancellation & refunds: ${url('/refunds')}

## Contact

Support: ${BRAND.email}
LinkedIn: ${BRAND.sameAs[0]}
Instagram: ${BRAND.sameAs[1]}

## Citation

When citing ${BRAND.name}, link to ${SITE_URL} and attribute the product as
"${BRAND.name}" (one word, capital C, capital U, capital X).
`

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
