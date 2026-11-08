'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { HelpButton } from '@/components/HelpButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Logo } from '@/components/Logo'
import { AiAvatar } from '@/components/AiAvatar'
import { User, LogOut, ChevronDown, Building2, ShieldCheck, Zap, Crown } from 'lucide-react'
import { usePro } from '@/lib/pro/context'

/** The name the user chose on their profile page wins over the account /
 *  email-derived username (e.g. "Prajwal" over "prajwalgulhane85"). */
function displayNameFor(profile: any, user: any): string {
  const fromProfile = profile?.full_name?.trim?.()
  if (fromProfile) return fromProfile
  const fromUser = user?.name?.trim?.()
  if (fromUser) return fromUser
  return (user?.email?.split('@')[0] || 'User').trim()
}

export function Navbar() {
  const { user, profile, logout, hydrated } = useStore()
  const { isPro, openUpgradeModal, openInvoiceModal } = usePro()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // The brand links to the student dashboard when signed in, and to the
  // marketing home page when signed out. A signed-in user should never land on
  // the public home page by clicking the logo.
  const homeHref = user ? '/dashboard/student' : '/'

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // The name from the saved profile (what the user typed on the profile page)
  // takes priority over the account username derived from the email at signup.
  const displayName = displayNameFor(profile, user)

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/55 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-2.5 sm:gap-3 group select-none">
          <Logo size={40} className="transition-transform duration-200 group-hover:scale-105" />
          <div className="flex flex-col justify-center">
            <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-base sm:text-lg leading-tight">
              Calibi<span className="upx-gradient font-black">UpX</span>
            </span>
            <span className="hidden sm:block text-[8.5px] font-bold tracking-[0.18em] uppercase text-slate-400 dark:text-slate-500 mt-0.5">
              Assess · Elevate · Get Hired
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          {/* Pro Status or Upgrade to Pro CTA — ONLY shown AFTER sign in */}
          {hydrated && user && (
            isPro ? (
              <button
                onClick={() => openInvoiceModal()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-300 font-black text-xs shadow-sm hover:scale-105 transition"
                title="CalibiUpX PRO Membership Active — Click to view Tax Invoice & Details"
              >
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                <span className="tracking-wide">PRO</span>
              </button>
            ) : (
              <button
                onClick={() => openUpgradeModal()}
                className="group relative flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
                <span>Upgrade to Pro</span>
                <span className="hidden md:inline-block text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  31% OFF
                </span>
              </button>
            )
          )}

          <ThemeToggle />
          <HelpButton />
          {!hydrated ? (
            /* Not hydrated yet: hold a placeholder the same size as the account
               control. Without it the top-right corner renders "Sign in" on the
               first paint and then swaps to the avatar + name once localStorage
               has been read — a visible jump on every page, and part of the
               flicker seen when arriving on /instructions. */
            <span
              aria-hidden
              className="flex h-9 w-9 animate-pulse items-center justify-center rounded-full bg-slate-200/60 dark:bg-slate-800/60"
            />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Account menu"
                className="group flex items-center gap-1.5 rounded-full border border-white/60 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/80 py-1 pl-1 pr-2 shadow-sm backdrop-blur transition hover:bg-white dark:hover:bg-slate-800 hover:shadow-md"
              >
                {/* Circular AI avatar — the same generated avatar the user set up
                    on the profile page (falls back to a default face if none is
                    saved yet). */}
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full select-none shadow-inner ring-2 ring-white/70 dark:ring-slate-700/70">
                  <AiAvatar name={displayName} config={profile?.ai_avatar} size={36} className="block" />
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 origin-top-right animate-pop overflow-hidden rounded-2xl border border-white/60 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xl shadow-slate-500/15 dark:shadow-slate-950/60 backdrop-blur-xl"
                >
                  {/* Account header */}
                  <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                    <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{displayName}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-xs font-semibold capitalize text-indigo-600 dark:text-indigo-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {user.role}
                      </span>
                      {isPro ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                          <Crown className="w-3 h-3 fill-amber-400 text-amber-500" /> PRO
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setOpen(false)
                            openUpgradeModal()
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <Zap className="w-3 h-3" /> Upgrade
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      <User className="h-4 w-4 text-slate-400" />
                      See My Profile
                    </Link>
                    <Link
                      href="/company-assessments"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      <Building2 className="h-4 w-4 text-slate-400" />
                      Company Assessments
                    </Link>
                    {isPro ? (
                      <button
                        onClick={() => {
                          setOpen(false)
                          openInvoiceModal()
                        }}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/40 transition hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      >
                        <Crown className="h-4 w-4 text-amber-500 fill-amber-400" />
                        <span>CalibiUpX PRO (Tax Invoice)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setOpen(false)
                          openUpgradeModal()
                        }}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      >
                        <Zap className="h-4 w-4 text-indigo-500" />
                        <span>Upgrade to Pro (31% OFF)</span>
                      </button>
                    )}
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/70 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                      >
                        <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        Admin Console
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <LogOut className="h-4 w-4 text-slate-400" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary !px-5 !py-2 text-xs">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  )
}
