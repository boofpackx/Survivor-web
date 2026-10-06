import { useEffect, useMemo, useRef, useState } from 'react'
import type { Season } from '../data/seasons'
import { ERAS, eraOf, winnerLabel } from '../data/seasons'
import '../styles/index-drawer.css'

interface Props {
  open: boolean
  seasons: Season[]
  logos: Record<string, string>
  selected: Season | null
  visited: Set<number>
  favorites: Set<number>
  onSelect: (season: Season) => void
  onToggle: () => void
}

type Filter = 'all' | 'fav' | 'new'

function matches(s: Season, q: string): boolean {
  return (
    s.title.toLowerCase().includes(q) ||
    s.country.toLowerCase().includes(q) ||
    s.location.toLowerCase().includes(q) ||
    s.winner.toLowerCase().includes(q) ||
    s.year === q ||
    String(s.number) === q
  )
}

export default function SeasonIndex({ open, seasons, logos, selected, visited, favorites, onSelect, onToggle }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const q = query.trim().toLowerCase()

  useEffect(() => {
    if (!open) return
    // only auto-focus with a real keyboard/mouse — on phones it would pop the keyboard
    if (!window.matchMedia('(pointer: fine)').matches) return
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 260)
    return () => clearTimeout(t)
  }, [open])

  const groups = useMemo(() => {
    const visible = seasons.filter(s => {
      if (q && !matches(s, q)) return false
      if (filter === 'fav') return favorites.has(s.number)
      if (filter === 'new') return !visited.has(s.number)
      return true
    })
    return ERAS.map(era => ({ era, items: visible.filter(s => eraOf(s.number).id === era.id) })).filter(
      g => g.items.length,
    )
  }, [seasons, q, filter, favorites, visited])

  const explored = seasons.filter(s => visited.has(s.number)).length
  const countries = new Set(seasons.map(s => s.country)).size

  const moveFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('.index-item') ?? [])
    if (!items.length) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') items[Math.min(at + 1, items.length - 1)].focus()
    else if (at <= 0) inputRef.current?.focus()
    else items[at - 1].focus()
  }

  let n = 0
  return (
    <>
      <button className="index-toggle" onClick={onToggle} aria-expanded={open} aria-controls="season-index">
        {open ? '✕ Close' : '☰ Seasons'}
      </button>
      <nav
        id="season-index"
        className={`season-index ${open ? 'season-index-open' : ''}`}
        aria-label="Season index"
        inert={!open}
        onKeyDown={moveFocus}
      >
        <div className="index-head">
          <h3>{seasons.length} Seasons · {countries} Countries</h3>
          <div className="index-progress" title={`${explored} of ${seasons.length} explored`}>
            <span style={{ width: `${(explored / Math.max(seasons.length, 1)) * 100}%` }} />
          </div>
          <small>🔥 {explored} explored · {seasons.length - explored} to go</small>
        </div>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search season, country, winner, year…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Filter seasons"
        />
        <div className="index-filters" role="radiogroup" aria-label="Show">
          {([
            ['all', 'All'],
            ['fav', `★ Favorites${favorites.size ? ` (${favorites.size})` : ''}`],
            ['new', 'Unexplored'],
          ] as [Filter, string][]).map(([id, label]) => (
            <button
              key={id}
              role="radio"
              aria-checked={filter === id}
              className={filter === id ? 'index-filter index-filter-on' : 'index-filter'}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="index-list" ref={listRef}>
          {groups.map(({ era, items }) => (
            <section key={era.id} className="index-era">
              <h4>
                <span aria-hidden="true">{era.icon}</span> {era.name}
                <small>{era.to ? `${era.from}–${era.to}` : `${era.from}+`}</small>
              </h4>
              <ul>
                {items.map(s => {
                  const logo = logos[s.wikiPage]
                  const i = n++
                  return (
                    <li key={s.number} style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                      <button
                        className={`index-item ${selected?.number === s.number ? 'index-item-active' : ''} ${visited.has(s.number) ? 'index-item-seen' : ''}`}
                        style={{ '--item-color': s.theme.primary, '--item-accent': s.theme.accent } as React.CSSProperties}
                        onClick={() => onSelect(s)}
                      >
                        <span className="index-thumb">
                          {logo ? <img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
                          <span className="index-num">{s.number}</span>
                        </span>
                        <span className="index-title">
                          <span className="index-name">
                            {s.title}
                            {favorites.has(s.number) && <span className="index-star" aria-label="favorite">★</span>}
                          </span>
                          <small>{s.country} · {s.year}</small>
                          <small className="index-winner">🏆 {winnerLabel(s)}</small>
                        </span>
                        {s.status === 'airing' && <span className="badge badge-live">Live</span>}
                        {s.status === 'upcoming' && <span className="badge badge-soon">Soon</span>}
                        {s.discovered && s.status === 'complete' && <span className="badge badge-new">New</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {groups.length === 0 && (
            <p className="index-empty">
              {filter === 'fav' ? 'No favorites yet — press ★ on any season page.' : 'No seasons match.'}
            </p>
          )}
        </div>
      </nav>
    </>
  )
}
