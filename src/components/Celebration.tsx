import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { SetSummary } from '../chess/trainingSet'

interface CelebrationProps {
  summary: SetSummary
  onTrainAgain: () => void
  onLibrary: () => void
  onClose: () => void
}

const HEADLINES: Record<SetSummary['stars'], string> = {
  3: 'Flawless!',
  2: 'Excellent work!',
  1: 'Well done!',
}

/**
 * Results screen shown when a set is passed. Deliberately no backdrop-click close:
 * the winning move is often a drag, and the browser's trailing click would dismiss it.
 */
export function Celebration({ summary, onTrainAgain, onLibrary, onClose }: CelebrationProps) {
  const primary = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    primary.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { games, moves, mistakes, hints, accuracy, stars } = summary
  const what = games === 1 ? `the game (${moves} moves)` : `all ${games} games (${moves} moves)`
  const how =
    mistakes === 0 && hints === 0
      ? 'without a single mistake or hint'
      : `with ${plural(mistakes, 'mistake')} and ${plural(hints, 'hint')}`

  return (
    <div className="celebration" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
      <Confetti />
      <div className="celebration__card">
        <Trophy />
        <p className="celebration__kicker">{games === 1 ? 'Game completed' : 'Set passed'}</p>
        <h2 id="celebration-title">{HEADLINES[stars]}</h2>
        <Stars count={stars} />
        <p className="celebration__text">
          You recovered {what} {how}.
        </p>

        <dl className="celebration__stats">
          <Stat label="Games" value={games} />
          <Stat label="Moves" value={moves} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Hints" value={hints} />
        </dl>

        <div className="celebration__actions">
          <button ref={primary} type="button" className="primary" onClick={onTrainAgain}>
            Train again
          </button>
          <button type="button" onClick={onLibrary}>
            Choose new games
          </button>
          <button type="button" className="link" onClick={onClose}>
            View board
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="celebration__stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <div className="stars" role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          className={`star${n <= count ? ' star--on' : ''}`}
          style={{ animationDelay: `${300 + n * 180}ms` }}
          aria-hidden="true"
        >
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </div>
  )
}

function Trophy() {
  return (
    <svg className="trophy" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="trophy-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="0.55" stopColor="#f5b700" />
          <stop offset="1" stopColor="#c98a00" />
        </linearGradient>
      </defs>
      <path
        d="M14 10h36v6h6a2 2 0 0 1 2 2v4c0 7-5 12-12 13a18 18 0 0 1-10 7v6h8a3 3 0 0 1 3 3v3H17v-3a3 3 0 0 1 3-3h8v-6a18 18 0 0 1-10-7C11 34 6 29 6 22v-4a2 2 0 0 1 2-2h6zm0 12v-2h-4v2c0 4 2 7 5 8a19 19 0 0 1-1-8zm36 0a19 19 0 0 1-1 8c3-1 5-4 5-8v-2h-4z"
        fill="url(#trophy-gold)"
      />
      <path d="M24 16h4v14h-4z" fill="#fff" opacity="0.35" />
    </svg>
  )
}

const CONFETTI_COLORS = ['#f5b700', '#e8505b', '#2f9e6f', '#3a7bd5', '#9b59d0', '#ff8c42']

function Confetti() {
  // Random once per mount; stable across re-renders.
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 2.6 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 160,
        spin: 360 + Math.random() * 720,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 4 === 0,
      })),
    [],
  )

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.round ? '50%' : 2,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
