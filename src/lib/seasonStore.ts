import type { Season } from '../data/seasons'
import { SEASONS } from '../data/seasons'
import { discoverSeasons } from './discover'
import { createStore, readJSON, useStore, writeJSON } from './store'

const DISCOVERED_KEY = 'sa-discovered-v1'

export type DiscoveryStatus = 'idle' | 'checking' | 'done' | 'failed'

export interface SeasonState {
  /** bundled seasons followed by any found live on the wiki, in season order */
  seasons: Season[]
  discovery: DiscoveryStatus
}

function isSeason(x: unknown): x is Season {
  const s = x as Season
  return !!s && typeof s.number === 'number' && typeof s.wikiPage === 'string' && !!s.theme
}

function merge(found: Season[]): Season[] {
  const bundled = new Set(SEASONS.map(s => s.number))
  const extra = found
    .filter(s => !bundled.has(s.number))
    .sort((a, b) => a.number - b.number)
  return [...SEASONS, ...extra]
}

// last visit's discoveries show up instantly; the live check then refreshes them
const cached = readJSON<unknown[]>(DISCOVERED_KEY, []).filter(isSeason)

export const seasonStore = createStore<SeasonState>({ seasons: merge(cached), discovery: 'idle' })

export function useSeasonState(): SeasonState {
  return useStore(seasonStore)
}

export function useSeasons(): Season[] {
  return useStore(seasonStore).seasons
}

export function findSeason(seasons: Season[], n: number): Season | null {
  return seasons.find(s => s.number === n) ?? null
}

/**
 * Ask the wiki for seasons newer than the bundled list. Calls `onNew` with any
 * season this browser hasn't seen before (for the "new season" toast).
 */
export async function runDiscovery(onNew?: (fresh: Season[]) => void): Promise<void> {
  if (seasonStore.get().discovery === 'checking') return
  seasonStore.set(s => ({ ...s, discovery: 'checking' }))
  try {
    const found = await discoverSeasons(SEASONS)
    const before = new Set(seasonStore.get().seasons.map(s => s.number))
    writeJSON(DISCOVERED_KEY, found)
    seasonStore.set({ seasons: merge(found), discovery: 'done' })
    const fresh = found.filter(s => !before.has(s.number))
    if (fresh.length) onNew?.(fresh)
  } catch {
    // offline or the wiki is down — keep whatever we had cached
    seasonStore.set(s => ({ ...s, discovery: 'failed' }))
  }
}
