/**
 * Mentorly long-term memory — a rolling, LLM-maintained summary per student.
 *
 * This is the no-vector-DB approach to cross-session memory: instead of
 * embedding and retrieving past messages, Mentorly keeps ONE compact summary
 * of what it knows about each student (goals, target companies, recurring
 * struggles, advice already given, commitments they made). It is refreshed
 * every few replies from the real chat history and fed back into the coach's
 * prompt, so the conversation has continuity across sessions — all in plain
 * Postgres.
 *
 * Cost control: the summariser runs at most once every SUMMARY_EVERY assistant
 * replies, and is always best-effort — a failure (or a model that is not
 * configured) simply leaves the previous summary in place.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { callLlm, isLlmConfigured } from '../llm.ts'
import {
  countAssistantMessages, loadMemory, loadRecentMessages, saveMemory,
} from './persist.ts'

/** Refresh the memory every N assistant replies. */
const SUMMARY_EVERY = 5
/** How many recent messages to fold in when refreshing. */
const FOLD_WINDOW = 30
const SUMMARY_TIMEOUT_MS = 20_000
const MAX_SUMMARY_CHARS = 1_600

const SUMMARY_SYSTEM = `You maintain a compact long-term memory profile of a student for their AI placement coach (Mentorly).

Rewrite the memory by MERGING the existing memory with the recent conversation. Produce a single, dense profile (not a transcript) that the coach can read at the start of future chats.

Capture only durable, useful facts:
- the student's goals and target companies / roles;
- recurring weaknesses and strengths they care about;
- advice or plans already given (so the coach doesn't repeat itself);
- commitments the student made ("said they'd practise DBMS", "will retake TCS");
- clear preferences (tone, focus areas, timeline / drive dates).

RULES:
- Do NOT store exact scores or percentages — those come from live data, not memory.
- Drop anything stale or superseded by newer messages.
- No preamble, no headings. Plain prose or short dashes.
- Hard limit: 1200 characters. Be terse.`

/** Build the summariser's user message. */
function summaryInput(existing: string, convo: Array<{ role: string; content: string }>): string {
  const transcript = convo
    .map((m) => `${m.role === 'assistant' ? 'Coach' : 'Student'}: ${m.content}`)
    .join('\n')
    .slice(0, 8_000)
  return `EXISTING MEMORY:\n${existing || '(none yet)'}\n\nRECENT CONVERSATION:\n${transcript}\n\nReturn the updated memory profile.`
}

/**
 * Refresh the student's long-term memory if enough new replies have landed.
 * Call after a turn is persisted. Always best-effort; never throws.
 */
export async function maybeUpdateMemory(sb: SupabaseClient | null, studentId: string): Promise<void> {
  if (!sb || !isLlmConfigured()) return
  try {
    const count = await countAssistantMessages(sb, studentId)
    // Summarise on the 5th, 10th, 15th … assistant reply only.
    if (count === 0 || count % SUMMARY_EVERY !== 0) return

    const existing = await loadMemory(sb, studentId)
    // Already folded at this count (e.g. a retry) — nothing new to do.
    if (existing && existing.foldedAt === count) return

    const recent = await loadRecentMessages(sb, studentId, FOLD_WINDOW)
    if (!recent.length) return

    const updated = await callLlm({
      label: 'mentorly-memory',
      temperature: 0.2,
      timeoutMs: SUMMARY_TIMEOUT_MS,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM },
        { role: 'user', content: summaryInput(existing?.summary || '', recent) },
      ],
    })
    if (updated && updated.trim()) {
      await saveMemory(sb, studentId, updated.trim().slice(0, MAX_SUMMARY_CHARS), count)
    }
  } catch (e: any) {
    console.warn('[mentorly] memory update failed:', e?.message || e)
  }
}
