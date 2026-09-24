import { defaultPieces } from 'react-chessboard'

interface PromotionPickerProps {
  color: 'w' | 'b'
  /** Called with 'q' | 'r' | 'b' | 'n', or null when cancelled. */
  onChoose: (piece: string | null) => void
}

const CHOICES = [
  { piece: 'q', label: 'Queen' },
  { piece: 'r', label: 'Rook' },
  { piece: 'b', label: 'Bishop' },
  { piece: 'n', label: 'Knight' },
] as const

/**
 * Cancelling is only possible via the button or Escape: a backdrop click would also
 * catch the click that the browser fires at the end of the drag that opened the picker.
 */
export function PromotionPicker({ color, onChoose }: PromotionPickerProps) {
  return (
    <div
      className="promotion"
      role="dialog"
      aria-label="Choose promotion piece"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onChoose(null)
      }}
    >
      <div className="promotion__choices">
        <p>Promote to</p>
        <div className="promotion__row">
          {CHOICES.map(({ piece, label }) => (
            <button
              key={piece}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onChoose(piece)}
              autoFocus={piece === 'q'}
            >
              {defaultPieces[`${color}${piece.toUpperCase()}`]()}
            </button>
          ))}
        </div>
        <button type="button" className="link" onClick={() => onChoose(null)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
