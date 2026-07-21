import { useEffect } from 'react'

/**
 * Tactile fire feedback: every click/tap throws a small burst of embers
 * from the pointer. Pure DOM particles, removed after the animation.
 */
export default function SparkBurst() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onPointerDown = (e: PointerEvent) => {
      const burst = document.createElement('div')
      burst.className = 'spark-burst'
      burst.style.left = `${e.clientX}px`
      burst.style.top = `${e.clientY}px`

      const count = 9 + Math.floor(Math.random() * 5)
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span')
        const angle = Math.random() * Math.PI * 2
        const dist = 24 + Math.random() * 46
        s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
        s.style.setProperty('--dy', `${Math.sin(angle) * dist - 18}px`)
        s.style.setProperty('--spark-size', `${2 + Math.random() * 3}px`)
        s.style.setProperty('--spark-hue', `${16 + Math.random() * 30}`)
        s.style.animationDelay = `${Math.random() * 0.06}s`
        burst.appendChild(s)
      }
      document.body.appendChild(burst)
      setTimeout(() => burst.remove(), 750)
    }

    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return null
}
