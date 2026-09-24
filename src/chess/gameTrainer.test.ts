import { describe, expect, it } from 'vitest'
import {
  attemptMove,
  buildPosition,
  createTrainer,
  formatMoveList,
  getExpectedMove,
  getPlayedMoves,
  getProgress,
  isPromotionMove,
  resetGame,
  undoMove,
  type MoveAttempt,
  type TrainerState,
} from './gameTrainer'
import { loadMoveSequence } from './moveParser'

function trainer(input: string, index = 0): TrainerState {
  const result = loadMoveSequence(input)
  if (!result.ok) throw new Error(result.error)
  return createTrainer(result.game, index)
}

/** Plays a series of from-to moves (e.g. "e2e4 e7e5"), asserting each is correct. */
function play(state: TrainerState, moves: string): TrainerState {
  return moves.split(' ').reduce((current, uci) => {
    const { state: next, outcome } = attemptMove(current, uciToAttempt(uci))
    expect(outcome.kind, `expected ${uci} to be correct`).toBe('correct')
    return next
  }, state)
}

function uciToAttempt(uci: string): MoveAttempt {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}

describe('attemptMove', () => {
  it('accepts the expected move and advances', () => {
    const state = trainer('e4 e5 Nf3')
    const { state: next, outcome } = attemptMove(state, { from: 'e2', to: 'e4' })

    expect(outcome).toEqual({ kind: 'correct', san: 'e4', completed: false })
    expect(next.currentMoveIndex).toBe(1)
    expect(getExpectedMove(next)).toBe('e5')
  })

  it('rejects a legal but wrong move and leaves the state unchanged', () => {
    const state = trainer('e4 e5 Nf3')
    const { state: next, outcome } = attemptMove(state, { from: 'd2', to: 'd4' })

    expect(outcome).toEqual({ kind: 'wrong', san: 'd4' })
    expect(next).toBe(state)
    expect(next.currentMoveIndex).toBe(0)
    expect(buildPosition(next).fen()).toBe(buildPosition(state).fen())
  })

  it('keeps the board at the last correct position after a wrong reply', () => {
    const afterE4 = play(trainer('e4 e5 Nf3 Nc6'), 'e2e4')
    const fenAfterE4 = buildPosition(afterE4).fen()

    const wrong = attemptMove(afterE4, { from: 'c7', to: 'c5' })
    expect(wrong.outcome.kind).toBe('wrong')
    expect(buildPosition(wrong.state).fen()).toBe(fenAfterE4)
    expect(getProgress(wrong.state)).toMatchObject({ moveNumber: 2, sideToMove: 'black' })

    const right = attemptMove(wrong.state, { from: 'e7', to: 'e5' })
    expect(right.outcome.kind).toBe('correct')
    expect(getProgress(right.state)).toMatchObject({ moveNumber: 3, total: 4, sideToMove: 'white' })
  })

  it('reports illegal moves separately from wrong moves', () => {
    const state = trainer('e4 e5')
    expect(attemptMove(state, { from: 'e2', to: 'e5' }).outcome.kind).toBe('illegal')
    expect(attemptMove(state, { from: 'e7', to: 'e5' }).outcome.kind).toBe('illegal') // not Black's turn
  })

  it('marks the game completed after the last move and ignores further attempts', () => {
    const done = play(trainer('e4 e5'), 'e2e4 e7e5')
    expect(getProgress(done)).toMatchObject({ completed: true, percent: 100, moveNumber: 2, total: 2 })
    expect(attemptMove(done, { from: 'g1', to: 'f3' }).outcome.kind).toBe('finished')
  })

  it('flags completion on the final correct move', () => {
    const { outcome } = attemptMove(trainer('e4 e5', 1), { from: 'e7', to: 'e5' })
    expect(outcome).toEqual({ kind: 'correct', san: 'e5', completed: true })
  })
})

