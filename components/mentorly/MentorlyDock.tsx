'use client'
/**
 * Mentorly — the AI placement coach dock.
 *
 * A floating assistant that opens at the bottom-left of the student dashboard
 * and can be DRAGGED anywhere by its header (position is remembered). On open
 * it loads a compact, verified summary of the student (CalibiAI Score, weakest
 * skills, resume score) and restores past chat. Quick-action chips run the
 * specialised AI layers (score / company / plan / resume); free text runs the
 * general coach. Replies STREAM in token-by-token (typed in real time) and a
 * soft tone plays when an answer starts (mutable). Every answer is grounded
 * server-side in the student's real data, so nothing here trusts client numbers.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, BarChart3, Building2, CalendarCheck, FileText, Loader2, Volume2, VolumeX, Crown, Lock } from 'lucide-react'
import { useStore } from '@/lib/store'
import { usePro } from '@/lib/pro/context'
import { authenticatedFetch } from '@/lib/clientAuth'
import { MentorlyAvatar } from './MentorlyAvatar'
import type { MentorlyIntent } from '@/lib/mentorly/types'

const POS_KEY = 'mentorly_pos'
const BTN_POS_KEY = 'mentorly_btn_pos'
const MUTE_KEY = 'mentorly_muted'

interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface Summary {
  firstName: string | null
  score: number | null
  grade: string | null
  assessmentsCount: number
  weakSkills: Array<{ name: string; score: number }>
  resumeScore: number | null
  hasResume: boolean
  companiesAttempted: number
  companiesTracked: number
}

const QUICK_ACTIONS: Array<{ intent: MentorlyIntent; label: string; icon: any; prompt: string }> = [
  { intent: 'score', label: 'Analyse my score', icon: BarChart3, prompt: 'Analyse my CalibiAI Score and tell me how to improve it.' },
  { intent: 'company', label: 'Company readiness', icon: Building2, prompt: 'Which companies am I ready for, and which should I prepare next?' },
  { intent: 'plan', label: 'Build my plan', icon: CalendarCheck, prompt: 'Build me a weekly prep plan for my weak areas and target companies.' },
  { intent: 'resume', label: 'Improve my resume', icon: FileText, prompt: 'How can I improve my resume?' },
]

/** Minimal, safe Markdown → React (bold, inline code, bullets, line breaks). */
function renderRich(text: string): React.ReactNode {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let bullets: React.ReactNode[] = []
  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`ul-${out.length}`} className="my-1.5 ml-4 list-disc space-y-1">{bullets}</ul>)
      bullets = []
    }
  }
  const inline = (s: string, keyBase: string): React.ReactNode[] => {
    // Split on **bold** and `code`, keeping delimiters.
    const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
    return parts.map((p, i) => {
      if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={`${keyBase}-${i}`} className="font-bold text-slate-900 dark:text-white">{p.slice(2, -2)}</strong>
      if (/^`[^`]+`$/.test(p)) return <code key={`${keyBase}-${i}`} className="rounded bg-slate-100 dark:bg-white/10 px-1 py-0.5 text-[11px] font-mono">{p.slice(1, -1)}</code>
      return <span key={`${keyBase}-${i}`}>{p}</span>
    })
  }
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) { bullets.push(<li key={`li-${idx}`}>{inline(bullet[1], `li-${idx}`)}</li>); return }
    flush()
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      out.push(<p key={`h-${idx}`} className="mt-2.5 mb-1 first:mt-0 text-[13px] font-black text-slate-900 dark:text-white">{inline(heading[2], `h-${idx}`)}</p>)
      return
    }
    if (line.trim()) out.push(<p key={`p-${idx}`} className="my-1.5 first:mt-0 last:mb-0">{inline(line, `p-${idx}`)}</p>)
  })
  flush()
  return out
}

export function MentorlyDock() {
  const { user } = useStore()
  const { isPro, openUpgradeModal } = usePro()
  const [open, setOpen] = useState(false)
  const [loadingCtx, setLoadingCtx] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [awaitingReply, setAwaitingReply] = useState(false)
  const [error, setError] = useState('')
  const [loadedCtx, setLoadedCtx] = useState(false)
  const [muted, setMuted] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingBtn, setIsDraggingBtn] = useState(false)
  const hasDraggedBtnRef = useRef(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) })
  }, [])

  // Restore mute preference + last dragged positions (defaulting to bottom-left if unset).
  useEffect(() => {
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === '1')
      const raw = localStorage.getItem(POS_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (p && typeof p.x === 'number' && typeof p.y === 'number') setPos(p)
      }
      const rawBtn = localStorage.getItem(BTN_POS_KEY)
      if (rawBtn) {
        const bp = JSON.parse(rawBtn)
        if (bp && typeof bp.x === 'number' && typeof bp.y === 'number') setBtnPos(bp)
      }
    } catch { /* ignore */ }
  }, [])

  /** Soft two-note "answer ready" tone via Web Audio (no asset, no network). */
  const playTone = useCallback(() => {
    if (muted) return
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
      if (!AC) return
      const ctx = audioRef.current || (audioRef.current = new AC())
      if (ctx.state === 'suspended') void ctx.resume()
      const now = ctx.currentTime
      ;[880, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        osc.connect(gain)
        gain.connect(ctx.destination)
        const t = now + i * 0.085
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.1, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
        osc.start(t)
        osc.stop(t + 0.24)
      })
    } catch { /* audio unavailable */ }
  }, [muted])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try { localStorage.setItem(MUTE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }, [])

  // --- Drag the launcher button ---------------------------------------------
  const clampBtnPos = useCallback((x: number, y: number) => {
    const el = btnRef.current
    const w = el?.offsetWidth ?? 160
    const h = el?.offsetHeight ?? 48
    return {
      x: Math.max(8, Math.min(window.innerWidth - w - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, y)),
    }
  }, [])

  const onBtnPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const origX = r.left
    const origY = r.top
    const startX = e.clientX
    const startY = e.clientY
    hasDraggedBtnRef.current = false

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (!hasDraggedBtnRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        hasDraggedBtnRef.current = true
        setIsDraggingBtn(true)
      }
      if (hasDraggedBtnRef.current) {
        setBtnPos(clampBtnPos(origX + dx, origY + dy))
      }
    }

    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (hasDraggedBtnRef.current) {
        setIsDraggingBtn(false)
        setBtnPos((p) => {
          if (p) {
            try { localStorage.setItem(BTN_POS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
          }
          return p
        })
      }
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [clampBtnPos])

  const onBtnClick = () => {
    if (hasDraggedBtnRef.current) return
    if (!isPro) {
      openUpgradeModal('Mentorly AI Placement Coach')
      return
    }
    setOpen(true)
  }

  // --- Drag the panel by its header -----------------------------------------
  const clampPos = useCallback((x: number, y: number) => {
    const el = panelRef.current
    const w = el?.offsetWidth ?? 380
    const h = el?.offsetHeight ?? 560
    return {
      x: Math.max(8, Math.min(window.innerWidth - w - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - h - 8, y)),
    }
  }, [])

  // Drag via window-level listeners (robust: pointer can leave the small header
  // mid-drag without losing move/up events).
  const onHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    const el = panelRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = e.clientX - r.left
    const dy = e.clientY - r.top
    const move = (ev: PointerEvent) => { setPos(clampPos(ev.clientX - dx, ev.clientY - dy)) }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setPos((p) => { if (p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* ignore */ } } return p })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    e.preventDefault()
  }, [clampPos])

  // Keep the launcher and panel on-screen if the viewport shrinks.
  useEffect(() => {
    const onResize = () => {
      setPos((p) => (p ? clampPos(p.x, p.y) : p))
      setBtnPos((bp) => (bp ? clampBtnPos(bp.x, bp.y) : bp))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clampPos, clampBtnPos])

  // Load the verified summary + history the first time the dock is opened.
  useEffect(() => {
    if (!open || loadedCtx || !user?.id) return
    let cancelled = false
    setLoadingCtx(true)
    setError('')
    authenticatedFetch(`/api/mentorly/context?student_id=${encodeURIComponent(user.id)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d?.ok) {
          setSummary(d.summary)
          if (Array.isArray(d.history) && d.history.length) {
            setMessages(d.history.map((m: any) => ({ role: m.role, content: m.content })))
          }
        } else {
          setError(d?.error || 'Could not load your coach.')
        }
        setLoadedCtx(true)
      })
      .catch(() => { if (!cancelled) { setError('Network error — please retry.'); setLoadedCtx(true) } })
      .finally(() => { if (!cancelled) { setLoadingCtx(false); scrollToEnd() } })
    return () => { cancelled = true }
  }, [open, loadedCtx, user?.id, scrollToEnd])

  const send = useCallback(async (text: string, intent: MentorlyIntent) => {
    const trimmed = text.trim()
    if (!trimmed || sending || !user?.id) return
    setError('')
    const next = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(next)
    setInput('')
    setSending(true)
    setAwaitingReply(true)
    scrollToEnd()
    try {
      const res = await authenticatedFetch('/api/mentorly/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.id, intent, messages: next.slice(-10) }),
      })

      if (!res.ok) {
        let msg = 'Mentorly could not answer. Please retry.'
        try { const d = await res.json(); msg = d?.error || msg } catch { /* non-JSON */ }
        setError(msg)
        return
      }

      // Stream the reply, typing it into a growing assistant bubble.
      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ''
        let started = false
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          if (!chunk) continue
          acc += chunk
          if (!started) {
            started = true
            setAwaitingReply(false)
            playTone()
            setMessages((prev) => [...prev, { role: 'assistant', content: acc }])
          } else {
            setMessages((prev) => {
              const copy = prev.slice()
              const last = copy[copy.length - 1]
              if (last && last.role === 'assistant') copy[copy.length - 1] = { role: 'assistant', content: acc }
              return copy
            })
          }
          scrollToEnd()
        }
        if (!started) setError('Mentorly returned an empty reply. Please retry.')
      } else {
        // No streaming support — fall back to a single JSON read.
        const d = await res.json().catch(() => null)
        if (d?.reply) { playTone(); setMessages((prev) => [...prev, { role: 'assistant', content: d.reply }]) }
        else setError('Mentorly could not answer. Please retry.')
      }
    } catch {
      setError('Network error — please retry.')
    } finally {
      setSending(false)
      setAwaitingReply(false)
      scrollToEnd()
    }
  }, [messages, sending, user?.id, scrollToEnd, playTone])

  if (!user?.id) return null

  const hasChat = messages.length > 0

  return (
    <>
      {/* Launcher — Draggable with bottom-left default position */}
      {!open && (
        <button
          ref={btnRef}
          onPointerDown={onBtnPointerDown}
          onClick={onBtnClick}
          aria-label="Open Mentorly, your AI placement coach"
          title="Click to open · Drag to move"
          className={`fixed z-50 flex items-center gap-2 rounded-full calibiai-gradient px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/30 select-none touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            btnPos ? '' : 'bottom-5 left-5'
          } ${
            isDraggingBtn
              ? 'cursor-grabbing scale-105 shadow-2xl ring-2 ring-white/60 transition-none'
              : 'cursor-grab transition-transform hover:scale-105 hover:shadow-xl'
          }`}
          style={btnPos ? { left: btnPos.x, top: btnPos.y, right: 'auto', bottom: 'auto' } : undefined}
        >
          <MentorlyAvatar className="h-10 w-10 shrink-0 -my-1 drop-shadow-sm" />
          <span className="hidden sm:inline">Ask Mentorly</span>
          {!isPro && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400 text-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow">
              <Crown className="w-3 h-3 fill-slate-900" /> PRO
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div ref={panelRef}
          className={`fixed z-50 flex w-[calc(100vw-2.5rem)] max-w-[400px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl animate-fade-up ${pos || btnPos ? '' : 'bottom-5 left-5'}`}
          style={{
            height: 'min(620px, calc(100vh - 2.5rem))',
            ...(pos
              ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
              : btnPos
              ? { left: clampPos(btnPos.x, btnPos.y - 560).x, top: clampPos(btnPos.x, btnPos.y - 560).y, right: 'auto', bottom: 'auto' }
              : {}),
          }}
          role="dialog" aria-label="Mentorly AI coach">
          {/* Header — drag handle (the title area); buttons stay clickable */}
          <div className="relative shrink-0 calibiai-gradient px-4 py-3.5 text-white">
            <div className="flex items-center justify-between">
              <div
                onPointerDown={onHeaderPointerDown}
                className="flex flex-1 cursor-move touch-none select-none items-center gap-2"
                title="Drag to move"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20"><Sparkles className="h-4 w-4" aria-hidden /></span>
                <div className="leading-tight">
                  <div className="text-sm font-black">Mentorly</div>
                  <div className="text-[10px] font-semibold text-white/80">Your AI placement coach · drag to move</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={toggleMute} aria-label={muted ? 'Unmute Mentorly sound' : 'Mute Mentorly sound'} title={muted ? 'Sound off' : 'Sound on'} className="rounded-full p-1.5 transition hover:bg-white/20">
                  {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
                </button>
                <button onClick={() => setOpen(false)} aria-label="Close Mentorly" className="rounded-full p-1.5 transition hover:bg-white/20">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            {summary && (summary.score != null || summary.assessmentsCount > 0) && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
                {summary.score != null && <span className="rounded-full bg-white/20 px-2 py-0.5">Score {summary.score}/1000 · {summary.grade}</span>}
                <span className="rounded-full bg-white/20 px-2 py-0.5">{summary.companiesAttempted}/{summary.companiesTracked} companies</span>
                {summary.resumeScore != null && <span className="rounded-full bg-white/20 px-2 py-0.5">Resume {summary.resumeScore}/100</span>}
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loadingCtx && !hasChat && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your data…</div>
            )}

            {!hasChat && !loadingCtx && (
              <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 p-4 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-800 dark:text-white">Hi{summary?.firstName ? ` ${summary.firstName}` : ''} 👋 I'm Mentorly.</p>
                <p className="mt-1.5 text-[13px] leading-relaxed">
                  I read your real scores, skills and resume, then help you get placement-ready. Pick a starting point below or ask me anything.
                </p>
                {summary?.weakSkills?.length ? (
                  <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                    Weakest right now: {summary.weakSkills.map((s) => `${s.name} (${s.score}%)`).join(', ')}.
                  </p>
                ) : null}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' ? renderRich(m.content) : m.content}
                </div>
              </div>
            ))}

            {awaitingReply && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-white/10 px-3.5 py-2.5 text-slate-400">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                </div>
              </div>
            )}

            {error && <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[12px] font-semibold text-rose-600 dark:text-rose-300">{error}</div>}
          </div>

          {/* Quick actions */}
          {!hasChat && !loadingCtx && (
            <div className="shrink-0 grid grid-cols-2 gap-2 px-4 pb-2">
              {QUICK_ACTIONS.map(({ intent, label, icon: Icon, prompt }) => (
                <button key={intent} onClick={() => send(prompt, intent)} disabled={sending}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/60 px-3 py-2 text-[11.5px] font-bold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50">
                  <Icon className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <div className="shrink-0 border-t border-slate-100 dark:border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input, 'chat') } }}
                rows={1}
                placeholder="Ask Mentorly anything…"
                className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button onClick={() => send(input, 'chat')} disabled={sending || !input.trim()} aria-label="Send"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl calibiai-gradient text-white transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9.5px] text-slate-400">Mentorly uses your real CalibiUpX data. Guidance only — verify before you act.</p>
          </div>
        </div>
      )}
    </>
  )
}
