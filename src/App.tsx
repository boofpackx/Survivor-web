import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SurvivorMap from './components/SurvivorMap'
import SeasonWeb from './components/SeasonWeb'
import { nodeSlug } from './components/webNodes'
import type { WebNode } from './components/webNodes'
import DetailPanel from './components/DetailPanel'
import SeasonPage from './components/SeasonPage'
import SeasonIndex from './components/SeasonIndex'
import Embers from './components/Embers'
import Logotype from './components/Logotype'
import SparkBurst from './components/SparkBurst'
import FlameWipe from './components/FlameWipe'
import Dock from './components/Dock'
import Toasts from './components/Toasts'
import WikiPeek from './components/WikiPeek'
import CommandPalette from './components/CommandPalette'
import HelpOverlay from './components/HelpOverlay'
import RockDraw from './components/RockDraw'
import IntroSplash from './components/IntroSplash'
import type { Season } from './data/seasons'
import { placeLabel, seasonName } from './data/seasons'
import { applyTheme } from './lib/theme'
import { isTyping, modalOpen, useEscape } from './lib/escape'
import { usePageImages } from './lib/images'
import { navigate, parseRoute, useRoute } from './lib/router'
import { findSeason, runDiscovery, useSeasonState } from './lib/seasonStore'
import { useStore } from './lib/store'
import { toast } from './lib/toast'
import {
  favoritesStore, markVisited, pushRecent, toggleFavorite, viewModeStore, visitedStore,
} from './lib/userData'
import './App.css'
import './styles/shell.css'

