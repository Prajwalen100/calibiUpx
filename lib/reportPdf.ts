/* ------------------------------------------------------------------ */
/* CalibiAI report -> PDF builder (client-side, jsPDF)                 */
/*                                                                    */
/* A clean, branded, multi-page A4 report:                            */
/*   1. Header band on every page: CalibiAI logo + wordmark, report   */
/*      title, candidate name, page number                            */
/*   2. Page 1 — hero score card (total / grade / percentile / tier), */
/*      candidate profile card, skills chips, module performance bars */
/*   3. Page 2+ — English sub-skills tiles, objective accuracy,       */
/*      behavioural traits, AI feedback & improvement areas           */
/*   4. Footer on every page with the CalibiAI logo                   */
/*                                                                    */
/* Used by the student dashboard, ReportModal pop-up, profile page    */
/* and the sample report, so every download looks identical.          */
/* The logo is fetched from /icon-512.png at generation time (the     */
/* brand mark also used in the navbar) and embedded into the PDF.     */
/* ------------------------------------------------------------------ */
'use client'

import { platformAssessmentSkills, companyAssessmentSkills, rollupAssessmentSkills } from './assessmentSkills.ts'
import { calibiFromSources, calibiGrade, type CalibiScore, type ScoreEntry } from './calibiScore.ts'

export type SectionDatum = {
  key: string
  label: string
  score: number
  max: number
  pct: number
  note?: string
}

