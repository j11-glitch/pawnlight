import { useCallback, useMemo, useState } from 'react'
import { canUndo, getPlayedMoves } from './chess/gameTrainer'
import type { SetGame } from './chess/trainingSet'
import { Celebration } from './components/Celebration'
import { GameControls } from './components/GameControls'
import { GameStatus } from './components/GameStatus'
import { LibraryView } from './components/LibraryView'
import { MoveHistory } from './components/MoveHistory'
import { PuzzleView } from './components/PuzzleView'
import { SetOverview } from './components/SetOverview'
import { TrainerBoard } from './components/TrainerBoard'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTrainingSession } from './hooks/useTrainingSession'
import { library } from './library'
import { EMOJI } from './symbols'

// Same image as the home-screen icon (public/icon-192.png); BASE_URL keeps it working on a subpath.
const APP_ICON_URL = `${import.meta.env.BASE_URL}icon-192.png`

type View = 'library' | 'puzzles' | 'train'

const NO_SHORTCUTS = {}

export default function App() {
  const session = useTrainingSession()
  const { set, trainer, position, progress } = session
  const [view, setView] = useState<View>(set ? 'train' : 'library')

  const { startSet, passed } = session
  const handleStart = useCallback(
    (games: readonly SetGame[], shuffle: boolean) => {
      if (set && !passed && !window.confirm('Replace your current training set? Its progress will be lost.')) return
      startSet(games, shuffle)
      setView('train')
    },
    [set, passed, startSet],
  )

  const trainShortcuts = useMemo(
    () => ({ h: session.showHint, r: session.restartGame, u: session.undo, f: session.flip, n: session.nextGame }),
    [session.showHint, session.restartGame, session.undo, session.flip, session.nextGame],
  )
  // Shortcuts must not act on the (hidden) training board while browsing the library.
  useKeyboardShortcuts(view === 'train' ? trainShortcuts : NO_SHORTCUTS)

  const completed = progress?.completed ?? false

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <img className="brand__logo" src={APP_ICON_URL} alt="" width={58} height={58} />
          <div>
            <h1>Pawnlight</h1>
            <p className="brand__tagline">
              <span aria-hidden="true">{EMOJI.sparkles}</span> Light up your chess memory.
            </p>
            <p className="brand__description">
              Rebuild the games you study, move by move, and sharpen your tactics with 10,000 puzzles. Wrong moves
              bounce back; you find the right one yourself.
            </p>
          </div>
        </div>
        <nav className="tabs" aria-label="Views">
          <button type="button" aria-current={view === 'library'} onClick={() => setView('library')}>
            <span aria-hidden="true">{EMOJI.library}</span> Library
          </button>
          <button type="button" aria-current={view === 'puzzles'} onClick={() => setView('puzzles')}>
            <span aria-hidden="true">{EMOJI.puzzle}</span> Puzzles
          </button>
          <button type="button" aria-current={view === 'train'} onClick={() => setView('train')} disabled={!set}>
            <span aria-hidden="true">{EMOJI.training}</span> Training
          </button>
        </nav>
      </header>

      {view === 'puzzles' ? (
        <PuzzleView onStart={handleStart} />
      ) : view === 'library' || !set || !trainer ? (
        <LibraryView categories={library} orientation={session.orientation} onStart={handleStart} />
      ) : (
        <main className="app__main">
          <TrainerBoard
            position={position}
            orientation={session.orientation}
            disabled={completed}
            onMove={session.makeMove}
          />

          <aside className="panel">
            <SetOverview
              set={set}
              passed={passed}
              canAdvance={session.canAdvance}
              onNext={session.nextGame}
              onShowResults={session.openResults}
            />

            <GameStatus
              progress={progress}
              feedback={session.feedback}
              hint={session.hint}
              inCheck={position.inCheck()}
              isCheckmate={position.isCheckmate()}
            />

            <GameControls
              canHint={!completed}
              canUndo={canUndo(trainer)}
              canRestart
              showHistory={session.showHistory}
              onHint={session.showHint}
              onUndo={session.undo}
              onRestart={session.restartGame}
              onFlip={session.flip}
              onToggleHistory={session.toggleHistory}
            />

            {session.showHistory && <MoveHistory startFen={trainer.startFen} playedMoves={getPlayedMoves(trainer)} />}

            <p className="muted small shortcuts">
              <span aria-hidden="true">{EMOJI.keyboard}</span> Shortcuts: <kbd>H</kbd> hint, <kbd>U</kbd> undo, <kbd>R</kbd> restart game, <kbd>F</kbd> flip,{' '}
              <kbd>N</kbd> next game. Click or drag pieces to move.
            </p>
          </aside>
        </main>
      )}

      {view === 'train' && session.showResults && session.summary && (
        <Celebration
          summary={session.summary}
          onTrainAgain={session.restartSet}
          onLibrary={() => {
            session.closeResults()
            setView('library')
          }}
          onClose={session.closeResults}
        />
      )}
    </div>
  )
}
