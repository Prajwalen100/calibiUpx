'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { HeroMockup } from '@/components/HeroMockup'
import { useStore } from '@/lib/store'
import { Typewriter } from '@/components/Typewriter'
import { StudentTestimonials } from '@/components/StudentTestimonials'
import { Footer } from '@/components/Footer'
import { CompanyBadge } from '@/components/company/CompanyBadge'
import { COMPANY_BY_SLUG, companyMockFacts } from '@/lib/company/catalog'
import { signedInLandingRoute, afterSignInRoute } from '@/lib/nextStep'
import { breadcrumbLd, faqLd, graph, url } from '@/lib/seo'
import { isProfileComplete } from '@/lib/validate'
import { getLiveUser } from '@/lib/session'
import {
  Cpu, CalendarClock, Mic, FileCheck2, Sparkles, ArrowRight,
  Code2, Bug, Timer, Target, Route, TrendingUp,
  AudioLines, MessagesSquare, ShieldCheck, BarChart3, Share2,
  Crosshair, ScanFace, Gauge, Zap, BadgeCheck, Building2,
  Clock, Layers, ListChecks, ChevronDown, HelpCircle,
} from 'lucide-react'


const SHOWCASE_SLUGS = [
  'capgemini',
  'tcs',
  'cognizant',
  'meta',
  'google',
  'infosys',
  'accenture',
  'amazon',
  'microsoft',
  'wipro',
  'phonepe',
  'goldman-sachs',
]

const SHOWCASE_COMPANIES = SHOWCASE_SLUGS.map((slug) => COMPANY_BY_SLUG[slug]).filter(Boolean)

/**
 * One list, two consumers: the accordion rendered below and the FAQPage
 * JSON-LD emitted with it.
 *
 * They must stay identical. Structured data describing an answer the page
 * does not visibly contain is a rich-result violation, and it is also what
 * makes an answer engine distrust the source as a whole. Deriving both from
 * this single array makes divergence impossible.
 */
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What is CalibiUpX?',
    a: 'CalibiUpX is an AI placement-readiness platform for engineering students. One timed, proctored assessment scores you out of 1000 across coding, AI debugging, prompt engineering, English communication and cognitive ability, and issues a verifiable credential you can attach to your resume.',
  },
  {
    q: 'How is the 1000-point CalibiUpX score calculated?',
    a: 'Your score combines six skill dimensions: English communication, problem solving, AI debugging, AI feature building, prompt engineering and cognition. Coding answers run against hidden test cases, written and prompt tasks are graded by an AI evaluator against a rubric, and the total is reported with a letter grade from S to D plus your percentile.',
  },
  {
    q: 'Is CalibiUpX free?',
    a: 'Yes \u2014 the assessment is free to begin, and you can view a full sample report without creating an account. A Pro subscription unlocks the complete catalogue of 50+ company-specific mock tests.',
  },
  {
    q: 'Which company mock tests are available?',
    a: 'More than 50, including TCS NQT, Capgemini, Infosys, Wipro, Cognizant, Accenture, Amazon, Microsoft, Google, Meta, Goldman Sachs and PhonePe. Each mock reproduces that company\u2019s real recruitment pattern \u2014 the same round order, sectional timers, negative marking and cut-off structure.',
  },
  {
    q: 'Can recruiters verify my CalibiUpX report?',
    a: 'Yes. Every report carries a SHA-256 hash printed on the PDF, so a recruiter or placement cell can confirm the document has not been edited after it was issued.',
  },
  {
    q: 'Who is CalibiUpX for?',
    a: 'Third and fourth year engineering students preparing for on-campus and off-campus placement drives in India, and college placement cells that want a consistent measure of cohort readiness.',
  },
  {
    q: 'Is the assessment proctored?',
    a: 'Yes. It runs full-screen with anti-cheat telemetry and sectional timers, so the result reflects performance under the same pressure as a real hiring test.',
  },
]