const TimelinePage = lazy(() => import('./pages/TimelinePage'))
const ChampionsPage = lazy(() => import('./pages/ChampionsPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))

type Stage = 'world' | 'flying' | 'web'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function goToSeason(season: Season) {
  navigate({ page: 'season', number: season.number, slug: null })
}

export default function App() {
  const route = useRoute()
  const { seasons, discovery } = useSeasonState()
  const visited = useStore(visitedStore)
  const favorites = useStore(favoritesStore)
  const viewMode = useStore(viewModeStore)
  const logos = usePageImages(useMemo(() => seasons.map(s => s.wikiPage), [seasons]))

  const wantedNumber = route.page === 'season' ? route.number : null
  const selected = wantedNumber !== null ? findSeason(seasons, wantedNumber) : null
  const selNum = selected?.number ?? null

  /*
   * Flight state machine, adjusted during render when the selection changes:
   * picking a season flies the camera there ('flying'), arrival opens it
   * ('web'). Hopping between seasons while reading the full-screen page skips
   * the flight — the page just re-lights with the new season.
   */
  const [flight, setFlight] = useState<{ num: number | null; stage: Stage }>(() => ({
    num: selNum,
    stage: selNum === null ? 'world' : 'flying',
  }))
  const [wiping, setWiping] = useState(false)
  if (flight.num !== selNum) {
    const hop = selNum !== null && flight.stage === 'web' && viewMode === 'page'
    setFlight({ num: selNum, stage: selNum === null ? 'world' : hop ? 'web' : 'flying' })
    if (hop && !reducedMotion()) setWiping(true)
  }
  const stage: Stage = flight.num === selNum ? flight.stage : selNum === null ? 'world' : 'flying'

  const [activeNode, setActiveNode] = useState<WebNode | null>(null)
  const [nodeFor, setNodeFor] = useState(selNum)
  if (nodeFor !== selNum) {
    setNodeFor(selNum)
    setActiveNode(null)
  }

  const [indexOpen, setIndexOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [rock, setRock] = useState<Season | null>(null)
  const [pendingSlug, setPendingSlug] = useState<string | null>(() =>
    route.page === 'season' ? route.slug : null,
  )
  const [intro, setIntro] = useState(() => {
    if (route.page !== 'map' || reducedMotion()) return false
    try {
      return !sessionStorage.getItem('sa-intro')
    } catch {
      return false
    }
  })

  const closeIntro = useCallback(() => {
    setIntro(false)
    try {
      sessionStorage.setItem('sa-intro', '1')
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    applyTheme(selected?.theme ?? null)
  }, [selected])

  // look for brand-new seasons on the wiki
  useEffect(() => {
    runDiscovery(fresh => {
      for (const s of fresh) {
        toast(
          {
            icon: s.status === 'airing' ? '📺' : '🔥',
            title: s.status === 'airing' ? 'Now airing — added to the map!' : 'New season on the map!',
            body: `${seasonName(s)} (Season ${s.number}) was just pulled in from the Survivor Wiki.`,
            action: { label: 'Take me there', run: () => goToSeason(s) },
          },
          9000,
        )
      }
    })
  }, [])

  // deep link to a season we don't know (yet): wait for discovery, then give up gracefully
  const missingSeason = wantedNumber !== null && !selected
  const discoveryDone = discovery === 'done' || discovery === 'failed'
  useEffect(() => {
    if (!missingSeason || !discoveryDone) return
    toast({ icon: '🌫️', title: `Season ${wantedNumber} isn’t on the wiki yet`, body: 'Back to the map — check again soon.' })
    navigate({ page: 'map' }, { replace: true })
  }, [missingSeason, discoveryDone, wantedNumber])

  // external URL changes (pasted links, back/forward) may carry a section slug
  useEffect(() => {
    const onHash = () => {
      const r = parseRoute(window.location.hash)
      setPendingSlug(r.page === 'season' ? r.slug : null)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // web view: keep the open node in the URL (#/s/28/castaways) without piling up history
  useEffect(() => {
    if (!selNum || viewMode !== 'web' || stage !== 'web') return
    navigate({ page: 'season', number: selNum, slug: activeNode ? nodeSlug(activeNode) : null }, { replace: true })
  }, [selNum, activeNode, viewMode, stage])

  const flightRef = useRef(flight)
  useEffect(() => {
    flightRef.current = flight
  })
  const handleArrived = useCallback((n: number) => {
    const f = flightRef.current
    if (f.num === n && f.stage === 'flying') {
      if (!reducedMotion()) setWiping(true)
      setFlight({ num: n, stage: 'web' })
    }
    markVisited(n)
    pushRecent(n)
  }, [])

  const closeSeason = useCallback(() => navigate({ page: 'map' }), [])

  useEscape(() => {
    if (activeNode) setActiveNode(null)
    else closeSeason()
  }, selected !== null)
  useEscape(() => setIndexOpen(false), indexOpen)

  const neighbors = useMemo(() => {
    if (!selected) return { prev: null, next: null }
    const i = seasons.findIndex(s => s.number === selected.number)
    return { prev: seasons[i - 1] ?? null, next: seasons[i + 1] ?? null }
  }, [seasons, selected])

  const drawRock = useCallback(() => {
    const pool = seasons.filter(s => s.number !== selNum)
    const fresh = pool.filter(s => !visitedStore.get().has(s.number))
    // lean towards seasons you haven't explored yet
    const from = fresh.length && Math.random() < 0.75 ? fresh : pool
    setRock(from[Math.floor(Math.random() * from.length)])
  }, [seasons, selNum])

  const setViewMode = useCallback((mode: 'page' | 'web') => {
    setActiveNode(null)
    viewModeStore.set(mode)
  }, [])

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e) || modalOpen()) return
      const inSeason = selected !== null && stage === 'web'
      switch (e.key) {
        case '/':
          e.preventDefault()
          setSearchOpen(true)
          break
        case '?':
          setHelpOpen(true)
          break
        case 'r':
          drawRock()
          break
        case 's':
          setIndexOpen(o => !o)
          break
        case 'm':
          navigate({ page: 'map' })
          break
        case 't':
          navigate({ page: 'timeline' })
          break
        case 'c':
          navigate({ page: 'champions' })
          break
        case 'q':
          navigate({ page: 'quiz' })
          break
        case 'ArrowLeft':
        case '[':
          if (inSeason && neighbors.prev) goToSeason(neighbors.prev)
          break
        case 'ArrowRight':
        case ']':
          if (inSeason && neighbors.next) goToSeason(neighbors.next)
          break
        case 'f':
          if (inSeason && selected) {
            const added = toggleFavorite(selected.number)
            toast({ icon: added ? '⭐' : '☆', title: added ? 'Added to favorites' : 'Removed from favorites', body: selected.title }, 2200)
          }
          break
        case 'v':
          if (inSeason) setViewMode(viewMode === 'page' ? 'web' : 'page')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, stage, neighbors, drawRock, viewMode, setViewMode])

  const countries = useMemo(() => new Set(seasons.map(s => s.country)).size, [seasons])
  const overlayPage = route.page === 'timeline' || route.page === 'champions' || route.page === 'quiz'
  const seasonPageOpen = stage === 'web' && selected !== null && viewMode === 'page'

  return (
    <div className={`app stage-${stage} route-${route.page}`}>
      <header className="app-header">
        <Logotype />
        <p className="header-tag">
          {selected
            ? `Season ${selected.number} — ${selected.title} · ${placeLabel(selected)}`
            : `${seasons.length} seasons · ${countries} countries · one world map — click a torch to begin`}
        </p>
      </header>

      <SeasonIndex
        open={indexOpen}
        seasons={seasons}
        logos={logos}
        selected={selected}
        visited={visited}
        favorites={favorites}
        onSelect={s => {
          setIndexOpen(false)
          goToSeason(s)
        }}
        onToggle={() => setIndexOpen(o => !o)}
      />

      <div className="map-stage">
        <SurvivorMap
          seasons={seasons}
          logos={logos}
          selected={selected}
          visited={visited}
          instant={stage === 'web'}
          onSelect={goToSeason}
          onArrived={handleArrived}
        />
        <div className="map-vignette" />
      </div>

      {/* embers sit below opaque full-screen pages — skip the rAF loop there */}
      {!seasonPageOpen && !overlayPage && <Embers />}
      <SparkBurst />

      {wiping && <FlameWipe onDone={() => setWiping(false)} />}

      {stage === 'flying' && selected && (
        <div className="flying-banner">
          <span className="torch-spinner">🔥</span> Traveling to {placeLabel(selected)}…
        </div>
      )}
      {missingSeason && !discoveryDone && (
        <div className="flying-banner">
          <span className="torch-spinner">🔥</span> Searching the wiki for Season {wantedNumber}…
        </div>
      )}

      {seasonPageOpen && (
        <SeasonPage
          key={selected.number}
          season={selected}
          prev={neighbors.prev}
          next={neighbors.next}
          logos={logos}
          autoScrollSlug={pendingSlug}
          onAutoScrolled={() => setPendingSlug(null)}
          onNavigate={goToSeason}
          onSwitchToWeb={() => setViewMode('web')}
          onClose={closeSeason}
        />
      )}

      {stage === 'web' && selected && viewMode === 'web' && (
        <SeasonWeb
          season={selected}
          prev={neighbors.prev}
          next={neighbors.next}
          activeNode={activeNode}
          autoOpenSlug={pendingSlug}
          onAutoOpened={() => setPendingSlug(null)}
          onNodeClick={setActiveNode}
          onNavigate={goToSeason}
          onSwitchToPage={() => setViewMode('page')}
          onClose={closeSeason}
        />
      )}

      {stage === 'web' && selected && viewMode === 'web' && activeNode && (
        <DetailPanel season={selected} node={activeNode} onClose={() => setActiveNode(null)} />
      )}

      <Suspense
        fallback={
          <div className="page-loading">
            <span className="css-flame"><i /><i /><i /></span>
          </div>
        }
      >
        {route.page === 'timeline' && (
          <TimelinePage seasons={seasons} logos={logos} visited={visited} favorites={favorites} onSelect={goToSeason} />
        )}
        {route.page === 'champions' && <ChampionsPage seasons={seasons} onSelect={goToSeason} />}
        {route.page === 'quiz' && <QuizPage seasons={seasons} logos={logos} onSelect={goToSeason} />}
      </Suspense>

      {stage === 'world' && !missingSeason && (
        <Dock
          route={route}
          explored={seasons.filter(s => visited.has(s.number)).length}
          total={seasons.length}
          onSearch={() => setSearchOpen(true)}
          onRandom={drawRock}
          onIndex={() => setIndexOpen(true)}
        />
      )}

      <footer className="app-footer">
        Fan project · Data & images from the{' '}
        <a href="https://survivor.fandom.com" target="_blank" rel="noopener noreferrer">
          Survivor Wiki
        </a>{' '}
        (CC-BY-SA) · Not affiliated with CBS ·{' '}
        <button className="footer-help" onClick={() => setHelpOpen(true)}>
          Shortcuts <kbd>?</kbd>
        </button>
      </footer>

      {searchOpen && (
        <CommandPalette
          seasons={seasons}
          logos={logos}
          onClose={() => setSearchOpen(false)}
          onRandom={drawRock}
          onHelp={() => setHelpOpen(true)}
        />
      )}
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {rock && (
        <RockDraw
          season={rock}
          onDone={() => {
            const target = rock
            setRock(null)
            goToSeason(target)
          }}
        />
      )}
      <WikiPeek />
      <Toasts />
      {intro && <IntroSplash seasons={seasons.length} onDone={closeIntro} />}
    </div>
  )
}
