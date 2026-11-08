/**
 * Mentorly's AI layers.
 *
 * Accuracy rule: the MODEL NEVER COMPUTES NUMBERS. Every figure Mentorly says
 * is derived deterministically here from the snapshot and handed to the model
 * inside a `FACTS` block, with an instruction to use only those numbers. This
 * is what keeps a conversational coach from hallucinating a score or a gap.
 *
 * Each intent is a thin layer: the same snapshot, a tailored system prompt,
 * and (where it matters) extra pre-computed facts — point-to-next-grade,
 * weakest skills, per-company gaps. Add a new layer by adding an intent, a
 * fact builder, and a prompt; everything else (route, dock, persistence) is
 * shared.
 */
import { calibiGrade } from '../calibiScore.ts'
import type { MentorlyIntent, StudentSnapshot } from './types.ts'

const GRADE_FLOOR: Record<string, number> = { D: 0, C: 400, B: 600, A: 750, S: 900 }
const NEXT_GRADE: Record<string, string> = { D: 'C', C: 'B', B: 'A', A: 'S' }

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Points on the 1000 scale needed to reach the next grade band. */
export function pointsToNextGrade(score: number | null): { nextGrade: string; pointsNeeded: number } | null {
  if (score == null) return null
  const grade = calibiGrade(score)
  const next = NEXT_GRADE[grade]
  if (!next) return null
  return { nextGrade: next, pointsNeeded: Math.max(0, GRADE_FLOOR[next] - score) }
}

/**
 * The deterministic FACTS block. Compact, labelled, and the ONLY place the
 * model is allowed to get numbers from.
 */
export function factsBlock(snap: StudentSnapshot, intent: MentorlyIntent): string {
  const lines: string[] = []
  const s = snap.student
  const who = [
    s.firstName ? `name: ${s.firstName}` : null,
    s.degree ? `degree: ${s.degree}` : null,
    s.graduationYear ? `graduating: ${s.graduationYear}` : null,
    s.cgpa != null ? `CGPA: ${s.cgpa}` : null,
  ].filter(Boolean).join(', ')
  if (who) lines.push(`STUDENT: ${who}`)

  // CalibiAI Score + grade progression
  if (snap.calibi.score != null) {
    lines.push(`CALIBI_SCORE: ${snap.calibi.score}/1000 (grade ${snap.calibi.grade}, ${snap.calibi.percent}% avg over ${snap.calibi.assessmentsCount} graded assessment(s))`)
    const next = pointsToNextGrade(snap.calibi.score)
    if (next && next.pointsNeeded > 0) {
      lines.push(`NEXT_GRADE: ${next.pointsNeeded} points to reach grade ${next.nextGrade}`)
    }
  } else {
    lines.push('CALIBI_SCORE: none yet — the student has not completed a graded assessment.')
  }

  // Assessments
  if (snap.assessments.length) {
    lines.push('ASSESSMENTS (newest first): ' + snap.assessments
      .slice(0, 12)
      .map((a) => `${a.label} ${a.percent}%${a.outcome ? ` (${a.outcome})` : ''}`)
      .join('; '))
  }

  // Skills — weakest first (always useful context)
  if (snap.skills.length) {
    const weak = snap.skills.slice(0, 6).map((k) => `${k.name} ${k.score}%`).join(', ')
    const strong = snap.skills.slice(-3).reverse().map((k) => `${k.name} ${k.score}%`).join(', ')
    lines.push(`WEAKEST_SKILLS: ${weak}`)
    if (strong) lines.push(`STRONGEST_SKILLS: ${strong}`)
  }

  // Category breakdown
  if (snap.categories.length) {
    lines.push('CATEGORIES: ' + snap.categories.map((c) => `${c.label} ${c.percent}%`).join(', '))
  }

  // Intent-specific extra facts
  if (intent === 'company') {
    const attempted = snap.companies.filter((c) => c.attempted)
    const notYet = snap.companies.filter((c) => !c.attempted)
    if (attempted.length) {
      lines.push('COMPANY_ATTEMPTS: ' + attempted
        .map((c) => `${c.name} ${c.attemptScore ?? 0}/100${c.verdict ? ` (${c.verdict})` : ''}`)
        .join('; '))
    }
    if (notYet.length) {
      lines.push('TOP_COMPANIES_NOT_ATTEMPTED: ' + notYet
        .map((c) => `${c.name} [P${c.priority}; focus: ${c.focus.join(', ')}]`)
        .join('; '))
    }
  }

  if (intent === 'resume') {
    if (snap.resume.exists) {
      lines.push(`RESUME_SCORE: ${snap.resume.score ?? 'n/a'}/100`)
      if (snap.resume.strengths.length) lines.push('RESUME_STRENGTHS: ' + snap.resume.strengths.join('; '))
      if (snap.resume.gaps.length) lines.push('RESUME_GAPS: ' + snap.resume.gaps.join('; '))
      if (snap.resume.suggestions.length) lines.push('RESUME_SUGGESTIONS: ' + snap.resume.suggestions.join('; '))
    } else {
      lines.push('RESUME: not uploaded yet.')
    }
    lines.push(`RESUME_LINKS: linkedin=${s.hasLinkedin ? 'yes' : 'no'}, github=${s.hasGithub ? 'yes' : 'no'}`)
  }

  if (intent === 'plan') {
    lines.push('WEAK_AREAS_FOR_PLAN: ' + (snap.skills.slice(0, 5).map((k) => `${k.name} (${k.score}%)`).join(', ') || 'n/a'))
    const targets = snap.companies.filter((c) => !c.attempted).slice(0, 4).map((c) => c.name)
    if (targets.length) lines.push('SUGGESTED_TARGETS: ' + targets.join(', '))
  }

  return lines.join('\n')
}

