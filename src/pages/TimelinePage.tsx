import { useEffect, useMemo, useRef, useState } from 'react'
import type { Season } from '../data/seasons'
import { ERAS, eraOf, placeLabel, winnerLabel } from '../data/seasons'
import { useEscape } from '../lib/escape'
import { navigate } from '../lib/router'
import '../styles/pages.css'
import '../styles/timeline.css'

interface Props {
  seasons: Season[]
  logos: Record<string, string>
  visited: Set<number>
  favorites: Set<number>
  onSelect: (season: Season) => void
}

/** "The Journey" — every season along a torch-lit rope, era by era. */
export default function TimelinePage({ seasons, logos, visited, favorites, onSelect }: Props) {
  const pageRef = useRef<HTMLDivElement>(null)
  const [activeEra, setActiveEra] = useState(ERAS[0].id)
  useEscape(() => navigate({ page: 'map' }))

  const eras = useMemo(
    () => ERAS.map(era => ({ era, items: seasons.filter(s => eraOf(s.number).id === era.id) })).filter(e => e.items.length),
    [seasons],
  )
  const years = useMemo(() => {
    const ys = seasons.map(s => Number(s.year)).filter(Boolean)
    return { first: Math.min(...ys), last: Math.max(...ys) }
  }, [seasons])
  const countries = useMemo(() => new Set(seasons.map(s => s.country)).size, [seasons])

  // the fuse burns down the rope as you scroll
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    let raf = 0
    const update = () => {
      raf = 0
      const max = page.scrollHeight - page.clientHeight
      page.style.setProperty('--p', String(max > 0 ? page.scrollTop / max : 0))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    page.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      page.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // cards light up as they arrive; the era chips follow along
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    const reveal = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('tl-in')
            reveal.unobserve(e.target)
          }
        }
      },
      { root: page, rootMargin: '0px 0px -10% 0px' },
    )
    const spy = new IntersectionObserver(
      entries => {
        for (const e of entries) if (e.isIntersecting) setActiveEra(e.target.id.replace(/^era-/, ''))
      },
      { root: page, rootMargin: '-35% 0px -60% 0px' },
    )
    page.querySelectorAll('.tl-card, .tl-sign').forEach(el => reveal.observe(el))
    page.querySelectorAll('.tl-era').forEach(el => spy.observe(el))
    return () => {
      reveal.disconnect()
      spy.disconnect()
    }
  }, [eras])

  const jump = (id: string) => {
    pageRef.current?.querySelector(`#era-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  let side = 0
  return (
    <div className="page tl-page" ref={pageRef}>
      <div className="tl-sky" aria-hidden="true" />
      <button className="page-close" onClick={() => navigate({ page: 'map' })} aria-label="Back to the map">✕</button>

      <header className="page-head tl-head">
        <p className="page-kicker">📜 The Journey</p>
        <h1>
          {years.first}<span>–</span>{years.last}
        </h1>
        <p className="page-sub">
          {seasons.length} seasons · {years.last - years.first + 1} years · {countries} countries — follow the torches.
        </p>
      </header>
      <nav className="tl-eras" aria-label="Jump to era">
        {eras.map(({ era, items }) => (
          <button
            key={era.id}
            className={activeEra === era.id ? 'tl-era-chip tl-era-chip-on' : 'tl-era-chip'}
            onClick={() => jump(era.id)}
          >
            <span aria-hidden="true">{era.icon}</span> {era.name.replace(/^The /, '')}
            <small>{items.length}</small>
          </button>
        ))}
      </nav>

      <div className="tl-track">
        <div className="tl-rope" aria-hidden="true">
          <span className="tl-burn" />
          <span className="css-flame tl-flame"><i /><i /><i /></span>
        </div>

        {eras.map(({ era, items }) => (
          <section key={era.id} id={`era-${era.id}`} className="tl-era">
            <div className="tl-sign">
              <span className="tl-sign-icon" aria-hidden="true">{era.icon}</span>
              <h2>{era.name}</h2>
              <p className="tl-sign-range">
                Seasons {era.from}–{era.to ?? items[items.length - 1].number} · {items[0].year}–{items[items.length - 1].year}
              </p>
              <p className="tl-sign-blurb">{era.blurb}</p>
            </div>

            {items.map(s => {
              const logo = logos[s.wikiPage]
              const isLeft = side++ % 2 === 0
              return (
                <article
                  key={s.number}
                  className={`tl-card ${isLeft ? 'tl-left' : 'tl-right'} ${visited.has(s.number) ? 'tl-seen' : ''}`}
                  style={{
                    '--c1': s.theme.primary,
                    '--c2': s.theme.accent,
                    '--c3': s.theme.secondary,
                    '--cbg': s.theme.bg2,
                  } as React.CSSProperties}
                >
                  <span className="tl-node" aria-hidden="true">
                    <span className="tl-node-flame" />
                  </span>
                  <button className="tl-card-body" onClick={() => onSelect(s)}>
                    <span className="tl-logo">
                      {logo ? <img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <b>{s.number}</b>}
                    </span>
                    <span className="tl-text">
                      <span className="tl-meta">
                        Season {s.number} · {s.year}
                        {s.status === 'airing' && <span className="badge badge-live">Live</span>}
                        {s.status === 'upcoming' && <span className="badge badge-soon">Soon</span>}
                        {favorites.has(s.number) && <span className="tl-star" aria-label="favorite">★</span>}
                        {visited.has(s.number) && <span className="tl-check" title="Explored">✓</span>}
                      </span>
                      <strong className="tl-title">{s.title}</strong>
                      <span className="tl-place">📍 {placeLabel(s)}</span>
                      <span className="tl-winner">🏆 {winnerLabel(s)}</span>
                      <span className="tl-tagline">{s.tagline}</span>
                    </span>
                  </button>
                </article>
              )
            })}
          </section>
        ))}

        <div className="tl-end">
          <span className="css-flame"><i /><i /><i /></span>
          <p>The journey continues — new seasons appear here automatically.</p>
        </div>
      </div>
    </div>
  )
}
