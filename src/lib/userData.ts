import { createStore, readJSON, writeJSON } from './store'

/** Seasons the viewer has opened — dims their torches and powers "explored" progress. */
export const visitedStore = createStore<Set<number>>(
  new Set(readJSON<number[]>('sa-visited', [])),
  v => writeJSON('sa-visited', [...v]),
)

export function markVisited(n: number): void {
  visitedStore.set(prev => (prev.has(n) ? prev : new Set(prev).add(n)))
}

/** Starred seasons. */
export const favoritesStore = createStore<Set<number>>(
  new Set(readJSON<number[]>('sa-favorites', [])),
  v => writeJSON('sa-favorites', [...v]),
)

/** Returns true when the season is now a favorite. */
export function toggleFavorite(n: number): boolean {
  const next = new Set(favoritesStore.get())
  const added = !next.delete(n)
  if (added) next.add(n)
  favoritesStore.set(next)
  return added
}

/** Most recently opened seasons, newest first. */
export const recentStore = createStore<number[]>(
  readJSON<number[]>('sa-recent', []),
  v => writeJSON('sa-recent', v),
)

export function pushRecent(n: number): void {
  recentStore.set(prev => (prev[0] === n ? prev : [n, ...prev.filter(x => x !== n)].slice(0, 8)))
}

export type ViewMode = 'page' | 'web'

export const viewModeStore = createStore<ViewMode>(
  readJSON<string>('sa-view-mode', 'page') === 'web' ? 'web' : 'page',
  v => writeJSON('sa-view-mode', v),
)
