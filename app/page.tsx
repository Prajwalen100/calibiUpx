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
import { isProfileComplete } from '@/lib/validate'
import { getLiveUser } from '@/lib/session'
import { Cpu, CalendarClock, Mic, FileCheck2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'


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
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero — copy kept to the essentials; the MacBook window does the talking */}
        <section className="pt-12 sm:pt-20 pb-12 grid lg:grid-cols-2 gap-14 items-center">
          <div className="animate-fade-up">
            <span className="chip text-indigo-700 border-indigo-200 bg-indigo-50/70">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Trusted by 5k+ students · 4.9★ rating
            </span>
            <h1 className="mt-4 sm:mt-5 text-4xl sm:text-5xl lg:text-[3.35rem] font-black leading-[1.08] tracking-tight text-slate-900 dark:text-white min-h-[75px] sm:min-h-[92px] lg:min-h-[114px]">
              <Typewriter
                text="A smarter way to get hired in the AI era."
                highlightText="AI era."
                loopInterval={10000}
                typingDelay={50}
              />
            </h1>
            <p className="mt-2.5 sm:mt-3 text-slate-600 dark:text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Assess your real-world skills, elevate your placement readiness, and get hired with AI-verified credentials top employers trust.
            </p>
            <div className="mt-6 sm:mt-7 flex flex-wrap gap-3">
              <Link href={startHref} className="btn-primary">Start your free assessment →</Link>
              <Link href="/sample-report" className="btn-soft">See a sample report</Link>
            </div>

            {/* Social proof trust badge — 5k+ students, 4.9/5 rating */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2.5 overflow-hidden">
                <img
                  src="/testimonials/rohan-deshmukh.jpg"
                  alt="Student"
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                />
                <img
                  src="/testimonials/ananya-sharma.jpg"
                  alt="Student"
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                />
                <img
                  src="/testimonials/aditya-verma.jpg"
                  alt="Student"
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                />
                <img
                  src="/testimonials/sneha-kulkarni.jpg"
                  alt="Student"
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

        {/* Core Pillars — AI Assessment, AI Planner, Real-Time AI Interview, Instant Reports */}
        <section className="py-12 sm:py-16">
          <div className="flex flex-col items-center text-center animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/90 dark:bg-indigo-950/60 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-cyan-400 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-cyan-400" />
              Complete Placement Suite
            </span>
            <h2 className="mt-3.5 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Everything you need to <span className="upx-gradient">get hired.</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Diagnostic assessments, intelligent preparation roadmaps, simulated interview rounds, and instant verified credentials.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Cpu,
                tag: 'Adaptive Testing',
                title: 'AI-Powered Assessment',
                desc: 'Multi-skill timed diagnostic spanning algorithmic coding, AI debugging, prompt engineering, and cognitive depth with anti-cheat telemetry.',
                badge: '6 Skill Dimensions',
                gradient: 'from-cyan-500 to-blue-600',
                borderHover: 'hover:border-cyan-400/60',
                glow: 'from-cyan-400/20 to-blue-500/10',
                shadow: 'shadow-cyan-500/20',
                tagBg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60',
              },
              {
                icon: CalendarClock,
                tag: 'Personalized Path',
                title: 'AI Placement Planner',
                desc: 'Smart diagnostic study schedules that analyze your weak topics, benchmark your pace, and build customized roadmaps for target companies.',
                badge: 'Targeted Prep Tracks',
                gradient: 'from-blue-600 to-indigo-600',
                borderHover: 'hover:border-blue-400/60',
                glow: 'from-blue-400/20 to-indigo-500/10',
                shadow: 'shadow-blue-500/20',
                tagBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
              },
              {
                icon: Mic,
                tag: 'Live Voice & Code',
                title: 'Real-Time AI Interview',
                desc: 'Realistic interactive voice and coding simulations with instantaneous AI evaluating verbal communication, logic, and interview composure.',
                badge: 'Conversational Feedback',
                gradient: 'from-indigo-600 to-purple-600',
                borderHover: 'hover:border-indigo-400/60',
                glow: 'from-indigo-400/20 to-purple-500/10',
                shadow: 'shadow-indigo-500/20',
                tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
              },
              {
                icon: FileCheck2,
                tag: 'Tamper-Proof Credential',
                title: 'Instant Verified Reports',
                desc: 'Generate immediate section analytics and cryptographic 1000-point PDF credentials ready to attach to resumes or send to recruiters.',
                badge: 'Shareable PDF Hash',
                gradient: 'from-purple-600 to-pink-600',
                borderHover: 'hover:border-purple-400/60',
                glow: 'from-purple-400/20 to-pink-500/10',
                shadow: 'shadow-purple-500/20',
                tagBg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
              },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className={`glass-card group relative flex flex-col justify-between overflow-hidden !p-6 sm:!p-7 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl dark:border-slate-800/80 ${f.borderHover} animate-fade-up`}
                  style={{ animationDelay: `${0.08 * i}s` }}
                >
                  {/* Subtle top corner ambient glow */}
                  <div className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${f.glow} blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-50`} />

                  <div>
                    {/* Top row: Icon plate + Category Tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-md ${f.shadow} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${f.tagBg}`}>
                        {f.tag}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-5 text-lg font-black tracking-tight text-slate-900 dark:text-white transition-colors duration-200 group-hover:text-indigo-600 dark:group-hover:text-cyan-400">
                      {f.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {f.desc}
                    </p>
                  </div>

                  {/* Bottom pill tag */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {f.badge}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-cyan-400" />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Assessment CTA & 50+ Company Mocks Showcase */}
        <section className="py-10">
          <div className="glass-card !p-8 sm:!p-12 text-center animate-fade-up relative overflow-hidden">
            {/* Subtle ambient background glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-gradient-to-br from-indigo-200/40 via-violet-200/30 to-pink-200/20 blur-3xl -z-10" />

            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/90 dark:bg-indigo-950/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> 50+ Exam-Oriented Company Mocks
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Every company tests differently.{' '}
              <span className="upx-gradient">Master each pattern.</span>
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              No generic question banks. Replicate authentic recruitment blueprints — from game-based aptitude to algorithmic stress tests — with sectional timers, negative marking, and real hiring cutoffs.
            </p>


            {/* 50+ Companies sliding ticker */}
            <div className="mt-9 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 via-white to-indigo-50/30 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-indigo-950/30 p-4 sm:p-5 shadow-sm text-left">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/80 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-base text-white shadow-xs" aria-hidden>🏢</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      50+ Company-Specific Hiring Mocks
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Exact test blueprints for Capgemini, TCS, Cognizant, Meta, Google, Infosys &amp; more
                    </p>
                  </div>
                </div>
                <Link
                  href="/company-assessments"
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-violet-600 dark:hover:text-violet-300 transition"
                >
                  Explore all 50+ companies <span aria-hidden>→</span>
                </Link>
              </div>

              {/* Infinite horizontal sliding marquee */}
              <div className="relative mt-4 overflow-hidden py-1">
                {/* Gradient edge fades */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 to-transparent z-10" />

                <div className="animate-marquee-track gap-3.5">
                  {[...SHOWCASE_COMPANIES, ...SHOWCASE_COMPANIES].map((company, index) => {
                    const facts = companyMockFacts(company)
                    return (
                      <Link
                        key={`${company.slug}-${index}`}
                        href={`/company-assessments/${company.slug}`}
                        className="group flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-3 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:shadow-md"
                        title={`Take ${company.name} Mock Assessment`}
                      >
                        <CompanyBadge company={company} size={36} />
                        <div className="text-left min-w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {company.name}
                            </span>
                            <span className="rounded bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.2 text-[9px] font-black text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60">
                              Pattern Mock
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400 max-w-[155px]">
                            {company.track}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 dark:text-slate-400">
                            <span>⏱ {facts.minutes}m</span>
                            <span>·</span>
                            <span>{facts.rounds} rounds</span>
                            <span>·</span>
                            <span>{facts.questions} Qs</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Why candidates use this platform — 3 value cards */}
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
              <div className="group rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-xs border border-indigo-100/80 dark:border-indigo-800/60 transition group-hover:scale-110">
                  <span className="text-xl" aria-hidden>🎯</span>
                </div>
                <h4 className="mt-3.5 text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  100% Pattern-Accurate Mocks
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Replicating the exact recruitment patterns of TCS NQT, Capgemini, Cognizant, Meta, and 50+ companies. Sectional cutoffs, negative markings, and authentic question difficulty.
                </p>
              </div>

              <div className="group rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 shadow-xs border border-violet-100/80 dark:border-violet-800/60 transition group-hover:scale-110">
                  <span className="text-xl" aria-hidden>⏱️</span>
                </div>
                <h4 className="mt-3.5 text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                  Real Proctored Simulation
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Timed environments with strict full-screen anti-cheat proctoring. Experience real hiring pressure beforehand so you walk into campus and off-campus drives fully prepared.
                </p>
              </div>

              <div className="group rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 p-5 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-100/80 dark:border-emerald-800/60 transition group-hover:scale-110">
                  <span className="text-xl" aria-hidden>📊</span>
                </div>
                <h4 className="mt-3.5 text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  Instant AI Feedback &amp; Score
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Automatic code execution on hidden stress tests, section-wise score analytics, and a verified 1000-point CalibiUpX credential you can attach directly to your resume.
                </p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href={startHref}
                className="btn-primary !px-8 !py-3.5 text-sm sm:text-base font-black shadow-xl shadow-indigo-200 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Start your free assessment →
              </Link>
              <Link
                href="/company-assessments"
                className="btn-soft !px-6 !py-3.5 text-sm font-bold transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Explore 50+ company mocks →
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-400 font-medium">
              Free to begin · Authentic company pattern mocks · Sectional cutoffs · Instant verified report
            </p>
          </div>
        </section>

        {/* Student testimonials — auto-sliding carousel, 5s per story */}
        <section className="pt-10 pb-16">
          <StudentTestimonials />
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default function Page() {
  return <Landing />
}
