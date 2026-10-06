import { useMemo, useSyncExternalStore } from 'react'

export type PageId = 'timeline' | 'champions' | 'quiz'

export type Route =
  | { page: 'map' }
  | { page: 'season'; number: number; slug: string | null }
  | { page: PageId }

export function parseRoute(hash: string): Route {
  const season = hash.match(/^#\/s\/(\d+)(?:\/([a-z0-9-]+))?/)
  if (season) return { page: 'season', number: Number(season[1]), slug: season[2] ?? null }
  const page = hash.match(/^#\/(timeline|champions|quiz)\b/)
  if (page) return { page: page[1] as PageId }
  return { page: 'map' }
}

export function routeHash(r: Route): string {
  switch (r.page) {
    case 'map':
      return '#/'
    case 'season':
      return `#/s/${r.number}${r.slug ? `/${r.slug}` : ''}`
    default:
      return `#/${r.page}`
  }
}

const ROUTE_EVENT = 'sa-route'

function subscribe(cb: () => void): () => void {
  window.addEventListener('popstate', cb)
  window.addEventListener('hashchange', cb)
  window.addEventListener(ROUTE_EVENT, cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener('hashchange', cb)
    window.removeEventListener(ROUTE_EVENT, cb)
  }
}

const getHash = () => window.location.hash

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  return useMemo(() => parseRoute(hash), [hash])
}

/**
 * Go somewhere in the app. Pushes a history entry so the browser's back
 * button walks back through seasons and pages; `replace` is for incidental
 * URL updates (like the open web-view node) that shouldn't pile up history.
 */
export function navigate(r: Route, opts: { replace?: boolean } = {}): void {
  const hash = routeHash(r)
  if (window.location.hash === hash) return
  if (opts.replace) window.history.replaceState(null, '', hash)
  else window.history.pushState(null, '', hash)
  window.dispatchEvent(new Event(ROUTE_EVENT))
}

/** Full shareable URL for a route. */
export function routeUrl(r: Route): string {
  return `${window.location.origin}${window.location.pathname}${routeHash(r)}`
}
