import { useEffect, useRef, useState } from 'react'
import type { Side } from '../chess/gameTrainer'
import { loadMoveSequence } from '../chess/moveParser'
import type { SetGame } from '../chess/trainingSet'
import type { LibraryCategory, LibraryGame } from '../library'
import { GameInput } from './GameInput'
import { GamePreview } from './GamePreview'
import { EMOJI } from '../symbols'

interface LibraryViewProps {
  categories: readonly LibraryCategory[]
  orientation: Side
  onStart: (games: readonly SetGame[], shuffle: boolean) => void
}

function toSetGame(entry: LibraryGame): SetGame | null {
  return entry.game ? { id: entry.id, title: entry.title, category: entry.category, pgn: entry.pgn, game: entry.game } : null
}

export function LibraryView({ categories, orientation, onStart }: LibraryViewProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [shuffle, setShuffle] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // On narrow screens the preview sits below the list, so bring it into view.
  useEffect(() => {
    if (previewId && window.matchMedia('(max-width: 820px)').matches) {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [previewId])

  const allGames = categories.flatMap((c) => c.games)
  const preview = allGames.find((g) => g.id === previewId && g.game)
  // Keep library order, regardless of the order games were ticked in.
  const selectedGames = allGames.filter((g) => selected.has(g.id)).flatMap((g) => toSetGame(g) ?? [])

  function toggle(ids: readonly string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function loadCustom(text: string): string | null {
    const result = loadMoveSequence(text)
    if (!result.ok) return result.error
    onStart([{ id: 'custom', title: 'Custom game', category: 'Custom', pgn: text, game: result.game }], false)
    return null
  }

  return (
    <div className="library">
      <div className="library__list">
        {categories.length === 0 && (
          <p className="card muted">
            No games found. Add .pgn files to the <code>games/</code> folder, one subfolder per category.
          </p>
        )}

        {categories.map((category) => {
          const playable = category.games.filter((g) => g.game).map((g) => g.id)
          const allSelected = playable.length > 0 && playable.every((id) => selected.has(id))
          return (
            <section key={category.name} className="card category">
              <header className="category__header">
                <h2>
                  <span aria-hidden="true">{EMOJI.book}</span> {category.name}
                  <span className="category__count">{category.games.length}</span>
                </h2>
                <button type="button" className="link" onClick={() => toggle(playable, !allSelected)}>
                  {allSelected ? 'Clear' : 'Select all'}
                </button>
              </header>
              <ul className="category__games">
                {category.games.map((entry) => (
                  <li key={entry.id} className={`game-row${entry.id === previewId ? ' game-row--active' : ''}`}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${entry.title}`}
                      checked={selected.has(entry.id)}
                      disabled={!entry.game}
                      onChange={(event) => toggle([entry.id], event.target.checked)}
                    />
                    <button
                      type="button"
                      className="game-row__title"
                      onClick={() => setPreviewId(entry.id)}
                      disabled={!entry.game}
                      title={entry.game ? 'Preview' : entry.error}
                    >
                      <span>{entry.title}</span>
                      {entry.opening && <span className="muted small">{entry.opening}</span>}
                      {entry.error && <span className="error small">Invalid PGN: {entry.error}</span>}
                    </button>
                    {entry.game && <span className="muted small nowrap">{entry.game.moves.length} moves</span>}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <details className="card custom">
          <summary>
            <span aria-hidden="true">{EMOJI.pen}</span> Paste your own game
          </summary>
          <GameInput onLoad={loadCustom} submitLabel="Train this game" />
        </details>
      </div>

      <div className="library__preview" ref={previewRef}>
        {preview?.game ? (
          <GamePreview
            key={preview.id}
            title={preview.title}
            subtitle={[preview.category, preview.opening].filter(Boolean).join(' - ')}
            game={preview.game}
            orientation={orientation}
            selected={selected.has(preview.id)}
            onToggleSelected={() => toggle([preview.id], !selected.has(preview.id))}
            onTrainNow={() => {
              const game = toSetGame(preview)
              if (game) onStart([game], false)
            }}
          />
        ) : (
          <div className="card preview-empty">
            <span className="preview-empty__icon" aria-hidden="true">
              {EMOJI.eyes}
            </span>
            <p className="muted">Click a game title to preview it.</p>
          </div>
        )}
      </div>

      <div className="library__footer">
        <span>
          <strong>{selectedGames.length}</strong> {selectedGames.length === 1 ? 'game' : 'games'} selected
        </span>
        <label className="checkbox">
          <input type="checkbox" checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} />
          <span aria-hidden="true">{EMOJI.shuffle}</span> Shuffle order
        </label>
        {selectedGames.length > 0 && (
          <button type="button" className="link" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        )}
        <button
          type="button"
          className="primary"
          disabled={selectedGames.length === 0}
          onClick={() => onStart(selectedGames, shuffle)}
        >
          <span aria-hidden="true">{EMOJI.target}</span> Start training
        </button>
      </div>
    </div>
  )
}
