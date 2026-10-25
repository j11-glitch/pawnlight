import { useEffect, useRef } from 'react'
import { CROSS_MARK, EMOJI } from '../symbols'

export interface MovePair {
  number: number
  white: string
  black?: string
}

export interface PgnGame {
  id: string
  title: string
  details: string
  result?: string
  pairs: MovePair[]
}

interface PgnPopupProps {
  game: PgnGame
  onClose: () => void
}

/** The selected game's score sheet, shown over the list. Closes with the button, Escape or a backdrop click. */
export function PgnPopup({ game, onClose }: PgnPopupProps) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pgn-popup" role="dialog" aria-modal="true" aria-labelledby="pgn-popup-title" onClick={onClose}>
      <div className="pgn-popup__card" onClick={(event) => event.stopPropagation()}>
        <header className="pgn-popup__header">
          <div>
            <h2 id="pgn-popup-title" className="pgn__title">
              <span aria-hidden="true">{EMOJI.scroll}</span> {game.title}
            </h2>
            {game.details && <p className="muted">{game.details}</p>}
          </div>
          <button ref={closeButton} type="button" className="pgn-popup__close" aria-label="Close" onClick={onClose}>
            {CROSS_MARK}
          </button>
        </header>
        <ol className="pgn__moves">
          {game.pairs.map((pair) => (
            <li key={pair.number}>
              <span className="pgn__number">{pair.number}.</span>
              <span>{pair.white}</span>
              <span>{pair.black ?? ''}</span>
            </li>
          ))}
        </ol>
        {game.result && <p className="pgn__result">{game.result}</p>}
      </div>
    </div>
  )
}
