import { useEffect, useMemo, useState } from 'react'
import type { Season } from '../data/seasons'
import { SEASONS, WIKI_BASE } from '../data/seasons'
import { getPageImage, getSections } from '../lib/fandom'
import type { WikiSection } from '../lib/fandom'

export type WebNode =
  | { kind: 'overview'; label: string; icon: string }
  | { kind: 'section'; label: string; icon: string; sectionIndex: string }
  | { kind: 'winner'; label: string; icon: string }
  | { kind: 'gallery'; label: string; icon: string }
  | { kind: 'videos'; label: string; icon: string }
  | { kind: 'wiki'; label: string; icon: string }

/** URL-safe identifier for a node, used in deep links (#/s/28/castaways). */
export function nodeSlug(node: WebNode): string {
  return node.kind === 'section'
    ? node.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : node.kind
}

interface Props {
  season: Season
  activeNode: WebNode | null
  /** deep-link node slug to open automatically once nodes are known */
  autoOpenSlug?: string | null
  onAutoOpened?: () => void
  onNodeClick: (node: WebNode) => void
  onNavigate: (season: Season) => void
  onClose: () => void
}

const SECTION_META: { match: RegExp; label: string; icon: string }[] = [
  { match: /castaway/i, label: 'Castaways', icon: '🏝️' },
  { match: /season summary|summary/i, label: 'The Story', icon: '📖' },
  { match: /episode/i, label: 'Episodes', icon: '🎬' },
  { match: /voting history/i, label: 'Voting History', icon: '🗳️' },
  { match: /trivia/i, label: 'Trivia & Facts', icon: '💡' },
  { match: /twist/i, label: 'Twists', icon: '🌀' },
  { match: /production/i, label: 'Production', icon: '🎥' },
  { match: /format/i, label: 'Format', icon: '⚙️' },
]

function nodesFromSections(sections: WikiSection[]): WebNode[] {
  const nodes: WebNode[] = []
  for (const meta of SECTION_META) {
    const sec = sections.find(s => meta.match.test(s.line))
    if (sec) nodes.push({ kind: 'section', label: meta.label, icon: meta.icon, sectionIndex: sec.index })
  }
  return nodes
}

export default function SeasonWeb({
  season, activeNode, autoOpenSlug, onAutoOpened, onNodeClick, onNavigate, onClose,
}: Props) {
  const [logo, setLogo] = useState<string | null>(null)
  const [logoFallback, setLogoFallback] = useState<string | null>(null)
  const [sections, setSections] = useState<WikiSection[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLogo(null)
    setLogoFallback(null)
    setSections([])
    setLoaded(false)
    Promise.allSettled([getPageImage(season.wikiPage), getSections(season.wikiPage)]).then(
      ([img, secs]) => {
        if (cancelled) return
        if (img.status === 'fulfilled') {
          setLogo(img.value.thumbnail ?? img.value.original ?? null)
          setLogoFallback(img.value.original ?? null)
        }
        if (secs.status === 'fulfilled') setSections(secs.value)
        setLoaded(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [season])

  const handleLogoError = () => {
    // thumbnail 404s happen on some wiki images — retry the original, then give up
    if (logoFallback && logo !== logoFallback) setLogo(logoFallback)
    else setLogo(null)
  }

  const nodes = useMemo<WebNode[]>(() => {
    const base: WebNode[] = [{ kind: 'overview', label: 'Overview', icon: '🧭' }]
    base.push(...nodesFromSections(sections))
    base.push(
      { kind: 'winner', label: `Winner: ${season.winner}`, icon: '🏆' },
      { kind: 'gallery', label: 'Photo Gallery', icon: '🖼️' },
      { kind: 'videos', label: 'Videos', icon: '📺' },
      { kind: 'wiki', label: 'Full Wiki Page', icon: '🔗' },
    )
    return base
  }, [sections, season])

  useEffect(() => {
    if (!autoOpenSlug || !loaded) return
    const match = nodes.find(n => nodeSlug(n) === autoOpenSlug)
    if (match && match.kind !== 'wiki') onNodeClick(match)
    onAutoOpened?.()
  }, [autoOpenSlug, loaded, nodes, onNodeClick, onAutoOpened])

  const positioned = useMemo(() => {
    const n = nodes.length
    return nodes.map((node, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      // percentage offsets from center; ellipse wider than tall
      const x = 50 + 38 * Math.cos(angle)
      const y = 50 + 36 * Math.sin(angle)
      return { node, x, y, delay: 0.35 + i * 0.06 }
    })
  }, [nodes])

  return (
    <div className={`web-overlay ${loaded ? 'web-loaded' : ''}`}>
      <button className="web-close" onClick={onClose} title="Back to world map">
        ✕ <span>Back to the map</span>
      </button>

      {(() => {
        const prev = SEASONS.find(s => s.number === season.number - 1)
        const next = SEASONS.find(s => s.number === season.number + 1)
        return (
          <>
            {prev && (
              <button className="web-nav web-nav-prev" onClick={() => onNavigate(prev)} title={`Survivor: ${prev.title}`}>
                ◀ <span>S{prev.number}</span>
              </button>
            )}
            {next && (
              <button className="web-nav web-nav-next" onClick={() => onNavigate(next)} title={`Survivor: ${next.title}`}>
                <span>S{next.number}</span> ▶
              </button>
            )}
          </>
        )
      })()}

      <svg className="web-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {positioned.map(({ x, y }, i) => (
          <line
            key={i}
            x1="50" y1="50" x2={x} y2={y}
            className="web-line"
            style={{ animationDelay: `${0.3 + i * 0.05}s` }}
          />
        ))}
      </svg>

      <div className="web-center">
        {logo ? (
          <img
            src={logo}
            alt={`Survivor: ${season.title} logo`}
            className="web-logo"
            referrerPolicy="no-referrer"
            onError={handleLogoError}
          />
        ) : (
          <div className="web-logo web-logo-fallback">
            <span>SURVIVOR</span>
            <strong>{season.title}</strong>
          </div>
        )}
        <div className="web-center-caption">
          <h2>
            Season {season.number} · {season.year}
          </h2>
          <p>
            {season.location}, {season.country}
          </p>
          <p className="web-tagline">{season.tagline}</p>
        </div>
      </div>

      {positioned.map(({ node, x, y, delay }) => {
        const isActive =
          activeNode &&
          activeNode.kind === node.kind &&
          (node.kind !== 'section' ||
            (activeNode as Extract<WebNode, { kind: 'section' }>).sectionIndex === node.sectionIndex)
        if (node.kind === 'wiki') {
          return (
            <a
              key={node.label}
              className="web-node"
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }}
              href={`${WIKI_BASE}/wiki/${encodeURIComponent(season.wikiPage.replace(/ /g, '_'))}`}
              target="_blank" rel="noopener noreferrer"
            >
              <span className="web-node-icon">{node.icon}</span>
              <span className="web-node-label">{node.label}</span>
            </a>
          )
        }
        return (
          <button
            key={node.label}
            className={`web-node ${isActive ? 'web-node-active' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }}
            onClick={() => onNodeClick(node)}
          >
            <span className="web-node-icon">{node.icon}</span>
            <span className="web-node-label">{node.label}</span>
          </button>
        )
      })}
    </div>
  )
}
