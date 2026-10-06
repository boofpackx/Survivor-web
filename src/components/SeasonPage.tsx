import { useEffect, useMemo, useRef, useState } from 'react'
import type { Season } from '../data/seasons'
import { eraOf, placeLabel, seasonName, winnerLabel } from '../data/seasons'
import {
  getGalleryImages, getOverviewHtml, getPageImage, getSeasonFacts, getSectionHtml, getSections,
  parseCastaways, scaledImage, wikiUrl,
} from '../lib/fandom'
import type { Castaway, GalleryImage, SeasonFacts, WikiSection } from '../lib/fandom'
import { routeUrl } from '../lib/router'
import { useStore } from '../lib/store'
import { openPeek, toast } from '../lib/toast'
import { favoritesStore, toggleFavorite } from '../lib/userData'
import Ambience from './Ambience'
import { CastGrid, GalleryGrid, VideoGrid } from './ContentBlocks'
import CountUp from './CountUp'
import Horizon from './Horizon'
import WikiBlock from './WikiBlock'
import '../styles/season-page.css'

interface Props {
  season: Season
  prev: Season | null
  next: Season | null
  logos: Record<string, string>
  /** deep-link section to scroll to once known */
  autoScrollSlug?: string | null
  onAutoScrolled?: () => void
  onNavigate: (season: Season) => void
  onSwitchToWeb: () => void
  onClose: () => void
}

interface SectionDef {
  id: string
  label: string
  icon: string
  kind: 'overview' | 'wiki' | 'cast' | 'gallery' | 'videos'
  sectionIndex?: string
}

/** map deep-link node slugs (shared with the web view) onto page section ids */
const SLUG_TO_SECTION: Record<string, string> = {
  'overview': 'story', 'the-story': 'story', 'castaways': 'castaways', 'episodes': 'episodes',
  'format': 'format', 'twists': 'twists', 'production': 'production',
  'voting-history': 'voting', 'trivia-facts': 'trivia',
  'winner': 'castaways', 'gallery': 'gallery', 'videos': 'videos',
}

const SECTION_TO_SLUG: Record<string, string> = {
  story: 'the-story', castaways: 'castaways', episodes: 'episodes', format: 'format', twists: 'twists',
  production: 'production', voting: 'voting-history', trivia: 'trivia-facts', gallery: 'gallery', videos: 'videos',
}

const SECTION_ORDER: { match: RegExp; id: string; label: string; icon: string }[] = [
  { match: /season summary|summary/i, id: 'story', label: 'The Story', icon: '📖' },
  { match: /castaway/i, id: 'castaways', label: 'The Castaways', icon: '🏝️' },
  { match: /episode/i, id: 'episodes', label: 'Episode Guide', icon: '🎬' },
  { match: /format/i, id: 'format', label: 'Format', icon: '⚙️' },
  { match: /twist/i, id: 'twists', label: 'Twists', icon: '🌀' },
  { match: /voting history/i, id: 'voting', label: 'Voting History', icon: '🗳️' },
  { match: /trivia/i, id: 'trivia', label: 'Trivia & Facts', icon: '💡' },
  { match: /production/i, id: 'production', label: 'Production', icon: '🎥' },
]