const BASE_RULES = `You are Mentorly, an AI placement coach inside the CalibiUpX student platform.
You help final-year Indian engineering students get placement-ready.

HARD RULES:
- Use ONLY the numbers in the FACTS block. Never invent or estimate a score, percentage, rank or count. If a number is not in FACTS, say you don't have it yet.
- Be specific and personal: cite the student's actual weak skills and scores from FACTS.
- Be concise and warm. Prefer short paragraphs and tight bullet lists. No fluff, no empty praise.
- Give concrete, do-this-next actions, not generic advice.
- Never claim an offer, guarantee a job, or quote a company cutoff you were not given.
- If the student has no assessments yet, encourage them to take one and explain what it unlocks.
- Format with simple Markdown (bullets, **bold**). Keep replies under ~200 words unless asked for a full plan.`

const INTENT_PROMPT: Record<MentorlyIntent, string> = {
  chat: `${BASE_RULES}

Answer the student's question directly, grounded in their FACTS.`,

  score: `${BASE_RULES}

TASK: Analyse the student's CalibiAI Score. Explain in plain language where they stand, which assessments and skills are pulling the average down (name them with their %), and the exact points needed for the next grade (from NEXT_GRADE). Then give 3 prioritised, concrete actions that would raise the score fastest.`,

  company: `${BASE_RULES}

TASK: Assess company readiness. Compare the student's skills/scores to what their target companies emphasise (from FACTS). Say which companies they look ready for, which need work (and exactly which skills), and recommend the best 2-3 to prepare for next, given their priority and the student's gaps.`,

  plan: `${BASE_RULES}

TASK: Build a focused, realistic weekly prep plan aimed at the student's weak areas and suggested target companies. Structure it as Week 1, Week 2, ... with 3-5 concrete tasks each (e.g. "2 timed TCS mocks", "revise DBMS joins — you're at 33%"). Tie tasks to the actual weak skills in FACTS. End with one sentence on how to track progress on CalibiUpX.`,

  resume: `${BASE_RULES}

TASK: Coach the student's resume. Use RESUME_SCORE, RESUME_GAPS and RESUME_SUGGESTIONS from FACTS. Give the 3 highest-impact fixes, and rewrite one weak area into the Google XYZ format ("Accomplished X as measured by Y, by doing Z"). If no resume is uploaded, tell them to upload one and what a strong bullet looks like.`,
}

