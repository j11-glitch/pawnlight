import { Chess } from 'chess.js'
import { loadMoveSequence } from '../chess/moveParser'
import type { SetGame } from '../chess/trainingSet'

/** Shape of public/puzzles/index.json, written by scripts/import-puzzles.py. */
export interface PuzzleIndex {
  readonly source: string
  readonly categories: readonly PuzzleCategory[]
}

export interface PuzzleCategory {
  readonly slug: string
  readonly title: string
  readonly description: string
  readonly bands: readonly PuzzleBand[]
}

export interface PuzzleBand {
  readonly slug: string
  readonly title: string
  readonly min: number
  readonly max: number | null
  readonly count: number
  /** Path relative to the puzzles folder, e.g. "mate-in-2/casual.json"; null when the band is disabled. */
  readonly file: string | null
}

export function isBandAvailable(band: PuzzleBand): band is PuzzleBand & { file: string } {
  return band.file !== null && band.count > 0
}

/** One Lichess puzzle: the opponent's move comes first, then the solution (UCI). */
export interface RawPuzzle {
  readonly id: string
  readonly fen: string
  readonly moves: string
  readonly rating: number
}

const PUZZLES_URL = `${import.meta.env.BASE_URL}puzzles/`

export async function fetchPuzzleIndex(): Promise<PuzzleIndex> {
  return fetchJson<PuzzleIndex>(`${PUZZLES_URL}index.json`)
}

export async function fetchPuzzles(band: PuzzleBand): Promise<RawPuzzle[]> {
  if (!isBandAvailable(band)) throw new Error(`No puzzles available for ${band.title}.`)
  return fetchJson<RawPuzzle[]>(`${PUZZLES_URL}${band.file}`)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status}).`)
  return (await response.json()) as T
}

export function formatBandRange(band: PuzzleBand): string {
  if (band.min === 0 && band.max !== null) return `< ${band.max}`
  if (band.max === null) return `${band.min}+`
  return `${band.min}-${band.max - 1}`
}

/**
 * Converts a Lichess puzzle to PGN: the UCI moves become SAN (via chess.js) and the
 * user plays the side that moves after the opponent's first move.
 */
export function puzzleToPgn(puzzle: RawPuzzle): string {
  const chess = new Chess(puzzle.fen)
  const playerSide = chess.turn() === 'w' ? 'black' : 'white'
  const san = puzzle.moves.split(' ').map((uci) => {
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san
  })
  return [
    `[Event "Puzzle ${puzzle.id}"]`,
    `[Site "https://lichess.org/training/${puzzle.id}"]`,
    `[FEN "${puzzle.fen}"]`,
    `[PlayerSide "${playerSide}"]`,
    '',
    san.join(' '),
  ].join('\n')
}

export function puzzleToSetGame(puzzle: RawPuzzle, category: PuzzleCategory, band: PuzzleBand): SetGame {
  const pgn = puzzleToPgn(puzzle)
  const parsed = loadMoveSequence(pgn)
  if (!parsed.ok) throw new Error(`Puzzle ${puzzle.id} is invalid: ${parsed.error}`)
  return {
    id: `puzzle:${puzzle.id}`,
    title: `Puzzle ${puzzle.id} (${puzzle.rating})`,
    category: `${category.title} - ${band.title}`,
    pgn,
    game: parsed.game,
  }
}

/** Picks `count` distinct items at random (Fisher-Yates on a copy). */
export function pickRandom<T>(items: readonly T[], count: number, random: () => number = Math.random): T[] {
  const copy = [...items]
  const n = Math.min(count, copy.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}