/** Normalise one section of the score payload. */
export function num(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Readable name + note for every scored section of the Capgemini mock. */
function reportSections2(scores: any): SectionDatum[] {
  const eng = scores?.english || {}
  const cog = scores?.cognitive || {}
  const detail = scores?.detail || {}
  // The five stages of the Capgemini "Assessment Journey".
  const sections: Omit<SectionDatum, 'pct'>[] = [
    {
      key: 'english', label: 'English Communication', score: num(eng.total), max: 200,
      note: `Listening ${num(eng.listening)} · Speaking ${num(eng.speaking)} · Reading ${num(eng.reading)} · Writing ${num(eng.writing)} (each /50)`,
    },
    {
      key: 'ai_literacy', label: 'Technical Module — AI Literacy', score: num(scores?.ai_literacy), max: 250,
      note: num(detail.aiLiteracyTotal) ? `${num(detail.aiLiteracyCorrect)} / ${num(detail.aiLiteracyTotal)} scenario questions correct` : '',
    },
    {
      key: 'debugging', label: 'Debugging Assessment', score: num(scores?.debugging_total), max: 200,
      note: `Code MCQs ${num(scores?.debug_mcq)}/120${num(detail.debugMcqTotal) ? ` (${num(detail.debugMcqCorrect)}/${num(detail.debugMcqTotal)} correct)` : ''} · Debugging Lab ${num(scores?.debug_lab)}/80`,
    },
    {
      key: 'ai_coding', label: 'AI-assisted Coding', score: num(scores?.ai_coding), max: 200,
      note: 'AI-assisted build task · in-built compiler hidden tests + AI rubric',
    },
    {
      key: 'cognitive', label: 'Cognitive Assessment', score: num(cog.total), max: 150,
      note: `Motion & Grid ${num(cog.grid)}/40 · Logical reasoning ${num(cog.logical)}/50 · Behavioural ${num(cog.behavioural)}/60`,
    },
  ]
  return sections.map(s => ({ ...s, pct: s.max ? Math.round((s.score / s.max) * 100) : 0 }))
}

/** Readable name + English/behavioural note for every scored section. */
export function reportSections(scores: any): SectionDatum[] {
  // The Capgemini 2027 mock has its own five-stage layout.
  if (Number(scores?.assessment_no) === 2) return reportSections2(scores)
  const eng = scores?.english || {}
  const cog = scores?.cognitive || {}
  const detail = scores?.detail || {}
  const sections: Omit<SectionDatum, 'pct'>[] = [
    {
      key: 'english', label: 'English Communication', score: num(eng.total), max: 200,
      note: `Listening ${num(eng.listening)} · Speaking ${num(eng.speaking)} · Reading ${num(eng.reading)} · Writing ${num(eng.writing)} (each /50)`,
    },
    {
      key: 'problem_solving', label: 'Problem Solving', score: num(scores?.problem_solving), max: 200,
      note: num(detail.problemTotal) ? `${num(detail.problemCorrect)} / ${num(detail.problemTotal)} problems solved correctly` : '',
    },
    { key: 'ai_debugging', label: 'AI Debugging', score: num(scores?.ai_debugging), max: 150, note: '3 bug-fix tasks · hidden tests + AI rubric' },
    { key: 'ai_feature', label: 'AI Feature Development', score: num(scores?.ai_feature), max: 150, note: 'Build task · functionality + design quality' },
    { key: 'prompt_engineering', label: 'Prompt Engineering', score: num(scores?.prompt_engineering), max: 100, note: '3 prompts · AI-rubric scored' },
    {
      key: 'cognitive', label: 'Cognitive Assessment', score: num(cog.total), max: 200,
      note: `Grid ${num(cog.grid)}/30 · Logical reasoning ${num(cog.logical)} · Behavioural ${num(cog.behavioral_total)}`,
    },
  ]
  return sections.map(s => ({ ...s, pct: s.max ? Math.round((s.score / s.max) * 100) : 0 }))
}

/** AI task key -> friendly label. */
export function aiTaskLabel(key: string): string {
  const map: Record<string, string> = {
    WRITING: 'Writing Task', SP_speaking: 'Speaking Task',
    AD1: 'Debugging — Pagination', AD2: 'Debugging — Race condition', AD3: 'Debugging — List mutation',
    AF1: 'Feature — Rate limiter', AF2: 'Feature — Retry logic',
    CG1: 'Lab — First repeated character', CG2: 'Lab — Array rotation', CG3: 'Lab — Binary search first position', CG4: 'AI-assisted Coding — Merge intervals',
    PE1: 'Prompt — Summary', PE2: 'Prompt — CSV dedup', PE3: 'Prompt — Email critique',
  }
  return map[key] || String(key).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function tierFor(total: number): { label: string; color: [number, number, number] } {
  const t = num(total)
  if (t >= 800) return { label: 'Platinum', color: [15, 118, 110] }
  if (t >= 600) return { label: 'Gold', color: [180, 83, 9] }
  if (t >= 300) return { label: 'Silver', color: [71, 85, 105] }
  return { label: 'Bronze', color: [180, 83, 9] }
}

/** Colour for a percentage — red when weak, amber mid, green/indigo strong. */
export function pctColor(pct: number): [number, number, number] {
  if (pct >= 75) return [16, 185, 129]      // emerald
  if (pct >= 60) return [99, 102, 241]      // indigo
  if (pct >= 40) return [245, 158, 11]      // amber
  return [244, 63, 94]                       // rose
}

/** Brand colours used across the report (site palette). */
const GRADE_COLOR: Record<string, [number, number, number]> = {
  S: [16, 185, 129], A: [99, 102, 241], B: [139, 92, 246], C: [245, 158, 11], D: [244, 63, 94],
}

type RGB = [number, number, number]

const ML = 13
const MR = 13
const CW = 210 - ML - MR          // 184 mm content width
const HEADER_H = 21                // dark brand band at the top of every page
const BOTTOM_LIMIT = 280           // content must end above this

// Palette
const INK: RGB = [15, 23, 42]
const SLATE: RGB = [71, 85, 105]
const MUT: RGB = [148, 163, 184]
const INDIGO: RGB = [79, 70, 229]
const VIOLET: RGB = [124, 58, 237]
const NAVY: RGB = [30, 27, 75]
const LINE: RGB = [226, 232, 240]
const LIGHT: RGB = [241, 245, 249]
const WHITE: RGB = [255, 255, 255]
const INDIGO_LIGHT: RGB = [224, 231, 255]
const INDIGO_TXT: RGB = [199, 210, 254]   // light indigo text on dark bands

export type PdfInput = {
  scores?: any
  scores2?: any
  companyList?: any[] | null
  calibi?: CalibiScore | null
  resume?: any
  profile?: any
  user?: any
  sample?: boolean
  comprehensive?: boolean
  /** Optional pre-loaded logo data URL (tests / SSR). Falls back to /icon-512.png. */
  logoDataUrl?: string | null
}

/** Load the brand mark as a PNG data URL (best effort, never throws). */
async function loadLogoDataUrl(provided?: string | null): Promise<string | null> {
  if (provided) return provided
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch('/calibiai-logo.png', { cache: 'force-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>(resolve => {
      const fr = new FileReader()
      fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function verdictColor(outcome: string | null): RGB {
  if (!outcome) return SLATE
  const lower = outcome.toLowerCase()
  if (lower.includes('interview-ready') || lower.includes('ready') || lower.includes('grade s') || lower.includes('grade a')) return [16, 185, 129]
  if (lower.includes('almost') || lower.includes('grade b')) return [99, 102, 241]
  if (lower.includes('borderline') || lower.includes('grade c')) return [245, 158, 11]
  return [244, 63, 94]
}

function buildComprehensiveFeedback(calibi: CalibiScore, scores: any, resume: any) {
  const entries = calibi.entries || []
  const strengths: string[] = []
  const growthAreas: string[] = []
  const recommendations: { title: string; desc: string; focus: string }[] = []

  const sorted = [...entries].sort((a, b) => b.percent - a.percent)
  const highScoring = sorted.filter(e => e.percent >= 25)
  if (highScoring.length > 0) {
    const list = highScoring.slice(0, 3).map(e => `${e.label} (${e.scaled}/1000)`).join(', ')
    strengths.push(`Demonstrated strongest relative performance in ${list}.`)
  } else if (sorted.length > 0 && sorted[0].percent > 0) {
    strengths.push(`Highest initial benchmark achieved in ${sorted[0].label} (${sorted[0].scaled}/1000 · ${sorted[0].percent}%).`)
  }

  if (scores) {
    const sec = reportSections(scores)
    const strongSec = sec.filter(s => s.pct >= 45)
    if (strongSec.length > 0) {
      strengths.push(`Solid sectional performance in ${strongSec.map(s => `${s.label} (${s.pct}%)`).join(' and ')}.`)
    }
    const eng = scores?.english || {}
    if (num(eng.total) >= 80) {
      strengths.push(`Foundational English communication score of ${num(eng.total)}/200 demonstrating functional workplace verbal and written comprehension.`)
    }
  }

  strengths.push(`Completed ${calibi.count} simulated industry assessments spanning multiple company patterns and evaluation frameworks.`)
  strengths.push(`Demonstrated exam endurance and commitment across multi-stage technical and cognitive test workflows.`)

  const weakEntries = sorted.filter(e => e.percent < 25)
  const zeroEntries = sorted.filter(e => e.score === 0)
  if (zeroEntries.length > 0) {
    const zeroNames = zeroEntries.map(e => e.label).slice(0, 4).join(', ')
    growthAreas.push(`Scores of 0/1000 in ${zeroNames} indicate either unattempted questions, syntax/compiler errors, or failing hidden test cases under time pressure.`)
  }

  const moderateWeak = weakEntries.filter(e => e.score > 0)
  if (moderateWeak.length > 0) {
    const names = moderateWeak.slice(0, 3).map(e => `${e.label} (${e.scaled}/1000)`).join(', ')
    growthAreas.push(`Sub-par performance in ${names} highlights the need for dedicated preparation on company-specific syllabus formats and timed problem solving.`)
  }

  if (scores) {
    const sec = reportSections(scores)
    const weakSec = sec.filter(s => s.pct < 40)
    if (weakSec.length > 0) {
      growthAreas.push(`Core platform assessment flagged weakness in ${weakSec.map(s => `${s.label} (${s.pct}%)`).join(' and ')}, falling below competitive shortlisting cutoffs.`)
    }
  }

  if (scores?.ai_results) {
    for (const [, r] of Object.entries(scores.ai_results) as [string, any][]) {
      if (Array.isArray(r?.improvements) && r.improvements.length > 0) {
        growthAreas.push(String(r.improvements[0]))
        if (growthAreas.length >= 4) break
      }
    }
  }

  if (growthAreas.length < 3) {
    growthAreas.push('Practice speed-coding under strict time limits to ensure all test cases are executed before the round timer expires.')
    growthAreas.push('Focus on edge-case testing (empty collections, large constraints, boundary values) to convert partial solutions into 100% test passes.')
  }

  recommendations.push({
    title: 'Algorithmic Problem Solving & Edge Cases',
    focus: 'Data Structures & Coding Rounds',
    desc: 'Target daily problem solving on Arrays, Strings, HashMaps, and Two-Pointer patterns. Always trace empty, boundary, and worst-case inputs before submission.',
  })
  recommendations.push({
    title: 'Service-Company Aptitude & Pseudocode',
    focus: 'TCS, Infosys, Accenture, Capgemini Tracks',
    desc: 'Solve timed quantitative aptitude drills (ratios, percentages, speed-time-distance) and practice hand-tracing C/C++/Java loops and bitwise operators for pseudocode sections.',
  })
  recommendations.push({
    title: 'Core CS Fundamentals & Technical MCQs',
    focus: 'Operating Systems, DBMS, SQL, OOP',
    desc: 'Revise core CS subjects: SQL joins, ACID properties, normalization, process scheduling, and OOP design patterns commonly required to clear company technical cutoffs.',
  })
  recommendations.push({
    title: 'Placement Drive Strategy & Time Management',
    focus: 'Mock Exam Discipline',
    desc: 'Allocate time per section deliberately: never spend more than 2 minutes per MCQ. In coding rounds, implement brute force first then optimize for time complexity.',
  })

  return { strengths: strengths.slice(0, 4), growthAreas: growthAreas.slice(0, 4), recommendations }
}

export async function generateComprehensiveReportPdf({
  calibi: passedCalibi,
  scores,
  scores2,
  companyList = [],
  resume,
  profile = {},
  user = {},
  sample = false,
  logoDataUrl,
}: PdfInput) {
  const mod: any = await import('jspdf')
  let JsPDF: any = mod?.default
  if (JsPDF && typeof JsPDF !== 'function' && typeof JsPDF.default === 'function') JsPDF = JsPDF.default
  if (typeof JsPDF !== 'function') JsPDF = mod?.JsPDF || mod
  const doc: any = new JsPDF({ unit: 'mm', format: 'a4' })
  const logo = await loadLogoDataUrl(logoDataUrl)

  const calibi: CalibiScore = passedCalibi || calibiFromSources({ a1: scores, a2: scores2, company: companyList || [] })
  const total = calibi.score ?? 0
  const grade = calibi.grade || calibiGrade(total)
  const tier = tierFor(total)
  const gradeColor = GRADE_COLOR[grade] || INDIGO
  const sessionId = String(scores?.session_id || (user?.id ? `UPX-${String(user.id).slice(0, 8)}` : 'UPX-PORTFOLIO'))
  const hash = String(scores?.verifiable_hash || `UPX-${String(user?.id || 'CANDIDATE').slice(0, 6)}-${total}-${Date.now().toString(36).toUpperCase()}`)

  const fullName = String(profile?.full_name || user?.name || 'Candidate').trim() || 'Candidate'
  const email = String(profile?.email || user?.email || '').trim()
  const dateLine = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtPhone = (p: any) => {
    const d = String(p || '').replace(/\D/g, '').slice(-10)
    return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : (p || '—')
  }

  doc.setProperties({ title: `CalibiUpX Master Employability Report — ${fullName}` })

  let page = 1
  function header() {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, 210, HEADER_H, 'F')
    doc.setFillColor(...INDIGO)
    doc.rect(0, HEADER_H - 0.9, 210, 0.9, 'F')
    doc.setFillColor(...WHITE)
    doc.roundedRect(ML, 4.2, 12.4, 12.4, 2.6, 2.6, 'F')
    if (logo) {
      try { doc.addImage(logo, 'PNG', ML + 1.4, 5.6, 9.6, 9.6, 'calibiai_logo') } catch { /* decorative */ }
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.setTextColor(...WHITE)
    doc.text('Calibi', ML + 15.5, 9.2)
    doc.setTextColor(0, 196, 255)
    doc.text('Up', ML + 15.5 + doc.getTextWidth('Calibi') + 0.6, 9.2)
    doc.setTextColor(138, 43, 226)
    doc.text('X', ML + 15.5 + doc.getTextWidth('Calibi') + doc.getTextWidth('Up') + 0.9, 9.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.4)
    doc.setTextColor(148, 163, 184)
    doc.text('ASSESS · ELEVATE · GET HIRED', ML + 15.5, 13.8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...INDIGO_TXT)
    doc.text('MASTER EMPLOYABILITY REPORT', 210 - MR, 7.2, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.4)
    doc.setTextColor(...WHITE)
    doc.text(fullName.slice(0, 42), 210 - MR, 11.6, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.6)
    doc.setTextColor(148, 163, 184)
    doc.text(`Page ${page}`, 210 - MR, 15.6, { align: 'right' })
  }

  function newPage(): number {
    page += 1
    doc.addPage()
    header()
    return HEADER_H + 8
  }

  function fit(curY: number, space: number): number {
    if (curY + space <= BOTTOM_LIMIT) return curY
    return newPage()
  }

  function sectionTitle(text: string, curY: number, sub?: string): number {
    doc.setFillColor(...INDIGO)
    doc.roundedRect(ML, curY - 3, 1.8, 4.2, 0.9, 0.9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...INK)
    doc.text(text, ML + 4, curY)
    const titleW = doc.getTextWidth(text)
    let subW = 0
    if (sub) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(...MUT)
      subW = doc.getTextWidth(sub)
      doc.text(sub, ML + 4 + titleW + 4, curY - 0.6)
    }
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    const endX = ML + 4 + titleW + (sub ? 4 + subW : 0) + 3
    doc.line(endX, curY - 1.1, 210 - MR, curY - 1.1)
    return curY + 2.6
  }

  function bar(bx: number, by: number, bw: number, bh: number, pct: number, color: RGB) {
    const p = Math.max(0, Math.min(100, num(pct)))
    doc.setFillColor(...LIGHT)
    doc.roundedRect(bx, by, bw, bh, bh / 2, bh / 2, 'F')
    if (p > 0) {
      doc.setFillColor(...color)
      doc.roundedRect(bx, by, Math.max(bh, (bw * p) / 100), bh, bh / 2, bh / 2, 'F')
    }
  }

  function chip(cx: number, cy: number, text: string): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    const w = doc.getTextWidth(text) + 5
    doc.setFillColor(...INDIGO_LIGHT)
    doc.roundedRect(cx, cy, w, 4.8, 2.4, 2.4, 'F')
    doc.setTextColor(...INDIGO)
    doc.text(text, cx + w / 2, cy + 3.4, { align: 'center' })
    return w
  }

  function labelText(text: string, lx: number, ly: number, color: RGB = MUT, size = 6) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(String(text).toUpperCase(), lx, ly)
  }

  function valueText(
    text: string,
    vx: number,
    vy: number,
    color: RGB = INK,
    size = 9,
    style: 'bold' | 'normal' = 'bold',
    align: 'left' | 'right' | 'center' = 'left',
  ) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(String(text), vx, vy, { align })
  }

  header()

  /* ============================ PAGE 1 ============================== */
  let y = HEADER_H + 6

  // Hero Card
  y = fit(y, 48)
  const heroY = y
  const heroH = 48
  doc.setFillColor(...NAVY)
  doc.roundedRect(ML, heroY, CW, heroH, 6, 6, 'F')
  doc.setFillColor(...INDIGO)
  doc.rect(ML, heroY, 2.6, heroH, 'F')

  labelText('CALIBIUPX COMPOSITE EMPLOYABILITY SCORE', ML + 11, heroY + 10, INDIGO_TXT, 7.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(40)
  doc.setTextColor(...WHITE)
  doc.text(String(total), ML + 11, heroY + 28)
  const totalW = doc.getTextWidth(String(total))
  doc.setFontSize(13)
  doc.setTextColor(...INDIGO_TXT)
  doc.text('/ 1000', ML + 11 + totalW + 3, heroY + 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...WHITE)
  doc.text(fullName.length > 44 ? fullName.slice(0, 44) + '…' : fullName, ML + 11, heroY + 38)
  const collegeTxt = String([profile?.college, profile?.degree].filter(Boolean).join(' · ') || 'Verified Candidate').slice(0, 75)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.setTextColor(165, 180, 252)
  doc.text(collegeTxt, ML + 11, heroY + 43)

  const rx = 210 - MR - 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.4)
  doc.setTextColor(...INDIGO_TXT)
  doc.text('OVERALL GRADE', rx - 20, heroY + 6.6, { align: 'center' })
  doc.setFillColor(...gradeColor)
  doc.roundedRect(rx - 44, heroY + 9.2, 44, 14, 7, 7, 'F')
  doc.setFontSize(18)
  doc.setTextColor(...WHITE)
  doc.text(`Grade ${grade}`, rx - 22, heroY + 19.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(...INDIGO_TXT)
  const readiness = Math.max(1, Math.min(100, Math.round((total / 1000) * 100)))
  doc.text(`Readiness    ${readiness}%`, rx, heroY + 29, { align: 'right' })
  doc.text(`Assessments  ${calibi.count} completed`, rx, heroY + 34, { align: 'right' })
  doc.text(`Standard     1000-Point Scale`, rx, heroY + 39, { align: 'right' })
  doc.text(`Report Date  ${dateLine}`, rx, heroY + 44, { align: 'right' })

  y = heroY + heroH + 5

  // Session & verification strip
  y = fit(y, 9)
  doc.setFillColor(...LIGHT)
  doc.roundedRect(ML, y, CW, 8, 2.4, 2.4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.6)
  doc.setTextColor(...SLATE)
  doc.text(`Session: ${sessionId.slice(0, 26)}`, ML + 4, y + 5.2)
  doc.text(`Total: ${calibi.count} completed assessments (equal weight)`, ML + 56, y + 5.2)
  if (hash) {
    doc.setTextColor(...INDIGO)
    doc.setFont('helvetica', 'bold')
    doc.text(`Hash: ${hash.slice(0, 38)}`, 210 - MR - 4, y + 5.2, { align: 'right' })
  }
  y += 8 + 5

  // Candidate details card (compact)
  y = sectionTitle('Candidate Profile', y, 'academic and registration details')
  y = fit(y, 22)
  const profY = y
  const profH = 22
  doc.setFillColor(250, 250, 252)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, profY, CW, profH, 4, 4, 'FD')

  const colW = (CW - 16) / 3
  const p1: [string, string][] = [
    ['PRN', profile?.prn || '—'],
    ['Email', email || '—'],
  ]
  const p2: [string, string][] = [
    ['Mobile', fmtPhone(profile?.phone)],
    ['College', String(profile?.college || '—').slice(0, 36)],
  ]
  const p3: [string, string][] = [
    ['Degree / Branch', String(profile?.degree || '—').slice(0, 36)],
    ['Grad Year / CGPA', `${profile?.graduation_year || '—'}  ·  ${profile?.cgpa ? `${profile.cgpa}/10` : '—'}`],
  ]

  const renderCol = (items: [string, string][], colX: number) => {
    items.forEach(([label, val], idx) => {
      const iy = profY + 5.5 + idx * 8.5
      labelText(label, colX, iy, MUT, 5.8)
      valueText(val, colX, iy + 3.8, INK, 8, 'bold')
    })
  }
  renderCol(p1, ML + 5)
  renderCol(p2, ML + 5 + colW + 5)
  renderCol(p3, ML + 5 + (colW + 5) * 2)

  y = profY + profH + 6

  // All Completed Company & Platform Assessments Table
  y = sectionTitle('All Assessment & Company Results', y, `${calibi.entries.length} completed assessments · scaled to 1000`)
  y = fit(y, 14)
  y += 2

  const thY = y
  doc.setFillColor(...LIGHT)
  doc.roundedRect(ML, thY, CW, 6.2, 1.8, 1.8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.4)
  doc.setTextColor(...SLATE)
  doc.text('ASSESSMENT / COMPANY', ML + 3, thY + 4.2)
  doc.text('CATEGORY / TRACK', ML + 54, thY + 4.2)
  doc.text('STATUS / OUTCOME', ML + 102, thY + 4.2)
  doc.text('SCALED SCORE', ML + 138, thY + 4.2)
  doc.text('PERFORMANCE (% OF MAX)', ML + 160, thY + 4.2)
  y = thY + 6.6

  calibi.entries.forEach((e, idx) => {
    y = fit(y, 7.2)
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252)
      doc.rect(ML, y, CW, 6.8, 'F')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...INK)
    doc.text(e.label.slice(0, 28), ML + 3, y + 4.6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.6)
    doc.setTextColor(...SLATE)
    doc.text(e.category.slice(0, 24), ML + 54, y + 4.6)

    const outcomeStr = e.outcome || (e.percent >= 60 ? 'Interview-ready' : e.percent >= 40 ? 'Borderline' : 'Needs Practice')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    doc.setTextColor(...verdictColor(outcomeStr))
    doc.text(outcomeStr.slice(0, 18), ML + 102, y + 4.6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...pctColor(e.percent))
    doc.text(`${e.scaled}/1000`, ML + 138, y + 4.6)

    bar(ML + 160, y + 2.4, 14, 2.2, e.percent, pctColor(e.percent))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    doc.setTextColor(...SLATE)
    doc.text(`${e.percent}%`, ML + 176, y + 4.5)

    y += 7.0
  })

  /* ============================ PAGE 2 ============================== */
  y = newPage()

  y = sectionTitle('Category-Wise Performance Overview', y, 'grouped by employer domain')
  y += 4

  for (const c of calibi.categories) {
    y = fit(y, 9)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(...INK)
    doc.text(`${c.label} (${c.count} test${c.count === 1 ? '' : 's'})`, ML, y)
    doc.setFontSize(8)
    doc.setTextColor(...pctColor(c.percent))
    doc.text(`${c.percent}%`, 210 - MR, y, { align: 'right' })
    bar(ML, y + 2.2, CW, 2.6, c.percent, pctColor(c.percent))
    y += 8.2
  }
  y += 4

  const allEvidence = [
    ...(scores ? platformAssessmentSkills(scores, Number(scores?.assessment_no) === 2 ? 2 : 1) : []),
    ...(scores2 ? platformAssessmentSkills(scores2, 2) : []),
    ...((companyList || []).flatMap((attempt: any) => attempt.skillEvidence || [])),
  ]
  const rolledSkills = rollupAssessmentSkills(allEvidence)
  if (rolledSkills.length) {
    y = sectionTitle('Cross-Assessment Skill Mastery Map', y, 'mapped across all company & platform challenges')
    y = fit(y, 8)
    let sx = ML
    let sy = y + 4.6
    for (const skill of rolledSkills) {
      const label = `${skill.name} · ${Math.round(skill.score)}%`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.2)
      const w = doc.getTextWidth(label) + 5
      if (sx > ML && sx + w > 210 - MR) { sx = ML; sy += 6.6 }
      if (sy + 8 > BOTTOM_LIMIT) { sy = newPage(); sx = ML }
      const actualWidth = chip(sx, sy, label)
      sx += actualWidth + 2
    }
    y = sy + 5 + 6
  }

  if (scores) {
    y = sectionTitle('Detailed Core Platform Modules', y, 'section performance on the 1000-point standard')
    y = fit(y, 4)
    y += 5
    const sections = reportSections(scores)
    for (const s of sections) {
      y = fit(y, 11)
      valueText(s.label, ML, y, INK, 8.8)
      const scoreTxt = `${s.score} / ${s.max}` + (s.max ? `   ·   ${s.pct}%` : '')
      valueText(scoreTxt, 210 - MR, y, s.max ? pctColor(s.pct) : SLATE, 8.2, 'bold', 'right')
      bar(ML, y + 2.2, CW, 2.4, s.pct, s.max ? pctColor(s.pct) : INDIGO)
      if (s.note) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.2)
        doc.setTextColor(...MUT)
        doc.text(String(s.note).slice(0, 150), ML, y + 7.6)
      }
      y += s.note ? 10.4 : 7.8
    }
    y += 5

    const eng = scores?.english || {}
    if (eng.total !== undefined) {
      y = fit(y, 18)
      y = sectionTitle('English Sub-Skills Breakdown', y, 'listening · speaking · reading · writing (/50 each)')
      y += 5
      const engSubs: [string, any, any][] = [
        ['Listening', eng.listening, 50], ['Speaking', eng.speaking, 50],
        ['Reading', eng.reading, 50], ['Writing', eng.writing, 50],
      ]
      const boxW = (CW - 6) / 4
      engSubs.forEach(([label, v, m], i) => {
        const bx = ML + i * (boxW + 2)
        const pct = m ? (num(v) / num(m)) * 100 : 0
        doc.setFillColor(...LIGHT)
        doc.roundedRect(bx, y, boxW, 15, 3.2, 3.2, 'F')
        const big = String(num(v))
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(...pctColor(pct))
        doc.text(big, bx + boxW / 2 - doc.getTextWidth(big) / 2 - 4, y + 7.8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(5.8)
        doc.setTextColor(...MUT)
        doc.text(`/ ${num(m)}`, bx + boxW / 2 + 2, y + 6)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.6)
        doc.setTextColor(...SLATE)
        doc.text(String(label), bx + boxW / 2, y + 12.2, { align: 'center' })
      })
      y += 15 + 8
    }
  }

  /* ============================ PAGE 3 ============================== */
  y = newPage()

  y = sectionTitle('Evaluator Feedback & Placement Growth Strategy', y, 'diagnostic analysis across company patterns')
  y += 5

  const fb = buildComprehensiveFeedback(calibi, scores, resume)

  // 1. Key Strengths
  y = fit(y, 25)
  valueText('Demonstrated Strengths', ML, y, [16, 118, 110], 9.5)
  y += 4.5
  const strBoxH = 5 + fb.strengths.length * 6.5
  doc.setFillColor(240, 253, 250)
  doc.setDrawColor(204, 251, 241)
  doc.roundedRect(ML, y, CW, strBoxH, 3, 3, 'FD')
  doc.setFillColor(16, 185, 129)
  doc.roundedRect(ML, y, 2.4, strBoxH, 3, 3, 'F')
  doc.rect(ML, y, 2.4, strBoxH - 3, 'F')

  let sy = y + 4.5
  fb.strengths.forEach((st) => {
    doc.setFillColor(16, 185, 129)
    doc.circle(ML + 5.5, sy - 1, 0.9, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...INK)
    const lines = doc.splitTextToSize(st, CW - 12)
    lines.forEach((l: string) => {
      doc.text(l, ML + 8.5, sy)
      sy += 3.6
    })
    sy += 1.8
  })
  y = y + strBoxH + 6

  // 2. Critical Growth Areas
  y = fit(y, 25)
  valueText('Critical Growth Areas & Score Blockers', ML, y, [180, 83, 9], 9.5)
  y += 4.5
  const gaBoxH = 5 + fb.growthAreas.length * 6.5
  doc.setFillColor(255, 251, 235)
  doc.setDrawColor(254, 243, 199)
  doc.roundedRect(ML, y, CW, gaBoxH, 3, 3, 'FD')
  doc.setFillColor(245, 158, 11)
  doc.roundedRect(ML, y, 2.4, gaBoxH, 3, 3, 'F')
  doc.rect(ML, y, 2.4, gaBoxH - 3, 'F')

  let gy = y + 4.5
  fb.growthAreas.forEach((ga) => {
    doc.setFillColor(245, 158, 11)
    doc.circle(ML + 5.5, gy - 1, 0.9, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...INK)
    const lines = doc.splitTextToSize(ga, CW - 12)
    lines.forEach((l: string) => {
      doc.text(l, ML + 8.5, gy)
      gy += 3.6
    })
    gy += 1.8
  })
  y = y + gaBoxH + 6

  // 3. Actionable Placement Recommendations
  y = fit(y, 15)
  valueText('Actionable Placement Coaching & Preparation Plan', ML, y, INDIGO, 9.5)
  y += 4.5

  for (const rec of fb.recommendations) {
    y = fit(y, 14)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(ML, y, CW, 12.5, 3, 3, 'F')
    doc.setFillColor(...INDIGO)
    doc.roundedRect(ML, y, 2.2, 12.5, 3, 3, 'F')
    doc.rect(ML, y, 2.2, 12.5 - 3, 'F')

    valueText(rec.title, ML + 6, y + 4.2, INK, 8, 'bold')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    doc.setTextColor(...INDIGO)
    doc.text(rec.focus.toUpperCase(), 210 - MR - 4, y + 4.2, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...SLATE)
    const dlines = doc.splitTextToSize(rec.desc, CW - 12)
    doc.text(dlines[0] || '', ML + 6, y + 8.2)
    if (dlines[1]) doc.text(dlines[1], ML + 6, y + 11.4)
    y += 14.5
  }
  y += 2

  // 4. Resume & ATS Insights
  if (resume?.feedback || resume?.resume_score) {
    y = fit(y, 18)
    valueText('Resume & ATS Screening Insights', ML, y, [124, 58, 237], 9)
    y += 4.2
    const rScore = num(resume?.resume_score)
    doc.setFillColor(250, 245, 255)
    doc.roundedRect(ML, y, CW, 12, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...VIOLET)
    doc.text(`ATS Match Score: ${rScore}/100`, ML + 6, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...SLATE)
    const sug = (resume?.feedback?.suggestions || [])[0] || (resume?.feedback?.gaps || [])[0] || 'Resume parsed successfully against tech industry benchmarks.'
    doc.text(String(sug).slice(0, 110), ML + 6, y + 9.2)
    y += 15
  }

  // 5. Verifiable Credential Statement
  y = fit(y, 16)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(ML, y, 210 - MR, y)
  y += 4.5
  valueText('About the CalibiUpX Employability Credential', ML, y, INK, 8.2)
  y += 3.6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.6)
  doc.setTextColor(...SLATE)
  const blurb = 'The CalibiUpX Employability Score is a composite 1000-point standard evaluating candidates across proprietary platform exams and realistic company assessments. Each assessment counts with equal weight, and results are verified through multi-angle proctoring. Employers verify scores at calibiUpX.com using the verifiable hash printed on each page.'
  const blurbLines = doc.splitTextToSize(blurb, CW)
  blurbLines.forEach((l: string) => {
    doc.text(l, ML, y)
    y += 3.6
  })

  /* ============================ FOOTERS ============================= */
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.25)
    doc.line(ML, 286.5, 210 - MR, 286.5)
    if (logo) {
      try { doc.addImage(logo, 'PNG', ML, 288.4, 5.2, 5.2, 'calibiai_logo') } catch { /* decorative */ }
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.4)
    doc.setTextColor(...SLATE)
    doc.text('CalibiUpX', ML + 7.5, 291.8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MUT)
    doc.text('Verified Employability Assessment · calibiUpX.com', ML + 7.5, 295.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.4)
    doc.setTextColor(...MUT)
    doc.text(`Page ${i} of ${totalPages}`, 210 - MR, 291.8, { align: 'right' })
    if (sample) {
      doc.setTextColor(180, 83, 9)
      doc.setFont('helvetica', 'bold')
      doc.text('SAMPLE REPORT — FOR PREVIEW ONLY', 210 - MR, 295.2, { align: 'right' })
    }
  }
  doc.setPage(totalPages)

  return doc
}

