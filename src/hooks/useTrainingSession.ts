import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { buildPosition, canUndo, getProgress, startingSide, type MoveAttempt, type Side } from '../chess/gameTrainer'
import { loadMoveSequence } from '../chess/moveParser'
import {
  canAdvance,
  createTrainingSet,
  getCurrentGame,
  getSetSummary,
  isSetPassed,
  nextGame,
  playMove,
  restartCurrentGame,
  restartSet,
  restoreTrainingSet,
  takeHint,
  undoInSet,
  type SetGame,
  type TrainingSet,
} from '../chess/trainingSet'
import { loadSession, saveSession, type SavedSession } from '../storage'
import { CHECK_MARK, CROSS_MARK } from '../symbols'

export type FeedbackKind = 'correct' | 'wrong' | 'completed' | 'illegal' | 'info'

export interface Feedback {
  /** Increments on every message so repeated identical messages re-animate. */
  readonly id: number
  readonly kind: FeedbackKind
  readonly text: string
}

const MESSAGES = {
  correct: `${CHECK_MARK} Correct`,
  wrong: `${CROSS_MARK} Wrong move. Try again.`,
  completed: `${CHECK_MARK} Game completed!`,
  illegal: 'Illegal move.',
} as const

function restoreSet(saved: SavedSession | null): TrainingSet | null {
  if (!saved?.set) return null
  const games: SetGame[] = []
  for (const g of saved.set.games) {
    const parsed = loadMoveSequence(g.pgn)
    if (!parsed.ok) return null
    games.push({ id: g.id, title: g.title ?? g.id, category: g.category ?? '', pgn: g.pgn, game: parsed.game })
  }
  return restoreTrainingSet(games, saved.set)
}

