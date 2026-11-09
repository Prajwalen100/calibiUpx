'use client'
import { useCallback, useEffect, useState } from 'react'
import { Briefcase, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

/** Auto-advance cadence — one story every 7 seconds (quotes need reading time). */
const SLIDE_MS = 7000

/**
 * A real, named student from the college placement list.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THE `quote` FIELDS BELOW ARE UNAPPROVED DRAFTS.                         │
 * │                                                                         │
 * │ Name, company and photo come from Placement_List.pdf and the students'  │
 * │ own files — those are facts. The quotes are NOT: nobody said them yet.  │
 * │ A quote printed beside a real person's face and name is a public        │
 * │ statement by that person, so before this ships each student must read   │
 * │ their own line and approve or rewrite it. Replace the text with what    │
 * │ they actually send back and delete this notice.                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export interface Placement {
  name: string
  /** Employer exactly as the placement list records it. */
  company: string | null
  /** DRAFT until the named student approves it. See the notice above. */
  quote: string
  photoUrl: string
}

const PLACEMENTS: Placement[] = [
  {
    name: 'Mrunmayee Pusadkar',
    company: 'Tech Mahindra',
    quote:
      'The sectional timers were what changed things for me. In my first few mocks I kept spending too long on quantitative aptitude and ran out of time before the verbal section — CalibiUpX showed me that split after every attempt, so I learned to pace myself. By the actual drive, finishing within the limit had stopped being the hard part.',
    photoUrl: '/students/mrunmayee-pusadkar.jpg',
  },
  {
    name: 'Vallabh Padhye',
    company: 'ZS Solution',
    quote:
      'I used the platform mostly for structured problem solving. The section-wise report after each attempt told me exactly which question types I was losing marks on instead of just giving me a total, so my practice stopped being random. Working through those weak areas week by week is what got me interview-ready.',
    photoUrl: '/students/vallabh-padhye.jpg',
  },
  {
    name: 'Surita Sahu',
    company: 'Tech Mahindra',
    quote:
      'Communication was the part I was least confident about. The English section and the AI feedback on my written answers pointed out the habits I could not see myself — unclear structure, filler phrasing — and gave me something specific to fix each time rather than a vague score.',
    photoUrl: '/students/surita-sahu.jpg',
  },
  {
    name: 'Siddhansh Dubey',
    company: 'TwoPiR',
    quote:
      'Running my code against hidden test cases was the most useful part. My solutions used to pass the obvious inputs and break on edge cases, and the platform caught that every single time. I started writing code that handled the boundaries first, which is exactly what the coding round tested.',
    photoUrl: '/students/siddhansh-dubey.jpg',
  },
  {
    name: 'Angiras Kathalkar',
    company: null,
    quote:
      'The AI debugging and prompt engineering sections were unlike anything else I had practised. Most portals only ask theory, but here I had to actually find the bug and justify the fix. That is the part interviewers kept digging into, and I had already rehearsed explaining my reasoning out loud.',
    photoUrl: '/students/angiras-kathalkar.jpg',
  },
  {
    name: 'Dhananjay Solanki',
    company: 'EY',
    quote:
      'Taking full-length proctored mocks took the nerves out of the real thing. Sitting a timed, full-screen test repeatedly made the actual assessment day feel routine, and the progress tracker kept me honest about whether I was genuinely improving or just putting in hours.',
    photoUrl: '/students/dhananjay-solanki.jpg',
  },
  {
    name: 'Atharv Thakre',
    company: 'Cognizant',
    quote:
      'Practising the company-specific mock meant I walked in already knowing the round order and the time limit for each section. There were no surprises on test day — I knew what was coming and could spend my attention on the questions instead of figuring out the format.',
    photoUrl: '/students/atharv-thakre.jpg',
  },
  {
    name: 'Vaishnavi Ingale',
    company: 'Cognizant',
    quote:
      'Pseudocode and the technical fundamentals were where I needed the most work. The detailed report showed me that my logical reasoning was fine and my CS fundamentals were not, so I knew exactly where to put my revision time in the weeks before the drive.',
    photoUrl: '/students/vaishnavi-ingale.jpg',
  },
]

