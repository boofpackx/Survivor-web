import { useState } from 'react'
import type { Season } from '../data/seasons'
import type { Castaway, GalleryImage } from '../lib/fandom'
import { openPeek } from '../lib/toast'
import Lightbox from './Lightbox'

/* ---------- castaways ---------- */

function finishKind(finish: string): string {
  if (/sole survivor/i.test(finish)) return 'cast-winner'
  if (/runner/i.test(finish)) return 'cast-runner'
  if (/evacuat|quit|removed/i.test(finish)) return 'cast-out'
  return ''
}

export function CastGrid({ cards, season }: { cards: Castaway[]; season: Season }) {
  const [winnerFirst, setWinnerFirst] = useState(false)
  const ordered = winnerFirst ? [...cards].reverse() : cards
  return (
    <div className="cast-block">
      <div className="cast-toolbar">
        <span>{cards.length} castaways</span>
        <button className="chip-toggle" onClick={() => setWinnerFirst(w => !w)} aria-pressed={winnerFirst}>
          {winnerFirst ? '⬆ Winner first' : '⬇ Boot order'}
        </button>
      </div>
      <div className="cast-grid">
        {ordered.map((c, i) => {
          const kind = finishKind(c.finish)
          const stillIn = !c.finish && season.status === 'airing'
          return (
            <button
              key={c.page}
              className={`cast-card ${kind}`}
              style={{ '--i': Math.min(i, 14) } as React.CSSProperties}
              onClick={() => openPeek({ page: c.page, name: c.name, image: c.photo })}
            >
              <span className="cast-photo">
                {c.photo ? (
                  <img src={c.photo} alt={c.name} loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <span className="cast-noimg">🏝️</span>
                )}
                {kind === 'cast-winner' && <span className="cast-crown" aria-hidden="true">👑</span>}
              </span>
              <strong>{c.name}</strong>
              {c.finish && <em>{c.finish}</em>}
              {stillIn && <em className="cast-alive">🔥 Still in the game</em>}
              {c.meta && <span>{c.meta}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- gallery ---------- */

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!images.length) return <p>No photos found for this season.</p>
  return (
    <>
      <div className="gallery-grid">
        {images.map((img, i) => (
          <button
            key={img.url}
            className={`gallery-item ${i % 7 === 0 ? 'gallery-feature' : ''}`}
            style={{ '--i': Math.min(i, 14) } as React.CSSProperties}
            onClick={() => setOpen(i)}
          >
            <img src={img.thumbUrl} alt={img.title} loading="lazy" referrerPolicy="no-referrer" />
            <span>{img.title}</span>
          </button>
        ))}
      </div>
      {open !== null && (
        <Lightbox images={images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

/* ---------- videos ---------- */

function videoSearches(season: Season): { label: string; icon: string; query: string }[] {
  const name = season.wikiPage
  const list = [
    { label: 'Season intro', icon: '🎬', query: `${name} intro` },
    { label: 'Best moments', icon: '⭐', query: `${name} best moments` },
    { label: 'Blindsides', icon: '😱', query: `${name} blindside` },
    { label: 'Challenges', icon: '💪', query: `${name} immunity challenge` },
    { label: 'Final Tribal Council', icon: '⚖️', query: `${name} final tribal council` },
  ]
  if (season.winner) {
    list.push({ label: `${season.winner} wins`, icon: '🏆', query: `Survivor ${season.winner} winning moment` })
  } else {
    list.push({ label: 'Latest episode recap', icon: '📺', query: `${name} episode recap` })
  }
  return list
}

export function VideoGrid({ season }: { season: Season }) {
  return (
    <div className="video-grid">
      {videoSearches(season).map((v, i) => (
        <a
          key={v.query}
          className="video-card"
          style={{ '--i': i } as React.CSSProperties}
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="video-card-play" aria-hidden="true">▶</span>
          <span className="video-card-label">
            <small>{v.icon} YouTube</small>
            {v.label}
          </span>
          <span className="video-card-out" aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  )
}
