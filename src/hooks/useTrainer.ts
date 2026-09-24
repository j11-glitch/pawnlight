import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import {
  attemptMove,
  buildPosition,
  createTrainer,
  getExpectedMove,
  getPlayedMoves,
  getProgress,
  resetGame,
  undoMove,
  type MoveAttempt,
  type Side,
  type TrainerState,
} from '../chess/gameTrainer'
import { loadMoveSequence } from '../chess/moveParser'
import { loadSession, saveSession } from '../storage'

export type FeedbackKind = 'correct' | 'wrong' | 'completed' | 'illegal' | 'info'

export interface Feedback {
  /** Increments on every message so repeated identical messages re-animate. */
  readonly id: number
  readonly kind: FeedbackKind
  readonly text: string
}

const CHECK_MARK = String.fromCharCode(0x2713)
const CROSS_MARK = String.fromCharCode(0x2717)

const MESSAGES: Record<Exclude<FeedbackKind, 'info'>, string> = {
  correct: `${CHECK_MARK} Correct`,
  wrong: `${CROSS_MARK} Wrong move. Try again.`,
  completed: `${CHECK_MARK} Game completed!`,
  illegal: 'Illegal move.',
}

interface InitialState {
  trainer: TrainerState | null
  input: string
  orientation: Side
  showHistory: boolean
}

function restoreInitialState(): InitialState {
  const saved = loadSession()
  const parsed = saved ? loadMoveSequence(saved.input) : null
  if (!saved || !parsed?.ok) {
    return { trainer: null, input: '', orientation: saved?.orientation ?? 'white', showHistory: saved?.showHistory ?? true }
  }
  return {
    trainer: createTrainer(parsed.game, saved.currentMoveIndex),
    input: saved.input,
    orientation: saved.orientation,
    showHistory: saved.showHistory,
  }
}

/** React glue around the pure trainer functions: UI state, feedback and persistence. */
export function useTrainer() {
  const [initial] = useState(restoreInitialState)
  const [trainer, setTrainer] = useState<TrainerState | null>(initial.trainer)
  const [input, setInput] = useState(initial.input)
  const [orientation, setOrientation] = useState<Side>(initial.orientation)
  const [showHistory, setShowHistory] = useState(initial.showHistory)
  const [hint, setHint] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const feedbackId = useRef(0)

  const notify = useCallback((kind: FeedbackKind, text = kind === 'info' ? '' : MESSAGES[kind]) => {
    feedbackId.current += 1
    setFeedback({ id: feedbackId.current, kind, text })
  }, [])

  useEffect(() => {
    if (initial.trainer) {
      const { completedMoves, total } = getProgress(initial.trainer)
      notify('info', `Welcome back. Resumed your session (${completedMoves} of ${total} moves recovered).`)
    }
  }, [initial, notify])

  useEffect(() => {
    if (!trainer) return
    saveSession({
      input,
      currentMoveIndex: trainer.currentMoveIndex,
      completedMoves: getPlayedMoves(trainer),
      orientation,
      showHistory,
    })
  }, [trainer, input, orientation, showHistory])

  const position = useMemo(() => (trainer ? buildPosition(trainer) : new Chess()), [trainer])
  const progress = useMemo(() => (trainer ? getProgress(trainer) : null), [trainer])

  const loadGame = useCallback(
    (text: string): string | null => {
      const result = loadMoveSequence(text)
      if (!result.ok) return result.error
      const next = createTrainer(result.game)
      setTrainer(next)
      setInput(text)
      setHint(null)
      const { total, sideToMove } = getProgress(next)
      notify('info', `Game loaded: ${total} moves. ${sideToMove === 'white' ? 'White' : 'Black'} to move.`)
      return null
    },
    [notify],
  )

  /** Returns true when the move was accepted (the board should keep it). */
  const makeMove = useCallback(
    (attempt: MoveAttempt): boolean => {
      if (!trainer || attempt.from === attempt.to) return false
      const { state, outcome } = attemptMove(trainer, attempt)
      switch (outcome.kind) {
        case 'correct':
          setTrainer(state)
          setHint(null)
          notify(outcome.completed ? 'completed' : 'correct')
          return true
        case 'wrong':
          notify('wrong')
          return false
        case 'illegal':
          notify('illegal')
          return false
        case 'finished':
          return false
      }
    },
    [trainer, notify],
  )

  const showHint = useCallback(() => {
    const expected = trainer && getExpectedMove(trainer)
    if (expected) setHint(expected)
  }, [trainer])

  const undo = useCallback(() => {
    if (!trainer || trainer.currentMoveIndex === 0) return
    setTrainer(undoMove(trainer))
    setHint(null)
    notify('info', 'Undid the last move. Play it again.')
  }, [trainer, notify])

  const restart = useCallback(() => {
    if (!trainer) return
    setTrainer(resetGame(trainer))
    setHint(null)
    notify('info', 'Restarted from move 1.')
  }, [trainer, notify])

  const flip = useCallback(() => setOrientation((o) => (o === 'white' ? 'black' : 'white')), [])
  const toggleHistory = useCallback(() => setShowHistory((s) => !s), [])

  return {
    trainer,
    position,
    progress,
    orientation,
    showHistory,
    hint,
    feedback,
    loadGame,
    makeMove,
    showHint,
    undo,
    restart,
    flip,
    toggleHistory,
  }
}
