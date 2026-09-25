import { useEffect, useState } from 'react'
import type { SetGame } from '../chess/trainingSet'
import {
  fetchPuzzleIndex,
  fetchPuzzles,
  formatBandRange,
  isBandAvailable,
  pickRandom,
  puzzleToSetGame,
  type PuzzleIndex,
} from '../puzzles/puzzleLibrary'
import { EMOJI, PUZZLE_ICONS } from '../symbols'

interface PuzzleViewProps {
  onStart: (games: readonly SetGame[], shuffle: boolean) => void
}

const SET_SIZES = [5, 10, 20] as const

/** Pick a category, difficulty and set size; puzzle files are fetched only when started. */
export function PuzzleView({ onStart }: PuzzleViewProps) {
  const [index, setIndex] = useState<PuzzleIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [bandSlug, setBandSlug] = useState<string | null>(null)
  const [size, setSize] = useState<number>(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPuzzleIndex()
      .then((data) => {
        if (cancelled) return
        setIndex(data)
        setCategorySlug(data.categories[0]?.slug ?? null)
        setBandSlug(data.categories[0]?.bands.find(isBandAvailable)?.slug ?? null)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [])

  const category = index?.categories.find((c) => c.slug === categorySlug)
  const band =
    category?.bands.find((b) => b.slug === bandSlug && isBandAvailable(b)) ?? category?.bands.find(isBandAvailable)
  const total = index?.categories.reduce((sum, c) => sum + c.bands.reduce((n, b) => n + b.count, 0), 0) ?? 0

  function selectCategory(slug: string) {
    setCategorySlug(slug)
    const next = index?.categories.find((c) => c.slug === slug)
    // Keep the chosen difficulty when the new category offers it.
    if (next && !next.bands.some((b) => b.slug === bandSlug && isBandAvailable(b))) {
      setBandSlug(next.bands.find(isBandAvailable)?.slug ?? null)
    }
  }

  async function start() {
    if (!category || !band) return
    setLoading(true)
    setError(null)
    try {
      const puzzles = await fetchPuzzles(band)
      onStart(
        pickRandom(puzzles, size).map((p) => puzzleToSetGame(p, category, band)),
        false,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  if (error && !index) {
    return (
      <p className="card error" role="alert">
        Could not load the puzzles: {error}
      </p>
    )
  }
  if (!index) return <p className="card muted">Loading puzzles...</p>

  return (
    <div className="puzzles">
      <section className="card puzzles__intro">
        <h2>
          <span aria-hidden="true">{EMOJI.puzzle}</span> Puzzles
        </h2>
        <p className="muted">
          {total.toLocaleString('en')} hand-picked puzzles from the Lichess database. The opponent moves first; find
          the best reply. You pass the set by solving every puzzle.
        </p>
      </section>

      <section className="puzzles__categories" aria-label="Category">
        {index.categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`puzzle-tile${c.slug === category?.slug ? ' puzzle-tile--active' : ''}`}
            aria-pressed={c.slug === category?.slug}
            onClick={() => selectCategory(c.slug)}
          >
            <span className="puzzle-tile__icon" aria-hidden="true">
              {PUZZLE_ICONS[c.slug] ?? EMOJI.puzzle}
            </span>
            <span className="puzzle-tile__title">{c.title}</span>
            <span className="puzzle-tile__description">{c.description}</span>
          </button>
        ))}
      </section>

      {category && (
        <section className="card puzzles__options">
          <div className="puzzles__option">
            <h3>Difficulty</h3>
            <div className="chips" role="group" aria-label="Difficulty">
              {category.bands.map((b) => (
                <button
                  key={b.slug}
                  type="button"
                  className="chip"
                  aria-pressed={b.slug === band?.slug}
                  disabled={!isBandAvailable(b)}
                  title={isBandAvailable(b) ? `${b.count} puzzles` : 'Not available yet'}
                  onClick={() => setBandSlug(b.slug)}
                >
                  {b.title}
                  <span className="chip__meta">{formatBandRange(b)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="puzzles__option">
            <h3>Puzzles per set</h3>
            <div className="chips" role="group" aria-label="Puzzles per set">
              {SET_SIZES.map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={n === size} onClick={() => setSize(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="puzzles__start">
            <p className="muted small">
              {category.title} - {band?.title} ({band && formatBandRange(band)}), {size} random puzzles
            </p>
            <button type="button" className="primary" onClick={start} disabled={loading || !band}>
              <span aria-hidden="true">{EMOJI.target}</span> {loading ? 'Loading...' : 'Start puzzles'}
            </button>
          </div>
        </section>
      )}

      <p className="muted small puzzles__credit">
        Puzzles: <a href="https://database.lichess.org/#puzzles">Lichess puzzle database</a> (CC0).
      </p>
    </div>
  )
}