/** The system prompt for a given layer, with the deterministic facts embedded. */
export function buildSystemPrompt(snap: StudentSnapshot, intent: MentorlyIntent, memory?: string | null): string {
  const mem = (memory || '').trim()
  const memorySection = mem
    ? `\n\nLONG-TERM MEMORY (what you already know about this student from past sessions — use it for continuity and to avoid repeating advice, but ALWAYS trust the FACTS block for any number):\n${mem}`
    : ''
  return `${INTENT_PROMPT[intent] || INTENT_PROMPT.chat}

FACTS (the only source of numbers you may use):
${factsBlock(snap, intent)}${memorySection}`
}

/**
 * Deterministic, model-free fallback replies. Used when no LLM key is
 * configured or the model call fails — the coach still gives accurate,
 * grounded guidance from the snapshot, never a dead end.
 */
export function heuristicReply(snap: StudentSnapshot, intent: MentorlyIntent): string {
  const name = snap.student.firstName ? `${snap.student.firstName}, ` : ''
  if (snap.calibi.score == null && intent !== 'resume') {
    return `${name}you haven't completed a graded assessment yet, so I can't analyse your score. Take any company mock or the CalibiAI assessment from your dashboard — once it's graded I can show your weak skills and build a prep plan around them.`
  }
  const weak = snap.skills.slice(0, 3).map((k) => `**${k.name}** (${k.score}%)`).join(', ')

  if (intent === 'score') {
    const next = pointsToNextGrade(snap.calibi.score)
    const push = next && next.pointsNeeded > 0 ? ` You need **${next.pointsNeeded} more points** to reach grade ${next.nextGrade}.` : ''
    return `${name}your CalibiAI Score is **${snap.calibi.score}/1000** (grade ${snap.calibi.grade}).${push}\n\nYour weakest areas are ${weak || 'not measured yet'}. Focus practice there first — they move the average the most. Retake the mocks where you scored lowest and aim to close the gap in those sections.`
  }
  if (intent === 'company') {
    const notYet = snap.companies.filter((c) => !c.attempted).slice(0, 3).map((c) => `**${c.name}**`).join(', ')
    const done = snap.companies.filter((c) => c.attempted).map((c) => `${c.name} (${c.attemptScore ?? 0}/100)`).join(', ')
    return `${name}here's your company readiness.${done ? `\n\nAttempted: ${done}.` : ''}${notYet ? `\n\nStrong next targets: ${notYet}. Start with these — they're high priority and you haven't attempted them.` : ''}\n\nYour weakest skills to shore up first: ${weak || 'n/a'}.`
  }
  if (intent === 'plan') {
    return `${name}here's a focused 2-week starter plan:\n\n**Week 1** — drill your weakest areas: ${weak || 'your lowest-scoring sections'}. Do 2 timed company mocks and review every wrong answer.\n**Week 2** — take 3 more mocks on your top target companies, then retake your lowest-scoring one to measure improvement.\n\nTrack your CalibiAI Score on the dashboard after each mock to see the lift.`
  }
  if (intent === 'resume') {
    if (!snap.resume.exists) {
      return `${name}you haven't uploaded a resume yet. Upload one from your dashboard and I'll score it and give targeted fixes. Tip: every bullet should follow **"Accomplished X, as measured by Y, by doing Z"** — lead with impact and numbers.`
    }
    const fixes = snap.resume.suggestions.slice(0, 3).map((x) => `- ${x}`).join('\n')
    return `${name}your resume scores **${snap.resume.score ?? 'n/a'}/100**.\n\nTop fixes:\n${fixes || '- Add quantified outcomes to every bullet.'}\n\nRewrite vague bullets into "Accomplished X as measured by Y, by doing Z" — numbers first.`
  }
  // generic chat
  return `${name}your CalibiAI Score is **${snap.calibi.score}/1000** (grade ${snap.calibi.grade}) across ${snap.calibi.assessmentsCount} assessment(s). Weakest areas: ${weak || 'not measured yet'}. Ask me to analyse your score, check company readiness, build a prep plan, or improve your resume.`
}
