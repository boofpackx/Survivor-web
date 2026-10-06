import { useMemo, useState } from 'react'
import type { Season } from '../data/seasons'
import { ERAS, eraOf, seasonName } from '../data/seasons'
import CountUp from '../components/CountUp'
import { useEscape } from '../lib/escape'
import { usePageImages } from '../lib/images'
import { navigate } from '../lib/router'
import { openPeek } from '../lib/toast'
import '../styles/pages.css'
import '../styles/champions.css'

interface Props {
  seasons: Season[]
  onSelect: (season: Season) => void
}

interface Champion {
  name: string
  page: string
  wins: Season[]
}

type Sort = 'first' | 'recent' | 'name'

/** Hall of Champions — every Sole Survivor in a gilded frame. */
export default function ChampionsPage({ seasons, onSelect }: Props) {
  const [sort, setSort] = useState<Sort>('first')
  const [era, setEra] = useState<string>('all')
  const [query, setQuery] = useState('')
  useEscape(() => navigate({ page: 'map' }))

  const champions = useMemo(() => {
    const byPage = new Map<string, Champion>()
    for (const s of seasons) {
      if (!s.winner || !s.winnerPage) continue
      const key = s.winnerPage.toLowerCase()
      const c = byPage.get(key)
      if (c) c.wins.push(s)
      else byPage.set(key, { name: s.winner, page: s.winnerPage, wins: [s] })
    }
    return [...byPage.values()]
  }, [seasons])

  const photos = usePageImages(useMemo(() => champions.map(c => c.page), [champions]), 320)
  const pending = seasons.filter(s => !s.winner && s.status !== 'complete')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = champions.filter(c => {
      if (era !== 'all' && !c.wins.some(s => eraOf(s.number).id === era)) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.wins.some(s => s.title.toLowerCase().includes(q) || String(s.number) === q)
    })
    return list.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
        : sort === 'recent' ? b.wins[b.wins.length - 1].number - a.wins[a.wins.length - 1].number
          : a.wins[0].number - b.wins[0].number,
    )
  }, [champions, sort, era, query])

  const crowned = champions.reduce((n, c) => n + c.wins.length, 0)
  const repeat = champions.filter(c => c.wins.length > 1).length
  const lands = new Set(champions.flatMap(c => c.wins.map(s => s.country))).size

  return (
    <div className="page ch-page">
      <div className="ch-lights" aria-hidden="true" />
      <button className="page-close" onClick={() => navigate({ page: 'map' })} aria-label="Back to the map">✕</button>

      <header className="page-head ch-head">
        <p className="page-kicker">👑 Outwit · Outplay · Outlast</p>
        <h1>Hall of Champions</h1>
        <p className="page-sub">Every Sole Survivor, from the first beach to the latest finale.</p>
        <div className="ch-stats">
          <div><strong><CountUp value={crowned} /></strong><small>Seasons crowned</small></div>
          <div><strong><CountUp value={champions.length} /></strong><small>Champions</small></div>
          <div><strong><CountUp value={repeat} /></strong><small>Two-time winners</small></div>
          <div><strong><CountUp value={lands} /></strong><small>Countries</small></div>
        </div>
      </header>

      <div className="ch-controls">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find a champion or season…"
          aria-label="Find a champion"
        />
        <div className="ch-chips" role="radiogroup" aria-label="Era">
          <button role="radio" aria-checked={era === 'all'} className={era === 'all' ? 'ch-chip ch-chip-on' : 'ch-chip'} onClick={() => setEra('all')}>All eras</button>
          {ERAS.map(e => (
            <button key={e.id} role="radio" aria-checked={era === e.id} className={era === e.id ? 'ch-chip ch-chip-on' : 'ch-chip'} onClick={() => setEra(e.id)}>
              {e.icon} {e.name.replace(/^The /, '')}
            </button>
          ))}
        </div>
        <label className="ch-sort">
          Sort
          <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="first">First win</option>
            <option value="recent">Most recent</option>
            <option value="name">A–Z</option>
          </select>
        </label>
      </div>

      <div className="ch-grid">
        {era === 'all' && !query && pending.map(s => (
          <article key={`p-${s.number}`} className="ch-card ch-pending" style={{ '--c1': s.theme.primary, '--c2': s.theme.accent } as React.CSSProperties}>
            <div className="ch-frame">
              <div className="ch-photo ch-photo-empty"><span>?</span></div>
            </div>
            <h3>The crown awaits</h3>
            <p className="ch-pending-note">
              {s.status === 'airing' ? 'Still on the air' : 'Coming soon'} — who will outlast them all?
            </p>
            <div className="ch-wins">
              <button className="ch-win" onClick={() => onSelect(s)}>S{s.number} · {s.title}</button>
            </div>
          </article>
        ))}

        {visible.map((c, i) => {
          const latest = c.wins[c.wins.length - 1]
          const photo = photos[c.page]
          return (
            <article
              key={c.page}
              className={`ch-card ${c.wins.length > 1 ? 'ch-repeat' : ''}`}
              style={{ '--c1': latest.theme.primary, '--c2': latest.theme.accent, '--i': Math.min(i, 16) } as React.CSSProperties}
              onPointerMove={e => {
                const r = e.currentTarget.getBoundingClientRect()
                e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
                e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
                e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`)
                e.currentTarget.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -12}deg`)
              }}
              onPointerLeave={e => {
                e.currentTarget.style.setProperty('--rx', '0deg')
                e.currentTarget.style.setProperty('--ry', '0deg')
              }}
            >
              {c.wins.length > 1 && <span className="ch-ribbon">{c.wins.length}× Champion</span>}
              <button className="ch-frame" onClick={() => openPeek({ page: c.page, name: c.name, image: photo })} aria-label={`Read about ${c.name}`}>
                {photo ? (
                  <img className="ch-photo" src={photo} alt={c.name} loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <div className="ch-photo ch-photo-empty"><span>🏆</span></div>
                )}
                <span className="ch-shine" aria-hidden="true" />
              </button>
              <h3>{c.name}</h3>
              <div className="ch-wins">
                {c.wins.map(s => (
                  <button key={s.number} className="ch-win" onClick={() => onSelect(s)} title={`Open ${seasonName(s)}`}>
                    S{s.number} · {s.title} <small>{s.year}</small>
                  </button>
                ))}
              </div>
            </article>
          )
        })}
        {visible.length === 0 && <p className="ch-empty">No champion matches that — the jury is still out.</p>}
      </div>
    </div>
  )
}
