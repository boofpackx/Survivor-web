import { useEffect, useMemo, useRef, useState } from 'react'
import type { Season } from '../data/seasons'
import { winnerLabel } from '../data/seasons'
import { useEscape } from '../lib/escape'
import { searchWiki } from '../lib/fandom'
import type { WikiHit } from '../lib/fandom'
import { navigate } from '../lib/router'
import type { PageId } from '../lib/router'
import { useStore } from '../lib/store'
import { openPeek } from '../lib/toast'
import { recentStore } from '../lib/userData'

interface Props {
  seasons: Season[]
  logos: Record<string, string>
  onClose: () => void
  onRandom: () => void
  onHelp: () => void
}

type Item =
  | { kind: 'season'; key: string; season: Season }
  | { kind: 'page'; key: string; page: PageId | 'map'; label: string; icon: string; hint: string }
  | { kind: 'action'; key: string; action: 'random' | 'help'; label: string; icon: string; hint: string }
  | { kind: 'wiki'; key: string; hit: WikiHit }

const PAGES: Extract<Item, { kind: 'page' }>[] = [
  { kind: 'page', key: 'p-map', page: 'map', label: 'World Map', icon: '🗺️', hint: 'Every filming location' },
  { kind: 'page', key: 'p-timeline', page: 'timeline', label: 'The Journey — Timeline', icon: '📜', hint: 'Every season, era by era' },
  { kind: 'page', key: 'p-champions', page: 'champions', label: 'Hall of Champions', icon: '🏆', hint: 'Every Sole Survivor' },
  { kind: 'page', key: 'p-quiz', page: 'quiz', label: 'Tribal Council Quiz', icon: '🔥', hint: 'Test your Survivor knowledge' },
]

const ACTIONS: Extract<Item, { kind: 'action' }>[] = [
  { kind: 'action', key: 'a-random', action: 'random', label: 'Draw a rock — random season', icon: '🪨', hint: 'R' },
  { kind: 'action', key: 'a-help', action: 'help', label: 'Keyboard shortcuts', icon: '⌨️', hint: '?' },
]

function scoreSeason(s: Season, q: string): number {
  const title = s.title.toLowerCase()
  if (String(s.number) === q || `s${s.number}` === q) return 100
  if (title === q) return 90
  if (title.startsWith(q)) return 80
  if (title.includes(q)) return 60
  if (s.winner.toLowerCase().includes(q)) return 50
  if (s.country.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)) return 40
  if (s.year === q) return 35
  return 0
}

