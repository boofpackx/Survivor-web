import { useEffect, useRef } from 'react'
import type { Season } from '../data/seasons'

/**
 * "Draw a rock": the bag shakes, a stone comes out and flips to reveal the
 * season painted on it. Click anywhere to skip straight there.
 */
export default function RockDraw({ season, onDone }: { season: Season; onDone: () => void }) {
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => doneRef.current(), reduce ? 350 : 2300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="rock-draw"
      data-modal=""
      role="dialog"
      aria-label={`Random season: ${season.title}`}
      onClick={onDone}
      style={{
        '--rock-color': season.theme.accent,
        '--rock-primary': season.theme.primary,
      } as React.CSSProperties}
    >
      <p className="rock-caption rock-caption-1">Drawing rocks…</p>
      <svg className="rock-bag" viewBox="0 0 120 130" aria-hidden="true">
        <path
          d="M38 30 C30 22 34 12 44 14 L60 20 L76 14 C86 12 90 22 82 30 C104 46 112 74 104 98 C96 122 24 122 16 98 C8 74 16 46 38 30 Z"
          className="rock-bag-body"
        />
        <path d="M38 30 Q60 40 82 30" className="rock-bag-string" />
        <circle cx="60" cy="34" r="4" className="rock-bag-knot" />
      </svg>
      <div className="rock-stone" aria-hidden="true">
        <div className="rock-face rock-face-back" />
        <div className="rock-face rock-face-front">
          <span className="rock-num">{season.number}</span>
        </div>
      </div>
      <p className="rock-caption rock-caption-2">
        <small>The rock has spoken</small>
        Season {season.number} · {season.title}
      </p>
    </div>
  )
}
