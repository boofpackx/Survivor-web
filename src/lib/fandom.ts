import { WIKI_BASE } from '../data/seasons'

const API = `${WIKI_BASE}/api.php`

function apiUrl(params: Record<string, string>): string {
  const q = new URLSearchParams({ format: 'json', origin: '*', ...params })
  return `${API}?${q.toString()}`
}

const CACHE_PREFIX = 'sa-api:'
const DAY = 24 * 60 * 60 * 1000

function cacheRead(key: string, ttl: number): unknown | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { t, d } = JSON.parse(raw) as { t: number; d: unknown }
    if (Date.now() - t > ttl) return null
    return d
  } catch {
    return null
  }
}

function cacheWrite(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), d: data }))
  } catch {
    // storage full — drop our own oldest entries and move on
    try {
      const mine = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
      mine.slice(0, Math.ceil(mine.length / 2)).forEach(k => localStorage.removeItem(k))
    } catch { /* ignore */ }
  }
}

interface GetOptions {
  /** how long a stored response stays fresh (default: one day) */
  ttl?: number
  /** keep the response in localStorage (search results only live in memory) */
  persist?: boolean
}

/** in-memory layer: dedupes concurrent identical requests and skips re-parsing storage */
const memory = new Map<string, Promise<unknown>>()

async function apiGet<T>(params: Record<string, string>, opts: GetOptions = {}): Promise<T> {
  const { ttl = DAY, persist = true } = opts
  const url = apiUrl(params)
  const hit = memory.get(url)
  if (hit) return hit as Promise<T>
  const cached = persist ? cacheRead(url, ttl) : null
  if (cached !== null) {
    const p = Promise.resolve(cached)
    memory.set(url, p)
    return p as Promise<T>
  }
  const p = fetch(url).then(async res => {
    if (!res.ok) throw new Error(`Fandom API error ${res.status}`)
    const data = (await res.json()) as T
    if (persist) cacheWrite(url, data)
    return data
  })
  memory.set(url, p)
  // failed requests must be retryable
  p.catch(() => memory.delete(url))
  return p
}

export function wikiUrl(page: string): string {
  return `${WIKI_BASE}/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`
}

const NON_ARTICLE = /^(File|Image|Category|Template|Special|User|User talk|Help|Talk|Survivor Wiki|MediaWiki|Forum|Message Wall|Board|Blog|Thread)\s*:/i

