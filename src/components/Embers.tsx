import { useEffect, useRef } from 'react'

interface Ember {
  x: number
  y: number
  r: number
  vy: number
  sway: number
  phase: number
  alpha: number
  hue: number
}

/** Drifting fire embers over the whole app. Skipped for reduced-motion users. */
export default function Embers({ intensity = 34 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const spawn = (fromBottom: boolean): Ember => ({
      x: Math.random() * w,
      y: fromBottom ? h + 10 : Math.random() * h,
      r: 0.8 + Math.random() * 1.9,
      vy: 0.25 + Math.random() * 0.55,
      sway: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.5,
      hue: 18 + Math.random() * 26,
    })

    const embers: Ember[] = Array.from({ length: intensity }, () => spawn(false))
    let raf = 0
    let t = 0

    const tick = () => {
      t += 0.016
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i]
        e.y -= e.vy
        e.x += Math.sin(t * e.sway + e.phase) * 0.35
        const twinkle = 0.75 + 0.25 * Math.sin(t * 3 + e.phase * 5)
        if (e.y < -12) embers[i] = spawn(true)
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${e.hue}, 100%, ${55 + twinkle * 12}%, ${e.alpha * twinkle})`
        ctx.shadowColor = `hsla(${e.hue}, 100%, 60%, ${e.alpha})`
        ctx.shadowBlur = 6
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [intensity])

  return <canvas ref={canvasRef} className="embers" aria-hidden="true" />
}