function Landing() {
  const router = useRouter()
  const { user, profile, hydrated, setUser, reconcileForUser } = useStore()
  const sentRef = useRef(false)
  const [redirecting, setRedirecting] = useState(false)

  // A signed-in candidate should never see the marketing home page (or the login
  // screen). If they land here while authenticated — via the Supabase email
  // confirmation redirect, the browser back button or a direct URL — send them
  // smoothly to their actual next step (dashboard or onboarding).
  //
  // The cached `user`/`profile` cannot be trusted on its own: after an account
  // is deleted in Supabase and re-created, the old profile still sits in
  // localStorage and would route the "new" user straight to the dashboard. So
  // validate against Supabase Auth first, re-hydrate from the DB if the cached
  // account no longer matches, and only then route.
  useEffect(() => {
    if (!hydrated || !user || sentRef.current) return
    sentRef.current = true
    setRedirecting(true)
    ;(async () => {
      let route = signedInLandingRoute(profile)
      const live = await getLiveUser()
      if (live === null) {
        // Supabase no longer knows this account (deleted / no session) — wipe
        // the stale cache so the next sign-in starts from scratch.
        localStorage.clear()
        setUser(null)
        router.replace('/login')
        return
      }
      if (live && live.id !== user.id) {
        // The cached account belongs to a different live user — re-hydrate the
        // real one from the DB and route by its actual onboarding/result state.
        const { profile: p, hasAssessment } = await reconcileForUser(live)
        route = afterSignInRoute({ has_assessment: hasAssessment, has_onboarding: isProfileComplete(p) })
      }
      router.replace(route)
    })()
  }, [user, profile, hydrated, router, setUser, reconcileForUser])

  if (user || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-card animate-fade-up flex items-center gap-3 px-6 py-4">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Connecting to your dashboard…</span>
        </div>
      </div>
    )
  }

  const startHref = '/login'
  return (
    <div>
      {/* Home-page entities. The site-wide Organization / WebSite graph lives
          in the root layout; this adds only what is specific to this page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            graph(
              breadcrumbLd([{ name: 'Home', path: '/' }]),
              {
                '@type': 'WebPage',
                '@id': url('/#webpage'),
                url: url('/'),
                name: 'CalibiUpX — Your verified employability score for placements',
                isPartOf: { '@id': url('/#website') },
                about: { '@id': url('/#app') },
                primaryImageOfPage: { '@id': url('/#logo') },
                inLanguage: 'en-IN',
              },
              faqLd(FAQS),
            ),
          ),
        }}
      />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero — copy kept to the essentials; the MacBook window does the talking */}
        <section className="pt-8 sm:pt-16 lg:pt-20 pb-10 sm:pb-12 grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-14 items-center">
          <div className="animate-fade-up">
            <span className="chip max-w-full text-[11px] sm:text-xs text-indigo-700 border-indigo-200 bg-indigo-50/70">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> Trusted by 5k+ students · 4.9★
            </span>
            <h1 className="mt-4 sm:mt-5 text-[2rem] xs:text-4xl sm:text-5xl lg:text-[3.35rem] font-black leading-[1.12] sm:leading-[1.08] tracking-tight text-slate-900 dark:text-white min-h-[72px] sm:min-h-[92px] lg:min-h-[114px] text-balance">
              <Typewriter
                text="A smarter way to get hired in the AI era."
                highlightText="AI era."
                loopInterval={10000}
                typingDelay={50}
              />
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm sm:text-lg max-w-xl leading-relaxed">
              Assess your skills. Prove them with a verified credential.
            </p>
            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <Link href={startHref} className="btn-primary w-full sm:w-auto">Start free assessment →</Link>
              <Link href="/sample-report" className="btn-soft w-full sm:w-auto">See a sample report</Link>
            </div>

            {/* Social proof trust badge — 5k+ students, 4.9/5 rating */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2.5 overflow-hidden">
                <img
                  src="/students/dhananjay-solanki.jpg"
                  alt="Placed student"
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                />
                <img
                  src="/students/vaishnavi-ingale.jpg"
                  alt="Placed student"
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                />
                <img
                  src="/students/vallabh-padhye.jpg"
                  alt="Placed student"
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                />
                <img
                  src="/students/mrunmayee-pusadkar.jpg"
                  alt="Placed student"
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                />
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-[10px] font-black text-white ring-2 ring-white shadow-xs">
                  5k+
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400 text-xs">
                    {'★★★★★'}
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white">4.9 / 5.0 Rating</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Trusted by <span className="font-bold text-slate-700 dark:text-slate-200">5k+ students</span> across campus drives
                </p>
              </div>
            </div>


          </div>

          {/* MacBook window: typing report + self-drawing graph, ambient chart behind */}
          <HeroMockup />
        </section>

        {/* Core Pillars — four capabilities, one glance, no paragraphs */}
        <section className="py-12 sm:py-16">
          <div className="flex flex-col items-center text-center animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/90 dark:bg-indigo-950/60 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-cyan-400 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5" />
              Placement Suite
            </span>
            <h2 className="mt-3.5 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Everything you need to <span className="upx-gradient">get hired.</span>
            </h2>
          </div>

          <div className="mt-8 sm:mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              {
                icon: Cpu,
                title: 'Assessment',
                line: 'One timed test across coding, debugging, prompt craft and logic.',
                href: startHref,
                marks: [Code2, Bug, Timer],
                gradient: 'from-cyan-500 to-blue-600',
                shadow: 'shadow-cyan-500/25',
                glow: 'from-cyan-400/25 to-blue-500/5',
                hover: 'hover:border-cyan-400/60',
                accent: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
                arrow: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
              },
              {
                icon: CalendarClock,
                title: 'Planner',
                line: 'A weekly schedule built around your weak topics and target companies.',
                href: startHref,
                marks: [Target, Route, TrendingUp],
                gradient: 'from-blue-600 to-indigo-600',
                shadow: 'shadow-blue-500/25',
                glow: 'from-blue-400/25 to-indigo-500/5',
                hover: 'hover:border-blue-400/60',
                accent: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
                arrow: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
              },
              {
                icon: Mic,
                title: 'AI Interview',
                line: 'Live voice and coding rounds, scored on logic and composure.',
                href: '/interviews',
                marks: [AudioLines, Code2, MessagesSquare],
                gradient: 'from-indigo-600 to-purple-600',
                shadow: 'shadow-indigo-500/25',
                glow: 'from-indigo-400/25 to-purple-500/5',
                hover: 'hover:border-indigo-400/60',
                accent: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
                arrow: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
              },
              {
                icon: FileCheck2,
                title: 'Verified Report',
                line: 'Section analytics plus a 1000-point credential you can send to recruiters.',
                href: '/sample-report',
                marks: [ShieldCheck, BarChart3, Share2],
                gradient: 'from-purple-600 to-pink-600',
                shadow: 'shadow-purple-500/25',
                glow: 'from-purple-400/25 to-pink-500/5',
                hover: 'hover:border-purple-400/60',
                accent: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
                arrow: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
              },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <Link
                  key={f.title}
                  href={f.href}
                  className={`glass-card group relative flex gap-4 overflow-hidden !p-4 sm:!p-6 sm:flex-col sm:gap-0 transition-all duration-500 ease-out active:scale-[.99] sm:hover:-translate-y-1.5 sm:hover:shadow-2xl dark:border-slate-800/80 ${f.hover} animate-fade-up`}
                  style={{ animationDelay: `${0.07 * i}s` }}
                >
                  {/* ambient corner glow — depth without ink */}
                  <div className={`pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-gradient-to-br ${f.glow} blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-100`} />

                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-lg ${f.shadow} transition-transform duration-500 ease-out sm:group-hover:scale-110 sm:group-hover:-rotate-3`}>
                    <Icon className="h-6 w-6" strokeWidth={2.1} />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">

                  <h3 className={`text-base sm:mt-4 sm:text-lg font-black tracking-tight text-slate-900 dark:text-white transition-colors duration-300 ${f.accent}`}>
                    {f.title}
                  </h3>
                  <p className="mt-1 text-[13px] sm:mt-1.5 sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:min-h-[2.75rem]">
                    {f.line}
                  </p>

                  {/* icon proof row — what it does, without a sentence */}
                  <div className="mt-3 flex items-center justify-between sm:mt-auto sm:pt-5">
                    <div className="flex items-center gap-1.5">
                      {f.marks.map((M, j) => (
                        <span
                          key={j}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                          style={{ transitionDelay: `${j * 60}ms` }}
                        >
                          <M className="h-3.5 w-3.5" />
                        </span>
                      ))}
                    </div>
                    <ArrowRight className={`h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 transition-all duration-300 ease-out group-hover:translate-x-1 ${f.arrow}`} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* 50+ company mocks — headline, proof, one action */}
        <section className="py-10">
          <div className="glass-card !p-5 sm:!p-10 lg:!p-12 text-center animate-fade-up relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-gradient-to-br from-indigo-200/40 via-violet-200/30 to-pink-200/20 blur-3xl -z-10" />

            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/90 dark:bg-indigo-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> 50+ Company Mocks
            </span>

            <h2 className="mt-4 text-[1.6rem] xs:text-3xl sm:text-4xl font-black leading-[1.15] tracking-tight text-slate-900 dark:text-white text-balance">
              Every company tests differently.{' '}
              <span className="upx-gradient">Master each pattern.</span>
            </h2>

            {/* Companies sliding ticker */}
            <div className="mt-7 sm:mt-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 via-white to-indigo-50/30 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-indigo-950/30 p-3 sm:p-5 shadow-sm text-left">
              <div className="flex flex-nowrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 sm:h-9 sm:w-9">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <h3 className="text-[11px] sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Real blueprints
                  </h3>
                </div>
                <Link
                  href="/company-assessments"
                  className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap py-2 -my-2 text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-colors duration-300 hover:text-violet-600 dark:hover:text-violet-300"
                >
                  Explore all
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Infinite horizontal sliding marquee */}
              <div className="relative mt-4 overflow-hidden py-1">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 sm:w-12 bg-gradient-to-r from-white to-transparent dark:from-slate-900 z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-5 sm:w-12 bg-gradient-to-l from-white to-transparent dark:from-slate-900 z-10" />

                <div className="animate-marquee-track gap-3.5">
                  {[...SHOWCASE_COMPANIES, ...SHOWCASE_COMPANIES].map((company, index) => {
                    const facts = companyMockFacts(company)
                    return (
                      <Link
                        key={`${company.slug}-${index}`}
                        href={`/company-assessments/${company.slug}`}
                        className="group flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-3 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:shadow-lg"
                        title={`Take ${company.name} Mock Assessment`}
                      >
                        <CompanyBadge company={company} size={36} />
                        <div className="text-left min-w-[118px]">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100 transition-colors duration-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {company.name}
                          </span>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {facts.minutes}m
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {facts.rounds}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <ListChecks className="h-3 w-3" />
                              {facts.questions}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Three proof points — icon first, three words each */}
            <div className="mt-6 sm:mt-7 grid gap-2.5 sm:gap-3.5 text-left sm:grid-cols-3">
              {[
                {
                  icon: Crosshair,
                  title: 'Exact patterns',
                  line: 'TCS · Capgemini · Meta',
                  plate: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border-indigo-100/80 dark:border-indigo-800/60',
                  hover: 'hover:border-indigo-300 dark:hover:border-indigo-500/60',
                  accent: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
                },
                {
                  icon: ScanFace,
                  title: 'Proctored timing',
                  line: 'Real exam pressure',
                  plate: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 border-violet-100/80 dark:border-violet-800/60',
                  hover: 'hover:border-violet-300 dark:hover:border-violet-500/60',
                  accent: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
                },
                {
                  icon: Gauge,
                  title: 'Instant score',
                  line: '1000-point credential',
                  plate: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border-emerald-100/80 dark:border-emerald-800/60',
                  hover: 'hover:border-emerald-300 dark:hover:border-emerald-500/60',
                  accent: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
                },
              ].map((v) => {
                const Icon = v.icon
                return (
                  <div
                    key={v.title}
                    className={`group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 p-3.5 sm:p-4 shadow-xs transition-all duration-300 ease-out sm:hover:-translate-y-1 sm:hover:shadow-lg ${v.hover}`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-transform duration-300 ease-out group-hover:scale-110 ${v.plate}`}>
                      <Icon className="h-5 w-5" strokeWidth={2.1} />
                    </div>
                    <div>
                      <h4 className={`text-sm font-black text-slate-900 dark:text-slate-100 transition-colors duration-300 ${v.accent}`}>
                        {v.title}
                      </h4>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {v.line}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* One decision: a single primary action */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href={startHref}
                className="btn-primary group w-full sm:w-auto !px-9 !py-3.5 text-sm sm:text-base font-black shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 transition-transform duration-300 ease-out sm:hover:scale-[1.03] active:scale-[0.98]"
              >
                Start free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </Link>
              <Link
                href="/company-assessments"
                className="group inline-flex items-center gap-1.5 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors duration-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Browse 50+ mocks
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Trust row — icons carry the reassurance */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-violet-500" /> Proctored
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified report
              </span>
            </div>
          </div>
        </section>

        {/* Student testimonials — auto-sliding carousel, 5s per story */}
        <section className="pt-10 pb-16">
          <StudentTestimonials />
        </section>
        {/* FAQ — last section before the footer: the reader has seen the
            product and the proof, and this is where remaining objections get
            answered. Built from <details> so every answer is in the DOM at
            load, for crawlers and LLMs that do not run JavaScript. */}
        <section id="faq" className="scroll-mt-24 pb-16 pt-6 sm:pb-20 sm:pt-10">
          <div className="flex flex-col items-center text-center animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/90 dark:bg-indigo-950/60 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-cyan-400 shadow-2xs">
              <HelpCircle className="h-3.5 w-3.5" />
              Questions
            </span>
            <h2 className="mt-3.5 text-[1.75rem] xs:text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white text-balance">
              Everything, <span className="upx-gradient">answered.</span>
            </h2>
          </div>

          {/* One panel with hairline dividers reads as a considered document;
              separate floating cards read as a list of widgets. */}
          <div className="mx-auto mt-8 max-w-3xl sm:mt-10">
            <div className="glass-card divide-y divide-slate-200/70 overflow-hidden !p-0 dark:divide-slate-800/80 dark:border-slate-800/80">
              {FAQS.map((f, i) => (
                <details
                  key={f.q}
                  open={i === 0}
                  className="group animate-fade-up transition-colors duration-300 open:bg-indigo-50/40 dark:open:bg-indigo-950/20"
                  style={{ animationDelay: `${0.04 * i}s` }}
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3.5 px-4 py-4 text-left sm:gap-5 sm:px-7 sm:py-5 [&::-webkit-details-marker]:hidden">
                    {/* Index number — quiet typographic detail that makes the
                        set feel curated rather than dumped in. */}
                    <span className="mt-0.5 shrink-0 font-mono text-[11px] font-bold tabular-nums text-slate-300 transition-colors duration-300 group-open:text-indigo-500 dark:text-slate-600 dark:group-open:text-cyan-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm font-bold text-slate-900 transition-colors duration-300 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-cyan-300 sm:text-[15px]">
                      {f.q}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ease-out group-open:rotate-180 group-open:text-indigo-600 dark:group-open:text-cyan-400"
                    />
                  </summary>
                  {/* The accent rail aligns the answer under the question and
                      marks the open row without shouting. */}
                  <div className="px-4 pb-5 pl-[2.6rem] sm:px-7 sm:pb-6 sm:pl-[4.3rem]">
                    <p className="border-l-2 border-indigo-200 pl-4 text-[13px] leading-relaxed text-slate-600 dark:border-indigo-500/40 dark:text-slate-400 sm:text-sm sm:leading-[1.7]">
                      {f.a}
                    </p>
                  </div>
                </details>
              ))}
            </div>

            {/* Catch the reader whose question is not on the list. */}
            <div className="mt-5 flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-3">
              <span className="text-[13px] text-slate-500 dark:text-slate-400">
                Still have a question?
              </span>
              <a
                href="mailto:support@calibiai.com"
                className="group inline-flex min-h-[32px] items-center gap-1.5 text-[13px] font-bold text-indigo-600 transition-colors duration-300 hover:text-violet-600 dark:text-indigo-400 dark:hover:text-violet-300"
              >
                Talk to our team
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}

export default function Page() {
  return <Landing />
}