/** Article title for a link into the Survivor Wiki, or null for anything else. */
export function pageFromHref(href: string): string | null {
  const m = href.match(/^https?:\/\/survivor\.fandom\.com\/wiki\/([^?#]+)/i)
  if (!m) return null
  let title: string
  try {
    title = decodeURIComponent(m[1]).replace(/_/g, ' ')
  } catch {
    return null
  }
  return NON_ARTICLE.test(title) ? null : title
}

export interface WikiSection {
  index: string
  line: string
  toclevel: number
  anchor: string
}

export async function getSections(page: string): Promise<WikiSection[]> {
  const data = await apiGet<{ parse?: { sections: WikiSection[] } }>({
    action: 'parse', page, prop: 'sections', redirects: '1',
  })
  return (data.parse?.sections ?? []).filter(s => s.toclevel === 1)
}

/** Parsed (uncleaned) HTML of one section — the infobox lives in section 0. */
async function getSectionRaw(page: string, section: string): Promise<string> {
  const data = await apiGet<{ parse?: { text: { '*': string } } }>({
    action: 'parse', page, prop: 'text', section, disableeditsection: '1', redirects: '1',
  })
  return data.parse?.text['*'] ?? ''
}

export async function getSectionHtml(page: string, section: string): Promise<string> {
  return cleanWikiHtml(await getSectionRaw(page, section))
}

export interface PageImage {
  original?: string
  thumbnail?: string
}

export async function getPageImage(page: string): Promise<PageImage> {
  const data = await apiGet<{
    query?: { pages: Record<string, { original?: { source: string }; thumbnail?: { source: string } }> }
  }>({
    action: 'query', prop: 'pageimages', piprop: 'original|thumbnail',
    pithumbsize: '400', titles: page, redirects: '1',
  })
  const pages = data.query?.pages ?? {}
  const first = Object.values(pages)[0]
  return { original: first?.original?.source, thumbnail: first?.thumbnail?.source }
}

interface Alias { from: string; to: string }

/** follow the API's normalization + redirect hops from a requested title to the real page */
function finalTitle(title: string, normalized: Alias[] = [], redirects: Alias[] = []): string {
  let t = title
  const n = normalized.find(a => a.from === t)
  if (n) t = n.to
  for (let hop = 0; hop < 3; hop++) {
    const r = redirects.find(a => a.from === t)
    if (!r) break
    t = r.to
  }
  return t
}

/**
 * Thumbnails for many pages at once (season logos, winner portraits).
 * Returns requested title → image URL; pages without an image are omitted.
 */
export async function getPageImages(titles: string[], size = 200): Promise<Record<string, string>> {
  const unique = [...new Set(titles)]
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += 50) chunks.push(unique.slice(i, i + 50))

  const results = await Promise.all(
    chunks.map(chunk =>
      apiGet<{
        query?: {
          normalized?: Alias[]
          redirects?: Alias[]
          pages?: { title: string; thumbnail?: { source: string } }[]
        }
      }>({
        action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: String(size),
        pilimit: '50', titles: chunk.join('|'), redirects: '1', formatversion: '2',
      }).then(data => ({ chunk, data })),
    ),
  )

  const out: Record<string, string> = {}
  for (const { chunk, data } of results) {
    const byTitle = new Map<string, string>()
    for (const p of data.query?.pages ?? []) {
      if (p.thumbnail?.source) byTitle.set(p.title, p.thumbnail.source)
    }
    for (const t of chunk) {
      const src = byTitle.get(finalTitle(t, data.query?.normalized, data.query?.redirects))
      if (src) out[t] = src
    }
  }
  return out
}

/**
 * Which of these titles exist on the wiki? Maps each requested title to the
 * page it resolves to (following redirects), or null when there's no page.
 */
export async function resolvePages(titles: string[]): Promise<Record<string, string | null>> {
  const data = await apiGet<{
    query?: {
      normalized?: Alias[]
      redirects?: Alias[]
      pages?: { title: string; missing?: boolean; invalid?: boolean }[]
    }
  }>(
    { action: 'query', titles: titles.join('|'), redirects: '1', formatversion: '2' },
    // new seasons appear on the wiki between visits — re-check a few times a day
    { ttl: 6 * 60 * 60 * 1000 },
  )
  const existing = new Set(
    (data.query?.pages ?? []).filter(p => !p.missing && !p.invalid).map(p => p.title),
  )
  const out: Record<string, string | null> = {}
  for (const t of titles) {
    const final = finalTitle(t, data.query?.normalized, data.query?.redirects)
    out[t] = existing.has(final) ? final : null
  }
  return out
}

export interface WikiHit {
  title: string
  thumb: string | null
  snippet: string | null
}

/** Live search across the whole Survivor Wiki (castaways, episodes, tribes…). */
export async function searchWiki(query: string, limit = 8): Promise<WikiHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const prefix = await apiGet<{
    query?: { pages?: { title: string; index?: number; thumbnail?: { source: string } }[] }
  }>(
    {
      action: 'query', generator: 'prefixsearch', gpssearch: q, gpslimit: String(limit),
      gpsnamespace: '0', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '96',
      pilimit: String(limit), redirects: '1', formatversion: '2',
    },
    { persist: false },
  )
  const hits: WikiHit[] = (prefix.query?.pages ?? [])
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(p => ({ title: p.title, thumb: p.thumbnail?.source ?? null, snippet: null }))

  if (hits.length >= 4) return hits

  // few title matches — fall back to full-text search for the rest
  const full = await apiGet<{
    query?: { search?: { title: string; snippet: string }[] }
  }>(
    { action: 'query', list: 'search', srsearch: q, srlimit: '6', srnamespace: '0', formatversion: '2' },
    { persist: false },
  ).catch(() => ({ query: { search: [] } }))
  for (const s of full.query?.search ?? []) {
    if (hits.some(h => h.title === s.title)) continue
    const tmp = new DOMParser().parseFromString(s.snippet, 'text/html')
    hits.push({ title: s.title, thumb: null, snippet: (tmp.body.textContent ?? '').trim() || null })
  }
  return hits.slice(0, limit + 2)
}

export interface GalleryImage {
  title: string
  url: string
  thumbUrl: string
}

export async function getGalleryImages(page: string, limit = 40): Promise<GalleryImage[]> {
  const data = await apiGet<{
    query?: {
      pages: Record<string, {
        title: string
        imageinfo?: {
          url: string; thumburl?: string; width: number; height: number
          mime?: string; mediatype?: string
        }[]
      }>
    }
  }>({
    action: 'query', generator: 'images', titles: page, gimlimit: String(limit),
    prop: 'imageinfo', iiprop: 'url|size|mime|mediatype', iiurlwidth: '480', redirects: '1',
  })
  const pages = Object.values(data.query?.pages ?? {})
  return pages
    .filter(p => {
      const info = p.imageinfo?.[0]
      if (!info) return false
      // real bitmap images only (the wiki also lists youtube-reference "video files")
      if (info.mediatype !== 'BITMAP') return false
      // skip icons / tiny decorative files
      return info.width >= 150 && info.height >= 110
    })
    .map(p => ({
      title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/_/g, ' '),
      url: p.imageinfo![0].url,
      thumbUrl: p.imageinfo![0].thumburl ?? p.imageinfo![0].url,
    }))
}

