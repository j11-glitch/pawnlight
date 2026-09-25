import type { Progress } from '../chess/gameTrainer'
import { defaultPieces } from 'react-chessboard'
import type { Feedback, FeedbackKind } from '../hooks/useTrainingSession'
import { EMOJI } from '../symbols'

const FEEDBACK_ICONS: Record<FeedbackKind, string> = {
  correct: EMOJI.checkBox,
  wrong: EMOJI.crossBox,
  completed: EMOJI.party,
  illegal: EMOJI.stop,
  info: EMOJI.info,
}

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
        <p className="status__turn">
          <span aria-hidden="true">{EMOJI.book}</span> No game loaded
        </p>
        <p className="muted">Paste a move sequence or PGN below and press Load game.</p>
      </section>
    )
  }

  const turn = progress.sideToMove === 'white' ? 'White' : 'Black'
  return (
    <section className="status">
      <p className="status__turn">
        <span className="status__piece" aria-hidden="true">
          {progress.completed
            ? EMOJI.flag
            : progress.sideToMove === 'white'
              ? defaultPieces.wK()
              : defaultPieces.bK()}
        </span>
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
            <span className="feedback__icon" aria-hidden="true">
              {FEEDBACK_ICONS[feedback.kind]}
            </span>
            <span>{feedback.text}</span>
          </p>
        )}
        {hint && (
          <p className="hint">
            <span aria-hidden="true">{EMOJI.bulb}</span> Hint: <strong>{hint}</strong>
          </p>
        )}
      </div>
    </section>
  )
}
