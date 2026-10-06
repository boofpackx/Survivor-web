import type { MouseEvent } from 'react'
import { pageFromHref } from './fandom'
import { navigate } from './router'
import { seasonStore } from './seasonStore'
import { closePeek, openPeek } from './toast'

/**
 * Click delegate for embedded wiki HTML: links to a season jump to that
 * season in the app, links to anything else (castaways, tribes, episodes)
 * open the in-app peek. Modifier/middle clicks still open the real wiki.
 */
export function handleWikiLinkClick(e: MouseEvent<HTMLElement>): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = (e.target as HTMLElement).closest('a')
  if (!a || a.dataset.external !== undefined) return
  const page = pageFromHref(a.href)
  if (!page) return
  e.preventDefault()
  const season = seasonStore
    .get()
    .seasons.find(s => s.wikiPage.toLowerCase() === page.toLowerCase())
  if (season) {
    closePeek()
    navigate({ page: 'season', number: season.number, slug: null })
  } else {
    openPeek({ page, name: (a.textContent ?? '').trim() || page })
  }
}
