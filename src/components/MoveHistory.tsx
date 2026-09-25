import { formatMoveList } from '../chess/gameTrainer'
import { EMOJI } from '../symbols'

interface MoveHistoryProps {
  startFen: string
  /** Only the moves already recovered; future moves must never be passed in. */
  playedMoves: readonly string[]
}

export function MoveHistory({ startFen, playedMoves }: MoveHistoryProps) {
  const lines = formatMoveList(startFen, playedMoves)
  return (
    <section className="history">
      <h2>
        <span aria-hidden="true">{EMOJI.scroll}</span> Move history
      </h2>
      {lines.length === 0 ? (
        <p className="muted">No moves recovered yet.</p>
      ) : (
        <ol className="history__list">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      )}
    </section>
  )
}
