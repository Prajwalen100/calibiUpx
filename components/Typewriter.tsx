'use client'
import { useState, useEffect } from 'react'

interface TypewriterProps {
  text: string
  delay?: number
  typingDelay?: number
  deletingDelay?: number
  loopInterval?: number // Total cycle target in ms (default: 10000ms = 10s)
  highlightText?: string
  highlightClassName?: string
  className?: string
  cursorClassName?: string
}

export function Typewriter({
  text,
  delay = 55,
  typingDelay,
  deletingDelay = 20,
  loopInterval = 10000,
  highlightText,
  highlightClassName = 'upx-gradient font-black',
  className = '',
  cursorClassName = 'bg-indigo-600 dark:bg-cyan-400',
}: TypewriterProps) {
  const tDelay = typingDelay ?? delay
  const [displayedCount, setDisplayedCount] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('typing')

  const totalChars = text.length

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    if (phase === 'typing') {
      if (displayedCount < totalChars) {
        timeoutId = setTimeout(() => {
          setDisplayedCount((prev) => prev + 1)
        }, tDelay)
      } else {
        // Finished typing. Hold until the 10-second loop interval completes.
        if (loopInterval && loopInterval > 0) {
          const typeDuration = totalChars * tDelay
          const deleteDuration = totalChars * deletingDelay
          const holdTime = Math.max(2000, loopInterval - typeDuration - deleteDuration)
          timeoutId = setTimeout(() => {
            setPhase('deleting')
          }, holdTime)
        }
      }
    } else if (phase === 'deleting') {
      if (displayedCount > 0) {
        timeoutId = setTimeout(() => {
          setDisplayedCount((prev) => prev - 1)
        }, deletingDelay)
      } else {
        // Short pause at zero before restarting the next 10s typing cycle
        timeoutId = setTimeout(() => {
          setPhase('typing')
        }, 300)
      }
    }

    return () => clearTimeout(timeoutId)
  }, [displayedCount, phase, totalChars, tDelay, deletingDelay, loopInterval])

  const currentStr = text.slice(0, displayedCount)

  const renderContent = () => {
    if (!highlightText) {
      return renderWithLineBreaks(currentStr)
    }

    const highlightStart = text.indexOf(highlightText)
    if (highlightStart === -1) {
      return renderWithLineBreaks(currentStr)
    }

    if (displayedCount <= highlightStart) {
      return renderWithLineBreaks(currentStr)
    }

    const regularPart = text.slice(0, highlightStart)
    const highlightPart = text.slice(highlightStart, displayedCount)

    return (
      <>
        {renderWithLineBreaks(regularPart)}
        <span className={highlightClassName}>{renderWithLineBreaks(highlightPart)}</span>
      </>
    )
  }

  const renderWithLineBreaks = (str: string) => {
    const lines = str.split('\n')
    if (lines.length === 1) return str
    return lines.map((line, idx) => (
      <span key={idx}>
        {idx > 0 && <br />}
        {line}
      </span>
    ))
  }

  return (
    <span className={className}>
      {renderContent()}
      <span
        aria-hidden="true"
        className={`inline-block w-[3.5px] h-[0.88em] ml-1.5 align-baseline rounded-sm animate-pulse ${cursorClassName}`}
      />
    </span>
  )
}
