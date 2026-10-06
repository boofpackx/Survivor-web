import { useMemo } from 'react'
import type { SeasonTheme } from '../data/seasons'

/**
 * Landscape silhouette along the bottom of a season's hero — waves for ocean
 * seasons, a volcano for the fire islands, a Mayan temple for the ruins,
 * acacias on the savanna… Built procedurally so every shape stays crisp.
 */

const W = 1440
const H = 140

/** tiny deterministic PRNG so silhouettes are stable between renders */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function wave(y: number, amp: number, len: number, width = W * 2, sharp = false): string {
  let d = `M0 ${H} L0 ${y}`
  for (let x = 0; x < width; x += len) {
    const peak = sharp ? y - amp * 1.6 : y - amp
    d += ` Q ${x + len / 4} ${peak} ${x + len / 2} ${y} T ${x + len} ${y}`
  }
  return `${d} L${width} ${H} Z`
}

function canopy(seed: number, y: number, minW: number, maxW: number, minH: number, maxH: number): string {
  const r = rng(seed)
  let d = `M0 ${H} L0 ${y}`
  let x = 0
  while (x < W) {
    const w = minW + r() * (maxW - minW)
    const h = minH + r() * (maxH - minH)
    d += ` A ${w / 2} ${h} 0 0 1 ${Math.min(x + w, W + 40)} ${y}`
    x += w
  }
  return `${d} L${W + 40} ${H} Z`
}

function palm(x: number, base: number, height: number, lean: number): string {
  const tx = x + lean
  const ty = base - height
  let d = `M${x - 4} ${base} Q ${x + lean * 0.3} ${base - height * 0.5} ${tx - 2} ${ty} L ${tx + 2} ${ty} Q ${x + lean * 0.3 + 6} ${base - height * 0.5} ${x + 4} ${base} Z`
  const fronds: [number, number][] = [[-46, 14], [-34, -10], [-6, -22], [24, -16], [44, 6], [30, 22], [-26, 24]]
  for (const [dx, dy] of fronds) {
    d += ` M${tx} ${ty} Q ${tx + dx * 0.5} ${ty + dy * 0.5 - 12} ${tx + dx} ${ty + dy} Q ${tx + dx * 0.5} ${ty + dy * 0.5 - 4} ${tx} ${ty} Z`
  }
  return d
}

function acacia(x: number, base: number, height: number, spread: number): string {
  const top = base - height
  return [
    `M${x - 3} ${base} L${x - 2} ${top + 10} L${x - spread * 0.35} ${top + 2} L${x - spread * 0.3} ${top} L${x} ${top + 7} L${x + spread * 0.3} ${top} L${x + spread * 0.35} ${top + 2} L${x + 2} ${top + 10} L${x + 3} ${base} Z`,
    `M${x - spread} ${top + 2} Q ${x - spread * 0.6} ${top - 14} ${x} ${top - 12} Q ${x + spread * 0.6} ${top - 14} ${x + spread} ${top + 2} Q ${x} ${top + 8} ${x - spread} ${top + 2} Z`,
  ].join(' ')
}

function pyramid(cx: number, base: number, baseW: number, steps: number, stepH: number): string {
  let d = ''
  for (let i = 0; i < steps; i++) {
    const w = baseW * (1 - i / (steps + 1.4))
    const y = base - i * stepH
    d += ` M${cx - w / 2} ${y} L${cx - w / 2} ${y - stepH} L${cx + w / 2} ${y - stepH} L${cx + w / 2} ${y} Z`
  }
  const topW = baseW * (1 - (steps - 1) / (steps + 1.4)) * 0.45
  const topY = base - steps * stepH
  d += ` M${cx - topW / 2} ${topY} L${cx - topW / 2} ${topY - stepH * 1.5} L${cx + topW / 2} ${topY - stepH * 1.5} L${cx + topW / 2} ${topY} Z`
  // central staircase
  d += ` M${cx - 9} ${base} L${cx - 6} ${topY} L${cx + 6} ${topY} L${cx + 9} ${base} Z`
  return d
}

function tufts(seed: number, y: number, count: number): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const x = r() * W
    const h = 6 + r() * 10
    d += ` M${x - 7} ${y} L${x - 4} ${y - h * 0.7} L${x - 1} ${y} L${x + 1} ${y - h} L${x + 3} ${y} L${x + 6} ${y - h * 0.6} L${x + 8} ${y} Z`
  }
  return d
}

