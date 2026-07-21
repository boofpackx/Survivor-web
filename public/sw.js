/* Survivor Atlas service worker — cache-first for images, tiles, fonts and
   hashed build assets so repeat visits load instantly. */

const VERSION = 'v1'
const IMG_CACHE = `sa-img-${VERSION}`
const TILE_CACHE = `sa-tiles-${VERSION}`
const FONT_CACHE = `sa-fonts-${VERSION}`
const APP_CACHE = `sa-app-${VERSION}`
const KNOWN = [IMG_CACHE, TILE_CACHE, FONT_CACHE, APP_CACHE]

const TILE_LIMIT = 600
const IMG_LIMIT = 800

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(Promise.resolve())
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter(n => n.startsWith('sa-') && !KNOWN.includes(n)).map(n => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

async function trimCache(name, limit) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  if (keys.length <= limit) return
  // drop the oldest entries (keys() preserves insertion order)
  await Promise.all(keys.slice(0, keys.length - limit).map(k => cache.delete(k)))
}

async function cacheFirst(request, cacheName, { cors = false, limit = 0 } = {}) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request.url, { ignoreVary: true })
  if (hit) return hit
  try {
    // both wikia and arcgis send ACAO:* — a cors fetch avoids opaque-response quota padding.
    // referrerPolicy must be re-applied: Fandom's CDN 404s foreign-referer requests, and a
    // fresh Request() here would otherwise send "Referer: <our origin>".
    const upstream = cors
      ? new Request(request.url, { mode: 'cors', referrerPolicy: 'no-referrer' })
      : request
    const response = await fetch(upstream)
    if (response.ok) {
      cache.put(request.url, response.clone()).then(() => {
        if (limit) trimCache(cacheName, limit)
      }).catch(() => {})
      return response
    }
    // upstream quirk (e.g. CDN referer filtering) — retry exactly as the page sent it
    return fetch(request)
  } catch {
    return fetch(request)
  }
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // wiki images (season logos, castaway photos, galleries)
  if (url.hostname === 'static.wikia.nocookie.net') {
    event.respondWith(cacheFirst(request, IMG_CACHE, { cors: true, limit: IMG_LIMIT }))
    return
  }

  // satellite / label tiles
  if (url.hostname === 'server.arcgisonline.com') {
    event.respondWith(cacheFirst(request, TILE_CACHE, { cors: true, limit: TILE_LIMIT }))
    return
  }

  // web fonts
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE, { cors: true }))
    return
  }

  // our own hashed build assets are immutable — cache-first, trimmed so old
  // deploys' bundles don't accumulate forever
  if (url.origin === self.location.origin && /\/assets\/.+\.(js|css)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, APP_CACHE, { limit: 24 }))
    return
  }
})