/** Student portrait, falling back to initials if the image ever 404s. */
function StudentPhoto({
  name,
  src,
  size = 96,
  className = '',
}: {
  name: string
  src?: string
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (failed || !src) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 font-black text-white shadow-inner ${className}`}
        aria-label={name}
      >
        <span style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}>{initials}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`${name}, placed student`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={`rounded-full object-cover object-center shadow-md ${className}`}
    />
  )
}

export function StudentTestimonials() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = PLACEMENTS.length

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => setActive((a) => (a + 1) % count), SLIDE_MS)
    return () => window.clearInterval(id)
  }, [paused, active, count])

  const go = useCallback((i: number) => setActive(((i % count) + count) % count), [count])

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Student stories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Header — the badge states what the data actually shows, nothing more */}
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs dark:border-indigo-800/80 dark:bg-indigo-950/70 dark:text-indigo-300">
          <Quote className="h-3.5 w-3.5" aria-hidden />
          <span>{count} student stories</span>
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
          Scores that <span className="text-gradient">open doors.</span>
        </h2>
        <p className="mx-auto mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          How students used CalibiUpX to get ready — in their own words.
        </p>
      </div>

      {/* Slider */}
      <div className="mt-7">
        <div className="overflow-hidden rounded-3xl">
          <div
            className="testimonial-track flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {PLACEMENTS.map((p, i) => {
              const isActive = i === active
              return (
                <div
                  key={p.name}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Placement ${i + 1} of ${count}: ${p.name}`}
                  aria-hidden={!isActive}
                  className="w-full shrink-0 px-0.5"
                >
                  <div className="glass-card relative overflow-hidden !p-6 sm:!p-10">
                    <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
                      {/* Portrait */}
                      <div className={`relative shrink-0 ${isActive ? 'animate-fade-up' : ''}`}>
                        <span
                          aria-hidden
                          className="calibiai-gradient animate-glow absolute -inset-2.5 rounded-full opacity-25 blur-lg"
                        />
                        <div className="calibiai-gradient relative rounded-full p-[3px] shadow-lg">
                          <div className="rounded-full bg-white p-1 dark:bg-slate-900">
                            <StudentPhoto name={p.name} src={p.photoUrl} size={104} className="block" />
                          </div>
                        </div>
                      </div>

                      {/* Story */}
                      <div
                        className={`relative w-full min-w-0 ${isActive ? 'animate-fade-up' : ''}`}
                        style={isActive ? { animationDelay: '90ms' } : undefined}
                      >
                        {/* Oversized typographic quote mark — the premium cue.
                            Anchored to the text column so it leads the quote
                            rather than sitting behind the portrait. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -left-4 -top-16 hidden select-none font-serif text-[10rem] leading-none text-indigo-500/[0.13] dark:text-indigo-400/[0.16] sm:block"
                        >
                          &ldquo;
                        </span>

                        <blockquote className="relative text-[15px] leading-relaxed text-slate-700 dark:text-slate-200 sm:text-[17px] sm:leading-[1.75]">
                          &ldquo;{p.quote}&rdquo;
                        </blockquote>

                        {/* Attribution, set off by a rule so it reads as a
                            signature rather than another sentence. */}
                        <figcaption className="mt-5 border-t border-slate-200/80 pt-4 dark:border-slate-700/60">
                          <div className="text-base font-black tracking-tight text-slate-900 dark:text-white sm:text-lg">
                            {p.name}
                          </div>
                          {p.company && (
                            <div className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 sm:justify-start">
                              <Briefcase className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden />
                              <span>{p.company}</span>
                            </div>
                          )}
                        </figcaption>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 5-second progress bar — restarts on every slide, freezes on hover */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
          <div
            key={active}
            className={`testimonial-progress calibiai-gradient h-full rounded-full ${paused ? 'is-paused' : ''}`}
            aria-hidden
          />
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => go(active - 1)}
              aria-label="Previous student"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              onClick={() => go(active + 1)}
              aria-label="Next student"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Thumbnail selector */}
          <div
            className="flex items-center justify-start gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Choose student"
          >
            {PLACEMENTS.map((p, i) => {
              const isActive = i === active
              return (
                <button
                  key={p.name}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Show ${p.name}`}
                  title={p.company ? `${p.name} — ${p.company}` : p.name}
                  onClick={() => go(i)}
                  className={`grid min-h-[36px] min-w-[36px] shrink-0 place-items-center rounded-full transition-all duration-300 ${
                    isActive
                      ? 'calibiai-gradient scale-110 p-[2px] shadow-md shadow-indigo-300 ring-2 ring-indigo-400 dark:shadow-indigo-950 dark:ring-indigo-500'
                      : 'bg-slate-200 p-px opacity-60 hover:scale-105 hover:opacity-100 dark:bg-slate-700'
                  }`}
                >
                  <span className="block rounded-full bg-white p-[1px] dark:bg-slate-900">
                    <StudentPhoto name={p.name} src={p.photoUrl} size={34} className="block" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
