import { describe, expect, it } from 'vitest'
import {
  attemptMove,
  buildPosition,
  canUndo,
  createTrainer,
  getExpectedMove,
  getProgress,
  resetGame,
  undoMove,
} from './gameTrainer'
import { loadMoveSequence } from './moveParser'

function puzzle(pgn: string) {
  const parsed = loadMoveSequence(pgn)
  if (!parsed.ok) throw new Error(parsed.error)
  return createTrainer(parsed.game)
}

// Lichess-style mate in 2: White blunders with 1. f3, Black (the user) mates.
// Moves: f3 (opponent) e5 (user) g4 (opponent) Qh4# (user).
const FOOLS_MATE = '[PlayerSide "black"]\n\nf3 e5 g4 Qh4#'

describe('PlayerSide tag', () => {
  it('marks a game as a puzzle for that side', () => {
    const parsed = loadMoveSequence(FOOLS_MATE)
    expect(parsed.ok && parsed.game.playerSide).toBe('b')
  })

  it('rejects an invalid value', () => {
    const parsed = loadMoveSequence('[PlayerSide "red"]\n\ne4')
    expect(!parsed.ok && parsed.error).toContain('PlayerSide')
  })

  it('leaves normal games without a player side', () => {
    const parsed = loadMoveSequence('e4 e5')
    expect(parsed.ok && parsed.game.playerSide).toBeUndefined()
  })
})

describe('puzzle mode', () => {
  it("plays the opponent's first move automatically", () => {
    const state = puzzle(FOOLS_MATE)
    expect(state.currentMoveIndex).toBe(1)
    expect(getExpectedMove(state)).toBe('e5')
    expect(buildPosition(state).turn()).toBe('b')
  })

  it("plays the opponent's reply after each correct move", () => {
    const { state, outcome } = attemptMove(puzzle(FOOLS_MATE), { from: 'e7', to: 'e5' })
    expect(outcome.kind).toBe('correct')
    expect(state.currentMoveIndex).toBe(3)
    expect(getExpectedMove(state)).toBe('Qh4#')
  })

  it('counts only the user moves in progress', () => {
    const start = puzzle(FOOLS_MATE)
    expect(getProgress(start)).toMatchObject({ moveNumber: 1, total: 2, completedMoves: 0, percent: 0 })
    const after = attemptMove(start, { from: 'e7', to: 'e5' }).state
    expect(getProgress(after)).toMatchObject({ moveNumber: 2, total: 2, completedMoves: 1, percent: 50 })
  })

  it('completes the puzzle on the final move', () => {
    const afterE5 = attemptMove(puzzle(FOOLS_MATE), { from: 'e7', to: 'e5' }).state
    const { state, outcome } = attemptMove(afterE5, { from: 'd8', to: 'h4' })
    expect(outcome).toEqual({ kind: 'correct', san: 'Qh4#', completed: true })
    expect(getProgress(state)).toMatchObject({ completed: true, percent: 100 })
  })

  it('accepts a different checkmate on the final move', () => {
    // Back-rank mate where both Ra8# and Rb8# (via the b-file) mate.
    const state = puzzle('[FEN "6k1/2p2ppp/8/8/8/8/5PPP/RR4K1 b - - 0 1"]\n[PlayerSide "white"]\n\nc6 Ra8#')
    expect(getExpectedMove(state)).toBe('Ra8#')
    const { outcome } = attemptMove(state, { from: 'b1', to: 'b8' })
    expect(outcome).toEqual({ kind: 'correct', san: 'Rb8#', completed: true })
  })

  it('still rejects a non-mating alternative on the final move', () => {
    const state = puzzle('[FEN "6k1/2p2ppp/8/8/8/8/5PPP/RR4K1 b - - 0 1"]\n[PlayerSide "white"]\n\nc6 Ra8#')
    expect(attemptMove(state, { from: 'b1', to: 'b7' }).outcome.kind).toBe('wrong')
  })

  it('does not accept alternative mates outside puzzle mode', () => {
    const game = loadMoveSequence('[FEN "6k1/5ppp/8/8/8/8/5PPP/RR4K1 w - - 0 1"]\n\nRa8#')
    if (!game.ok) throw new Error(game.error)
    expect(attemptMove(createTrainer(game.game), { from: 'b1', to: 'b8' }).outcome.kind).toBe('wrong')
  })

  it("undo takes back the user's move and the opponent's reply", () => {
    const afterE5 = attemptMove(puzzle(FOOLS_MATE), { from: 'e7', to: 'e5' }).state
    const undone = undoMove(afterE5)
    expect(undone.currentMoveIndex).toBe(1)
    expect(getExpectedMove(undone)).toBe('e5')
  })

  it("cannot undo the opponent's opening move", () => {
    const start = puzzle(FOOLS_MATE)
    expect(canUndo(start)).toBe(false)
    expect(undoMove(start)).toBe(start)
  })

  it("restart goes back to the user's first move", () => {
    const afterE5 = attemptMove(puzzle(FOOLS_MATE), { from: 'e7', to: 'e5' }).state
    expect(resetGame(afterE5).currentMoveIndex).toBe(1)
  })

  it('keeps the normal behaviour for games', () => {
    const game = loadMoveSequence('e4 e5')
    if (!game.ok) throw new Error(game.error)
    const state = createTrainer(game.game)
    expect(state.currentMoveIndex).toBe(0)
    expect(canUndo(state)).toBe(false)
    expect(canUndo(attemptMove(state, { from: 'e2', to: 'e4' }).state)).toBe(true)
  })
})
