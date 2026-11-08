/**
 * Build the deterministic student snapshot Mentorly reasons over.
 *
 * This layer runs NO model — it reads the student's real rows from Supabase
 * (profile, assessment results, company attempts, resume) and composes them
 * with the same pure functions the dashboard uses, so the numbers Mentorly
 * quotes are exactly the numbers the student sees elsewhere. The LLM layers
 * are then told to narrate these facts and never invent their own.
 *
 * Everything degrades: a missing table or a failed sub-fetch yields an empty
 * section, never an exception that would take the whole coach down.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchLatestAssessmentResult, fetchLatestResumeAnalysis, fetchProfile, toUuid,
} from '../persist.ts'
import { flattenAssessmentResult } from '../resultShape.ts'
import { calibiFromSources } from '../calibiScore.ts'
import { listSummaries } from '../company/attempts.ts'
import { platformAssessmentSkills, rollupAssessmentSkills, type AssessmentSkillEvidence } from '../assessmentSkills.ts'
import { COMPANIES, COMPANY_ORDER } from '../company/catalog.ts'
import { getProfileById, getLatestAssessmentResultForStudent } from '../db.ts'
import type {
  SnapshotAssessment, SnapshotCompanyGap, SnapshotSkill, StudentSnapshot,
} from './types.ts'

/** How many of the highest-priority companies Mentorly tracks by default. */
const TRACKED_COMPANIES = 10

function firstName(full: unknown): string | null {
  const s = String(full ?? '').trim()
  return s ? s.split(/\s+/)[0] : null
}

function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function strList(v: unknown, max = 6): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, max)
}

/**
 * Load every assessment result for a student (both platform assessments and
 * the flattened company attempts are combined for the CalibiAI Score).
 */
async function loadPlatformResults(
  sb: SupabaseClient | null, studentId: string,
): Promise<{ a1: any; a2: any }> {
  if (!sb) {
    return {
      a1: flattenAssessmentResult(getLatestAssessmentResultForStudent(studentId, 1) || null),
      a2: flattenAssessmentResult(getLatestAssessmentResultForStudent(studentId, 2) || null),
    }
  }
  const [r1, r2] = await Promise.all([
    fetchLatestAssessmentResult(sb, studentId, 1).catch(() => null),
    fetchLatestAssessmentResult(sb, studentId, 2).catch(() => null),
  ])
  return { a1: flattenAssessmentResult(r1), a2: flattenAssessmentResult(r2) }
}

async function loadProfile(sb: SupabaseClient | null, studentId: string): Promise<any> {
  if (!sb) return getProfileById(studentId) || {}
  try {
    return (await fetchProfile(sb, studentId)) || {}
  } catch {
    return {}
  }
}

async function loadResume(sb: SupabaseClient | null, studentId: string): Promise<any> {
  if (!sb) return null
  try {
    return await fetchLatestResumeAnalysis(sb, studentId)
  } catch {
    return null
  }
}

/**
 * The single public entry point. `studentId` is the VERIFIED id from
 * requireStudentApi — never a client claim.
 */
export async function buildStudentSnapshot(
  sb: SupabaseClient | null, studentId: string,
): Promise<StudentSnapshot> {
  const sid = sb ? (toUuid(studentId, 'profile') || studentId) : studentId

  const [profile, platform, resume, attempts] = await Promise.all([
    loadProfile(sb, sid),
    loadPlatformResults(sb, sid),
    loadResume(sb, sid),
    listSummaries(studentId, { sb }).catch(() => [] as any[]),
  ])

  // --- CalibiAI Score (identical math to the dashboard card) ---------------
  const calibi = calibiFromSources({ a1: platform.a1, a2: platform.a2, company: attempts })

  const assessments: SnapshotAssessment[] = calibi.entries
    .map((e) => ({
      key: e.key, label: e.label, kind: e.kind, company: e.company,
      percent: e.percent, outcome: e.outcome, at: e.at,
    }))
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))

  // --- Skill rollups (weakest first = coaching priority) -------------------
  // Assembled exactly like the dashboard: platform skills + each company
  // attempt's pre-computed skill evidence (listSummaries attaches it).
  const evidence: AssessmentSkillEvidence[] = [
    ...platformAssessmentSkills(platform.a1, 1),
    ...platformAssessmentSkills(platform.a2, 2),
    ...(attempts as any[]).flatMap((a) => (Array.isArray(a?.skillEvidence) ? a.skillEvidence : [])),
  ]
  const skills: SnapshotSkill[] = rollupAssessmentSkills(evidence)
    .map((s) => ({ key: s.key, name: s.name, score: Math.round(s.score * 10) / 10, assessmentCount: s.assessmentCount }))
    .sort((a, b) => a.score - b.score)

  // --- Company readiness, highest priority first ---------------------------
  const attemptByCompany = new Map<string, any>()
  for (const a of attempts as any[]) attemptByCompany.set(a.company, a)
  const companies: SnapshotCompanyGap[] = COMPANIES
    .slice()
    .sort((a, b) => a.priority - b.priority || COMPANY_ORDER[a.slug] - COMPANY_ORDER[b.slug])
    .slice(0, TRACKED_COMPANIES)
    .map((c) => {
      const at = attemptByCompany.get(c.slug)
      const done = at && (at.status === 'submitted' || at.status === 'expired')
      return {
        slug: c.slug, name: c.name, priority: c.priority,
        attemptScore: done ? num(at.score) : null,
        verdict: done ? (at.verdict ?? null) : null,
        attempted: !!done,
        focus: strList(c.focus, 4),
      }
    })

  const fb = resume?.feedback && typeof resume.feedback === 'object' ? resume.feedback : {}

  return {
    student: {
      firstName: firstName(profile.full_name),
      degree: profile.degree ? String(profile.degree) : null,
      college: profile.college ? String(profile.college) : null,
      graduationYear: num(profile.graduation_year),
      cgpa: num(profile.cgpa),
      claimedSkills: profile.skills ? String(profile.skills).slice(0, 400) : null,
      hasResume: !!resume,
      hasLinkedin: !!profile.linkedin_url,
      hasGithub: !!profile.github_url,
    },
    calibi: {
      score: calibi.score,
      grade: calibi.grade,
      percent: calibi.percent,
      assessmentsCount: calibi.count,
    },
    assessments,
    skills,
    categories: calibi.categories.map((c) => ({ id: c.id, label: c.label, percent: c.percent, count: c.count })),
    resume: {
      exists: !!resume,
      score: resume ? num(resume.resume_score) : null,
      strengths: strList(fb.strengths),
      gaps: strList(fb.gaps),
      suggestions: strList(fb.suggestions),
    },
    companies,
    generatedAt: new Date().toISOString(),
  }
}
