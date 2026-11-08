// GET /api/mentorly/context?student_id=…
//
// A compact, safe summary of the VERIFIED student for the Mentorly dock header
// (score, grade, weakest skills, resume score) plus recent chat history so the
// conversation survives a reload. No answer keys or raw answers are exposed.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireStudentApi } from '@/lib/studentApi'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { buildStudentSnapshot } from '@/lib/mentorly/snapshot'
import { loadRecentMessages } from '@/lib/mentorly/persist'

export async function GET(req: Request) {
  const rl = checkRateLimit(`mentorly-ctx:${getClientIp(req)}`, 600, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec), 'Cache-Control': 'no-store' } },
    )
  }

  const url = new URL(req.url)
  const ctx = await requireStudentApi(req, url.searchParams.get('student_id'))
  if (!ctx.ok) return ctx.response
  const sb = ctx.supabase ? ctx.db : null

  try {
    const [snap, history] = await Promise.all([
      buildStudentSnapshot(sb, ctx.studentId),
      loadRecentMessages(sb, ctx.studentId, 20),
    ])

    return NextResponse.json(
      {
        ok: true,
        summary: {
          firstName: snap.student.firstName,
          score: snap.calibi.score,
          grade: snap.calibi.grade,
          assessmentsCount: snap.calibi.assessmentsCount,
          weakSkills: snap.skills.slice(0, 3).map((s) => ({ name: s.name, score: s.score })),
          resumeScore: snap.resume.score,
          hasResume: snap.resume.exists,
          companiesAttempted: snap.companies.filter((c) => c.attempted).length,
          companiesTracked: snap.companies.length,
        },
        history: history.map((m) => ({ role: m.role, content: m.content, intent: m.intent })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e: any) {
    console.error('[mentorly] context failed:', e?.message || e)
    return NextResponse.json(
      { error: 'Could not load your coach data.', detail: String(e?.message || e) },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '10' } },
    )
  }
}
