import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Season } from '../data/seasons'
import { seasonName } from '../data/seasons'
import { useEscape } from '../lib/escape'
import { navigate } from '../lib/router'
import { readJSON, writeJSON } from '../lib/store'
import { toast } from '../lib/toast'
import '../styles/pages.css'
import '../styles/quiz.css'

interface Props {
  seasons: Season[]
  logos: Record<string, string>
  onSelect: (season: Season) => void
}

interface Question {
  prompt: string
  quote?: string
  logo?: string
  options: string[]
  answer: number
  season: Season
}

const ROUND = 10
const BEST_KEY = 'sa-quiz-best'

const RIGHT = [
  'Safe tonight — the necklace is yours.',
  'Idol played perfectly!',
  'Blindside avoided.',
  'Jeff would be impressed.',
  'Straight to the merge!',
]
const WRONG = ['The tribe has spoken.', 'Blindsided!', 'Your torch has been snuffed.', 'That one goes to the jury.']

const RANKS: [number, string, string][] = [
  [10, 'Sole Survivor', '👑'],
  [8, 'Final Tribal Council', '⚖️'],
  [6, 'Jury Member', '🗳️'],
  [4, 'Made the Merge', '🤝'],
  [2, 'Pre-merge Boot', '🎒'],
  [0, 'First One Out', '🪦'],
]

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** correct answer + three distinct distractors, shuffled */
function withOptions(correct: string, pool: string[]): { options: string[]; answer: number } | null {
  const distractors = shuffle([...new Set(pool.filter(p => p !== correct))]).slice(0, 3)
  if (distractors.length < 3) return null
  const options = shuffle([correct, ...distractors])
  return { options, answer: options.indexOf(correct) }
}

function makeQuestion(kind: number, s: Season, all: Season[], logos: Record<string, string>): Question | null {
  const others = all.filter(o => o.number !== s.number)
  switch (kind) {
    case 0: {
      // who won? — never offer the same person twice (Sandra, Tony…)
      const opts = withOptions(s.winner, others.filter(o => o.winnerPage !== s.winnerPage).map(o => o.winner))
      return opts && { prompt: `Who won ${seasonName(s)}?`, logo: logos[s.wikiPage], season: s, ...opts }
    }
    case 1: {
      const opts = withOptions(s.title, others.filter(o => o.winnerPage !== s.winnerPage).map(o => o.title))
      return opts && { prompt: `${s.winner} won which season?`, season: s, ...opts }
    }
    case 2: {
      const opts = withOptions(s.country, others.map(o => o.country))
      return opts && { prompt: `Where was ${seasonName(s)} filmed?`, logo: logos[s.wikiPage], season: s, ...opts }
    }
    case 3: {
      const opts = withOptions(s.title, others.map(o => o.title))
      return opts && { prompt: 'Which season is this?', quote: s.tagline, season: s, ...opts }
    }
    case 4: {
      // "Survivor 45" would give its own number away
      if (/\d/.test(s.title)) return null
      const near = others
        .filter(o => Math.abs(o.number - s.number) <= 6)
        .map(o => String(o.number))
      const opts = withOptions(String(s.number), near)
      return opts && { prompt: `What season number was ${seasonName(s)}?`, logo: logos[s.wikiPage], season: s, ...opts }
    }
    default: {
      const opts = withOptions(s.year, others.map(o => o.year))
      return opts && { prompt: `What year did ${seasonName(s)} first air?`, logo: logos[s.wikiPage], season: s, ...opts }
    }
  }
}

function buildRound(seasons: Season[], logos: Record<string, string>): Question[] {
  const done = seasons.filter(s => s.status !== 'airing' && s.status !== 'upcoming' && s.winner)
  const used = new Set<number>()
  const out: Question[] = []
  let fijiLocation = false
  for (let tries = 0; out.length < ROUND && tries < 200; tries++) {
    const s = pick(done)
    if (used.has(s.number)) continue
    const kind = out.length < 4 ? [0, 1, 2, 3][out.length] : Math.floor(Math.random() * 6)
    // "Fiji" is the answer for every recent season — ask that one at most once
    if (kind === 2 && s.country === 'Fiji') {
      if (fijiLocation) continue
      fijiLocation = true
    }
    const q = makeQuestion(kind, s, done, logos)
    if (!q) continue
    used.add(s.number)
    out.push(q)
  }
  return out
}

