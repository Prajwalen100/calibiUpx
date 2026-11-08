-- ============================================================================
-- Migration 0014 — CalibiUpX Pro Subscriptions (Razorpay Integration)
-- Idempotent table & policies for tracking Pro membership.
-- ============================================================================

create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.profiles(id) on delete cascade,
  plan                text not null check (plan in ('monthly', 'half_yearly', 'yearly')),
  amount_paise        integer not null,
  currency            text not null default 'INR',
  razorpay_order_id   text,
  razorpay_payment_id text,
  razorpay_signature  text,
  status              text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  starts_at           timestamptz not null default now(),
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists subscriptions_student_idx
  on public.subscriptions (student_id, status, expires_at);

alter table public.subscriptions enable row level security;

drop policy if exists "own subscriptions read" on public.subscriptions;
create policy "own subscriptions read" on public.subscriptions
  for select using (auth.uid() = student_id);

comment on table public.subscriptions is
  'CalibiUpX Pro subscriptions paid via Razorpay. One active row grants access to 60+ company mocks and Mentorly.';
