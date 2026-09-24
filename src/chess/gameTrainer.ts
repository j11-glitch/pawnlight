import { Chess, type Square } from 'chess.js'
import type { ParsedGame } from './moveParser'

/**
 * Immutable trainer state. The board position is never stored: it is always
 * derived by replaying the first `currentMoveIndex` moves from `startFen`.
 * That keeps every operation (attempt, undo, reset) a pure function.
 */
export interface TrainerState {
  readonly startFen: string
  readonly moves: readonly string[]
  readonly currentMoveIndex: number
}

export interface MoveAttempt {
  readonly from: string
  readonly to: string
  readonly promotion?: string
}

export type AttemptOutcome =
  | { readonly kind: 'correct'; readonly san: string; readonly completed: boolean }
  | { readonly kind: 'wrong'; readonly san: string }
  | { readonly kind: 'illegal' }
  | { readonly kind: 'finished' }

export interface AttemptResult {
  readonly state: TrainerState
  readonly outcome: AttemptOutcome
}

export type Side = 'white' | 'black'

export interface Progress {
  /** 1-based number of the move to play next (capped at `total` once completed). */
  readonly moveNumber: number
  readonly total: number
  /** Number of moves recovered so far. */
  readonly completedMoves: number
  readonly percent: number
  readonly completed: boolean
  readonly sideToMove: Side
}

export function createTrainer(game: ParsedGame, currentMoveIndex = 0): TrainerState {
  const index = Math.min(Math.max(0, Math.trunc(currentMoveIndex)), game.moves.length)
  return { startFen: game.startFen, moves: [...game.moves], currentMoveIndex: index }
}

/** Returns a fresh chess.js instance at the current (last correct) position. */
export function buildPosition(state: TrainerState): Chess {
  const chess = new Chess(state.startFen)
  for (let i = 0; i < state.currentMoveIndex; i++) {
    chess.move(state.moves[i])
  }
  return chess
}

export function getExpectedMove(state: TrainerState): string | null {
  return state.moves[state.currentMoveIndex] ?? null
}

export function isCompleted(state: TrainerState): boolean {
  return state.currentMoveIndex >= state.moves.length
}

/**
 * Validates a user move against the expected move.
 * A correct move advances the index; any other move leaves the state untouched,
 * so the board stays at the last correct position.
 */
export function attemptMove(state: TrainerState, attempt: MoveAttempt): AttemptResult {
  if (isCompleted(state)) {
    return { state, outcome: { kind: 'finished' } }
  }

  const chess = buildPosition(state)
  let san: string
  try {
    san = chess.move({ from: attempt.from, to: attempt.to, promotion: attempt.promotion }).san
  } catch {
    return { state, outcome: { kind: 'illegal' } }
  }

  // Both sides of the comparison are chess.js SAN generated from the same position,
  // so string equality is exact (check/mate suffixes, disambiguation, promotion).
  if (san !== getExpectedMove(state)) {
    return { state, outcome: { kind: 'wrong', san } }
  }

  const next: TrainerState = { ...state, currentMoveIndex: state.currentMoveIndex + 1 }
  return { state: next, outcome: { kind: 'correct', san, completed: isCompleted(next) } }
}

export function undoMove(state: TrainerState): TrainerState {
  if (state.currentMoveIndex === 0) return state
  return { ...state, currentMoveIndex: state.currentMoveIndex - 1 }
}

export function resetGame(state: TrainerState): TrainerState {
  return { ...state, currentMoveIndex: 0 }
}

export function getProgress(state: TrainerState): Progress {
  const total = state.moves.length
  const completedMoves = state.currentMoveIndex
  return {
    moveNumber: Math.min(completedMoves + 1, total),
    total,
    completedMoves,
    percent: total === 0 ? 100 : Math.round((completedMoves / total) * 100),
    completed: isCompleted(state),
    sideToMove: buildPosition(state).turn() === 'w' ? 'white' : 'black',
  }
}

/** Moves the user has already recovered. Never includes future moves. */
export function getPlayedMoves(state: TrainerState): readonly string[] {
  return state.moves.slice(0, state.currentMoveIndex)
}

/** From/to squares of the last correct move, for board highlighting. */
export function getLastMove(position: Chess): { from: Square; to: Square } | null {
  const last = position.history({ verbose: true }).at(-1)
  return last ? { from: last.from, to: last.to } : null
}

/** True if moving from -> to is a legal pawn promotion (so a piece must be chosen). */
export function isPromotionMove(position: Chess, from: string, to: string): boolean {
  return position
    .moves({ square: from as Square, verbose: true })
    .some((move) => move.to === to && move.promotion !== undefined)
}

export interface NumberedPly {
  /** Index of the position after this move (1 = after the first move). */
  readonly ply: number
  readonly san: string
}

export interface NumberedMove {
  readonly number: number
  readonly white?: NumberedPly
  readonly black?: NumberedPly
}

/**
 * Groups SAN moves into numbered pairs, handling a start position where Black moves first.
 */
export function numberMoves(startFen: string, moves: readonly string[]): NumberedMove[] {
  const start = new Chess(startFen)
  const result: NumberedMove[] = []
  let number = start.moveNumber()
  let i = 0
  if (start.turn() === 'b' && moves.length > 0) {
    result.push({ number, black: { ply: 1, san: moves[0] } })
    number++
    i = 1
  }
  for (; i < moves.length; i += 2) {
    const black = moves[i + 1] === undefined ? undefined : { ply: i + 2, san: moves[i + 1] }
    result.push({ number, white: { ply: i + 1, san: moves[i] }, black })
    number++
  }
  return result
}

/**
 * Formats SAN moves as numbered lines: ["e4", "e5", "Nf3"] gives ["1. e4 e5", "2. Nf3"].
 * Handles a starting position where Black moves first ("5... Nf6").
 */
export function formatMoveList(startFen: string, moves: readonly string[]): string[] {
  return numberMoves(startFen, moves).map(({ number, white, black }) =>
    white ? [`${number}.`, white.san, black?.san].filter(Boolean).join(' ') : `${number}... ${black?.san}`,
  )
}
