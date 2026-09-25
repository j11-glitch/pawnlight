import { describe, expect, it } from 'vitest'
import { attemptMove, getProgress } from '../chess/gameTrainer'
import { createTrainingSet } from '../chess/trainingSet'
import {
  fetchPuzzles,
  formatBandRange,
  isBandAvailable,
  pickRandom,
  puzzleToPgn,
  puzzleToSetGame,
  type PuzzleBand,
  type PuzzleCategory,
  type PuzzleIndex,
  type RawPuzzle,
} from './puzzleLibrary'

// A real Lichess mate-in-2 from the bundled data (Black to play after White's blunder).
const SAMPLE: RawPuzzle = {
  id: 'XwD3t',
  fen: 'rnb1k2r/ppp3p1/4q2p/4Qp2/7B/2P1bN2/P1P3PP/RK3B1R w kq - 1 15',
  moves: 'e5g7 e6b6 f1b5 b6b5',
  rating: 1002,
}
const BAND: PuzzleBand = { slug: 'casual', title: 'Casual', min: 1000, max: 1400, count: 1, file: 'x/casual.json' }
const CATEGORY: PuzzleCategory = { slug: 'mate-in-2', title: 'Mate in 2', description: '', bands: [BAND] }

describe('puzzleToPgn', () => {
  it('converts UCI moves to SAN and sets the player side', () => {
    const pgn = puzzleToPgn(SAMPLE)
    expect(pgn).toContain('[FEN "rnb1k2r/ppp3p1/4q2p/4Qp2/7B/2P1bN2/P1P3PP/RK3B1R w kq - 1 15"]')
    expect(pgn).toContain('[PlayerSide "black"]')
    expect(pgn.split('\n').at(-1)).toBe('Qxg7 Qb6+ Bb5+ Qxb5#')
  })
})

describe('puzzleToSetGame', () => {
  it('creates a playable puzzle that starts after the opponent move', () => {
    const game = puzzleToSetGame(SAMPLE, CATEGORY, BAND)
    expect(game).toMatchObject({ id: 'puzzle:XwD3t', title: 'Puzzle XwD3t (1002)', category: 'Mate in 2 - Casual' })

    const set = createTrainingSet([game])
    expect(getProgress(set.trainer)).toMatchObject({ moveNumber: 1, total: 2, sideToMove: 'black' })
    const first = attemptMove(set.trainer, { from: 'e6', to: 'b6' })
    expect(first.outcome.kind).toBe('correct')
    const mate = attemptMove(first.state, { from: 'b6', to: 'b5' })
    expect(mate.outcome).toMatchObject({ kind: 'correct', completed: true })
  })
})

describe('pickRandom', () => {
  it('returns distinct items and caps at the list size', () => {
    const items = [1, 2, 3, 4, 5]
    const picked = pickRandom(items, 3, () => 0.5)
    expect(new Set(picked).size).toBe(3)
    expect(pickRandom(items, 10)).toHaveLength(5)
    expect(items).toEqual([1, 2, 3, 4, 5])
  })
})

describe('formatBandRange', () => {
  it('formats open and closed ranges', () => {
    expect(formatBandRange({ ...BAND, min: 0, max: 1000 })).toBe('< 1000')
    expect(formatBandRange(BAND)).toBe('1000-1399')
    expect(formatBandRange({ ...BAND, min: 2200, max: null })).toBe('2200+')
  })
})

describe('bundled puzzle files', () => {
  const index = import.meta.glob<PuzzleIndex>('../../public/puzzles/index.json', { eager: true, import: 'default' })
  const files = import.meta.glob<RawPuzzle[]>('../../public/puzzles/*/*.json', { eager: true, import: 'default' })
  const puzzleIndex = Object.values(index)[0]

  const bands = puzzleIndex.categories.flatMap((c) => c.bands)

  it('has an index that matches the files', () => {
    for (const band of bands.filter(isBandAvailable)) {
      expect(files[`../../public/puzzles/${band.file}`], band.file).toHaveLength(band.count)
    }
    expect(Object.keys(files)).toHaveLength(bands.filter(isBandAvailable).length)
  })

  it('has 7,000 Casual and 3,000 Intermediate puzzles, other levels disabled', () => {
    const totals: Record<string, number> = {}
    for (const band of bands) totals[band.slug] = (totals[band.slug] ?? 0) + band.count
    expect(totals).toEqual({ beginner: 0, casual: 7000, intermediate: 3000, advanced: 0, expert: 0 })
    expect(bands.filter((b) => !isBandAvailable(b)).every((b) => b.file === null)).toBe(true)
  })

  it('refuses to fetch a disabled band', async () => {
    const disabled = bands.find((b) => !isBandAvailable(b))
    await expect(fetchPuzzles(disabled!)).rejects.toThrow('No puzzles available')
  })

  it('keeps every puzzle inside its band rating range', () => {
    for (const band of bands.filter(isBandAvailable)) {
      for (const puzzle of files[`../../public/puzzles/${band.file}`]) {
        expect(puzzle.rating, puzzle.id).toBeGreaterThanOrEqual(band.min)
        if (band.max !== null) expect(puzzle.rating, puzzle.id).toBeLessThan(band.max)
      }
    }
  })

  it('contains only valid puzzles', () => {
    for (const category of puzzleIndex.categories) {
      for (const band of category.bands.filter(isBandAvailable)) {
        for (const puzzle of files[`../../public/puzzles/${band.file}`]) {
          expect(() => puzzleToSetGame(puzzle, category, band), puzzle.id).not.toThrow()
        }
      }
    }
  }, 30_000) // replays all 10,000 puzzles
})