/** Tribal Council quiz: ten questions, ten torches — keep yours lit. */
export default function QuizPage({ seasons, logos, onSelect }: Props) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [round, setRound] = useState<Question[]>([])
  const [at, setAt] = useState(0)
  const [picks, setPicks] = useState<(number | null)[]>([])
  const [best, setBest] = useState(() => readJSON<number>(BEST_KEY, 0))
  const [line, setLine] = useState('')
  useEscape(() => navigate({ page: 'map' }))

  const q = round[at]
  const picked = picks[at] ?? null
  const answered = picked !== null
  const score = picks.filter((p, i) => p !== null && p === round[i]?.answer).length

  const start = useCallback(() => {
    setRound(buildRound(seasons, logos))
    setPicks([])
    setAt(0)
    setPhase('play')
  }, [seasons, logos])

  const choose = useCallback((i: number) => {
    if (!q || answered) return
    setPicks(p => {
      const next = [...p]
      next[at] = i
      return next
    })
    setLine(pick(i === q.answer ? RIGHT : WRONG))
  }, [q, answered, at])

  const advance = useCallback(() => {
    if (!answered) return
    if (at + 1 < round.length) {
      setAt(at + 1)
      return
    }
    setPhase('done')
    if (score > best) {
      setBest(score)
      writeJSON(BEST_KEY, score)
      toast({ icon: '🏆', title: 'New personal best!', body: `${score} / ${ROUND} at Tribal Council` })
    }
  }, [answered, at, round.length, score, best])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[data-modal]')) return
      // a focused button already handles Enter/Space itself
      const onButton = (e.target as HTMLElement).tagName === 'BUTTON'
      if (phase === 'play') {
        const n = Number(e.key)
        if (n >= 1 && n <= 4) choose(n - 1)
        else if ((e.key === 'Enter' || e.key === ' ') && answered && !onButton) {
          e.preventDefault()
          advance()
        }
      } else if (e.key === 'Enter' && !onButton) {
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, choose, advance, answered, start])

  const rank = useMemo(() => RANKS.find(([min]) => score >= min) ?? RANKS[RANKS.length - 1], [score])
  const missed = round.filter((qq, i) => picks[i] !== qq.answer)

  const shareScore = async () => {
    const text = `I scored ${score}/${ROUND} at Tribal Council on Survivor Atlas — ${rank[2]} ${rank[1]}! ${window.location.origin}${window.location.pathname}#/quiz`
    try {
      await navigator.clipboard.writeText(text)
      toast({ icon: '📋', title: 'Score copied', body: 'Challenge your tribe.' }, 2400)
    } catch {
      toast({ icon: '📋', title: 'Your score', body: text }, 6000)
    }
  }

  return (
    <div className="page qz-page">
      <div className="qz-fire" aria-hidden="true">
        <span className="css-flame"><i /><i /><i /></span>
        <span className="css-flame"><i /><i /><i /></span>
        <span className="css-flame"><i /><i /><i /></span>
      </div>
      <button className="page-close" onClick={() => navigate({ page: 'map' })} aria-label="Back to the map">✕</button>

      {phase === 'intro' && (
        <section className="qz-intro">
          <p className="page-kicker">🔥 Tribal Council</p>
          <h1>Keep Your Torch Lit</h1>
          <p className="page-sub">
            Ten questions on winners, islands and legendary seasons. Every miss snuffs a torch.
          </p>
          <div className="qz-torches qz-torches-demo" aria-hidden="true">
            {Array.from({ length: ROUND }, (_, i) => (
              <span key={i} className="qz-torch qz-torch-lit" style={{ '--i': i } as React.CSSProperties}>
                <span className="css-flame"><i /><i /><i /></span>
              </span>
            ))}
          </div>
          <button className="qz-start" onClick={start}>Grab your torch</button>
          {best > 0 && <p className="qz-best">Your best: {best} / {ROUND}</p>}
          <p className="qz-hint">Keys: <kbd>1</kbd>–<kbd>4</kbd> to vote · <kbd>Enter</kbd> for the next question</p>
        </section>
      )}

      {phase === 'play' && q && (
        <section className="qz-play">
          <div className="qz-torches" aria-label={`Question ${at + 1} of ${round.length}`}>
            {round.map((qq, i) => {
              const p = picks[i]
              const state = p === undefined || p === null ? (i === at ? 'now' : 'unlit') : p === qq.answer ? 'lit' : 'out'
              return (
                <span key={i} className={`qz-torch qz-torch-${state}`}>
                  {(state === 'lit' || state === 'now') && <span className="css-flame"><i /><i /><i /></span>}
                  {state === 'out' && <span className="qz-smoke" />}
                </span>
              )
            })}
          </div>
          <p className="qz-count">Question {at + 1} of {round.length} · Score {score}</p>

          <div className="qz-card" key={at}>
            {q.logo && <img className="qz-logo" src={q.logo} alt="" referrerPolicy="no-referrer" />}
            <h2>{q.prompt}</h2>
            {q.quote && <blockquote>“{q.quote}”</blockquote>}
            <div className="qz-options">
              {q.options.map((o, i) => {
                const cls = !answered ? '' : i === q.answer ? 'qz-right' : i === picked ? 'qz-wrong' : 'qz-dim'
                return (
                  <button key={o} className={`qz-option ${cls}`} onClick={() => choose(i)} disabled={answered}>
                    <kbd>{i + 1}</kbd>
                    <span>{o}</span>
                  </button>
                )
              })}
            </div>
            {answered && (
              <div className={`qz-verdict ${picked === q.answer ? 'qz-verdict-right' : 'qz-verdict-wrong'}`}>
                <strong>{line}</strong>
                <button className="qz-learn" onClick={() => onSelect(q.season)}>
                  Explore {seasonName(q.season)} →
                </button>
                <button className="qz-next" onClick={advance} autoFocus>
                  {at + 1 < round.length ? 'Next question' : 'Read the votes'} ↵
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {phase === 'done' && (
        <section className="qz-done">
          <p className="page-kicker">The votes are in</p>
          <div className="qz-rank-icon" aria-hidden="true">{rank[2]}</div>
          <h1>{rank[1]}</h1>
          <p className="qz-score"><strong>{score}</strong> / {round.length}</p>
          <p className="qz-best">Personal best: {Math.max(best, score)} / {ROUND}</p>
          <div className="qz-actions">
            <button className="qz-start" onClick={start}>Play again</button>
            <button className="qz-secondary" onClick={shareScore}>Share score</button>
          </div>
          {missed.length > 0 && (
            <div className="qz-review">
              <h3>Brush up on</h3>
              <div className="qz-review-list">
                {missed.map(m => (
                  <button
                    key={m.season.number}
                    onClick={() => onSelect(m.season)}
                    style={{ '--c1': m.season.theme.primary, '--c2': m.season.theme.accent } as React.CSSProperties}
                  >
                    <small>{m.prompt}</small>
                    <span>{m.options[m.answer]}</span>
                    <em>S{m.season.number} · {m.season.title} →</em>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
