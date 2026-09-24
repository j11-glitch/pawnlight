import { useState, type FormEvent, type RefObject } from 'react'

interface GameInputProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  /** Returns an error message, or null when the game loaded. */
  onLoad: (text: string) => string | null
  onCancel?: () => void
}

const PLACEHOLDER = `e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7

or a PGN:

[Event "Example"]
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6`

/**
 * The input starts empty and is hidden once a game is loaded,
 * so the full move list is never on screen while training.
 */
export function GameInput({ textareaRef, onLoad, onCancel }: GameInputProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const message = onLoad(text)
    setError(message)
    if (!message) setText('')
  }

  return (
    <form className="input" onSubmit={handleSubmit}>
      <label htmlFor="game-input">Move sequence / PGN</label>
      <textarea
        id="game-input"
        ref={textareaRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={PLACEHOLDER}
        rows={7}
        spellCheck={false}
        aria-invalid={error !== null}
        aria-describedby={error ? 'game-input-error' : undefined}
      />
      {error && (
        <p id="game-input-error" className="error" role="alert">
          {error}
        </p>
      )}
      <div className="input__actions">
        <button type="submit" className="primary" disabled={!text.trim()}>
          Load game
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
