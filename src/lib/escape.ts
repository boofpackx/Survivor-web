import { useEffect, useRef } from 'react'

/**
 * Escape closes the topmost layer only. Every overlay registers while it's
 * open; the most recently opened one wins, so a lightbox inside a season page
 * inside the app closes one layer per key press.
 */
const stack: (() => void)[] = []

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !stack.length) return
  e.preventDefault()
  stack[stack.length - 1]()
}

let bound = false

export function useEscape(handler: () => void, active = true): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!active) return
    if (!bound) {
      window.addEventListener('keydown', onKeyDown)
      bound = true
    }
    const fn = () => ref.current()
    stack.push(fn)
    return () => {
      const i = stack.lastIndexOf(fn)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active])
}

/** True while a modal layer (search, lightbox, wiki peek…) is open — global shortcuts stand down. */
export function modalOpen(): boolean {
  return !!document.querySelector('[data-modal]')
}

/** Ignore shortcuts typed into form fields. */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
}
