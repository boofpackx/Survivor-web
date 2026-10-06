import { createStore } from './store'

export interface Toast {
  id: number
  icon: string
  title: string
  body?: string
  action?: { label: string; run: () => void }
}

export const toastStore = createStore<Toast[]>([])

let nextId = 1

export function dismissToast(id: number): void {
  toastStore.set(list => list.filter(t => t.id !== id))
}

export function toast(t: Omit<Toast, 'id'>, ms = 4200): void {
  const id = nextId++
  toastStore.set(list => [...list.slice(-3), { ...t, id }])
  setTimeout(() => dismissToast(id), ms)
}

/** A wiki page to show in the in-app "peek" modal instead of leaving the site. */
export interface PeekRequest {
  page: string
  /** shown while the page loads */
  name?: string
  image?: string | null
}

/** Stack of peeked pages — following a link inside a peek pushes, "Back" pops. */
export const peekStore = createStore<PeekRequest[]>([])

export function openPeek(req: PeekRequest): void {
  peekStore.set(stack => [...stack.slice(-9), req])
}

export function closePeek(): void {
  peekStore.set([])
}

export function backPeek(): void {
  peekStore.set(stack => stack.slice(0, -1))
}