/** React glue around the pure training-set functions: UI state, feedback and persistence. */
export function useTrainingSession() {
  const [saved] = useState(loadSession)
  const [initialSet] = useState(() => restoreSet(saved))
  const [set, setSet] = useState<TrainingSet | null>(initialSet)
  // The side that moves first is at the bottom when a game starts; Flip only changes the current view.
  const [orientation, setOrientation] = useState<Side>(() =>
    initialSet ? startingSide(getCurrentGame(initialSet).game) : 'white',
  )
  const [showHistory, setShowHistory] = useState(saved?.showHistory ?? true)
  const [hint, setHint] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [showResults, setShowResults] = useState(false)
  /** The last rejected move, shown as a pop-up on the board until dismissed. */
  const [wrongMove, setWrongMove] = useState<{ id: number; san: string } | null>(null)
  const feedbackId = useRef(0)

  const notify = useCallback((kind: FeedbackKind, text?: string) => {
    feedbackId.current += 1
    setFeedback({ id: feedbackId.current, kind, text: text ?? (kind === 'info' ? '' : MESSAGES[kind]) })
  }, [])

  useEffect(() => {
    if (initialSet) {
      const { title } = getCurrentGame(initialSet)
      notify('info', `Welcome back. Resumed "${title}" where you stopped.`)
    }
  }, [initialSet, notify])

  useEffect(() => {
    saveSession({
      set: set && {
        games: set.games.map(({ id, title, category, pgn }) => ({ id, title, category, pgn })),
        currentGameIndex: set.currentGameIndex,
        currentMoveIndex: set.trainer.currentMoveIndex,
        stats: set.stats,
      },
      orientation,
      showHistory,
    })
  }, [set, orientation, showHistory])

  /** Turns the board so the side that moves first in the current game or puzzle is at the bottom. */
  const faceStartingSide = useCallback((next: TrainingSet) => {
    setOrientation(startingSide(getCurrentGame(next).game))
  }, [])

  const trainer = set?.trainer ?? null
  const position = useMemo(() => (trainer ? buildPosition(trainer) : new Chess()), [trainer])
  const progress = useMemo(() => (trainer ? getProgress(trainer) : null), [trainer])

  const startSet = useCallback(
    (games: readonly SetGame[], shuffle = false) => {
      const next = createTrainingSet(games, { shuffle })
      setSet(next)
      faceStartingSide(next)
      setHint(null)
      setWrongMove(null)
      setShowResults(false)
      const first = getCurrentGame(next)
      const puzzles = first.game.playerSide !== undefined
      const noun = puzzles ? 'puzzles' : 'games'
      const intro = puzzles ? `Find the best move for ${first.game.playerSide === 'w' ? 'White' : 'Black'}.` : ''
      notify(
        'info',
        games.length === 1
          ? `Loaded "${first.title}". ${intro}`.trim()
          : `Set started: ${games.length} ${noun}. First up: "${first.title}". ${intro}`.trim(),
      )
    },
    [notify, faceStartingSide],
  )

  /** Returns true when the move was accepted (the board should keep it). */
  const makeMove = useCallback(
    (attempt: MoveAttempt): boolean => {
      if (!set || attempt.from === attempt.to) return false
      const { set: next, outcome } = playMove(set, attempt)
      setSet(next)
      switch (outcome.kind) {
        case 'correct':
          setHint(null)
          setWrongMove(null)
          const puzzle = getCurrentGame(next).game.playerSide !== undefined
          if (!outcome.completed) notify('correct')
          else if (isSetPassed(next)) {
            const all = puzzle ? 'All puzzles solved' : 'All games completed'
            const single = puzzle ? `${CHECK_MARK} Puzzle solved!` : undefined
            notify('completed', next.games.length > 1 ? `${CHECK_MARK} ${all}. Set passed!` : single)
            // Celebrate only the transition into "passed", not replays after an undo.
            if (!isSetPassed(set)) setShowResults(true)
          } else notify('completed', puzzle ? `${CHECK_MARK} Puzzle solved!` : undefined)
          return true
        case 'wrong':
          notify('wrong')
          setWrongMove({ id: feedbackId.current, san: outcome.san })
          return false
        case 'illegal':
          notify('illegal')
          return false
        case 'finished':
          return false
      }
    },
    [set, notify],
  )

  const showHint = useCallback(() => {
    if (!set || hint) return
    const result = takeHint(set)
    if (result.hint) {
      setSet(result.set)
      setHint(result.hint)
    }
  }, [set, hint])

  const undo = useCallback(() => {
    if (!set || !canUndo(set.trainer)) return
    setSet(undoInSet(set))
    setHint(null)
    setWrongMove(null)
    notify('info', 'Undid the last move. Play it again.')
  }, [set, notify])

  const restartGame = useCallback(() => {
    if (!set) return
    setSet(restartCurrentGame(set))
    faceStartingSide(set)
    setHint(null)
    setWrongMove(null)
    const puzzle = getCurrentGame(set).game.playerSide !== undefined
    notify('info', puzzle ? 'Restarted this puzzle.' : 'Restarted this game from move 1.')
  }, [set, notify, faceStartingSide])

  const restartWholeSet = useCallback(() => {
    if (!set) return
    const next = restartSet(set)
    setSet(next)
    faceStartingSide(next)
    setHint(null)
    setWrongMove(null)
    setShowResults(false)
    notify('info', 'Restarted the set from the first game.')
  }, [set, notify, faceStartingSide])

  const goToNextGame = useCallback(() => {
    if (!set || !canAdvance(set)) return
    const next = nextGame(set)
    setSet(next)
    faceStartingSide(next)
    setHint(null)
    setWrongMove(null)
    const current = getCurrentGame(next)
    const noun = current.game.playerSide ? 'Puzzle' : 'Game'
    notify('info', `${noun} ${next.currentGameIndex + 1} of ${next.games.length}: "${current.title}".`)
  }, [set, notify, faceStartingSide])

  const dismissWrongMove = useCallback(() => setWrongMove(null), [])
  const openResults = useCallback(() => setShowResults(true), [])
  const closeResults = useCallback(() => setShowResults(false), [])
  const flip = useCallback(() => setOrientation((o) => (o === 'white' ? 'black' : 'white')), [])
  const toggleHistory = useCallback(() => setShowHistory((s) => !s), [])

  return {
    set,
    trainer,
    position,
    progress,
    orientation,
    showHistory,
    hint,
    feedback,
    wrongMove,
    dismissWrongMove,
    isPuzzle: set ? getCurrentGame(set).game.playerSide !== undefined : false,
    passed: set ? isSetPassed(set) : false,
    summary: set ? getSetSummary(set) : null,
    showResults,
    openResults,
    closeResults,
    canAdvance: set ? canAdvance(set) : false,
    startSet,
    makeMove,
    showHint,
    undo,
    restartGame,
    restartSet: restartWholeSet,
    nextGame: goToNextGame,
    flip,
    toggleHistory,
  }
}
