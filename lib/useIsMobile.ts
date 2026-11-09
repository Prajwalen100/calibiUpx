'use client'
import { useEffect, useState } from 'react'

/**
 * True while the viewport is narrower than `breakpoint` (Tailwind's `sm` by
 * default). Starts `false` so the server and the first client render agree —
 * the real value lands in the effect, after hydration.
 */
export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [breakpoint])

  return isMobile
}
