import { useState } from 'react'
import type { Season } from '../data/seasons'
import { SEASONS } from '../data/seasons'

interface Props {
  open: boolean
  selected: Season | null
  onSelect: (season: Season) => void
  onToggle: () => void
}

export default function SeasonIndex({ open, selected, onSelect, onToggle }: Props) {
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()
  const visible = q
    ? SEASONS.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.winner.toLowerCase().includes(q) ||
          String(s.number) === q,
      )
    : SEASONS

  return (
    <>
      <button className="index-toggle" onClick={onToggle}>
        {open ? '✕ Close' : '☰ Seasons'}
      </button>
      <nav className={`season-index ${open ? 'season-index-open' : ''}`}>
        <h3>48 Seasons · 20 Locations</h3>
        <input
          type="search"
          placeholder="Search season, country, winner…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <ul>
          {visible.map(s => (
            <li key={s.number}>
              <button
                className={selected?.number === s.number ? 'index-item-active' : ''}
                style={{ '--item-color': s.theme.primary } as React.CSSProperties}
                onClick={() => onSelect(s)}
              >
                <span className="index-num">{s.number}</span>
                <span className="index-title">
                  {s.title}
                  <small>
                    {s.country} · {s.year}
                  </small>
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="index-empty">No seasons match.</li>}
        </ul>
      </nav>
    </>
  )
}
