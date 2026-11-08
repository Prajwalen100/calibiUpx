// POST /api/mentorly/chat  { student_id, intent, messages:[{role,content}] }
//
// Mentorly — the AI placement coach. Builds a deterministic snapshot of the
// VERIFIED student from real Supabase data, selects an AI layer by intent,
// grounds the model on exact facts (so it cannot invent numbers), answers via
// DeepSeek, and persists the turn. Falls back to a grounded heuristic reply
// when no model is configured or the call fails — the coach never dead-ends.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireStudentApi } from '@/lib/studentApi'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { isLlmConfigured, streamLlm } from '@/lib/llm'
import { buildStudentSnapshot } from '@/lib/mentorly/snapshot'
import { buildSystemPrompt, heuristicReply } from '@/lib/mentorly/layers'
import { appendTurn, loadMemory } from '@/lib/mentorly/persist'
import { maybeUpdateMemory } from '@/lib/mentorly/memory'
import { MENTORLY_INTENTS, type MentorlyIntent } from '@/lib/mentorly/types'

const RATE_LIMIT = 600            // per-IP abuse backstop (campuses share a NAT IP)
const RATE_WINDOW_MS = 60_000
const AI_TIMEOUT_MS = 25_000
const MAX_MESSAGE_CHARS = 4_000
const MAX_HISTORY = 10

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  const rl = checkRateLimit(`mentorly:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec), 'Cache-Control': 'no-store' } },
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return bad(400, 'Invalid JSON body')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad(400, 'A JSON object is required')

  const intent: MentorlyIntent = MENTORLY_INTENTS.includes(body.intent) ? body.intent : 'chat'

  // Only real conversation turns; a client can never smuggle a system message
  // into the model prompt.
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-MAX_HISTORY)
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
    .filter((m: any) => m.content.trim())

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return bad(400, 'Send your own question to get a response.')
  }
  const lastUser = messages[messages.length - 1].content

  const ctx = await requireStudentApi(req, body.student_id)
  if (!ctx.ok) return ctx.response
  const sb = ctx.supabase ? ctx.db : null
  const studentId = ctx.studentId

  // Gating: Mentorly AI coach requires an active Pro subscription
  if (sb) {
    try {
      const { data: sub } = await sb
        .from('subscriptions')
        .select('id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
      if (!sub || sub.length === 0) {
        return NextResponse.json(
          { error: 'CalibiUpX Pro subscription required to use Mentorly AI coach.' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        )
      }
    } catch {}
  }

  // Build the deterministic snapshot from real data. If this fails the coach
  // is useless (no grounding), so surface it rather than guess.
  let snapshot
  try {
    snapshot = await buildStudentSnapshot(sb, studentId)
  } catch (e: any) {
    console.error('[mentorly] snapshot failed:', e?.message || e)
    return NextResponse.json(
      { error: 'Could not load your data right now. Please retry in a moment.', detail: String(e?.message || e) },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '10' } },
    )
  }

  // Long-term memory (rolling summary from past sessions) — cheap single row,
  // best-effort. Gives the coach continuity without any vector store.
  const memory = await loadMemory(sb, studentId).catch(() => null)
  const systemPrompt = buildSystemPrompt(snapshot, intent, memory?.summary)
  const llmReady = isLlmConfigured()

  // Stream the reply token-by-token so the dock can type it in real time. The
  // model path streams live deltas; if no model is configured — or it produces
  // nothing — the grounded heuristic reply is streamed in small chunks so the
  // typing experience (and the answer) are identical to the student.
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = ''
      let engine: 'calibiai' | 'heuristic' = 'heuristic'
      try {
        if (llmReady) {
          for await (const delta of streamLlm({
            label: `mentorly-${intent}`,
            temperature: intent === 'chat' ? 0.5 : 0.35,
            timeoutMs: AI_TIMEOUT_MS,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          })) {
            if (!delta) continue
            full += delta
            controller.enqueue(encoder.encode(delta))
          }
          if (full.trim()) engine = 'calibiai'
        }

        if (!full.trim()) {
          engine = 'heuristic'
          const fallback = heuristicReply(snapshot, intent)
          full = fallback
          // Chunk by word so the client still sees it being typed.
          for (const piece of fallback.match(/\S+\s*/g) || [fallback]) {
            controller.enqueue(encoder.encode(piece))
            await new Promise((r) => setTimeout(r, 12))
          }
        }
      } catch (e: any) {
        console.warn('[mentorly] stream failed:', e?.message || e)
        if (!full.trim()) {
          full = heuristicReply(snapshot, intent)
          controller.enqueue(encoder.encode(full))
        }
      } finally {
        controller.close()
        // Persist best-effort after the stream completes; never blocks it.
        // Then refresh long-term memory (runs the summariser only every few
        // replies; no-op otherwise). Both are fire-and-forget.
        void appendTurn(sb, studentId, intent, lastUser, full, engine)
          .then(() => maybeUpdateMemory(sb, studentId))
          .catch(() => { /* memory is best-effort */ })
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      // Disable proxy buffering (LiteSpeed/nginx) so deltas flush immediately.
      'X-Accel-Buffering': 'no',
      'X-Mentorly-Engine': llmReady ? 'calibiai' : 'heuristic',
    },
  })
}
