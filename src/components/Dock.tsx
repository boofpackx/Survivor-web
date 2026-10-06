import type { Route } from '../lib/router'
import { navigate } from '../lib/router'

interface Props {
  route: Route
  explored: number
  total: number
  onSearch: () => void
  onRandom: () => void
  onIndex: () => void
}

const TABS = [
  { page: 'map', icon: '🗺️', label: 'Map' },
  { page: 'timeline', icon: '📜', label: 'Timeline' },
  { page: 'champions', icon: '🏆', label: 'Champions' },
  { page: 'quiz', icon: '🔥', label: 'Quiz' },
] as const

/** Floating bottom navigation — the "camp" you always come back to. */
export default function Dock({ route, explored, total, onSearch, onRandom, onIndex }: Props) {
  const activeIdx = Math.max(0, TABS.findIndex(t => t.page === route.page))
  const pct = total ? explored / total : 0
  return (
    <nav className="dock" aria-label="Main">
      <div className="dock-tabs" style={{ '--active': activeIdx } as React.CSSProperties}>
        <span className="dock-indicator" aria-hidden="true" />
        {TABS.map(t => (
          <button
            key={t.page}
            className={`dock-tab ${route.page === t.page ? 'dock-tab-active' : ''}`}
            aria-current={route.page === t.page ? 'page' : undefined}
            onClick={() => navigate(t.page === 'map' ? { page: 'map' } : { page: t.page })}
          >
            <span className="dock-icon" aria-hidden="true">{t.icon}</span>
            <span className="dock-label">{t.label}</span>
          </button>
        ))}
      </div>
      <span className="dock-sep" aria-hidden="true" />
      <button className="dock-btn" onClick={onSearch} title="Search (/ or Ctrl K)" aria-label="Search">
        🔍
      </button>
      <button className="dock-btn" onClick={onRandom} title="Draw a rock — random season (R)" aria-label="Random season">
        🪨
      </button>
      <button
        className="dock-progress"
        onClick={onIndex}
        title={`You've explored ${explored} of ${total} seasons`}
        aria-label={`Explored ${explored} of ${total} seasons — open the season index`}
        style={{ '--pct': pct } as React.CSSProperties}
      >
        <span className="dock-progress-ring" aria-hidden="true" />
        <span className="dock-progress-text">
          {explored}<small>/{total}</small>
        </span>
      </button>
    </nav>
  )
}
