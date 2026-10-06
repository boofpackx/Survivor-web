import { useEffect, useRef } from 'react'
import type { TextureKey } from '../data/seasons'

/**
 * Per-season atmosphere drawn behind the season page: fireflies in the jungle,
 * rain squalls for storm seasons, rising bubbles for ocean seasons, cherry
 * petals for China, glints of gold for the all-star seasons… One small
 * particle engine, a dozen personalities.
 */

type Mode =
  | 'fireflies' | 'bubbles' | 'sand' | 'embers' | 'ash' | 'leaves'
  | 'lantern' | 'rain' | 'glints' | 'petals' | 'dust'

const MODE_FOR: Record<TextureKey, Mode> = {
  jungle: 'fireflies',
  water: 'bubbles',
  sand: 'sand',
  lava: 'ash',
  bamboo: 'leaves',
  parchment: 'lantern',
  storm: 'rain',
  gold: 'glints',
  silk: 'petals',
  savanna: 'dust',
  tribal: 'embers',
  ruins: 'dust',
}

const COUNT: Record<Mode, number> = {
  fireflies: 28, bubbles: 30, sand: 80, embers: 42, ash: 46, leaves: 14,
  lantern: 24, rain: 120, glints: 26, petals: 20, dust: 42,
}

interface P {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  a: number
  phase: number
  rot: number
  vr: number
  /** 0 = primary look, 1 = secondary look (e.g. ash vs ember) */
  kind: number
}

/** soft round glow, pre-rendered once per color — far cheaper than shadowBlur */
function glowSprite(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.18, color)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return c
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function spawn(mode: Mode, w: number, h: number, initial: boolean): P {
  const p: P = { x: rand(0, w), y: rand(0, h), vx: 0, vy: 0, r: 2, a: 1, phase: rand(0, Math.PI * 2), rot: rand(0, Math.PI * 2), vr: 0, kind: 0 }
  switch (mode) {
    case 'fireflies':
      p.r = rand(5, 11)
      p.vx = rand(-0.3, 0.3)
      p.vy = rand(-0.3, 0.3)
      break
    case 'bubbles':
      p.r = rand(1.5, 6.5)
      p.vy = -rand(0.35, 1.1)
      if (!initial) p.y = h + p.r * 2
      break
    case 'sand':
      p.r = rand(0.6, 1.8)
      p.vx = rand(1.4, 3.6)
      p.vy = rand(-0.15, 0.25)
      p.a = rand(0.25, 0.6)
      if (!initial) p.x = -10
      break
    case 'embers':
      p.r = rand(3, 8)
      p.vy = -rand(0.5, 1.4)
      p.vx = rand(-0.2, 0.2)
      if (!initial) p.y = h + 10
      break
    case 'ash':
      // two populations: glowing embers rising, grey ash drifting down
      p.kind = Math.random() < 0.45 ? 0 : 1
      if (p.kind === 0) {
        p.r = rand(3, 7)
        p.vy = -rand(0.5, 1.3)
        if (!initial) p.y = h + 10
      } else {
        p.r = rand(1, 2.6)
        p.vy = rand(0.25, 0.7)
        p.vx = rand(-0.2, 0.3)
        p.a = rand(0.25, 0.55)
        if (!initial) p.y = -10
      }
      break
    case 'leaves':
    case 'petals':
      p.r = mode === 'leaves' ? rand(7, 13) : rand(4, 7)
      p.vy = rand(0.35, 0.9)
      p.vx = rand(-0.3, 0.5)
      p.vr = rand(-0.025, 0.025)
      p.a = rand(0.45, 0.85)
      if (!initial) p.y = -20
      break
    case 'lantern':
      p.r = rand(4, 10)
      p.vy = -rand(0.08, 0.35)
      p.vx = rand(-0.15, 0.15)
      if (!initial) p.y = h + 10
      break
    case 'rain':
      p.r = rand(12, 26)
      p.vy = rand(9, 15)
      p.vx = -p.vy * 0.22
      p.a = rand(0.12, 0.32)
      if (!initial) {
        p.y = -30
        p.x = rand(0, w + 120)
      }
      break
    case 'glints':
      p.r = rand(3, 8)
      p.vy = -rand(0.03, 0.12)
      break
    case 'dust':
      p.r = rand(2, 5)
      p.vx = rand(0.05, 0.3)
      p.vy = rand(-0.12, 0.08)
      if (!initial) p.x = -10
      break
  }
  return p
}

