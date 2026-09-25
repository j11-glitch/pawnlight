import { useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { buildPosition, createTrainer, getLastMove, numberMoves, type Side } from '../chess/gameTrainer'
import type { ParsedGame } from '../chess/moveParser'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { DARK_SQUARE_STYLE, LIGHT_SQUARE_STYLE } from './boardTheme'
import { EMOJI } from '../symbols'

interface GamePreviewProps {
  title: string
  subtitle?: string
  game: ParsedGame
  orientation: Side
  selected: boolean
  onToggleSelected: () => void
  onTrainNow: () => void
}

const LAST_MOVE_STYLE: CSSProperties = { backgroundColor: 'rgba(255, 214, 10, 0.42)' }

/** Read-only board to step through a game before choosing it. Remount (key) per game. */
export function GamePreview({ title, subtitle, game, orientation, selected, onToggleSelected, onTrainNow }: GamePreviewProps) {
  const [ply, setPly] = useState(0)
  const total = game.moves.length
  const go = (next: number) => setPly(Math.min(Math.max(0, next), total))

  const position = buildPosition(createTrainer(game, ply))
  const lastMove = getLastMove(position)
  const squareStyles = lastMove ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE } : {}

  useKeyboardShortcuts({
    arrowleft: () => setPly((p) => Math.max(0, p - 1)),
    arrowright: () => setPly((p) => Math.min(total, p + 1)),
    home: () => setPly(0),
    end: () => setPly(total),
  })

  return (
    <section className="card preview" aria-label={`Preview of ${title}`}>
      <header className="preview__header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        <span className="muted small">{total} moves</span>
      </header>

      <div className="preview__board">
        <Chessboard
          options={{
            id: 'preview-board',
            position: position.fen(),
            boardOrientation: orientation,
            allowDragging: false,
            squareStyles,
            animationDurationInMs: 120,
            darkSquareStyle: DARK_SQUARE_STYLE,
            lightSquareStyle: LIGHT_SQUARE_STYLE,
          }}
        />
      </div>

      <div className="preview__nav" role="group" aria-label="Step through moves">
        <button type="button" onClick={() => go(0)} disabled={ply === 0} aria-label="First position">
          |&lt;
        </button>
        <button type="button" onClick={() => go(ply - 1)} disabled={ply === 0} aria-label="Previous move">
          &lt;
        </button>
        <span className="preview__counter">
          {ply} / {total}
        </span>
        <button type="button" onClick={() => go(ply + 1)} disabled={ply === total} aria-label="Next move">
          &gt;
        </button>
        <button type="button" onClick={() => go(total)} disabled={ply === total} aria-label="Final position">
          &gt;|
        </button>
      </div>

      <ol className="preview__moves">
        {numberMoves(game.startFen, game.moves).map(({ number, white, black }) => (
          <li key={number}>
            <span className="muted">{white ? `${number}.` : `${number}...`}</span>
            {[white, black].map(
              (move) =>
                move && (
                  <button
                    key={move.ply}
                    type="button"
                    className={`move${move.ply === ply ? ' move--active' : ''}`}
                    onClick={() => go(move.ply)}
                  >
                    {move.san}
                  </button>
                ),
            )}
          </li>
        ))}
      </ol>

      <div className="preview__actions">
        <button type="button" onClick={onToggleSelected} aria-pressed={selected}>
          {selected ? 'Remove from set' : `+ Add to set`}
        </button>
        <button type="button" className="primary" onClick={onTrainNow}>
          <span aria-hidden="true">{EMOJI.target}</span> Train this game only
        </button>
      </div>
    </section>
  )
}