type Mood = SeasonTheme['mood']

interface Scene {
  back: string
  front: string
  /** wave layers are drawn two screens wide and scroll seamlessly */
  driftBack?: boolean
  driftFront?: boolean
  volcano?: boolean
}

function scene(mood: Mood, seed: number): Scene {
  switch (mood) {
    case 'ocean':
      return { back: wave(92, 10, 180), front: wave(112, 8, 144), driftBack: true, driftFront: true }
    case 'island':
      return {
        back: `M760 ${H} Q 900 72 1080 78 Q 1220 84 1320 ${H} Z ${palm(1000, 84, 62, 30)} ${palm(1120, 86, 48, -22)}`,
        front: wave(114, 7, 160),
        driftFront: true,
      }
    case 'jungle':
      return {
        back: `${canopy(seed, 92, 60, 150, 28, 52)} ${palm(260, 80, 70, 24)} ${palm(1180, 80, 64, -20)}`,
        front: canopy(seed + 7, 122, 40, 90, 14, 26),
      }
    case 'river':
      return {
        back: canopy(seed, 96, 70, 160, 24, 46),
        front: wave(124, 5, 240),
        driftFront: true,
      }
    case 'outback':
      return {
        back: `M120 ${H} L170 70 L178 62 L420 60 L436 70 L500 ${H} Z M880 ${H} L930 86 L1110 80 L1130 92 L1200 ${H} Z M1260 ${H} L1300 102 L1380 98 L1420 ${H} Z`,
        front: `M0 ${H} L0 124 Q 720 116 1440 126 L1440 ${H} Z ${tufts(seed, 126, 34)}`,
      }
    case 'savanna':
      return {
        back: `M0 ${H} L0 106 Q 260 82 520 100 Q 840 118 1100 92 Q 1300 78 1440 98 L1440 ${H} Z`,
        front: `M0 ${H} L0 124 L1440 124 L1440 ${H} Z ${acacia(240, 124, 54, 62)} ${acacia(980, 124, 70, 78)} ${acacia(1260, 124, 40, 46)} ${tufts(seed, 124, 26)}`,
      }
    case 'ruins':
      return {
        back: `${canopy(seed, 104, 80, 170, 20, 40)} ${pyramid(470, 108, 300, 7, 11)} ${pyramid(1100, 112, 170, 5, 9)}`,
        front: `M0 ${H} L0 122 Q 720 114 1440 124 L1440 ${H} Z`,
      }
    case 'volcanic':
      return {
        back: `M620 ${H} Q 760 90 900 34 L960 30 Q 1100 92 1300 ${H} Z M0 ${H} L0 110 Q 200 96 420 112 L520 ${H} Z`,
        front: `M0 ${H} L0 120 L90 112 L170 124 L300 110 L420 122 L560 108 L700 124 L860 112 L1000 126 L1150 110 L1290 122 L1440 112 L1440 ${H} Z`,
        volcano: true,
      }
    case 'storm':
    default:
      return {
        back: `M180 ${H} L210 70 L240 64 L262 90 L290 ${H} Z M330 ${H} L350 96 L380 92 L400 ${H} Z M1040 ${H} L1080 58 L1100 50 L1124 74 L1150 66 L1190 ${H} Z`,
        front: wave(116, 9, 90, W * 2, true),
        driftFront: true,
      }
  }
}

export default function Horizon({ mood, seed }: { mood: Mood; seed: number }) {
  const s = useMemo(() => scene(mood, seed), [mood, seed])
  return (
    <svg className={`horizon horizon-${mood}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {s.volcano && (
        <g className="hz-volcano">
          <ellipse className="hz-crater-glow" cx="930" cy="34" rx="70" ry="30" />
          <circle className="hz-smoke hz-smoke-1" cx="930" cy="20" r="16" />
          <circle className="hz-smoke hz-smoke-2" cx="940" cy="10" r="12" />
          <circle className="hz-smoke hz-smoke-3" cx="922" cy="14" r="10" />
        </g>
      )}
      <path className={s.driftBack ? 'hz-back hz-drift-slow' : 'hz-back'} d={s.back} />
      <path className={s.driftFront ? 'hz-front hz-drift' : 'hz-front'} d={s.front} />
    </svg>
  )
}
