import { useEffect, useState } from 'react'
import { getPageImages } from './fandom'

/** size|title → url ('' = the page has no image, so don't ask again) */
const known = new Map<string, string>()

function snapshot(titles: string[], size: number): Record<string, string> {
  const out: Record<string, string> = {}
  for (const t of titles) {
    const url = known.get(`${size}|${t}`)
    if (url) out[t] = url
  }
  return out
}

/**
 * Thumbnails for a list of wiki pages (season logos, winner portraits),
 * fetched in batches of 50 and shared across every component that asks.
 */
export function usePageImages(titles: string[], size = 200): Record<string, string> {
  const key = `${size}@${titles.join('|')}`
  const [images, setImages] = useState(() => snapshot(titles, size))

  useEffect(() => {
    const list = key.slice(key.indexOf('@') + 1).split('|').filter(Boolean)
    const missing = list.filter(t => !known.has(`${size}|${t}`))
    if (!missing.length) {
      setImages(snapshot(list, size))
      return
    }
    let cancelled = false
    getPageImages(missing, size)
      .then(found => {
        for (const t of missing) known.set(`${size}|${t}`, found[t] ?? '')
        if (!cancelled) setImages(snapshot(list, size))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [key, size])

  return images
}
