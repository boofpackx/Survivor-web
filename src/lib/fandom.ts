import { WIKI_BASE } from '../data/seasons'

const API = `${WIKI_BASE}/api.php`

function apiUrl(params: Record<string, string>): string {
  const q = new URLSearchParams({ format: 'json', origin: '*', ...params })
  return `${API}?${q.toString()}`
}

const CACHE_PREFIX = 'sa-api:'
const CACHE_TTL = 24 * 60 * 60 * 1000

function cacheRead(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { t, d } = JSON.parse(raw) as { t: number; d: unknown }
    if (Date.now() - t > CACHE_TTL) return null
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

async function apiGet<T>(params: Record<string, string>): Promise<T> {
  const url = apiUrl(params)
  const cached = cacheRead(url)
  if (cached !== null) return cached as T
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fandom API error ${res.status}`)
  const data = (await res.json()) as T
  cacheWrite(url, data)
  return data
}

export interface WikiSection {
  index: string
  line: string
  toclevel: number
  anchor: string
}

export async function getSections(page: string): Promise<WikiSection[]> {
  const data = await apiGet<{ parse?: { sections: WikiSection[] } }>({
    action: 'parse', page, prop: 'sections',
  })
  return (data.parse?.sections ?? []).filter(s => s.toclevel === 1)
}

export async function getSectionHtml(page: string, section: string): Promise<string> {
  const data = await apiGet<{ parse?: { text: { '*': string } } }>({
    action: 'parse', page, prop: 'text', section, disableeditsection: '1',
  })
  return cleanWikiHtml(data.parse?.text['*'] ?? '')
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
    pithumbsize: '400', titles: page,
  })
  const pages = data.query?.pages ?? {}
  const first = Object.values(pages)[0]
  return { original: first?.original?.source, thumbnail: first?.thumbnail?.source }
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
    prop: 'imageinfo', iiprop: 'url|size|mime|mediatype', iiurlwidth: '480',
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
    'table.navibox', '.noprint',
  ]
  for (const sel of removeSelectors) {
    doc.querySelectorAll(sel).forEach(el => el.remove())
  }

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
    let meta = (nameCell?.textContent ?? '').replace(name, '').replace(/\s+/g, ' ').trim()
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
