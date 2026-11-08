-- ============================================================================
-- Migration 0013 — Mentorly (AI placement coach) chat history
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
--
-- Stores the student's conversation with Mentorly so the coach has memory
-- across sessions. No scores or answer keys live here — only chat text and the
-- layer (intent) each message used. Writes require the service-role key; a
-- student may only READ their own conversation.
--
-- The feature works WITHOUT this migration: lib/mentorly/persist.ts treats a
-- missing table as "no history" and the chat stays stateless until it is
-- applied. Apply this to turn on cross-session memory.
-- ============================================================================

create table if not exists public.mentorly_messages (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  intent        text not null default 'chat'
                check (intent ~ '^[a-z0-9_-]{1,32}$'),
  content       text not null check (char_length(content) <= 8000),
  /** 'calibiai' = answered by the model, 'heuristic' = grounded fallback. */
  engine        text check (engine is null or engine in ('calibiai', 'heuristic')),
  created_at    timestamptz not null default now()
);

create index if not exists mentorly_messages_student_idx
  on public.mentorly_messages (student_id, created_at);

comment on table public.mentorly_messages is
  'Mentorly AI coach chat history. One row per message; students read only their own.';

alter table public.mentorly_messages enable row level security;

drop policy if exists "own mentorly messages read" on public.mentorly_messages;
create policy "own mentorly messages read" on public.mentorly_messages
  for select using (auth.uid() = student_id);

-- Institution staff can read their students' coach history (mirrors the
-- company-attempt tenant policy), so support can see context when helping.
drop policy if exists "tenant mentorly messages read" on public.mentorly_messages;
create policy "tenant mentorly messages read" on public.mentorly_messages
  for select using (
    exists (
      select 1 from public.profiles p
       where p.id = mentorly_messages.student_id
         and p.institution_id = (select institution_id from public.profiles where id = auth.uid())
    )
  );

-- Intentionally NO insert / update / delete policies: only the server
-- (service role, which bypasses RLS) writes, so a student can never forge
-- coach messages from the browser.

-- ---------------------------------------------------------------------------
-- Long-term memory (rolling summary). ONE row per student.
--
-- Instead of a vector store, Mentorly keeps a compact, LLM-maintained summary
-- of what it knows about each student across sessions (goals, target
-- companies, recurring struggles, advice already given, commitments). It is
-- refreshed every few replies from the real chat history and fed back into the
-- coach's prompt, so context survives across sessions without embeddings. All
-- in plain Postgres — no pgvector, no external DB.
-- ---------------------------------------------------------------------------
create table if not exists public.mentorly_memory (
  student_id    uuid primary key references public.profiles(id) on delete cascade,
  summary       text not null default '' check (char_length(summary) <= 4000),
  /** Assistant-reply count the summary was last folded at (freshness marker). */
  folded_at     int not null default 0,
  updated_at    timestamptz not null default now()
);

comment on table public.mentorly_memory is
  'Mentorly rolling long-term memory: one compact LLM summary per student. No vectors.';

alter table public.mentorly_memory enable row level security;

drop policy if exists "own mentorly memory read" on public.mentorly_memory;
create policy "own mentorly memory read" on public.mentorly_memory
  for select using (auth.uid() = student_id);

drop policy if exists "tenant mentorly memory read" on public.mentorly_memory;
create policy "tenant mentorly memory read" on public.mentorly_memory
  for select using (
    exists (
      select 1 from public.profiles p
       where p.id = mentorly_memory.student_id
         and p.institution_id = (select institution_id from public.profiles where id = auth.uid())
    )
  );

-- As with messages: only the service role writes (summaries are generated
-- server-side); no student-facing insert/update/delete policies.
