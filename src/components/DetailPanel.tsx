import { useEffect, useState } from 'react'
import type { Season } from '../data/seasons'
import { WIKI_BASE } from '../data/seasons'
import {
  getGalleryImages, getOverviewHtml, getPageImage, getSectionHtml,
} from '../lib/fandom'
import type { GalleryImage } from '../lib/fandom'
import type { WebNode } from './SeasonWeb'

interface Props {
  season: Season
  node: WebNode
  onClose: () => void
}

type PanelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'html'; html: string; heroImage?: string }
  | { status: 'gallery'; images: GalleryImage[] }

function videoSearches(season: Season): { label: string; query: string }[] {
  const name = season.wikiPage
  return [
    { label: 'Season intro', query: `${name} intro` },
    { label: 'Best moments', query: `${name} best moments` },
    { label: 'Final Tribal Council', query: `${name} final tribal council` },
    { label: `${season.winner} wins`, query: `Survivor ${season.winner} winning moment` },
    { label: 'Blindsides', query: `${name} blindside` },
    { label: 'Challenges', query: `${name} immunity challenge` },
  ]
}

export default function DetailPanel({ season, node, onClose }: Props) {
  const [state, setState] = useState<PanelState>({ status: 'loading' })

  useEffect(() => {
    if (node.kind === 'videos') return // static content
    let cancelled = false
    setState({ status: 'loading' })

    const load = async (): Promise<PanelState> => {
      switch (node.kind) {
        case 'overview': {
          const html = await getOverviewHtml(season.wikiPage)
          return { status: 'html', html }
        }
        case 'section': {
          const html = await getSectionHtml(season.wikiPage, node.sectionIndex)
          return { status: 'html', html }
        }
        case 'winner': {
          const [html, img] = await Promise.all([
            getSectionHtml(season.winnerPage, '0'),
            getPageImage(season.winnerPage).catch(() => ({}) as { thumbnail?: string }),
          ])
          return { status: 'html', html, heroImage: img.thumbnail }
        }
        case 'gallery': {
          const images = await getGalleryImages(season.wikiPage)
          return { status: 'gallery', images }
        }
        default:
          return { status: 'error', message: 'Unknown content type' }
      }
    }

    load()
      .then(s => !cancelled && setState(s))
      .catch(e => !cancelled && setState({ status: 'error', message: String(e) }))
    return () => {
      cancelled = true
    }
  }, [season, node])

  return (
    <aside className="detail-panel">
      <header className="detail-header">
        <div>
          <span className="detail-kicker">
            Survivor: {season.title} · S{season.number}
          </span>
          <h2>
            {node.icon} {node.label}
          </h2>
        </div>
        <button className="detail-close" onClick={onClose} title="Close panel">
          ✕
        </button>
      </header>

      <div className="detail-body">
        {node.kind === 'videos' ? (
          <VideoPanel season={season} />
        ) : state.status === 'loading' ? (
          <div className="detail-loading">
            <div className="torch-spinner">🔥</div>
            <p>Gathering intel from the Survivor Wiki…</p>
          </div>
        ) : state.status === 'error' ? (
          <div className="detail-error">
            <p>The tribe has spoken — this content couldn’t be loaded.</p>
            <p className="detail-error-msg">{state.message}</p>
            <a
              href={`${WIKI_BASE}/wiki/${encodeURIComponent(season.wikiPage.replace(/ /g, '_'))}`}
              target="_blank" rel="noopener noreferrer" className="btn-themed"
            >
              Read it on the Survivor Wiki ↗
            </a>
          </div>
        ) : state.status === 'gallery' ? (
          <div className="gallery-grid">
            {state.images.length === 0 && <p>No photos found for this season.</p>}
            {state.images.map(img => (
              <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="gallery-item">
                <img src={img.thumbUrl} alt={img.title} loading="lazy" />
                <span>{img.title}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="wiki-content">
            {state.heroImage && (
              <img className="detail-hero" src={state.heroImage} alt={node.label} />
            )}
            <div dangerouslySetInnerHTML={{ __html: state.html }} />
            <p className="wiki-credit">
              Content from the{' '}
              <a
                href={`${WIKI_BASE}/wiki/${encodeURIComponent(
                  (node.kind === 'winner' ? season.winnerPage : season.wikiPage).replace(/ /g, '_'),
                )}`}
                target="_blank" rel="noopener noreferrer"
              >
                Survivor Wiki
              </a>{' '}
              (CC-BY-SA)
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

function VideoPanel({ season }: { season: Season }) {
  const searches = videoSearches(season)

  return (
    <div className="video-panel">
      <p className="video-hint">
        Hand-picked video hunts for this season — each opens the matching reel on YouTube:
      </p>
      <div className="video-grid">
        {searches.map(v => (
          <a
            key={v.query}
            className="video-card"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
            target="_blank" rel="noopener noreferrer"
          >
            <span className="video-card-play">▶</span>
            <span className="video-card-label">{v.label}</span>
            <span className="video-card-out">↗</span>
          </a>
        ))}
      </div>
      <p className="video-hint video-note">
        Tip: full episodes stream on Paramount+ — the reels above cover intros, blindsides and
        Final Tribal moments.
      </p>
    </div>
  )
}
