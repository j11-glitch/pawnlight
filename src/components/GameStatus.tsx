import type { Progress } from '../chess/gameTrainer'
import type { Feedback } from '../hooks/useTrainingSession'

interface GameStatusProps {
  progress: Progress | null
  feedback: Feedback | null
  hint: string | null
  isCheckmate: boolean
  inCheck: boolean
}

export function GameStatus({ progress, feedback, hint, isCheckmate, inCheck }: GameStatusProps) {
  if (!progress) {
    return (
      <section className="status" aria-live="polite">
        <p className="status__turn">No game loaded</p>
        <p className="muted">Paste a move sequence or PGN below and press Load game.</p>
      </section>
    )
  }

  const turn = progress.sideToMove === 'white' ? 'White' : 'Black'
  return (
    <section className="status">
      <p className="status__turn">
        {progress.completed ? 'Finished' : `${turn} to move`}
        {isCheckmate ? <span className="tag">Checkmate</span> : inCheck && <span className="tag">Check</span>}
      </p>
      <p className="status__counter">
        Move {progress.moveNumber} / {progress.total}
      </p>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label="Progress"
      >
        <div className="progress__bar" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="muted">Progress: {progress.percent}%</p>

      <div className="status__messages" aria-live="polite">
        {feedback && (
          <p key={feedback.id} className={`feedback feedback--${feedback.kind}`}>
            {feedback.text}
          </p>
        )}
        {hint && (
          <p className="hint">
            Hint: <strong>{hint}</strong>
          </p>
        )}
      </div>
    </section>
  )
}
