'use client'
/**
 * Mentorly's animated mascot — a friendly male coach who waves "hi" and blinks.
 *
 * Pure inline SVG + CSS keyframes (defined in globals.css as `mentorly-*`), so
 * there is no image asset, no network request and nothing for the CSP to block.
 * The eyes blink on a loop, one hand waves, and a little "Hi!" bubble pops in
 * every few seconds. All motion is paused automatically for users who prefer
 * reduced motion (global rule in globals.css).
 */
import type { CSSProperties } from 'react'

export function MentorlyAvatar({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={style} role="img" aria-label="Mentorly coach waving hello" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* "Hi!" speech bubble (pops in periodically) */}
      <g className="mentorly-hi">
        <rect x="27" y="0.5" width="20.5" height="13" rx="6.5" fill="#ffffff" />
        <path d="M33 12.5 L31.5 17 L37.5 12.8 Z" fill="#ffffff" />
        <text x="37.2" y="9.7" textAnchor="middle" fontSize="8" fontWeight="800" fill="#6d28d9" fontFamily="ui-sans-serif, system-ui, sans-serif">Hi!</text>
      </g>

      {/* Head + face (gentle bob) */}
      <g className="mentorly-head">
        {/* ears */}
        <circle cx="9.5" cy="25" r="2.6" fill="#eeb189" />
        <circle cx="32.5" cy="25" r="2.6" fill="#eeb189" />
        {/* face */}
        <circle cx="21" cy="24" r="13" fill="#f6c6a0" />
        {/* hair — full cap with a soft side-swept fringe */}
        <path d="M8 24 C8 14 14 10.5 21 10.5 C28 10.5 34 14 34 24 C33.2 19.5 31 17.6 28.8 17.4 C26.6 15.8 23.8 15.2 21 15.6 C18.4 15.3 15.4 15.9 13.2 17.6 C11 18 9 20 8 24 Z" fill="#3a2d28" />
        <path d="M20.6 15.7 C17.6 16 14.8 16.8 13 18.4 C15 16.9 18 16.2 21 16 C20.9 15.9 20.8 15.8 20.6 15.7 Z" fill="#4a3a33" />
        {/* eyebrows */}
        <path d="M13 19.3 Q16 18.1 19 19.3" stroke="#3a2d28" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M23 19.3 Q26 18.1 29 19.3" stroke="#3a2d28" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* eyes (blink) */}
        <g className="mentorly-eye">
          <ellipse cx="16" cy="23.6" rx="2.5" ry="3.1" fill="#ffffff" />
          <circle cx="16.4" cy="24" r="1.5" fill="#2a2420" />
          <circle cx="15.8" cy="23.3" r="0.5" fill="#ffffff" />
          <ellipse cx="26" cy="23.6" rx="2.5" ry="3.1" fill="#ffffff" />
          <circle cx="26.4" cy="24" r="1.5" fill="#2a2420" />
          <circle cx="25.8" cy="23.3" r="0.5" fill="#ffffff" />
        </g>
        {/* nose */}
        <path d="M21 24.4 q1.1 1.9 -0.5 3" stroke="#e09f78" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {/* cheeks */}
        <circle cx="13.2" cy="28.6" r="1.7" fill="#f2a085" opacity="0.5" />
        <circle cx="28.8" cy="28.6" r="1.7" fill="#f2a085" opacity="0.5" />
        {/* smile */}
        <path d="M15.5 29.4 Q21 34.2 26.5 29.4" stroke="#aa5236" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>

      {/* Waving hand */}
      <g className="mentorly-hand">
        {/* forearm */}
        <rect x="35.6" y="23" width="3.6" height="10" rx="1.8" fill="#f6c6a0" transform="rotate(20 37.4 28)" />
        {/* palm */}
        <circle cx="41.4" cy="20.6" r="4.2" fill="#f6c6a0" />
        {/* fingers */}
        <path d="M39.2 16.8 v-3.2 M41.4 16.2 v-3.6 M43.6 16.8 v-3" stroke="#f6c6a0" strokeWidth="1.9" strokeLinecap="round" />
        {/* thumb */}
        <path d="M37.6 19 q-2.4 -0.4 -2.8 1.8" stroke="#f6c6a0" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
