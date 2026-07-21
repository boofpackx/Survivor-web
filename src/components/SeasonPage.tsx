import { useEffect, useMemo, useRef, useState } from 'react'
import type { Season } from '../data/seasons'
import { SEASONS, WIKI_BASE } from '../data/seasons'
import {
  getGalleryImages, getOverviewHtml, getPageImage, getSectionHtml, getSections,
  getContestantBio, parseCastaways,
} from '../lib/fandom'
import type { Castaway, GalleryImage, WikiSection } from '../lib/fandom'

interface Props {
  season: Season
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

/** map deep-link node slugs (from the web view) onto page section ids */
const SLUG_TO_SECTION: Record<string, string> = {
  'overview': 'story', 'the-story': 'story', 'castaways': 'castaways',
  'format': 'format', 'twists': 'twists', 'production': 'production',
  'voting-history': 'voting', 'trivia-facts': 'trivia',
  'winner': 'castaways', 'gallery': 'gallery', 'videos': 'videos',
}

const SECTION_ORDER: { match: RegExp; id: string; label: string; icon: string }[] = [
  { match: /season summary|summary/i, id: 'story', label: 'The Story', icon: '📖' },
  { match: /castaway/i, id: 'castaways', label: 'The Castaways', icon: '🏝️' },
  { match: /format/i, id: 'format', label: 'Format', icon: '⚙️' },
  { match: /twist/i, id: 'twists', label: 'Twists', icon: '🌀' },
  { match: /voting history/i, id: 'voting', label: 'Voting History', icon: '🗳️' },
  { match: /trivia/i, id: 'trivia', label: 'Trivia & Facts', icon: '💡' },
  { match: /production/i, id: 'production', label: 'Production', icon: '🎥' },
]

function wikiUrl(page: string): string {
  return `${WIKI_BASE}/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`
}

export default function SeasonPage({
  season, autoScrollSlug, onAutoScrolled, onNavigate, onSwitchToWeb, onClose,
}: Props) {
  const [logo, setLogo] = useState<string | null>(null)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [heroImg, setHeroImg] = useState<string | null>(null)
  const [sections, setSections] = useState<WikiSection[] | null>(null)
  const [bio, setBio] = useState<{ name: string; page: string; html: string | null; image: string | null } | null>(null)
  /** sections at index <= revealUpTo skip lazy-loading (scroll targets need real heights) */
  const [revealUpTo, setRevealUpTo] = useState(-1)
  const pageRef = useRef<HTMLDivElement>(null)
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
      const el = pageRef.current.querySelector(`#sp-${id}`)
      if (el) {
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
    setLogo(null)
    setLogoLoaded(false)
    setHeroImg(null)
    setSections(null)
    setBio(null)
    setRevealUpTo(-1)
    anchorCancelRef.current?.()
    pageRef.current?.scrollTo(0, 0)

    getPageImage(season.wikiPage)
      .then(img => !cancelled && setLogo(img.thumbnail ?? img.original ?? null))
      .catch(() => {})
    getSections(season.wikiPage)
      .then(secs => !cancelled && setSections(secs))
      .catch(() => !cancelled && setSections([]))
    getGalleryImages(season.wikiPage)
      .then(imgs => {
        if (cancelled) return
        // widest landscape photo that isn't a logo makes the best hero banner;
        // a 1400px thumb loads far faster than the multi-MB original
        const hero = imgs.find(i => !/logo/i.test(i.title)) ?? imgs[0]
        if (!hero) return
        const scaled = hero.thumbUrl.includes('/scale-to-width-down/')
          ? hero.thumbUrl.replace(/\/scale-to-width-down\/\d+/, '/scale-to-width-down/1400')
          : hero.url
        setHeroImg(scaled)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [season])

  const defs = useMemo<SectionDef[] | null>(() => {
    if (sections === null) return null
    const out: SectionDef[] = []
    for (const meta of SECTION_ORDER) {
      const sec = sections.find(s => meta.match.test(s.line))
      if (sec) {
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

  useEffect(() => {
    if (!bio) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBio(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bio])

  const openBio = (c: Castaway) => {
    setBio({ name: c.name, page: c.page, html: null, image: c.photo })
    getContestantBio(c.page)
      .then(b => setBio(prev => (prev?.page === c.page ? { ...prev, html: b.html, image: b.image ?? prev.image } : prev)))
      .catch(() => setBio(prev => (prev?.page === c.page ? { ...prev, html: '' } : prev)))
  }

  const prev = SEASONS.find(s => s.number === season.number - 1)
  const next = SEASONS.find(s => s.number === season.number + 1)
  const motifs = season.theme.motifs.split(' ')

  return (
    <div className="season-page" ref={pageRef}>
      <div className="sp-texture" aria-hidden="true" />
      <div className="sp-motifs" aria-hidden="true">
        {motifs.map((m, i) => (
          <span key={i} className={`sp-motif sp-motif-${i}`}>{m}</span>
        ))}
      </div>

      {/* hero */}
      <header className="sp-hero">
        {heroImg && (
          <img className="sp-hero-photo" src={heroImg} alt="" referrerPolicy="no-referrer" loading="eager" />
        )}
        <div className="sp-hero-scrim" />
        <span className="sp-hero-number" aria-hidden="true">{season.number}</span>
        <div className="sp-hero-content">
          {logo && (
            <img
              className="sp-logo" src={logo} alt={`Survivor: ${season.title} logo`}
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
            <span>{season.location}, {season.country}</span>
            <span className="sp-fact-winner">🏆 {season.winner}</span>
          </div>
        </div>
        <button className="sp-close" onClick={onClose} title="Back to the world map">✕</button>
        <div className="sp-hero-actions">
          <button className="btn-themed btn-small" onClick={onSwitchToWeb}>🕸️ Web view</button>
          <a className="btn-themed btn-small" href={wikiUrl(season.wikiPage)} target="_blank" rel="noopener noreferrer">
            Wiki ↗
          </a>
        </div>
      </header>

      {/* sticky section nav */}
      {defs !== null && (
        <nav className="sp-nav">
          {defs.map((d, i) => (
            <button key={d.id} onClick={() => anchorToSection(d.id, i)}>
              {d.icon} {d.label}
            </button>
          ))}
        </nav>
      )}

      <main className="sp-body">
        {defs === null && (
          <div className="detail-loading">
            <div className="torch-spinner">🔥</div>
            <p>Setting up camp…</p>
          </div>
        )}
        {defs?.map((d, i) => (
          <LazySection
            key={`${season.number}-${d.id}`}
            def={d} season={season} index={i}
            forceVisible={i <= revealUpTo}
            onOpenBio={openBio}
          />
        ))}

        <div className="sp-footer-nav">
          {prev ? (
            <button className="web-nav" onClick={() => onNavigate(prev)}>
              ◀ <span>S{prev.number} · {prev.title}</span>
            </button>
          ) : <span />}
          {next ? (
            <button className="web-nav" onClick={() => onNavigate(next)}>
              <span>S{next.number} · {next.title}</span> ▶
            </button>
          ) : <span />}
        </div>
      </main>

      {bio && (
        <div className="sp-modal-backdrop" onClick={() => setBio(null)}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <button className="detail-close sp-modal-close" onClick={() => setBio(null)}>✕</button>
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
              <div className="detail-loading"><div className="torch-spinner">🔥</div></div>
            ) : bio.html === '' ? (
              <p>Couldn’t load this profile — try the wiki link above.</p>
            ) : (
              <div className="wiki-content" dangerouslySetInnerHTML={{ __html: bio.html }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- lazily loaded themed sections ---------- */

function LazySection({
  def, season, index, forceVisible, onOpenBio,
}: {
  def: SectionDef
  season: Season
  index: number
  forceVisible: boolean
  onOpenBio: (c: Castaway) => void
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
    <section
      ref={ref}
      id={`sp-${def.id}`}
      className="sp-section"
      style={{ animationDelay: `${Math.min(index * 0.08, 0.4)}s` }}
    >
      <h2 className="sp-section-title">
        <span className="sp-section-icon">{def.icon}</span>
        {def.label}
        <span className="sp-section-rule" aria-hidden="true" />
      </h2>
      {visible ? <SectionBody def={def} season={season} onOpenBio={onOpenBio} /> : (
        <div className="sp-section-placeholder">🔥</div>
      )}
    </section>
  )
}

function SectionBody({
  def, season, onOpenBio,
}: {
  def: SectionDef
  season: Season
  onOpenBio: (c: Castaway) => void
}) {
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
    setState({ s: 'loading' })
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
    return <div className="sp-section-placeholder torch-spinner">🔥</div>
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
        <div className="cast-grid">
          {state.cards.map(c => (
            <button key={c.page} className="cast-card" onClick={() => onOpenBio(c)}>
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
        <button className="btn-themed btn-small" onClick={() => setShowRaw(true)}>
          View the full wiki table instead
        </button>
      </div>
    )
  }
  if (state.s === 'cast') {
    return <WikiBlock html={state.rawHtml} page={season.wikiPage} />
  }
  if (state.s === 'gallery') {
    return (
      <div className="gallery-grid">
        {state.images.length === 0 && <p>No photos found for this season.</p>}
        {state.images.map(img => (
          <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="gallery-item">
            <img src={img.thumbUrl} alt={img.title} loading="lazy" referrerPolicy="no-referrer" />
            <span>{img.title}</span>
          </a>
        ))}
      </div>
    )
  }
  if (state.s === 'videos') {
    const searches = [
      { label: 'Season intro', query: `${season.wikiPage} intro` },
      { label: 'Best moments', query: `${season.wikiPage} best moments` },
      { label: 'Final Tribal Council', query: `${season.wikiPage} final tribal council` },
      { label: `${season.winner} wins`, query: `Survivor ${season.winner} winning moment` },
      { label: 'Blindsides', query: `${season.wikiPage} blindside` },
      { label: 'Challenges', query: `${season.wikiPage} immunity challenge` },
    ]
    return (
      <div className="video-grid">
        {searches.map(v => (
          <a
            key={v.query} className="video-card"
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
            target="_blank" rel="noopener noreferrer"
          >
            <span className="video-card-play">▶</span>
            <span className="video-card-label">{v.label}</span>
            <span className="video-card-out">↗</span>
          </a>
        ))}
      </div>
    )
  }
  return <WikiBlock html={state.html} page={season.wikiPage} />
}

function WikiBlock({ html, page }: { html: string; page: string }) {
  return (
    <div className="wiki-content">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <p className="wiki-credit">
        Content from the{' '}
        <a href={wikiUrl(page)} target="_blank" rel="noopener noreferrer">Survivor Wiki</a> (CC-BY-SA)
      </p>
    </div>
  )
}
