import { useCallback, useEffect, useState } from 'react'
import SurvivorMap from './components/SurvivorMap'
import SeasonWeb from './components/SeasonWeb'
import type { WebNode } from './components/SeasonWeb'
import DetailPanel from './components/DetailPanel'
import SeasonIndex from './components/SeasonIndex'
import type { Season } from './data/seasons'
import { applyTheme } from './lib/theme'
import './App.css'

type Stage = 'world' | 'flying' | 'web'

export default function App() {
  const [selected, setSelected] = useState<Season | null>(null)
  const [stage, setStage] = useState<Stage>('world')
  const [activeNode, setActiveNode] = useState<WebNode | null>(null)
  const [indexOpen, setIndexOpen] = useState(false)

  useEffect(() => {
    applyTheme(selected?.theme ?? null)
  }, [selected])

  const handleSelect = useCallback((season: Season) => {
    setActiveNode(null)
    setIndexOpen(false)
    setSelected(season)
    setStage('flying')
  }, [])

  const handleArrived = useCallback(() => {
    setStage(s => (s === 'flying' ? 'web' : s))
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
        <h1>
          <span className="logo-flame">🔥</span> SURVIVOR <span className="logo-sub">ATLAS</span>
        </h1>
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
        <SurvivorMap selected={selected} onSelect={handleSelect} onArrived={handleArrived} />
        <div className="map-vignette" />
      </div>

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
          onNodeClick={setActiveNode}
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