/** Fandom thumbnail URL rescaled to a given width (falls back to the original). */
export function scaledImage(img: GalleryImage, width: number): string {
  return img.thumbUrl.includes('/scale-to-width-down/')
    ? img.thumbUrl.replace(/\/scale-to-width-down\/\d+/, `/scale-to-width-down/${width}`)
    : img.url
}

/**
 * Sanitize + adapt Fandom's parsed HTML for embedding in the detail panel:
 * remove infoboxes/nav cruft/scripts, absolutize links, fix lazy-loaded images.
 */
export function cleanWikiHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const removeSelectors = [
    'script', 'style', 'aside.portable-infobox', '.toc', '#toc',
    '.mw-editsection', 'sup.reference', '.reference', '.navbox',
    '.mw-references-wrap', 'ol.references', '.wikia-gallery-add',
    'table.navibox', '.noprint', 'iframe', 'object', 'embed', 'form',
  ]
  for (const sel of removeSelectors) {
    doc.querySelectorAll(sel).forEach(el => el.remove())
  }

  // never carry inline event handlers or javascript: URLs into our DOM
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name)
      else if (/^(href|src|xlink:href)$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name)
      }
    }
  })

  // Lazy images: Fandom ships data-src / noscript fallbacks
  doc.querySelectorAll('img').forEach(img => {
    const dataSrc = img.getAttribute('data-src')
    if (dataSrc) img.setAttribute('src', dataSrc)
    const dataSrcset = img.getAttribute('data-srcset')
    if (dataSrcset) img.setAttribute('srcset', dataSrcset)
    img.removeAttribute('loading')
    img.setAttribute('loading', 'lazy')
    img.setAttribute('referrerpolicy', 'no-referrer')
    const src = img.getAttribute('src') ?? ''
    // strip base64 placeholder images that never got hydrated
    if (src.startsWith('data:') && !dataSrc) img.remove()
  })

  // Absolutize wiki links and open in a new tab
  doc.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') ?? ''
    if (href.startsWith('/')) a.setAttribute('href', `${WIKI_BASE}${href}`)
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer')
  })

  // Make wide tables scrollable
  doc.querySelectorAll('table').forEach(table => {
    const wrap = doc.createElement('div')
    wrap.className = 'table-scroll'
    table.parentNode?.insertBefore(wrap, table)
    wrap.appendChild(table)
  })

  return doc.body.innerHTML
}

/** Intro (section 0) with infobox stripped — used for the Overview node. */
export function getOverviewHtml(page: string): Promise<string> {
  return getSectionHtml(page, '0')
}

