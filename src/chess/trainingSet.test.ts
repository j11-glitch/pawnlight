import { describe, expect, it } from 'vitest'
import { getExpectedMove } from './gameTrainer'
import { loadMoveSequence } from './moveParser'
import {
  canAdvance,
  createTrainingSet,
  getCurrentGame,
  getSetProgress,
  getSetSummary,
  isSetPassed,
  nextGame,
  playMove,
  restartSet,
  restoreTrainingSet,
  takeHint,
  undoInSet,
  type SetGame,
  type TrainingSet,
} from './trainingSet'

function setGame(id: string, pgn: string): SetGame {
  const parsed = loadMoveSequence(pgn)
  if (!parsed.ok) throw new Error(parsed.error)
  return { id, title: id, category: 'Test', pgn, game: parsed.game }
}

const gameA = setGame('a', 'e4 e5')
const gameB = setGame('b', 'd4')

function play(set: TrainingSet, ...moves: string[]): TrainingSet {
  return moves.reduce((current, uci) => {
    const result = playMove(current, { from: uci.slice(0, 2), to: uci.slice(2, 4) })
    expect(result.outcome.kind).toBe('correct')
    return result.set
  }, set)
}

describe('training set', () => {
  it('starts at the first game', () => {
    const set = createTrainingSet([gameA, gameB])
    expect(getCurrentGame(set).id).toBe('a')
    expect(getSetProgress(set)).toEqual({ gameNumber: 1, totalGames: 2, completedGames: 0 })
    expect(isSetPassed(set)).toBe(false)
  })

  it('requires the current game to be completed before advancing', () => {
    const set = play(createTrainingSet([gameA, gameB]), 'e2e4')
    expect(canAdvance(set)).toBe(false)
    expect(nextGame(set)).toBe(set)
  })

  it('advances after completing a game and passes when all games are completed', () => {
    let set = play(createTrainingSet([gameA, gameB]), 'e2e4', 'e7e5')
    expect(canAdvance(set)).toBe(true)
    expect(isSetPassed(set)).toBe(false)

    set = nextGame(set)
    expect(getCurrentGame(set).id).toBe('b')
    expect(set.trainer.currentMoveIndex).toBe(0)

    set = play(set, 'd2d4')
    expect(canAdvance(set)).toBe(false)
    expect(isSetPassed(set)).toBe(true)
    expect(getSetProgress(set)).toMatchObject({ completedGames: 2 })
  })

  it('counts mistakes and hints for the current game only', () => {
    let set = createTrainingSet([gameA, gameB])
    set = playMove(set, { from: 'd2', to: 'd4' }).set
    set = playMove(set, { from: 'c2', to: 'c4' }).set
    const hinted = takeHint(set)
    expect(hinted.hint).toBe('e4')
    expect(hinted.set.stats).toEqual([
      { mistakes: 2, hints: 1, completed: false },
      { mistakes: 0, hints: 0, completed: false },
    ])
  })

  it('does not count illegal moves as mistakes', () => {
    const set = playMove(createTrainingSet([gameA]), { from: 'e2', to: 'e5' }).set
    expect(set.stats[0].mistakes).toBe(0)
  })

  it('keeps a game completed after undoing its last move', () => {
    const set = undoInSet(play(createTrainingSet([gameA]), 'e2e4', 'e7e5'))
    expect(getExpectedMove(set.trainer)).toBe('e5')
    expect(set.stats[0].completed).toBe(true)
  })

  it('restartSet goes back to the first game with fresh stats', () => {
    const done = play(nextGame(play(createTrainingSet([gameA, gameB]), 'e2e4', 'e7e5')), 'd2d4')
    const again = restartSet(done)
    expect(getCurrentGame(again).id).toBe('a')
    expect(isSetPassed(again)).toBe(false)
    expect(again.stats.every((s) => !s.completed && s.mistakes === 0)).toBe(true)
  })

  it('shuffles with an injectable random source', () => {
    const set = createTrainingSet([gameA, gameB, setGame('c', 'c4')], { shuffle: true, random: () => 0 })
    expect(set.games.map((g) => g.id)).toEqual(['b', 'c', 'a'])
  })

  it('rejects an empty set', () => {
    expect(() => createTrainingSet([])).toThrow()
  })

  it('restores a saved set and rejects mismatched data', () => {
    const stats = [
      { mistakes: 1, hints: 0, completed: true },
      { mistakes: 0, hints: 0, completed: false },
    ]
    const restored = restoreTrainingSet([gameA, gameB], { currentGameIndex: 1, currentMoveIndex: 0, stats })
    expect(restored && getCurrentGame(restored).id).toBe('b')
    expect(restoreTrainingSet([gameA], { currentGameIndex: 1, currentMoveIndex: 0, stats })).toBeNull()
  })
})

describe('getSetSummary', () => {
  const stats = (mistakes: number, hints: number) => ({ mistakes, hints, completed: true })
  const summaryFor = (s: TrainingSet['stats']) => getSetSummary({ ...createTrainingSet([gameA, gameB]), stats: s })

  it('gives three stars for a flawless set', () => {
    expect(summaryFor([stats(0, 0), stats(0, 0)])).toEqual({
      games: 2,
      moves: 3,
      mistakes: 0,
      hints: 0,
      accuracy: 100,
      stars: 3,
    })
  })

  it('gives two stars for high accuracy with few hints', () => {
    const long = setGame('long', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7')
    const set = { ...createTrainingSet([long]), stats: [stats(1, 1)] }
    expect(getSetSummary(set)).toMatchObject({ accuracy: 91, stars: 2 })
  })

  it('gives one star otherwise', () => {
    expect(summaryFor([stats(3, 0), stats(0, 0)])).toMatchObject({ accuracy: 50, stars: 1 })
    expect(summaryFor([stats(0, 2), stats(0, 1)]).stars).toBe(1)
  })
})