export async function generateReportPdf(input: PdfInput) {
  const { scores, scores2, companyList, calibi, comprehensive = false } = input
  const activeCalibi = calibi || (companyList?.length || scores2 ? calibiFromSources({ a1: scores, a2: scores2, company: companyList || [] }) : null)
  const isComprehensive = Boolean(comprehensive || (activeCalibi && activeCalibi.entries && activeCalibi.entries.length > 1) || (!scores && activeCalibi && activeCalibi.count > 0))

  if (isComprehensive && activeCalibi && activeCalibi.count > 0) {
    return generateComprehensiveReportPdf({ ...input, calibi: activeCalibi })
  }
  return generateSingleReportPdf(input)
}

export async function generateSingleReportPdf({ scores, profile = {}, user = {}, sample = false, logoDataUrl }: PdfInput) {
  // Resolve the jsPDF constructor across module systems: webpack returns the
  // class as `default`, while Node's ESM/CJS interop wraps it one level deeper
  // (`default.default`). Accepting both keeps tests and the browser build happy.
  const mod: any = await import('jspdf')
  let JsPDF: any = mod?.default
  if (JsPDF && typeof JsPDF !== 'function' && typeof JsPDF.default === 'function') JsPDF = JsPDF.default
  if (typeof JsPDF !== 'function') JsPDF = mod?.JsPDF || mod
  const doc: any = new JsPDF({ unit: 'mm', format: 'a4' })
  const logo = await loadLogoDataUrl(logoDataUrl)

  const fullName = String(profile?.full_name || user?.name || 'Student').trim() || 'Student'
  const email = String(profile?.email || user?.email || '').trim()
  const isA2 = Number(scores?.assessment_no) === 2
  const reportName = isA2 ? 'Capgemini 2027 Mock Report' : 'CalibiAI Talent Report'
  doc.setProperties({ title: `${reportName} — ${fullName}` })

  const dateLine = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtPhone = (p: any) => {
    const d = String(p || '').replace(/\D/g, '').slice(-10)
    return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : (p || '—')
  }
  const dobLine = (d: any) => {
    if (!d) return '—'
    const b = new Date(d)
    if (isNaN(b.getTime())) return String(d)
    const now = new Date()
    let age = now.getFullYear() - b.getFullYear()
    const m = now.getMonth() - b.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
    return `${String(d).slice(0, 10)}${age >= 0 && age < 120 ? `  (${age} yrs)` : ''}`
  }

  const total = num(scores?.total)
  const grade = String(scores?.grade || '—').slice(0, 1)
  const percentile = num(scores?.percentile)
  const tier = tierFor(total)
  const sessionId = String(scores?.session_id || '—')
  const hash = String(scores?.verifiable_hash || '')
  const gradeColor = GRADE_COLOR[grade] || INDIGO

  /* ---------------------------- helpers ----------------------------- */
  let page = 1

  /** Brand band drawn at the top of every page. */
  function header() {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, 210, HEADER_H, 'F')
    doc.setFillColor(...INDIGO)
    doc.rect(0, HEADER_H - 0.9, 210, 0.9, 'F')
    // Logo chip (white rounded square with the brand mark inside).
    doc.setFillColor(...WHITE)
    doc.roundedRect(ML, 4.2, 12.4, 12.4, 2.6, 2.6, 'F')
    if (logo) {
      try { doc.addImage(logo, 'PNG', ML + 1.4, 5.6, 9.6, 9.6, 'calibiai_logo') } catch { /* decorative */ }
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.setTextColor(...WHITE)
    doc.text('Calibi', ML + 15.5, 9.2)
    doc.setTextColor(0, 196, 255)
    doc.text('Up', ML + 15.5 + doc.getTextWidth('Calibi') + 0.6, 9.2)
    doc.setTextColor(138, 43, 226)
    doc.text('X', ML + 15.5 + doc.getTextWidth('Calibi') + doc.getTextWidth('Up') + 0.9, 9.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.4)
    doc.setTextColor(148, 163, 184)
    doc.text('ASSESS · ELEVATE · GET HIRED', ML + 15.5, 13.8)
    // Right side: report label + candidate + page
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...INDIGO_TXT)
    doc.text(isA2 ? 'ASSESSMENT 2 REPORT' : 'TALENT REPORT', 210 - MR, 7.2, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.4)
    doc.setTextColor(...WHITE)
    doc.text(fullName.slice(0, 42), 210 - MR, 11.6, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.6)
    doc.setTextColor(148, 163, 184)
    doc.text(`Page ${page}`, 210 - MR, 15.6, { align: 'right' })
  }

  /** Start a new page and re-draw the header. */
  function newPage(): number {
    page += 1
    doc.addPage()
    header()
    return HEADER_H + 8
  }

  /** Ensure `space` mm fits below y; page-break when it doesn't. */
  function fit(y: number, space: number): number {
    if (y + space <= BOTTOM_LIMIT) return y
    return newPage()
  }

  /** Section heading with an indigo accent tick. */
  function sectionTitle(text: string, y: number, sub?: string): number {
    doc.setFillColor(...INDIGO)
    doc.roundedRect(ML, y - 3, 1.8, 4.2, 0.9, 0.9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...INK)
    doc.text(text, ML + 4, y)
    // Measure the title at its own size *before* switching to the subtitle
    // font — the subtitle was previously positioned using a title width
    // measured at 6.8pt, which made it collide with the title.
    const titleW = doc.getTextWidth(text)
    let subW = 0
    if (sub) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(...MUT)
      subW = doc.getTextWidth(sub)
      doc.text(sub, ML + 4 + titleW + 4, y - 0.6)
    }
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    const endX = ML + 4 + titleW + (sub ? 4 + subW : 0) + 3
    doc.line(endX, y - 1.1, 210 - MR, y - 1.1)
    return y + 2.6
  }

  /** Rounded progress bar. */
  function bar(x: number, y: number, w: number, h: number, pct: number, color: RGB) {
    const p = Math.max(0, Math.min(100, num(pct)))
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
    if (p > 0) {
      doc.setFillColor(...color)
      doc.roundedRect(x, y, Math.max(h, (w * p) / 100), h, h / 2, h / 2, 'F')
    }
  }

  /** Skill chip: light indigo rounded pill; returns its width. */
  function chip(x: number, y: number, text: string): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    const w = doc.getTextWidth(text) + 5
    doc.setFillColor(...INDIGO_LIGHT)
    doc.roundedRect(x, y, w, 4.8, 2.4, 2.4, 'F')
    doc.setTextColor(...INDIGO)
    doc.text(text, x + w / 2, y + 3.4, { align: 'center' })
    return w
  }

  function labelText(text: string, x: number, y: number, color: RGB = MUT, size = 6) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(String(text).toUpperCase(), x, y)
  }
  function valueText(
    text: string,
    x: number,
    y: number,
    color: RGB = INK,
    size = 9,
    style: 'bold' | 'normal' = 'bold',
    align: 'left' | 'right' | 'center' = 'left',
  ) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.text(String(text), x, y, { align })
  }

  header()

  /* ============================ PAGE 1 ============================== */
  let y = HEADER_H + 7

  /* ---- hero score card ---- */
  y = fit(y, 50)
  const heroY = y
  const heroH = 50
  doc.setFillColor(...NAVY)
  doc.roundedRect(ML, heroY, CW, heroH, 6, 6, 'F')
  doc.setFillColor(...INDIGO)
  doc.rect(ML, heroY, 2.6, heroH, 'F')
  // left — score
  labelText(isA2 ? 'Capgemini 2027 Mock Score' : 'Calibiai Talent Score', ML + 11, heroY + 11, INDIGO_TXT, 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(44)
  doc.setTextColor(...WHITE)
  doc.text(String(total), ML + 11, heroY + 31)
  // Measure the big number *before* shrinking the font — otherwise the
  // "/ 1000" is sized/positioned wrong and lands on top of the score.
  const totalW = doc.getTextWidth(String(total))
  doc.setFontSize(13)
  doc.setTextColor(...INDIGO_TXT)
  doc.text('/ 1000', ML + 11 + totalW + 3, heroY + 31)
  // candidate details under the score
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...WHITE)
  doc.text(fullName.length > 44 ? fullName.slice(0, 44) + '…' : fullName, ML + 11, heroY + 41.5)
  const collegeTxt = String([profile?.college, profile?.degree].filter(Boolean).join(' · ') || '—').slice(0, 80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.6)
  doc.setTextColor(165, 180, 252)
  doc.text(collegeTxt, ML + 11, heroY + 46.6)
  // right — grade badge + mini stats
  const rx = 210 - MR - 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.4)
  doc.setTextColor(...INDIGO_TXT)
  doc.text('GRADE', rx - 20, heroY + 6.6, { align: 'center' })
  doc.setFillColor(...gradeColor)
  doc.roundedRect(rx - 44, heroY + 9.6, 44, 15, 7.5, 7.5, 'F')
  doc.setFontSize(19)
  doc.setTextColor(...WHITE)
  doc.text(grade, rx - 22, heroY + 20.8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.setTextColor(...INDIGO_TXT)
  doc.text(`Percentile   ${Number.isFinite(percentile) ? percentile.toFixed(0) : '—'}th`, rx, heroY + 31, { align: 'right' })
  doc.text(`Tier         ${tier.label}`, rx, heroY + 36.4, { align: 'right' })
  doc.text(`Report       ${dateLine}`, rx, heroY + 41.8, { align: 'right' })
  if (sample) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    doc.setTextColor(253, 230, 138)
    doc.text('SAMPLE — PREVIEW ONLY', rx, heroY + 47, { align: 'right' })
  }
  y = heroY + heroH + 6

  /* ---- session / verification strip ---- */
  y = fit(y, 9)
  doc.setFillColor(...LIGHT)
  doc.roundedRect(ML, y, CW, 8, 2.4, 2.4, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(...SLATE)
  doc.text(`Session: ${sessionId.slice(0, 28)}`, ML + 4, y + 5.3)
  const assessedOn = scores?.submitted_at ? String(scores.submitted_at).slice(0, 10) : dateLine
  doc.text(`Assessed on: ${assessedOn}`, ML + 66, y + 5.3)
  if (hash) {
    doc.setTextColor(...INDIGO)
    doc.setFont('helvetica', 'bold')
    doc.text(`Verifiable hash: ${hash.slice(0, 44)}`, 210 - MR - 4, y + 5.3, { align: 'right' })
  }
  y += 8 + 7

  /* ---- candidate profile card ---- */
  y = sectionTitle('Candidate Profile', y, 'personal & academic details')
  y = fit(y, 4)
  const cardY = y
  const profileRows: [string, any][] = [
    ['PRN', profile?.prn || '—'],
    ['Email', email || '—'],
    ['Mobile', fmtPhone(profile?.phone)],
    ['Date of birth', dobLine(profile?.dob)],
    ['Gender', profile?.gender || '—'],
    ['Degree', profile?.degree || '—'],
    ['College', profile?.college || '—'],
    ['Graduation year', profile?.graduation_year ? String(profile.graduation_year) : '—'],
    ['CGPA', profile?.cgpa ? `${profile.cgpa} / 10` : '—'],
    ['Registered', String(profile?.created_at || profile?.updated_at || '').slice(0, 10) || '—'],
  ]
  const halfW = (CW - 14) / 2
  const xL = ML + 7
  const xR = ML + 7 + halfW + 14
  // Cell height driven by the longest value (at most two wrapped lines).
  let maxLines = 1
  for (const [, value] of profileRows) {
    maxLines = Math.max(maxLines, doc.splitTextToSize(String(value), halfW - 2).length)
  }
  const cellH = Math.min(13, Math.max(7.2, 6.0 + (maxLines - 1) * 3.8))
  const cardH = 8 + Math.ceil(profileRows.length / 2) * cellH
  doc.setFillColor(250, 250, 252)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, cardY, CW, cardH, 5, 5, 'FD')
  profileRows.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const cy = cardY + 6.5 + row * cellH
    const cx = col === 0 ? xL : xR
    labelText(label, cx, cy)
    const lines = doc.splitTextToSize(String(value), halfW - 2).slice(0, 2)
    lines.forEach((line: string, li: number) => valueText(line, cx, cy + 3.8 + li * 3.8, INK, 8.6))
  })
  y = cardY + cardH + 8

  /* ---- skills chips ---- */
  const skillsTxt = String(profile?.skills || '').trim()
  if (skillsTxt) {
    const skills = skillsTxt.split(',').map(s => s.trim()).filter(Boolean).slice(0, 26)
    y = sectionTitle('Skills', y, 'self-reported on profile')
    y = fit(y, 8)
    y += 4.6
    let sx = ML
    let sy = y
    for (const skill of skills) {
      const w = chip(sx, sy, skill)
      sx += w + 2
      if (sx + 16 > 210 - MR) {
        sx = ML
        sy += 6.6
      }
    }
    y = sy + 5 + 6
  }

  /* ---- assessment-derived skill map ---- */
  const mappedSkills = rollupAssessmentSkills(platformAssessmentSkills(scores, isA2 ? 2 : 1))
  if (mappedSkills.length) {
    y = sectionTitle('Assessment skill map', y, 'mapped from scored assessment modules')
    y = fit(y, 8)
    let sx = ML
    let sy = y + 4.6
    for (const skill of mappedSkills) {
      const label = `${skill.name} · ${Math.round(skill.score)}%`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.2)
      const w = doc.getTextWidth(label) + 5
      if (sx > ML && sx + w > 210 - MR) { sx = ML; sy += 6.6 }
      if (sy + 8 > BOTTOM_LIMIT) { sy = newPage(); sx = ML }
      const actualWidth = chip(sx, sy, label)
      sx += actualWidth + 2
    }
    y = sy + 5 + 6
  }

  /* ---- module performance ---- */
  y = sectionTitle('Section-wise Analysis', y, isA2 ? 'four modules on the 1000-point scale' : 'six modules on the 1000-point scale')
  y = fit(y, 4)
  y += 5
  const sections = reportSections(scores)
  for (const s of sections) {
    y = fit(y, 11.5)
    valueText(s.label, ML, y, INK, 9.2)
    const scoreTxt = `${s.score} / ${s.max}` + (s.max ? `    ·   ${s.pct}%` : '')
    valueText(scoreTxt, 210 - MR, y, s.max ? pctColor(s.pct) : SLATE, 8.4, 'bold', 'right')
    bar(ML, y + 2.2, CW, 2.6, s.pct, s.max ? pctColor(s.pct) : INDIGO)
    if (s.note) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.4)
      doc.setTextColor(...MUT)
      doc.text(String(s.note).slice(0, 150), ML, y + 8)
    }
    y += s.note ? 11 : 8.4
  }
  y += 6

  /* ============================ PAGE 2+ ============================= */
  y = fit(y, 6)
  y = sectionTitle('Detailed Score Analysis', y, 'sub-skills · accuracy · traits')
  y += 6

  /* ---- English sub-skills tiles ---- */
  const eng = scores?.english || {}
  const engSubs: [string, any, any][] = [
    ['Listening', eng.listening, 50], ['Speaking', eng.speaking, 50],
    ['Reading', eng.reading, 50], ['Writing', eng.writing, 50],
  ]
  y = fit(y, 17)
  const boxW = (CW - 6) / 4
  engSubs.forEach(([label, v, m], i) => {
    const bx = ML + i * (boxW + 2)
    const pct = m ? (num(v) / num(m)) * 100 : 0
    doc.setFillColor(...LIGHT)
    doc.roundedRect(bx, y, boxW, 16, 3.5, 3.5, 'F')
    const big = String(num(v))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...pctColor(pct))
    doc.text(big, bx + boxW / 2 - doc.getTextWidth(big) / 2 - 4, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MUT)
    doc.text(`/ ${num(m)}`, bx + boxW / 2 + 2, y + 6.2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...SLATE)
    doc.text(String(label), bx + boxW / 2, y + 12.8, { align: 'center' })
  })
  y += 16 + 8

  /* ---- objective accuracy ---- */
  const detail = scores?.detail || {}
  const accRaw: [string, number, number][] = isA2
    ? [
      ['Listening accuracy', num(detail.listeningCorrect), num(detail.listeningTotal)],
      ['Reading accuracy', num(detail.readingCorrect), num(detail.readingTotal)],
      ['AI Literacy', num(detail.aiLiteracyCorrect), num(detail.aiLiteracyTotal)],
      ['Debugging MCQ', num(detail.debugMcqCorrect), num(detail.debugMcqTotal)],
    ]
    : [
      ['Listening accuracy', num(detail.listeningCorrect), num(detail.listeningTotal)],
      ['Reading accuracy', num(detail.readingCorrect), num(detail.readingTotal)],
      ['Problem solving', num(detail.problemCorrect), num(detail.problemTotal)],
      ['Logical reasoning', num(detail.logicalCorrect), num(detail.logicalTotal)],
    ]
  const acc = accRaw.filter(([, , t]) => t > 0)
  if (acc.length) {
    y = fit(y, 6)
    y = sectionTitle('Objective Accuracy', y, 'correct answers in MCQ sections')
    y += 6
    acc.forEach(([label, c, t]) => {
      y = fit(y, 7)
      const pct = Math.round((c / t) * 100)
      valueText(label, ML, y, SLATE, 8, 'normal')
      valueText(`${c}/${t} correct · ${pct}%`, ML + 64, y, pctColor(pct), 8)
      bar(ML + 92, y - 1.5, 210 - MR - (ML + 92), 2, pct, pctColor(pct))
      y += 8
    })
    y += 4
  }

  /* ---- behavioural traits ---- */
  const cog = scores?.cognitive || {}
  const traits = Object.entries(cog?.behavioral || {}) as [string, number][]
  if (traits.length) {
    y = fit(y, 6)
    y = sectionTitle('Behavioural Profile', y, 'six workplace traits · each /100')
    y += 6.5
    const tColW = (CW - 8) / 2
    const rows2 = Math.ceil(traits.length / 2)
    y = fit(y, rows2 * 8.6)
    traits.forEach(([k, v], i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const tx = ML + col * (tColW + 8)
      const ty = y + row * 8.6
      const label = String(cog?.traitLabels?.[k] || String(k).replace(/_/g, ' ')).slice(0, 24)
      valueText(label, tx, ty, SLATE, 7.8, 'normal')
      valueText(String(num(v)), tx + tColW - 10, ty, pctColor(num(v)), 8)
      bar(tx + 32, ty - 1.5, tColW - 44, 1.8, num(v), pctColor(num(v)))
    })
    y += rows2 * 8.6 + 5
  }

  /* ---- AI feedback & improvement areas ---- */
  const aiEntries = Object.entries(scores?.ai_results || {}) as [string, any][]
  if (aiEntries.length) {
    y = fit(y, 6)
    y = sectionTitle('AI Feedback & Areas to Improve', y, 'generated per task by the AI evaluation engine')
    y += 7
    aiEntries.slice(0, 8).forEach(([key, r]) => {
      const label = aiTaskLabel(key)
      const score = num(r?.score)
      const note = String(r?.summary || '')
      const noteLines = note ? doc.splitTextToSize(note, CW - 14).slice(0, 3) : []
      const cardH = 13 + noteLines.length * 3.4 + (noteLines.length ? 1.5 : 0)
      y = fit(y, cardH)
      doc.setFillColor(...LIGHT)
      doc.roundedRect(ML, y, CW, cardH, 4, 4, 'F')
      doc.setFillColor(...INDIGO)
      doc.roundedRect(ML, y, 2.2, cardH, 4, 4, 'F')
      doc.rect(ML, y, 2.2, cardH - 4, 'F')
      valueText(label, ML + 7, y + 5, INK, 8.6)
      doc.setFillColor(...pctColor(score))
      doc.roundedRect(210 - MR - 24, y + 1.8, 24, 6, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.6)
      doc.setTextColor(...WHITE)
      doc.text(`${score}/100`, 210 - MR - 12, y + 6, { align: 'center' })
      // Start the summary below the task label (8.6pt at y+5) with a real gap,
      // so the first line no longer runs into the label text.
      let ny = y + 9.4
      noteLines.forEach((line: string) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.6)
        doc.setTextColor(...SLATE)
        doc.text(line, ML + 7, ny)
        ny += 3.4
      })
      y += cardH + 3.5
    })
    y += 3
    /* improvement bullets */
    const imps: string[] = []
    aiEntries.slice(0, 8).forEach(([, r]) => {
      if (Array.isArray(r?.improvements)) imps.push(...r.improvements.map(String))
    })
    const uniqImps = [...new Set(imps)].slice(0, 6)
    if (uniqImps.length) {
      y = fit(y, 6)
      valueText('Suggested improvements', ML, y + 2, INK, 9)
      y += 5
      uniqImps.forEach(imp => {
        const lines = doc.splitTextToSize(String(imp), CW - 10).slice(0, 2)
        lines.forEach((line: string) => {
          y = fit(y, 5)
          doc.setFillColor(...VIOLET)
          doc.circle(ML + 1.3, y - 1.2, 0.8, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.4)
          doc.setTextColor(...SLATE)
          doc.text(String(line), ML + 4.5, y)
          y += 4.6
        })
      })
    }
  }

  /* ---- closing blurb ---- */
  y = fit(y, 18)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(ML, y, 210 - MR, y)
  y += 5.5
  valueText('What does this score measure?', ML, y, INK, 8.4)
  y += 3.8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...SLATE)
  const blurb = 'The CalibiAI Assessment is a 1000-point, verifiable measure of employability — English communication, problem solving, AI debugging, AI feature development, prompt engineering and cognitive/behavioural traits, assessed through a supervised 120-minute exam. Your overall CalibiUpX score on the dashboard is the average of every assessment you complete (this one, the Capgemini mock and each company mock). Every report carries a tamper-evident verifiable hash.'
  const blurbLines = doc.splitTextToSize(blurb, CW)
  blurbLines.slice(0, 5).forEach((line: string) => {
    y = fit(y, 4.4)
    doc.text(line, ML, y)
    y += 4.3
  })

  /* ============================ footers ============================= */
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.25)
    doc.line(ML, 286.5, 210 - MR, 286.5)
    if (logo) {
      try { doc.addImage(logo, 'PNG', ML, 288.4, 5.2, 5.2, 'calibiai_logo') } catch { /* decorative */ }
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.4)
    doc.setTextColor(...SLATE)
    doc.text('CalibiUpX', ML + 7.5, 291.8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...MUT)
    doc.text('Verified Employability Assessment · calibiai.com', ML + 7.5, 295.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.4)
    doc.setTextColor(...MUT)
    doc.text(`Page ${i} of ${totalPages}`, 210 - MR, 291.8, { align: 'right' })
    if (sample) {
      doc.setTextColor(180, 83, 9)
      doc.setFont('helvetica', 'bold')
      doc.text('SAMPLE REPORT — FOR PREVIEW ONLY', 210 - MR, 295.2, { align: 'right' })
    }
  }
  doc.setPage(totalPages)

  return doc
}