/* ---------- infobox ---------- */

export interface InfoboxLink {
  title: string
  text: string
}

export interface InfoboxField {
  /** the template parameter name (data-source attribute), lowercased */
  key: string
  label: string
  text: string
  links: InfoboxLink[]
}

function valueText(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  clone.querySelectorAll('li, p, div').forEach(li => li.append('\n'))
  return (clone.textContent ?? '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function linksOf(el: Element): InfoboxLink[] {
  const out: InfoboxLink[] = []
  el.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') ?? ''
    const abs = href.startsWith('/') ? `${WIKI_BASE}${href}` : href
    const title = pageFromHref(abs)
    const text = (a.textContent ?? '').trim()
    if (title && text) out.push({ title, text })
  })
  return out
}

/** Every labelled field in the page's portable infobox. */
export function parseInfobox(rawHtml: string): InfoboxField[] {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  const box = doc.querySelector('aside.portable-infobox, .portable-infobox')
  if (!box) return []
  const out: InfoboxField[] = []
  box.querySelectorAll('.pi-data').forEach(el => {
    const value = el.querySelector('.pi-data-value')
    if (!value) return
    out.push({
      key: (el.getAttribute('data-source') ?? '').toLowerCase(),
      label: (el.querySelector('.pi-data-label')?.textContent ?? '').trim(),
      text: valueText(value),
      links: linksOf(value),
    })
  })
  // horizontal groups render as a table: th[data-source] label over td[data-source] value
  box.querySelectorAll('td[data-source]').forEach(td => {
    const key = (td.getAttribute('data-source') ?? '').toLowerCase()
    if (!key || out.some(f => f.key === key)) return
    const th = Array.from(box.querySelectorAll('th[data-source]')).find(
      h => (h.getAttribute('data-source') ?? '').toLowerCase() === key,
    )
    out.push({ key, label: (th?.textContent ?? key).trim(), text: valueText(td), links: linksOf(td) })
  })
  return out
}

function findField(fields: InfoboxField[], keys: string[], label: RegExp): InfoboxField | null {
  return (
    fields.find(f => keys.includes(f.key)) ??
    fields.find(f => label.test(f.label)) ??
    null
  )
}

function firstInt(text: string | undefined): number | null {
  const m = text?.replace(/,/g, '').match(/\d+/)
  return m ? Number(m[0]) : null
}

const PLACEHOLDER = /^(tba|tbd|n\/a|none|unknown|\?+|-+|—)$/i

export interface SeasonFacts {
  location: string | null
  seasonRun: string | null
  filmingDates: string | null
  days: number | null
  castaways: number | null
  episodes: number | null
  tribes: string[]
  winner: InfoboxLink | null
  runnersUp: string[]
  /** wiki page of the following season, if the infobox links one */
  next: string | null
}

export function factsFromInfobox(fields: InfoboxField[]): SeasonFacts {
  const f = (keys: string[], label: RegExp) => findField(fields, keys, label)

  const winnerField = f(['winner', 'winners', 'solesurvivor'], /winner|sole survivor/i)
  let winner: InfoboxLink | null = winnerField?.links[0] ?? null
  if (!winner && winnerField && winnerField.text && !PLACEHOLDER.test(winnerField.text)) {
    const name = winnerField.text.split('\n')[0].trim()
    winner = { title: name, text: name }
  }

  const tribesField = f(['tribes', 'tribe'], /tribes?$/i)
  const tribes = tribesField
    ? (tribesField.links.length
        ? tribesField.links.map(l => l.text)
        : tribesField.text.split(/\n|,/).map(s => s.trim()).filter(Boolean)
      ).filter((t, i, all) => all.indexOf(t) === i).slice(0, 8)
    : []

  const nextField = f(['next', 'nextseason', 'next_season'], /^next/i)

  const text = (field: InfoboxField | null) =>
    field && field.text && !PLACEHOLDER.test(field.text) ? field.text.replace(/\n/g, ', ') : null

  return {
    location: text(f(['location', 'locations'], /location/i)),
    seasonRun: text(f(['seasonrun', 'season_run', 'airdates', 'aired', 'run', 'broadcast'], /season run|aired|broadcast|original run|air ?dates?/i)),
    filmingDates: text(f(['filmingdates', 'filming_dates', 'filming'], /filming/i)),
    days: firstInt(f(['days', 'numberofdays', 'no_days'], /\bdays\b/i)?.text),
    castaways: firstInt(f(['survivors', 'castaways', 'contestants', 'players'], /castaways|survivors|contestants|players/i)?.text),
    episodes: firstInt(f(['episodes', 'numberofepisodes'], /episodes/i)?.text),
    tribes,
    winner,
    runnersUp: (f(['runnerup', 'runnersup', 'runner-up', 'runners-up'], /runner/i)?.links ?? []).map(l => l.text),
    next: nextField?.links[0]?.title ?? null,
  }
}

