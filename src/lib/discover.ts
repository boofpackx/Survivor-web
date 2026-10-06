import type { Season, SeasonStatus } from '../data/seasons'
import { NEW_ERA_VIBES, PLACES, fijiSpot, makeTheme } from '../data/seasons'
import { getPageImage, getSeasonFacts, resolvePages } from './fandom'
import type { SeasonFacts } from './fandom'
import { paletteFromImage, paletteFromSeed } from './palette'

/** how many seasons past the newest bundled one we look for */
const LOOKAHEAD = 4

function splitLocation(raw: string | null): { location: string; country: string } {
  if (!raw) return { location: 'Mamanuca Islands', country: 'Fiji' }
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 1) return { location: parts[0], country: parts[0] }
  return { location: parts.slice(0, -1).join(', '), country: parts[parts.length - 1] }
}

function placeFor(location: string, country: string, n: number): { lat: number; lng: number } {
  if (/fiji/i.test(country) || /mamanuca/i.test(location)) return fijiSpot(n)
  const key = Object.keys(PLACES).find(
    k => country.toLowerCase().includes(k) || location.toLowerCase().includes(k),
  )
  if (!key) return fijiSpot(n)
  // nudge off any older season's pin at the same spot
  const base = PLACES[key]
  return { lat: base.lat + 0.12 * Math.sin(n), lng: base.lng + 0.12 * Math.cos(n) }
}

function yearFrom(text: string | null): string | null {
  return text?.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? null
}

/** "September 24, 2025", "Sept. 24, 2025", "Sep 24 2025" */
const DATE_RE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/g
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function statusFrom(facts: SeasonFacts | null): SeasonStatus {
  if (facts?.winner) return 'complete'
  const dates = [...(facts?.seasonRun ?? '').matchAll(DATE_RE)]
    .map(m => new Date(Number(m[3]), MONTHS.indexOf(m[1].toLowerCase()), Number(m[2])).getTime())
    .filter(t => !Number.isNaN(t))
  const now = Date.now()
  if (dates.length >= 2 && dates[dates.length - 1] < now - 2 * 86400000) return 'complete'
  if (dates.length && dates[0] <= now) return 'airing'
  return 'upcoming'
}

function taglineFor(status: SeasonStatus, facts: SeasonFacts | null): string {
  const bits: string[] = []
  if (facts?.castaways) bits.push(`${facts.castaways} castaways`)
  if (facts?.days) bits.push(`${facts.days} days`)
  const roster = bits.length ? `${bits.join(', ')}, one Sole Survivor` : 'A brand-new cast and one Sole Survivor'
  if (status === 'airing') return `On the air right now — ${roster}.`
  if (status === 'upcoming') return `The next chapter of Survivor is on its way — ${roster.charAt(0).toLowerCase()}${roster.slice(1)}.`
  return facts?.winner
    ? `${roster}. ${facts.winner.text} outlasted them all.`
    : `${roster}.`
}

async function buildSeason(n: number, page: string, facts: SeasonFacts | null): Promise<Season> {
  const title = page.replace(/^Survivor\s*\d+\s*:\s*/i, '').replace(/^Survivor:\s*/i, '') || page
  const { location, country } = splitLocation(facts?.location ?? null)
  const status = statusFrom(facts)
  const logo = await getPageImage(page).then(i => i.thumbnail ?? i.original ?? null).catch(() => null)
  const palette = logo ? await paletteFromImage(logo, n) : paletteFromSeed(n)
  return {
    number: n,
    title,
    wikiPage: page,
    location,
    country,
    ...placeFor(location, country, n),
    year: yearFrom(facts?.seasonRun ?? null) ?? yearFrom(facts?.filmingDates ?? null) ?? String(new Date().getFullYear()),
    winner: facts?.winner?.text ?? '',
    winnerPage: facts?.winner?.title ?? '',
    tagline: taglineFor(status, facts),
    theme: makeTheme(palette, NEW_ERA_VIBES[n % NEW_ERA_VIBES.length]),
    status,
    discovered: true,
  }
}

function looksLikeSeason(n: number, page: string, facts: SeasonFacts | null): boolean {
  if (new RegExp(`\\b${n}\\b`).test(page)) return true
  return !!facts && !!(facts.location || facts.seasonRun || facts.castaways || facts.days || facts.tribes.length)
}

/**
 * Find seasons newer than the bundled list, straight from the Survivor Wiki.
 * Two signals, so either naming style works: pages titled "Survivor N"
 * (how every season since 41 is named) and the "next season" link in the
 * newest known season's infobox, followed hop by hop.
 */
export async function discoverSeasons(known: Season[]): Promise<Season[]> {
  const last = known.reduce((a, b) => (b.number > a.number ? b : a))
  const numbers = Array.from({ length: LOOKAHEAD }, (_, i) => last.number + 1 + i)
  const titles = numbers.map(n => `Survivor ${n}`)
  const [resolved, lastFacts] = await Promise.all([
    resolvePages(titles),
    getSeasonFacts(last.wikiPage).catch(() => null),
  ])

  const taken = new Set(known.map(s => s.wikiPage))
  const found: Season[] = []
  let nextLink = lastFacts?.next ?? null
  for (const [i, n] of numbers.entries()) {
    let page = resolved[titles[i]]
    if (!page && nextLink && !taken.has(nextLink)) page = nextLink
    if (!page || taken.has(page)) break
    const facts = await getSeasonFacts(page).catch(() => null)
    if (!looksLikeSeason(n, page, facts)) break
    found.push(await buildSeason(n, page, facts))
    taken.add(page)
    nextLink = facts?.next ?? null
  }
  return found
}
