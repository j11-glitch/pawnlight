import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPlayedMoves } from './chess/gameTrainer'
import { GameControls } from './components/GameControls'
import { GameInput } from './components/GameInput'
import { GameStatus } from './components/GameStatus'
import { MoveHistory } from './components/MoveHistory'
import { TrainerBoard } from './components/TrainerBoard'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTrainer } from './hooks/useTrainer'

export default function App() {
  const game = useTrainer()
  const { trainer, position, progress } = game
  const [inputOpen, setInputOpen] = useState(trainer === null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (inputOpen && trainer) textareaRef.current?.focus()
  }, [inputOpen, trainer])

  const openInput = useCallback(() => {
    setInputOpen(true)
    textareaRef.current?.focus()
  }, [])

  const { loadGame } = game
  const handleLoad = useCallback(
    (text: string) => {
      const error = loadGame(text)
      if (!error) setInputOpen(false)
      return error
    },
    [loadGame],
  )

  const shortcuts = useMemo(
    () => ({ h: game.showHint, r: game.restart, u: game.undo, f: game.flip }),
    [game.showHint, game.restart, game.undo, game.flip],
  )
  useKeyboardShortcuts(shortcuts)

  const completed = progress?.completed ?? false

  return (
    <div className="app">
      <header className="app__header">
        <h1>Chess Move Trainer</h1>
        <p className="muted">Recover a game move by move. Wrong moves are taken back; the answer stays hidden.</p>
      </header>

      <main className="app__main">
        <TrainerBoard
          position={position}
          orientation={game.orientation}
          disabled={!trainer || completed}
          onMove={game.makeMove}
        />

        <aside className="panel">
          <GameStatus
            progress={progress}
            feedback={game.feedback}
            hint={game.hint}
            inCheck={position.inCheck()}
            isCheckmate={position.isCheckmate()}
          />

          <GameControls
            hasGame={trainer !== null}
            canHint={trainer !== null && !completed}
            canUndo={(trainer?.currentMoveIndex ?? 0) > 0}
            showHistory={game.showHistory}
            onHint={game.showHint}
            onUndo={game.undo}
            onRestart={game.restart}
            onFlip={game.flip}
            onToggleHistory={game.toggleHistory}
            onLoadNew={openInput}
          />

          {trainer && game.showHistory && (
            <MoveHistory startFen={trainer.startFen} playedMoves={getPlayedMoves(trainer)} />
          )}

          {inputOpen ? (
            <GameInput
              textareaRef={textareaRef}
              onLoad={handleLoad}
              onCancel={trainer ? () => setInputOpen(false) : undefined}
            />
          ) : (
            <p className="muted small shortcuts">
              Shortcuts: <kbd>H</kbd> hint, <kbd>U</kbd> undo, <kbd>R</kbd> restart, <kbd>F</kbd> flip. Click or drag
              pieces to move.
            </p>
          )}
        </aside>
      </main>
    </div>
  )
}