/** Structured season facts (days, castaways, tribes, winner…) from the wiki infobox. */
export async function getSeasonFacts(page: string): Promise<SeasonFacts> {
  return factsFromInfobox(parseInfobox(await getSectionRaw(page, '0')))
}

/* ---------- castaways ---------- */

export interface Castaway {
  name: string
  /** wiki page title for the contestant */
  page: string
  photo: string | null
  /** age, hometown, profession line from the table */
  meta: string
  /** finish text, e.g. "7th Voted Out — Day 21" */
  finish: string
}

const FINISH_RE = /(Sole Survivor|Runner[- ]Up|Voted Out|Eliminated|Medically Evacuated|Evacuated|Quit|Removed|Lost Fire|2nd Runner-Up)/i

/**
 * Best-effort extraction of the castaways table into structured cards.
 * The wiki's table layout is consistent enough across seasons: one row per
 * player with a portrait image and the contestant link in the same row.
 */
export function parseCastaways(sectionHtml: string): Castaway[] {
  const doc = new DOMParser().parseFromString(sectionHtml, 'text/html')
  const out: Castaway[] = []
  const seen = new Set<string>()

  doc.querySelectorAll('table tr').forEach(tr => {
    const img = tr.querySelector('img')
    if (!img) return
    const photo = img.getAttribute('src')
    // contestant link: first anchor whose text is a real name (not an image wrap)
    const link = Array.from(tr.querySelectorAll('a')).find(
      a => (a.textContent ?? '').trim().length > 2,
    )
    if (!link) return
    const name = (link.textContent ?? '').trim()
    if (seen.has(name)) return
    const href = link.getAttribute('href') ?? ''
    const pageMatch = href.match(/\/wiki\/([^#?]+)/)
    if (!pageMatch) return

    const nameCell = link.closest('td')
    nameCell?.querySelectorAll('br').forEach(br => br.replaceWith(' · '))
    let meta = (nameCell?.textContent ?? '')
      .replace(name, '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s·,]+|[\s·,]+$/g, '')
      .replace(/(\s·\s)+/g, ' · ')
      .trim()
    if (meta.length > 90) meta = meta.slice(0, 87) + '…'

    const rowText = (tr.textContent ?? '').replace(/\s+/g, ' ')
    const finishMatch = rowText.match(
      new RegExp(`((?:\\d+\\w{2}\\s+)?${FINISH_RE.source}[^|]*?(?:Day\\s+\\d+)?)`, 'i'),
    )
    let finish = finishMatch ? finishMatch[1].trim() : ''
    if (finish.length > 50) finish = finish.slice(0, 47) + '…'

    out.push({
      name,
      page: decodeURIComponent(pageMatch[1]).replace(/_/g, ' '),
      photo: photo && !photo.startsWith('data:') ? photo : null,
      meta,
      finish,
    })
    seen.add(name)
  })

  return out
}

export interface ContestantBio {
  html: string
  image: string | null
}

export async function getContestantBio(page: string): Promise<ContestantBio> {
  const [html, img] = await Promise.all([
    getSectionHtml(page, '0'),
    getPageImage(page).catch(() => ({}) as PageImage),
  ])
  return { html, image: img.thumbnail ?? img.original ?? null }
}
