import { useEffect, useRef } from 'react'
import { CROSS_MARK } from '../symbols'

interface WrongMovePopupProps {
  /** SAN of the rejected move, e.g. "Nf3". */
  san: string
  restartLabel: string
  onContinue: () => void
  onRestart: () => void
}

// Ignore clicks right after opening: the browser fires a click at the end of the drag
// that caused the wrong move, and it must not press a button by accident.
const CLICK_GUARD_MS = 300

/** Shown on top of the board after a wrong move. The move itself was already taken back. */
export function WrongMovePopup({ san, restartLabel, onContinue, onRestart }: WrongMovePopupProps) {
  const openedAt = useRef(Date.now())
  const continueButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    continueButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onContinue])

  const guarded = (action: () => void) => () => {
    if (Date.now() - openedAt.current >= CLICK_GUARD_MS) action()
  }

  return (
    <div className="wrong-move" role="alertdialog" aria-modal="true" aria-labelledby="wrong-move-title">
      <div className="wrong-move__card">
        <span className="wrong-move__icon" aria-hidden="true">
          {CROSS_MARK}
        </span>
        <h2 id="wrong-move-title">Wrong move</h2>
        <p className="wrong-move__text">
          <strong>{san}</strong> isn&apos;t the move here. Try again from this position, or start over.
        </p>
        <div className="wrong-move__actions">
          <button ref={continueButton} type="button" className="primary" onClick={guarded(onContinue)}>
            Continue
          </button>
          <button type="button" onClick={guarded(onRestart)}>
            {restartLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
