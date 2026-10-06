import { useEffect, useState } from 'react'
import type { Season } from '../data/seasons'
import { seasonName, winnerLabel } from '../data/seasons'
import {
  getGalleryImages, getOverviewHtml, getPageImage, getSectionHtml, parseCastaways, wikiUrl,
} from '../lib/fandom'
import type { Castaway, GalleryImage } from '../lib/fandom'
import { CastGrid, GalleryGrid, VideoGrid } from './ContentBlocks'
import WikiBlock from './WikiBlock'
import type { WebNode } from './webNodes'

interface Props {
  season: Season
  node: WebNode
  onClose: () => void
}

type PanelState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'html'; html: string }
  | { status: 'winner'; html: string; heroImage: string | null }
  | { status: 'pending' }
  | { status: 'cast'; cards: Castaway[]; rawHtml: string }
  | { status: 'gallery'; images: GalleryImage[] }

export default function DetailPanel({ season, node, onClose }: Props) {
  const [state, setState] = useState<PanelState>({ status: 'loading' })
  const [showRawCast, setShowRawCast] = useState(false)

  useEffect(() => {
    setShowRawCast(false)
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
          if (/castaway/i.test(node.label)) {
            const cards = parseCastaways(html)
            if (cards.length >= 6) return { status: 'cast', cards, rawHtml: html }
          }
          return { status: 'html', html }
        }
        case 'winner': {
          if (!season.winnerPage) return { status: 'pending' }
          const [html, img] = await Promise.all([
            getSectionHtml(season.winnerPage, '0'),
            getPageImage(season.winnerPage).catch(() => ({}) as { thumbnail?: string }),
          ])
          return { status: 'winner', html, heroImage: img.thumbnail ?? null }
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
            {seasonName(season)} · S{season.number}
          </span>
          <h2>
            {node.icon} {node.label}
          </h2>
        </div>
        <button className="detail-close" onClick={onClose} title="Close panel" aria-label="Close panel">
          ✕
        </button>
      </header>

      <div className="detail-body">
        {node.kind === 'videos' ? (
          <div className="video-panel">
            <p className="video-hint">Hand-picked video hunts for this season — each opens the matching reel on YouTube:</p>
            <VideoGrid season={season} />
            <p className="video-hint video-note">
              Tip: full episodes stream on Paramount+ — the reels above cover intros, blindsides and Final Tribal moments.
            </p>
          </div>
        ) : state.status === 'loading' ? (
          <div className="skeleton-lines" aria-label="Loading">
            <span /><span /><span /><span /><span /><span />
          </div>
        ) : state.status === 'error' ? (
          <div className="detail-error">
            <p>The tribe has spoken — this content couldn’t be loaded.</p>
            <p className="detail-error-msg">{state.message}</p>
            <a href={wikiUrl(season.wikiPage)} target="_blank" rel="noopener noreferrer" className="btn-themed">
              Read it on the Survivor Wiki ↗
            </a>
          </div>
        ) : state.status === 'gallery' ? (
          <GalleryGrid images={state.images} />
        ) : state.status === 'cast' && !showRawCast ? (
          <div>
            <CastGrid cards={state.cards} season={season} />
            <button className="btn-themed btn-small" onClick={() => setShowRawCast(true)}>
              View the full wiki table instead
            </button>
          </div>
        ) : state.status === 'cast' ? (
          <WikiBlock html={state.rawHtml} page={season.wikiPage} />
        ) : state.status === 'pending' ? (
          <div className="crown-pending">
            <span className="css-flame"><i /><i /><i /></span>
            <h3>{winnerLabel(season)}</h3>
            <p>
              {season.status === 'upcoming'
                ? 'This season hasn’t premiered yet. Check back once the castaways hit the beach.'
                : 'This season is still on the air — the Sole Survivor will appear here the moment the wiki crowns them.'}
            </p>
          </div>
        ) : state.status === 'winner' ? (
          <div>
            <div className="winner-card">
              {state.heroImage && (
                <img className="winner-photo" src={state.heroImage} alt={season.winner} referrerPolicy="no-referrer" />
              )}
              <div className="winner-meta">
                <span className="winner-crown">🏆 SOLE SURVIVOR</span>
                <h3>{season.winner}</h3>
                <div className="winner-chips">
                  <span>Season {season.number}</span>
                  <span>{season.year}</span>
                  <span>{season.country}</span>
                </div>
                <p className="winner-tagline">“{season.tagline}”</p>
              </div>
            </div>
            <WikiBlock html={state.html} page={season.winnerPage} />
          </div>
        ) : (
          <WikiBlock html={state.html} page={season.wikiPage} />
        )}
      </div>
    </aside>
  )
}