export default function CommandPalette({ seasons, logos, onClose, onRandom, onHelp }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [wiki, setWiki] = useState<{ q: string; hits: WikiHit[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const recent = useStore(recentStore)
  const q = query.trim().toLowerCase()

  useEscape(onClose)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // debounced live wiki search
  useEffect(() => {
    if (q.length < 2) return
    const timer = setTimeout(() => {
      searchWiki(q, 6)
        .then(hits => setWiki({ q, hits }))
        .catch(() => setWiki({ q, hits: [] }))
    }, 260)
    return () => clearTimeout(timer)
  }, [q])

  const groups = useMemo(() => {
    const out: { title: string; items: Item[] }[] = []
    if (!q) {
      const recentSeasons = recent
        .map(n => seasons.find(s => s.number === n))
        .filter((s): s is Season => !!s)
        .slice(0, 5)
      if (recentSeasons.length) {
        out.push({ title: 'Recently visited', items: recentSeasons.map(s => ({ kind: 'season', key: `s-${s.number}`, season: s })) })
      }
      out.push({ title: 'Go to', items: PAGES })
      out.push({ title: 'Actions', items: ACTIONS })
      return out
    }
    const matched = seasons
      .map(s => ({ s, score: scoreSeason(s, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || a.s.number - b.s.number)
      .slice(0, 8)
    if (matched.length) {
      out.push({ title: 'Seasons', items: matched.map(({ s }) => ({ kind: 'season', key: `s-${s.number}`, season: s })) })
    }
    const pages = [...PAGES, ...ACTIONS].filter(p => p.label.toLowerCase().includes(q))
    if (pages.length) out.push({ title: 'Go to', items: pages })
    const seasonPages = new Set(seasons.map(s => s.wikiPage.toLowerCase()))
    const hits = wiki?.q === q ? wiki.hits.filter(h => !seasonPages.has(h.title.toLowerCase())) : []
    if (hits.length) {
      out.push({ title: 'On the Survivor Wiki', items: hits.map(h => ({ kind: 'wiki', key: `w-${h.title}`, hit: h })) })
    }
    return out
  }, [q, seasons, recent, wiki])

  const flat = useMemo(() => groups.flatMap(g => g.items), [groups])
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0))
  const searching = q.length >= 2 && wiki?.q !== q

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const choose = (item: Item | undefined) => {
    if (!item) return
    onClose()
    switch (item.kind) {
      case 'season':
        navigate({ page: 'season', number: item.season.number, slug: null })
        break
      case 'page':
        navigate(item.page === 'map' ? { page: 'map' } : { page: item.page })
        break
      case 'action':
        if (item.action === 'random') onRandom()
        else onHelp()
        break
      case 'wiki':
        openPeek({ page: item.hit.title, name: item.hit.title, image: item.hit.thumb })
        break
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(activeIndex + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(activeIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(flat[activeIndex])
    }
  }

  let index = -1
  return (
    <div className="palette-backdrop" data-modal="" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={e => e.stopPropagation()}
      >
        <div className="palette-input">
          <span aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search seasons, castaways, tribes, anything on the wiki…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={flat.length ? `pal-${activeIndex}` : undefined}
          />
          {searching && <span className="palette-spinner torch-spinner" aria-label="Searching">🔥</span>}
          <kbd>esc</kbd>
        </div>
        <div className="palette-results" id="palette-results" role="listbox" ref={listRef}>
          {groups.map(g => (
            <div key={g.title} className="palette-group">
              <div className="palette-group-title">{g.title}</div>
              {g.items.map(item => {
                index++
                const i = index
                return (
                  <button
                    key={item.key}
                    id={`pal-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`palette-item ${i === activeIndex ? 'palette-item-active' : ''}`}
                    onMouseMove={() => i !== activeIndex && setActive(i)}
                    onClick={() => choose(item)}
                  >
                    <PaletteRow item={item} logos={logos} />
                  </button>
                )
              })}
            </div>
          ))}
          {q && !flat.length && !searching && (
            <p className="palette-empty">Nothing found — the tribe has spoken. Try a castaway’s name or a country.</p>
          )}
        </div>
        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span>Castaways open right here — no tab-hopping</span>
        </div>
      </div>
    </div>
  )
}

function PaletteRow({ item, logos }: { item: Item; logos: Record<string, string> }) {
  if (item.kind === 'season') {
    const s = item.season
    const logo = logos[s.wikiPage]
    return (
      <>
        <span className="palette-thumb" style={{ '--c': s.theme.primary } as React.CSSProperties}>
          {logo ? <img src={logo} alt="" referrerPolicy="no-referrer" loading="lazy" /> : s.number}
        </span>
        <span className="palette-label">
          <strong>S{s.number} · {s.title}</strong>
          <small>{s.country} · {s.year} · 🏆 {winnerLabel(s)}</small>
        </span>
        {s.status === 'airing' && <span className="badge badge-live">Live</span>}
        {s.status === 'upcoming' && <span className="badge badge-soon">Soon</span>}
      </>
    )
  }
  if (item.kind === 'wiki') {
    return (
      <>
        <span className="palette-thumb">
          {item.hit.thumb ? <img src={item.hit.thumb} alt="" referrerPolicy="no-referrer" loading="lazy" /> : '📖'}
        </span>
        <span className="palette-label">
          <strong>{item.hit.title}</strong>
          <small>{item.hit.snippet ? `${item.hit.snippet.slice(0, 90)}…` : 'Open a quick look'}</small>
        </span>
      </>
    )
  }
  return (
    <>
      <span className="palette-thumb palette-thumb-icon">{item.icon}</span>
      <span className="palette-label">
        <strong>{item.label}</strong>
        <small>{item.hint}</small>
      </span>
    </>
  )
}