export default function SeasonPage({
  season, prev, next, logos, autoScrollSlug, onAutoScrolled, onNavigate, onSwitchToWeb, onClose,
}: Props) {
  const [logo, setLogo] = useState<string | null>(null)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [heroImg, setHeroImg] = useState<string | null>(null)
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [sections, setSections] = useState<WikiSection[] | null>(null)
  const [facts, setFacts] = useState<SeasonFacts | null | 'error'>(null)
  /** sections at index <= revealUpTo skip lazy-loading (scroll targets need real heights) */
  const [revealUpTo, setRevealUpTo] = useState(-1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showTop, setShowTop] = useState(false)
  const favorites = useStore(favoritesStore)
  const isFav = favorites.has(season.number)
  const era = eraOf(season.number)

  const pageRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const anchorCancelRef = useRef<(() => void) | null>(null)

  /**
   * Scrolling to a section races against lazy content expanding above it, so a
   * one-shot scrollIntoView lands wrong. Instead: force-load every section up
   * to the target, then keep re-anchoring until layout settles (or the user
   * takes over scrolling).
   */
  const anchorToSection = (id: string, targetIndex: number) => {
    anchorCancelRef.current?.()
    setRevealUpTo(prev => Math.max(prev, targetIndex))

    const page = pageRef.current
    if (!page) return
    let cancelled = false
    let stable = 0
    let first = true
    const cancel = () => {
      cancelled = true
      page.removeEventListener('wheel', cancel)
      page.removeEventListener('touchstart', cancel)
    }
    anchorCancelRef.current = cancel
    page.addEventListener('wheel', cancel, { passive: true, once: true })
    page.addEventListener('touchstart', cancel, { passive: true, once: true })

    const started = performance.now()
    const tick = () => {
      if (cancelled || !pageRef.current) return
      const el = pageRef.current.querySelector<HTMLElement>(`#sp-${id}`)
      if (el) {
        el.classList.add('sp-in')
        const top = el.getBoundingClientRect().top
        if (Math.abs(top - 64) > 40) {
          el.scrollIntoView({ behavior: first ? 'smooth' : 'auto', block: 'start' })
          first = false
          stable = 0
        } else {
          stable++
        }
      }
      if (stable < 3 && performance.now() - started < 6000) setTimeout(tick, 350)
      else cancel()
    }
    setTimeout(tick, 120)
  }

  useEffect(() => {
    let cancelled = false
    getPageImage(season.wikiPage)
      .then(img => !cancelled && setLogo(img.thumbnail ?? img.original ?? null))
      .catch(() => {})
    getSections(season.wikiPage)
      .then(secs => !cancelled && setSections(secs))
      .catch(() => !cancelled && setSections([]))
    getSeasonFacts(season.wikiPage)
      .then(f => !cancelled && setFacts(f))
      .catch(() => !cancelled && setFacts('error'))
    getGalleryImages(season.wikiPage)
      .then(imgs => {
        if (cancelled) return
        // widest landscape photo that isn't a logo makes the best hero banner;
        // a 1400px thumb loads far faster than the multi-MB original
        const hero = imgs.find(i => !/logo/i.test(i.title)) ?? imgs[0]
        if (hero) setHeroImg(scaledImage(hero, 1400))
      })
      .catch(() => {})
    return () => {
      cancelled = true
      anchorCancelRef.current?.()
    }
  }, [season.wikiPage])

  const defs = useMemo<SectionDef[] | null>(() => {
    if (sections === null) return null
    const out: SectionDef[] = []
    const used = new Set<string>()
    for (const meta of SECTION_ORDER) {
      const sec = sections.find(s => meta.match.test(s.line) && !used.has(s.index))
      if (sec) {
        used.add(sec.index)
        out.push({
          id: meta.id, label: meta.label, icon: meta.icon,
          kind: meta.id === 'castaways' ? 'cast' : 'wiki',
          sectionIndex: sec.index,
        })
      }
    }
    if (!out.some(d => d.id === 'story')) {
      out.unshift({ id: 'story', label: 'The Story', icon: '📖', kind: 'overview' })
    }
    out.push(
      { id: 'gallery', label: 'Photo Gallery', icon: '🖼️', kind: 'gallery' },
      { id: 'videos', label: 'Videos', icon: '📺', kind: 'videos' },
    )
    return out
  }, [sections])

  // deep-link scroll once sections are known
  useEffect(() => {
    if (!autoScrollSlug || defs === null) return
    const target = SLUG_TO_SECTION[autoScrollSlug]
    if (target) {
      const idx = defs.findIndex(d => d.id === target)
      if (idx >= 0) anchorToSection(target, idx)
    }
    onAutoScrolled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScrollSlug, defs, onAutoScrolled])

  // scroll-linked effects: reading progress fuse, hero parallax, back-to-top
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    let raf = 0
    const update = () => {
      raf = 0
      const max = page.scrollHeight - page.clientHeight
      const y = page.scrollTop
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`
      page.style.setProperty('--scroll', String(Math.min(y, 900)))
      setShowTop(y > 700)
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

  // reveal sections as they scroll in + track which one is being read
  useEffect(() => {
    const page = pageRef.current
    if (!page || !defs) return
    const els = Array.from(page.querySelectorAll<HTMLElement>('.sp-section'))
    const reveal = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('sp-in')
            reveal.unobserve(e.target)
          }
        }
      },
      { root: page, rootMargin: '0px 0px -8% 0px', threshold: 0.02 },
    )
    const spy = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id.replace(/^sp-/, ''))
        }
      },
      { root: page, rootMargin: '-25% 0px -65% 0px' },
    )
    els.forEach(el => {
      reveal.observe(el)
      spy.observe(el)
    })
    return () => {
      reveal.disconnect()
      spy.disconnect()
    }
  }, [defs])

  // keep the active nav pill in view on narrow screens
  useEffect(() => {
    const nav = navRef.current
    const btn = nav?.querySelector<HTMLElement>('.sp-nav-active')
    if (!nav || !btn) return
    const left = btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2
    nav.scrollTo({ left, behavior: 'smooth' })
  }, [activeId])

  const share = async () => {
    const url = routeUrl({ page: 'season', number: season.number, slug: activeId ? SECTION_TO_SLUG[activeId] ?? null : null })
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: `${seasonName(season)} — Survivor Atlas`, url })
      } catch { /* dismissed */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast({ icon: '🔗', title: 'Link copied', body: 'Paste it anywhere — it opens right on this season.' }, 2600)
    } catch {
      toast({ icon: '🔗', title: 'Share this link', body: url }, 6000)
    }
  }

  const favorite = () => {
    const added = toggleFavorite(season.number)
    toast({ icon: added ? '⭐' : '☆', title: added ? 'Added to favorites' : 'Removed from favorites', body: season.title }, 2200)
  }

  const motifs = season.theme.motifs.split(' ')
  const factsReady = facts !== null && facts !== 'error' ? facts : null
  const stats = factsReady
    ? ([
        ['Days', factsReady.days, '☀️'],
        ['Castaways', factsReady.castaways, '🏝️'],
        ['Episodes', factsReady.episodes, '📺'],
        ['Tribes', factsReady.tribes.length || null, '🔥'],
      ] as [string, number | null, string][]).filter(([, v]) => v)
    : []

  return (
    <div className={`season-page ${heroLoaded ? 'sp-hero-ready' : ''}`} ref={pageRef}>
      <div className="sp-progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>
      <div className="sp-texture" aria-hidden="true" />
      <Ambience texture={season.theme.texture} accent={season.theme.accent} primary={season.theme.primary} />
      <div className="sp-motifs" aria-hidden="true">
        {motifs.map((m, i) => (
          <span key={i} className={`sp-motif sp-motif-${i}`}>{m}</span>
        ))}
      </div>

      {/* hero */}
      <header className="sp-hero">
        {heroImg && (
          <img
            className="sp-hero-photo" src={heroImg} alt="" referrerPolicy="no-referrer" loading="eager"
            onLoad={() => setHeroLoaded(true)}
            onError={() => setHeroImg(null)}
          />
        )}
        <div className="sp-hero-scrim" />
        <span className="sp-hero-number" aria-hidden="true">{season.number}</span>
        <div className="sp-hero-content">
          <div className="sp-badges">
            <span className="sp-era">{era.icon} {era.name}</span>
            {season.status === 'airing' && <span className="badge badge-live">On the air</span>}
            {season.status === 'upcoming' && <span className="badge badge-soon">Coming soon</span>}
            {season.discovered && <span className="sp-fresh" title="Added automatically from the Survivor Wiki">✨ Fresh from the wiki</span>}
          </div>
          {logo && (
            <img
              className="sp-logo" src={logo} alt={`${seasonName(season)} logo`}
              referrerPolicy="no-referrer"
              style={logoLoaded ? undefined : { display: 'none' }}
              onLoad={() => setLogoLoaded(true)}
              onError={() => setLogo(null)}
            />
          )}
          {!logoLoaded && (
            <h1 className="sp-title">
              <span>SURVIVOR</span>
              {season.title}
            </h1>
          )}
          <p className="sp-tagline">“{season.tagline}”</p>
          <div className="sp-facts">
            <span>Season {season.number}</span>
            <span>{season.year}</span>
            <span>📍 {placeLabel(season)}</span>
            {season.winnerPage ? (
              <button
                className="sp-fact-winner"
                onClick={() => openPeek({ page: season.winnerPage, name: season.winner })}
                title="Read the winner's story"
              >
                🏆 {season.winner}
              </button>
            ) : (
              <span className="sp-fact-winner">🏆 {winnerLabel(season)}</span>
            )}
            {factsReady && factsReady.runnersUp.length > 0 && (
              <span className="sp-fact-runner">🥈 {factsReady.runnersUp.join(' & ')}</span>
            )}
          </div>

          {facts === null && (
            <div className="sp-stats sp-stats-loading" aria-hidden="true">
              {[0, 1, 2, 3].map(i => <span key={i} className="sp-stat skeleton-block" />)}
            </div>
          )}
          {stats.length > 0 && (
            <div className="sp-stats">
              {stats.map(([label, value, icon], i) => (
                <div key={label} className="sp-stat" style={{ '--i': i } as React.CSSProperties}>
                  <span className="sp-stat-icon" aria-hidden="true">{icon}</span>
                  <strong><CountUp value={value!} /></strong>
                  <small>{label}</small>
                </div>
              ))}
            </div>
          )}
          {factsReady && factsReady.tribes.length > 0 && (
            <div className="sp-buffs" aria-label="Tribes">
              {factsReady.tribes.map((tribe, i) => (
                <span key={tribe} className={`buff buff-${i % 6}`} style={{ '--i': i } as React.CSSProperties}>
                  {tribe}
                </span>
              ))}
            </div>
          )}
          {factsReady?.seasonRun && <p className="sp-aired">📺 Aired {factsReady.seasonRun}</p>}
        </div>
        <button className="sp-close" onClick={onClose} title="Back to the world map (Esc)" aria-label="Back to the world map">✕</button>
        <div className="sp-hero-actions">
          <button className="sp-action" onClick={onSwitchToWeb} title="Radial web view (V)">🕸️ <span>Web view</span></button>
          <button className={`sp-action ${isFav ? 'sp-action-on' : ''}`} onClick={favorite} aria-pressed={isFav} title="Favorite (F)">
            {isFav ? '★' : '☆'} <span>{isFav ? 'Favorited' : 'Favorite'}</span>
          </button>
          <button className="sp-action" onClick={share} title="Copy a link to this season">🔗 <span>Share</span></button>
          <a className="sp-action" href={wikiUrl(season.wikiPage)} target="_blank" rel="noopener noreferrer" title="Open on the Survivor Wiki">
            📖 <span>Wiki ↗</span>
          </a>
        </div>
        <Horizon mood={season.theme.mood} seed={season.number} />
      </header>

      {/* sticky section nav */}
      {defs !== null && (
        <nav className="sp-nav" ref={navRef} aria-label="Sections">
          {defs.map((d, i) => (
            <button
              key={d.id}
              className={activeId === d.id ? 'sp-nav-active' : undefined}
              aria-current={activeId === d.id ? 'true' : undefined}
              onClick={() => anchorToSection(d.id, i)}
            >
              <span aria-hidden="true">{d.icon}</span> {d.label}
            </button>
          ))}
        </nav>
      )}

      <main className="sp-body">
        {defs === null && (
          <div className="sp-section sp-in">
            <div className="skeleton-lines"><span /><span /><span /><span /></div>
          </div>
        )}
        {defs?.map((d, i) => (
          <LazySection
            key={d.id}
            def={d} season={season}
            forceVisible={i <= revealUpTo}
          />
        ))}

        <div className="sp-footer-nav">
          {prev ? <NeighborCard season={prev} logo={logos[prev.wikiPage]} dir="prev" onGo={onNavigate} /> : <span />}
          {next ? <NeighborCard season={next} logo={logos[next.wikiPage]} dir="next" onGo={onNavigate} /> : <span />}
        </div>
        <p className="sp-keyhint">Tip: use <kbd>←</kbd> <kbd>→</kbd> to hop between seasons · <kbd>Esc</kbd> returns to the map</p>
      </main>

      <button
        className={`sp-top ${showTop ? 'sp-top-on' : ''}`}
        onClick={() => pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
      >
        ↑
      </button>
    </div>
  )
}

function NeighborCard({ season, logo, dir, onGo }: {
  season: Season
  logo?: string
  dir: 'prev' | 'next'
  onGo: (s: Season) => void
}) {
  return (
    <button
      className={`sp-neighbor sp-neighbor-${dir}`}
      onClick={() => onGo(season)}
      style={{
        '--n-primary': season.theme.primary,
        '--n-accent': season.theme.accent,
        '--n-bg': season.theme.bg2,
      } as React.CSSProperties}
    >
      <span className="sp-neighbor-arrow" aria-hidden="true">{dir === 'prev' ? '◀' : '▶'}</span>
      <span className="sp-neighbor-logo">
        {logo ? <img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <b>{season.number}</b>}
      </span>
      <span className="sp-neighbor-text">
        <small>{dir === 'prev' ? 'Previous season' : 'Next season'}</small>
        <strong>S{season.number} · {season.title}</strong>
        <em>{season.country} · {season.year}</em>
      </span>
    </button>
  )
}

/* ---------- lazily loaded themed sections ---------- */

function LazySection({
  def, season, forceVisible,
}: {
  def: SectionDef
  season: Season
  forceVisible: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (forceVisible) setVisible(true)
  }, [forceVisible])

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      // the page itself is the scroll container — without it as root, the
      // 600px preload margin would be clipped away and never apply
      { root: el.closest('.season-page'), rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return (
    <section ref={ref} id={`sp-${def.id}`} className="sp-section" aria-labelledby={`sp-h-${def.id}`}>
      <span className="sp-corner sp-corner-tl" aria-hidden="true" />
      <span className="sp-corner sp-corner-tr" aria-hidden="true" />
      <span className="sp-corner sp-corner-bl" aria-hidden="true" />
      <span className="sp-corner sp-corner-br" aria-hidden="true" />
      <h2 className="sp-section-title" id={`sp-h-${def.id}`}>
        <span className="sp-section-icon" aria-hidden="true">{def.icon}</span>
        <span className="sp-section-label">{def.label}</span>
        <span className="sp-section-rule" aria-hidden="true" />
      </h2>
      {visible ? <SectionBody def={def} season={season} /> : (
        <div className="skeleton-lines" aria-hidden="true"><span /><span /><span /></div>
      )}
    </section>
  )
}

function SectionBody({ def, season }: { def: SectionDef; season: Season }) {
  type BodyState =
    | { s: 'loading' }
    | { s: 'error' }
    | { s: 'html'; html: string }
    | { s: 'cast'; cards: Castaway[]; rawHtml: string }
    | { s: 'gallery'; images: GalleryImage[] }
    | { s: 'videos' }
  const [state, setState] = useState<BodyState>(def.kind === 'videos' ? { s: 'videos' } : { s: 'loading' })
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    if (def.kind === 'videos') return
    let cancelled = false
    const load = async (): Promise<BodyState> => {
      switch (def.kind) {
        case 'overview':
          return { s: 'html', html: await getOverviewHtml(season.wikiPage) }
        case 'wiki':
          return { s: 'html', html: await getSectionHtml(season.wikiPage, def.sectionIndex!) }
        case 'cast': {
          const html = await getSectionHtml(season.wikiPage, def.sectionIndex!)
          const cards = parseCastaways(html)
          return cards.length >= 6 ? { s: 'cast', cards, rawHtml: html } : { s: 'html', html }
        }
        case 'gallery':
          return { s: 'gallery', images: await getGalleryImages(season.wikiPage) }
        default:
          return { s: 'error' }
      }
    }
    load().then(st => !cancelled && setState(st)).catch(() => !cancelled && setState({ s: 'error' }))
    return () => {
      cancelled = true
    }
  }, [def, season])

  if (state.s === 'loading') {
    return <div className="skeleton-lines" aria-label="Loading"><span /><span /><span /><span /></div>
  }
  if (state.s === 'error') {
    return (
      <p>
        Couldn’t load this — read it on the{' '}
        <a href={wikiUrl(season.wikiPage)} target="_blank" rel="noopener noreferrer">Survivor Wiki</a>.
      </p>
    )
  }
  if (state.s === 'cast' && !showRaw) {
    return (
      <div>
        <CastGrid cards={state.cards} season={season} />
        <button className="btn-themed btn-small" onClick={() => setShowRaw(true)}>
          View the full wiki table instead
        </button>
      </div>
    )
  }
  if (state.s === 'cast') return <WikiBlock html={state.rawHtml} page={season.wikiPage} />
  if (state.s === 'gallery') return <GalleryGrid images={state.images} />
  if (state.s === 'videos') return <VideoGrid season={season} />
  return <WikiBlock html={state.html} page={season.wikiPage} />
}
