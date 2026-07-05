import { useCallback, useEffect, useState } from 'react'
import SurvivorMap from './components/SurvivorMap'
import SeasonWeb, { nodeSlug } from './components/SeasonWeb'
import type { WebNode } from './components/SeasonWeb'
import DetailPanel from './components/DetailPanel'
import SeasonIndex from './components/SeasonIndex'
import Embers from './components/Embers'
import Logotype from './components/Logotype'
import type { Season } from './data/seasons'
import { SEASONS } from './data/seasons'
import { applyTheme } from './lib/theme'
import './App.css'

type Stage = 'world' | 'flying' | 'web'

const VISITED_KEY = 'sa-visited'

function loadVisited(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]') as number[])
  } catch {
    return new Set()
  }
}

function parseHash(): { season: Season | null; slug: string | null } {
  const m = window.location.hash.match(/^#\/s\/(\d+)(?:\/([a-z0-9-]+))?/)
  if (!m) return { season: null, slug: null }
  const season = SEASONS.find(s => s.number === Number(m[1])) ?? null
  return { season, slug: m[2] ?? null }
}

export default function App() {
  // parse any deep link once, before the hash-sync effect can overwrite the URL
  const [initial] = useState(parseHash)
  const [selected, setSelected] = useState<Season | null>(initial.season)
  const [stage, setStage] = useState<Stage>(initial.season ? 'flying' : 'world')
  const [activeNode, setActiveNode] = useState<WebNode | null>(null)
  const [indexOpen, setIndexOpen] = useState(false)
  const [visited, setVisited] = useState<Set<number>>(loadVisited)
  const [pendingSlug, setPendingSlug] = useState<string | null>(initial.slug)

  useEffect(() => {
    applyTheme(selected?.theme ?? null)
  }, [selected])

  // keep the URL shareable: #/s/<season>/<node>
  useEffect(() => {
    const hash = selected
      ? `#/s/${selected.number}${activeNode ? `/${nodeSlug(activeNode)}` : ''}`
      : '#/'
    // replaceState never fires hashchange, so this won't loop back into us
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash)
  }, [selected, activeNode])

  const handleSelect = useCallback((season: Season) => {
    setActiveNode(null)
    setIndexOpen(false)
    setSelected(season)
    setStage('flying')
  }, [])

  // deep links while the app is open (pasted URLs, back/forward)
  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash()
      if (parsed.season) {
        setPendingSlug(parsed.slug)
        handleSelect(parsed.season)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [handleSelect])

  const handleArrived = useCallback(() => {
    setStage(s => (s === 'flying' ? 'web' : s))
    setSelected(current => {
      if (current) {
        setVisited(prev => {
          if (prev.has(current.number)) return prev
          const next = new Set(prev).add(current.number)
          try {
            localStorage.setItem(VISITED_KEY, JSON.stringify([...next]))
          } catch { /* ignore */ }
          return next
        })
      }
      return current
    })
  }, [])

  const handleCloseWeb = useCallback(() => {
    setActiveNode(null)
    setSelected(null)
    setStage('world')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (activeNode) setActiveNode(null)
      else if (selected) handleCloseWeb()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeNode, selected, handleCloseWeb])

  return (
    <div className={`app stage-${stage}`}>
      <header className="app-header">
        <Logotype />
        <p className="header-tag">
          {selected
            ? `Season ${selected.number} — ${selected.title} · ${selected.location}, ${selected.country}`
            : '48 seasons. 20 filming locations. One world map. Click a torch to begin.'}
        </p>
      </header>

      <SeasonIndex
        open={indexOpen}
        selected={selected}
        onSelect={handleSelect}
        onToggle={() => setIndexOpen(o => !o)}
      />

      <div className="map-stage">
        <SurvivorMap
          selected={selected}
          visited={visited}
          onSelect={handleSelect}
          onArrived={handleArrived}
        />
        <div className="map-vignette" />
      </div>

      <Embers />

      {stage === 'flying' && selected && (
        <div className="flying-banner">
          <span className="torch-spinner">🔥</span> Traveling to {selected.location},{' '}
          {selected.country}…
        </div>
      )}

      {stage === 'web' && selected && (
        <SeasonWeb
          season={selected}
          activeNode={activeNode}
          autoOpenSlug={pendingSlug}
          onAutoOpened={() => setPendingSlug(null)}
          onNodeClick={setActiveNode}
          onNavigate={handleSelect}
          onClose={handleCloseWeb}
        />
      )}

      {stage === 'web' && selected && activeNode && (
        <DetailPanel season={selected} node={activeNode} onClose={() => setActiveNode(null)} />
      )}

      <footer className="app-footer">
        Fan project · Data & images from the{' '}
        <a href="https://survivor.fandom.com" target="_blank" rel="noopener noreferrer">
          Survivor Wiki
        </a>{' '}
        (CC-BY-SA) · Not affiliated with CBS
      </footer>
    </div>
  )
}