function offscreen(mode: Mode, p: P, w: number, h: number): boolean {
  return p.y < -40 || p.y > h + 40 || p.x < -60 || p.x > w + 60 || (mode === 'glints' && p.y < -10)
}

export default function Ambience({ texture, accent, primary }: { texture: TextureKey; accent: string; primary: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const mode = MODE_FOR[texture]
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0
    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const small = w < 720
    const n = Math.round(COUNT[mode] * (small ? 0.6 : 1))
    const parts = Array.from({ length: n }, () => spawn(mode, w, h, true))
    const accentGlow = glowSprite(accent)
    const warmGlow = glowSprite(mode === 'fireflies' ? '#d4ff6a' : '#ff9a3c')
    const primaryGlow = glowSprite(primary)

    let flash = 0
    let nextFlash = performance.now() + rand(3000, 7000)
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7)
      last = now
      const t = now / 1000
      ctx.clearRect(0, 0, w, h)

      if (mode === 'dust') {
        // god rays slanting through the canopy / ruins
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 3; i++) {
          const x = w * (0.18 + i * 0.3) + Math.sin(t * 0.2 + i) * 30
          const g = ctx.createLinearGradient(x, 0, x + h * 0.35, h)
          g.addColorStop(0, `${accent}22`)
          g.addColorStop(1, `${accent}00`)
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.moveTo(x - 30, 0)
          ctx.lineTo(x + 50, 0)
          ctx.lineTo(x + h * 0.35 + 140, h)
          ctx.lineTo(x + h * 0.35 - 40, h)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }

      ctx.globalCompositeOperation = mode === 'leaves' || mode === 'petals' || mode === 'bubbles' || mode === 'rain' || mode === 'sand' ? 'source-over' : 'lighter'

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        switch (mode) {
          case 'fireflies': {
            p.phase += 0.01 * dt
            p.vx += Math.cos(p.phase * 1.7 + i) * 0.012 * dt
            p.vy += Math.sin(p.phase * 1.3 + i * 2) * 0.012 * dt
            p.vx *= 0.985
            p.vy *= 0.985
            p.x += p.vx * dt
            p.y += p.vy * dt
            if (p.x < -20) p.x = w + 20
            if (p.x > w + 20) p.x = -20
            if (p.y < -20) p.y = h + 20
            if (p.y > h + 20) p.y = -20
            const pulse = Math.max(0, Math.sin(t * 1.6 + p.phase * 3))
            ctx.globalAlpha = 0.15 + pulse * 0.85
            ctx.drawImage(warmGlow, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
            continue
          }
          case 'bubbles': {
            p.y += p.vy * dt
            p.x += Math.sin(t * 2 + p.phase) * 0.35 * dt
            ctx.globalAlpha = Math.min(1, p.y / (h * 0.4)) * 0.55
            ctx.strokeStyle = accent
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
            ctx.stroke()
            ctx.fillStyle = '#ffffff'
            ctx.globalAlpha *= 0.8
            ctx.beginPath()
            ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, Math.PI * 2)
            ctx.fill()
            break
          }
          case 'sand': {
            const gust = 1 + Math.max(0, Math.sin(t * 0.6)) * 1.4
            p.x += p.vx * gust * dt
            p.y += (p.vy + Math.sin(t * 3 + p.phase) * 0.2) * dt
            ctx.globalAlpha = p.a
            ctx.fillStyle = accent
            ctx.fillRect(p.x, p.y, p.r * 2.4 * gust, p.r)
            break
          }
          case 'embers':
          case 'ash':
          case 'lantern': {
            const ember = mode !== 'ash' || p.kind === 0
            p.y += p.vy * dt
            p.x += (p.vx + Math.sin(t * 1.4 + p.phase) * (ember ? 0.3 : 0.5)) * dt
            if (ember) {
              const flicker = 0.55 + 0.45 * Math.sin(t * 6 + p.phase * 4)
              const fade = mode === 'lantern' ? 0.7 : Math.min(1, (p.y / h) * 1.6)
              ctx.globalAlpha = Math.max(0, flicker * fade)
              ctx.drawImage(mode === 'lantern' ? accentGlow : warmGlow, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
            } else {
              ctx.globalCompositeOperation = 'source-over'
              ctx.globalAlpha = p.a
              ctx.fillStyle = '#9e9e9e'
              ctx.fillRect(p.x, p.y, p.r, p.r)
              ctx.globalCompositeOperation = 'lighter'
            }
            break
          }
          case 'leaves':
          case 'petals': {
            p.rot += p.vr * dt
            p.y += p.vy * dt
            p.x += (p.vx + Math.sin(t * 1.1 + p.phase) * 0.7) * dt
            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.rot)
            ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t * 1.8 + p.phase)))
            ctx.globalAlpha = p.a
            ctx.fillStyle = mode === 'leaves' ? primary : accent
            ctx.beginPath()
            if (mode === 'leaves') {
              ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.32, 0, 0, Math.PI * 2)
            } else {
              ctx.moveTo(0, -p.r)
              ctx.quadraticCurveTo(p.r, -p.r * 0.2, 0, p.r)
              ctx.quadraticCurveTo(-p.r, -p.r * 0.2, 0, -p.r)
            }
            ctx.fill()
            ctx.restore()
            break
          }
          case 'rain': {
            p.y += p.vy * dt
            p.x += p.vx * dt
            ctx.globalAlpha = p.a
            ctx.strokeStyle = '#cfe3ff'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p.x - p.vx * 1.6, p.y - p.r)
            ctx.stroke()
            break
          }
          case 'glints': {
            p.y += p.vy * dt
            const tw = Math.max(0, Math.sin(t * 1.3 + p.phase * 5))
            const s = p.r * (0.3 + tw)
            ctx.globalAlpha = tw * 0.9
            ctx.drawImage(accentGlow, p.x - s * 1.4, p.y - s * 1.4, s * 2.8, s * 2.8)
            ctx.fillStyle = '#fff8dc'
            ctx.beginPath()
            ctx.moveTo(p.x, p.y - s * 2.2)
            ctx.lineTo(p.x + s * 0.28, p.y)
            ctx.lineTo(p.x, p.y + s * 2.2)
            ctx.lineTo(p.x - s * 0.28, p.y)
            ctx.closePath()
            ctx.moveTo(p.x - s * 2.2, p.y)
            ctx.lineTo(p.x, p.y + s * 0.28)
            ctx.lineTo(p.x + s * 2.2, p.y)
            ctx.lineTo(p.x, p.y - s * 0.28)
            ctx.closePath()
            ctx.fill()
            break
          }
          case 'dust': {
            p.x += p.vx * dt
            p.y += (p.vy + Math.sin(t * 0.8 + p.phase) * 0.1) * dt
            ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.7 + p.phase))
            ctx.drawImage(primaryGlow, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
            ctx.drawImage(accentGlow, p.x - p.r * 0.5, p.y - p.r * 0.5, p.r, p.r)
            break
          }
        }
        if (offscreen(mode, p, w, h)) parts[i] = spawn(mode, w, h, false)
      }

      if (mode === 'rain') {
        // distant lightning: a quick double flicker every few seconds
        if (now > nextFlash) {
          flash = 1
          nextFlash = now + rand(5000, 12000)
        }
        if (flash > 0) {
          const f = flash > 0.6 ? flash : flash * (0.5 + 0.5 * Math.sin(now / 30))
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = f * 0.22
          ctx.fillStyle = '#e8f0ff'
          ctx.fillRect(0, 0, w, h)
          flash = Math.max(0, flash - 0.045 * dt)
        }
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [texture, accent, primary])

  return <canvas ref={ref} className={`ambience ambience-${MODE_FOR[texture]}`} aria-hidden="true" />
}