describe('special moves', () => {
  it('handles kingside castling', () => {
    const state = play(trainer('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O'), 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5')
    const { state: next, outcome } = attemptMove(state, { from: 'e1', to: 'g1' })
    expect(outcome).toMatchObject({ kind: 'correct', san: 'O-O' })
    expect(buildPosition(next).get('f1')).toEqual({ type: 'r', color: 'w' })
  })

  it('handles queenside castling', () => {
    const state = trainer('d4 d5 Nc3 Nc6 Bf4 Bf5 Qd2 Qd7 O-O-O', 8)
    expect(attemptMove(state, { from: 'e1', to: 'c1' }).outcome).toMatchObject({ san: 'O-O-O' })
  })

  it('handles captures', () => {
    const state = trainer('e4 d5 exd5', 2)
    expect(attemptMove(state, { from: 'e4', to: 'd5' }).outcome).toMatchObject({ kind: 'correct', san: 'exd5' })
  })

  it('handles captures with check (Bxc6+)', () => {
    const state = trainer('e4 e5 Nf3 Nc6 Bb5 d6 Bxc6+', 6)
    expect(attemptMove(state, { from: 'b5', to: 'c6' }).outcome).toMatchObject({ kind: 'correct', san: 'Bxc6+' })
  })

  it('handles check notation even when the input omitted "+"', () => {
    const state = trainer('e4 e5 Nf3 d6 Bb5', 4)
    const { state: next, outcome } = attemptMove(state, { from: 'f1', to: 'b5' })
    expect(outcome).toMatchObject({ kind: 'correct', san: 'Bb5+' })
    expect(buildPosition(next).inCheck()).toBe(true)
  })

  it('handles checkmate', () => {
    const state = trainer('f3 e5 g4 Qh4', 3)
    const { state: next, outcome } = attemptMove(state, { from: 'd8', to: 'h4' })
    expect(outcome).toEqual({ kind: 'correct', san: 'Qh4#', completed: true })
    expect(buildPosition(next).isCheckmate()).toBe(true)
  })

  it('handles en passant', () => {
    const state = trainer('e4 a6 e5 d5 exd6', 4)
    const { state: next, outcome } = attemptMove(state, { from: 'e5', to: 'd6' })
    expect(outcome).toMatchObject({ kind: 'correct', san: 'exd6' })
    expect(buildPosition(next).get('d5')).toBeUndefined()
  })

  it('handles promotion and rejects the wrong promotion piece', () => {
    const state = trainer('e4 d5 exd5 c6 dxc6 Nf6 cxb7 Nbd7 bxa8=Q', 8)
    const position = buildPosition(state)
    expect(isPromotionMove(position, 'b7', 'a8')).toBe(true)
    expect(isPromotionMove(position, 'g1', 'f3')).toBe(false)

    expect(attemptMove(state, { from: 'b7', to: 'a8', promotion: 'n' }).outcome).toEqual({
      kind: 'wrong',
      san: 'bxa8=N',
    })
    expect(attemptMove(state, { from: 'b7', to: 'c8', promotion: 'q' }).outcome.kind).toBe('wrong')
    expect(attemptMove(state, { from: 'b7', to: 'a8', promotion: 'q' }).outcome).toMatchObject({
      kind: 'correct',
      san: 'bxa8=Q',
    })
  })
})

describe('undoMove / resetGame', () => {
  it('undo returns to the position after the previous correct move', () => {
    const afterE4 = play(trainer('e4 e5 Nf3'), 'e2e4')
    const afterE5 = play(afterE4, 'e7e5')

    const undone = undoMove(afterE5)
    expect(undone.currentMoveIndex).toBe(1)
    expect(buildPosition(undone).fen()).toBe(buildPosition(afterE4).fen())
    expect(getExpectedMove(undone)).toBe('e5')
    expect(attemptMove(undone, { from: 'e7', to: 'e5' }).outcome.kind).toBe('correct')
  })

  it('undo at the start is a no-op', () => {
    const state = trainer('e4')
    expect(undoMove(state)).toBe(state)
  })

  it('reset returns to move 1 and keeps the sequence', () => {
    const state = play(trainer('e4 e5 Nf3'), 'e2e4 e7e5')
    const reset = resetGame(state)
    expect(reset.currentMoveIndex).toBe(0)
    expect(reset.moves).toEqual(['e4', 'e5', 'Nf3'])
    expect(getProgress(reset)).toMatchObject({ moveNumber: 1, total: 3, percent: 0, sideToMove: 'white' })
  })
})

describe('progress and history', () => {
  it('reports progress as described in the spec', () => {
    const state = trainer('e4 e5 Nf3 Nc6')
    expect(getProgress(state)).toEqual({
      moveNumber: 1,
      total: 4,
      completedMoves: 0,
      percent: 0,
      completed: false,
      sideToMove: 'white',
    })
    expect(getProgress(trainer('e4 e5 Nf3', 2)).percent).toBe(67)
  })

  it('never exposes future moves in the played history', () => {
    const state = trainer('e4 e5 Nf3 Nc6 Bb5', 2)
    expect(getPlayedMoves(state)).toEqual(['e4', 'e5'])
  })

  it('clamps a restored index into range', () => {
    expect(trainer('e4 e5', 99).currentMoveIndex).toBe(2)
    expect(trainer('e4 e5', -3).currentMoveIndex).toBe(0)
  })

  it('formats the move list with move numbers', () => {
    const start = trainer('e4').startFen
    expect(formatMoveList(start, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])).toEqual(['1. e4 e5', '2. Nf3 Nc6', '3. Bb5'])
    expect(formatMoveList('4k3/8/8/8/8/8/8/4K3 b - - 0 7', ['Kd7', 'Kd2'])).toEqual(['7... Kd7', '8. Kd2'])
  })
})
