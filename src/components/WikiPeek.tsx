import { useEffect, useRef, useState } from 'react'
import { getContestantBio, wikiUrl } from '../lib/fandom'
import { useEscape } from '../lib/escape'
import { navigate } from '../lib/router'
import { useSeasons } from '../lib/seasonStore'
import { useStore } from '../lib/store'
import type { PeekRequest } from '../lib/toast'
import { backPeek, closePeek, peekStore } from '../lib/toast'
import WikiBlock from './WikiBlock'

/** In-app reader for any wiki page — castaway bios, tribes, episodes. */
export default function WikiPeek() {
  const stack = useStore(peekStore)
  const req = stack[stack.length - 1]
  useEscape(closePeek, !!req)
  if (!req) return null
  return (
    <div className="peek-backdrop" data-modal="" onClick={closePeek}>
      <PeekCard key={req.page} req={req} canGoBack={stack.length > 1} />
    </div>
  )
}

function PeekCard({ req, canGoBack }: { req: PeekRequest; canGoBack: boolean }) {
  const [html, setHtml] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [image, setImage] = useState<string | null>(req.image ?? null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const seasons = useSeasons()
  const crowns = seasons.filter(s => s.winnerPage && s.winnerPage.toLowerCase() === req.page.toLowerCase())

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    let cancelled = false
    getContestantBio(req.page)
      .then(b => {
        if (cancelled) return
        setHtml(b.html)
        if (b.image) setImage(b.image)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [req.page])

  return (
    <article
      className="peek-card"
      role="dialog"
      aria-modal="true"
      aria-label={req.name ?? req.page}
      onClick={e => e.stopPropagation()}
    >
      <div className="peek-actions">
        {canGoBack && (
          <button className="peek-btn" onClick={backPeek}>← Back</button>
        )}
        <button ref={closeRef} className="peek-btn peek-close" onClick={closePeek} aria-label="Close">✕</button>
      </div>
      <header className="peek-head">
        {image ? (
          <img className="peek-photo" src={image} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="peek-photo peek-photo-empty">🏝️</div>
        )}
        <div className="peek-meta">
          <span className="peek-kicker">From the Survivor Wiki</span>
          <h3>{req.name && req.name.length < 60 ? req.name : req.page}</h3>
          {crowns.length > 0 && (
            <div className="peek-crowns">
              {crowns.map(s => (
                <button
                  key={s.number}
                  className="peek-crown"
                  onClick={() => {
                    closePeek()
                    navigate({ page: 'season', number: s.number, slug: null })
                  }}
                >
                  🏆 Sole Survivor · S{s.number} {s.title}
                </button>
              ))}
            </div>
          )}
          <a className="btn-themed btn-small" href={wikiUrl(req.page)} target="_blank" rel="noopener noreferrer">
            Full wiki page ↗
          </a>
        </div>
      </header>
      <div className="peek-body">
        {failed ? (
          <p className="peek-empty">Couldn’t load this page — try the wiki link above.</p>
        ) : html === null ? (
          <div className="skeleton-lines" aria-label="Loading">
            <span /><span /><span /><span />
          </div>
        ) : (
          <WikiBlock html={html} page={req.page} />
        )}
      </div>
    </article>
  )
}
