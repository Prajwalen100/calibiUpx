/**
 * Mentorly — the AI placement coach.
 *
 * Shared types for the student snapshot (deterministic, built from real
 * Supabase data) and the chat protocol. Every AI layer consumes the same
 * snapshot so answers stay grounded in the student's actual numbers.
 */

/** The intent chosen by a quick-action chip (or inferred for free chat). */
export type MentorlyIntent =
  | 'chat'
  | 'score'
  | 'company'
  | 'plan'
  | 'resume'

export const MENTORLY_INTENTS: MentorlyIntent[] = ['chat', 'score', 'company', 'plan', 'resume']

export interface MentorlyMessage {
  role: 'user' | 'assistant'
  content: string
}

/** One finished assessment, normalised to a percentage for the coach. */
export interface SnapshotAssessment {
  key: string
  label: string
  kind: 'core' | 'capgemini' | 'company'
  company?: string
  percent: number
  outcome: string | null
  at: string | null
}

/** One canonical skill the student has been measured on. */
export interface SnapshotSkill {
  key: string
  name: string
  /** 0-100, mean across every assessment that measured it. */
  score: number
  assessmentCount: number
}

/** One company's hiring-readiness gap for this student. */
export interface SnapshotCompanyGap {
  slug: string
  name: string
  priority: number
  /** Student's best score on this company mock, or null if not attempted. */
  attemptScore: number | null
  verdict: string | null
  attempted: boolean
  /** What this company's mock emphasises (from the catalog). */
  focus: string[]
}

/** The complete, deterministic picture Mentorly reasons over. */
export interface StudentSnapshot {
  student: {
    firstName: string | null
    degree: string | null
    college: string | null
    graduationYear: number | null
    cgpa: number | null
    /** Free-text skills the student claims on their profile. */
    claimedSkills: string | null
    hasResume: boolean
    hasLinkedin: boolean
    hasGithub: boolean
  }
  calibi: {
    score: number | null
    /** 0-1000 → S/A/B/C/D, or null. */
    grade: string | null
    percent: number | null
    assessmentsCount: number
  }
  /** Every finished assessment, newest first. */
  assessments: SnapshotAssessment[]
  /** Skills sorted weakest-first (the coaching priority order). */
  skills: SnapshotSkill[]
  /** Category → mean percent (platform vs each company tag). */
  categories: Array<{ id: string; label: string; percent: number; count: number }>
  resume: {
    exists: boolean
    score: number | null
    strengths: string[]
    gaps: string[]
    suggestions: string[]
  }
  /** Company readiness, highest-priority first. */
  companies: SnapshotCompanyGap[]
  generatedAt: string
}
