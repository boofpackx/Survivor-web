import { useEffect, useState } from 'react'
import type { Season } from '../data/seasons'
import { WIKI_BASE } from '../data/seasons'
import {
  getContestantBio, getGalleryImages, getOverviewHtml, getPageImage, getSectionHtml,
  parseCastaways,
} from '../lib/fandom'
import type { Castaway, GalleryImage } from '../lib/fandom'
import type { WebNode } from './SeasonWeb'

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
  | { status: 'cast'; cards: Castaway[]; rawHtml: string }
  | { status: 'gallery'; images: GalleryImage[] }

interface BioView {
  name: string
  page: string
  html: string | null
  image: string | null
}

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

function wikiUrl(page: string): string {
  return `${WIKI_BASE}/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`
}

export default function DetailPanel({ season, node, onClose }: Props) {
  const [state, setState] = useState<PanelState>({ status: 'loading' })
  const [bio, setBio] = useState<BioView | null>(null)
  const [showRawCast, setShowRawCast] = useState(false)

  useEffect(() => {
    setBio(null)
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

  const openBio = (c: Castaway) => {
    setBio({ name: c.name, page: c.page, html: null, image: c.photo })
    getContestantBio(c.page)
      .then(b => setBio(prev => (prev?.page === c.page ? { ...prev, html: b.html, image: b.image ?? prev.image } : prev)))
      .catch(() => setBio(prev => (prev?.page === c.page ? { ...prev, html: '' } : prev)))
  }

  return (
    <aside className="detail-panel">
      <header className="detail-header">
        <div>
          <span className="detail-kicker">
            Survivor: {season.title} · S{season.number}
          </span>
          <h2>
            {bio ? (
              <button className="bio-back" onClick={() => setBio(null)}>
                ← Back to {node.label}
              </button>
            ) : (
              <>
                {node.icon} {node.label}
              </>
            )}
          </h2>
        </div>
        <button className="detail-close" onClick={onClose} title="Close panel">
          ✕
        </button>
      </header>

      <div className="detail-body">
        {bio ? (
          <BioPanel bio={bio} />
        ) : node.kind === 'videos' ? (
          <VideoPanel season={season} />
        ) : state.status === 'loading' ? (
          <Loading />
        ) : state.status === 'error' ? (
          <div className="detail-error">
            <p>The tribe has spoken — this content couldn’t be loaded.</p>
            <p className="detail-error-msg">{state.message}</p>
            <a href={wikiUrl(season.wikiPage)} target="_blank" rel="noopener noreferrer" className="btn-themed">
              Read it on the Survivor Wiki ↗
            </a>
          </div>
        ) : state.status === 'gallery' ? (
          <div className="gallery-grid">
            {state.images.length === 0 && <p>No photos found for this season.</p>}
            {state.images.map(img => (
              <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="gallery-item">
                <img src={img.thumbUrl} alt={img.title} loading="lazy" referrerPolicy="no-referrer" />
                <span>{img.title}</span>
              </a>
            ))}
          </div>
        ) : state.status === 'cast' && !showRawCast ? (
          <div>
            <div className="cast-grid">
              {state.cards.map(c => (
                <button key={c.page} className="cast-card" onClick={() => openBio(c)}>
                  {c.photo ? (
                    <img src={c.photo} alt={c.name} loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="cast-noimg">🏝️</div>
                  )}
                  <strong>{c.name}</strong>
                  {c.finish && <em>{c.finish}</em>}
                  {c.meta && <span>{c.meta}</span>}
                </button>
              ))}
            </div>
            <button className="btn-themed btn-small" onClick={() => setShowRawCast(true)}>
              View the full wiki table instead
            </button>
          </div>
        ) : state.status === 'cast' ? (
          <WikiHtml html={state.rawHtml} creditPage={season.wikiPage} />
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
            <WikiHtml html={state.html} creditPage={season.winnerPage} />
          </div>
        ) : (
          <WikiHtml html={state.html} creditPage={season.wikiPage} />
        )}
      </div>
    </aside>
  )
}

function Loading() {
  return (
    <div className="detail-loading">
      <div className="torch-spinner">🔥</div>
      <p>The tribe is deliberating…</p>
    </div>
  )
}

function WikiHtml({ html, creditPage }: { html: string; creditPage: string }) {
  return (
    <div className="wiki-content">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <p className="wiki-credit">
        Content from the{' '}
        <a href={wikiUrl(creditPage)} target="_blank" rel="noopener noreferrer">
          Survivor Wiki
        </a>{' '}
        (CC-BY-SA)
      </p>
    </div>
  )
}

function BioPanel({ bio }: { bio: BioView }) {
  return (
    <div>
      <div className="winner-card">
        {bio.image && <img className="winner-photo" src={bio.image} alt={bio.name} referrerPolicy="no-referrer" />}
        <div className="winner-meta">
          <h3>{bio.name}</h3>
          <a className="btn-themed btn-small" href={wikiUrl(bio.page)} target="_blank" rel="noopener noreferrer">
            Full wiki profile ↗
          </a>
        </div>
      </div>
      {bio.html === null ? (
        <Loading />
      ) : bio.html === '' ? (
        <p>Couldn’t load this profile — try the wiki link above.</p>
      ) : (
        <WikiHtml html={bio.html} creditPage={bio.page} />
      )}
    </div>
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
