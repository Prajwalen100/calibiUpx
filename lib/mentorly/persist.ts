/**
 * Mentorly chat persistence (public.mentorly_messages).
 *
 * Everything here is best-effort and never throws into the request path: if
 * the table does not exist yet (migration 0013 not applied) or a write fails,
 * the coach simply runs stateless for that turn. Memory is a nice-to-have, not
 * a prerequisite for answering.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { toUuid } from '../persist.ts'
import type { MentorlyIntent, MentorlyMessage } from './types.ts'

/**
 * "The Mentorly tables aren't there yet" — the migration hasn't been applied.
 * Postgres raises SQLSTATE 42P01; PostgREST (supabase-js) instead returns
 * PGRST205 with a "schema cache" message. Treat all of these as a benign
 * not-migrated state so logs stay quiet until 0013 is applied.
 */
const UNDEFINED_TABLE = '42P01'
function isMissingTable(error: any): boolean {
  const code = String(error?.code || '')
  if (code === UNDEFINED_TABLE || code === 'PGRST205') return true
  return /schema cache|does not exist|could not find the table/i.test(String(error?.message || ''))
}

export interface StoredMentorlyMessage extends MentorlyMessage {
  intent: string
  engine: string | null
  created_at: string
}

/** Recent conversation for a student, oldest → newest. Empty on any failure. */
export async function loadRecentMessages(
  sb: SupabaseClient | null, studentId: string, limit = 20,
): Promise<StoredMentorlyMessage[]> {
  if (!sb) return []
  const sid = toUuid(studentId, 'profile')
  if (!sid) return []
  try {
    const { data, error } = await sb
      .from('mentorly_messages')
      .select('role,intent,content,engine,created_at')
      .eq('student_id', sid)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      if (!isMissingTable(error)) console.warn('[mentorly] load failed:', error.message)
      return []
    }
    const rows = Array.isArray(data) ? data : []
    return rows
      .reverse()
      .map((r) => ({
        role: r.role === 'assistant' ? 'assistant' : 'user',
        content: String(r.content || ''),
        intent: String(r.intent || 'chat'),
        engine: r.engine ?? null,
        created_at: r.created_at,
      }))
  } catch (e: any) {
    console.warn('[mentorly] load error:', e?.message || e)
    return []
  }
}

/** How many assistant replies this student has. 0 on any failure. */
export async function countAssistantMessages(
  sb: SupabaseClient | null, studentId: string,
): Promise<number> {
  if (!sb) return 0
  const sid = toUuid(studentId, 'profile')
  if (!sid) return 0
  try {
    const { count, error } = await sb
      .from('mentorly_messages')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', sid)
      .eq('role', 'assistant')
    if (error) {
      if (!isMissingTable(error)) console.warn('[mentorly] count failed:', error.message)
      return 0
    }
    return count ?? 0
  } catch {
    return 0
  }
}

export interface MentorlyMemory {
  summary: string
  foldedAt: number
}

/** The student's rolling long-term memory. Null when absent or unavailable. */
export async function loadMemory(
  sb: SupabaseClient | null, studentId: string,
): Promise<MentorlyMemory | null> {
  if (!sb) return null
  const sid = toUuid(studentId, 'profile')
  if (!sid) return null
  try {
    const { data, error } = await sb
      .from('mentorly_memory')
      .select('summary,folded_at')
      .eq('student_id', sid)
      .maybeSingle()
    if (error) {
      if (!isMissingTable(error)) console.warn('[mentorly] memory load failed:', error.message)
      return null
    }
    if (!data) return null
    return { summary: String(data.summary || ''), foldedAt: Number(data.folded_at) || 0 }
  } catch (e: any) {
    console.warn('[mentorly] memory load error:', e?.message || e)
    return null
  }
}

/** Upsert the rolling summary. Best-effort; never throws into the request path. */
export async function saveMemory(
  sb: SupabaseClient | null, studentId: string, summary: string, foldedAt: number,
): Promise<void> {
  if (!sb) return
  const sid = toUuid(studentId, 'profile')
  if (!sid) return
  try {
    const { error } = await sb
      .from('mentorly_memory')
      .upsert(
        { student_id: sid, summary: summary.slice(0, 4000), folded_at: foldedAt, updated_at: new Date().toISOString() },
        { onConflict: 'student_id' },
      )
    if (error && !isMissingTable(error)) console.warn('[mentorly] memory save failed:', error.message)
  } catch (e: any) {
    console.warn('[mentorly] memory save error:', e?.message || e)
  }
}

/** Append the user turn and the assistant reply. Best-effort. */
export async function appendTurn(
  sb: SupabaseClient | null,
  studentId: string,
  intent: MentorlyIntent,
  userText: string,
  assistantText: string,
  engine: 'calibiai' | 'heuristic',
): Promise<void> {
  if (!sb) return
  const sid = toUuid(studentId, 'profile')
  if (!sid) return
  const rows = [
    { student_id: sid, role: 'user', intent, content: userText.slice(0, 8000), engine: null },
    { student_id: sid, role: 'assistant', intent, content: assistantText.slice(0, 8000), engine },
  ]
  try {
    const { error } = await sb.from('mentorly_messages').insert(rows)
    if (error && !isMissingTable(error)) {
      console.warn('[mentorly] persist failed:', error.message)
    }
  } catch (e: any) {
    console.warn('[mentorly] persist error:', e?.message || e)
  }
}
