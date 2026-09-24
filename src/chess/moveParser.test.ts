import { describe, expect, it } from 'vitest'
import { DEFAULT_POSITION } from 'chess.js'
import { loadMoveSequence } from './moveParser'

function movesOf(input: string): readonly string[] {
  const result = loadMoveSequence(input)
  if (!result.ok) throw new Error(result.error)
  return result.game.moves
}

describe('loadMoveSequence', () => {
  it('parses a space-separated move list', () => {
    expect(movesOf('e4 e5 Nf3 Nc6 Bb5 a6')).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'])
  })

  it('parses a comma-separated move list', () => {
    expect(movesOf('e4, e5, Nf3,Nc6 ,  Bb5, a6')).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'])
  })

  it('ignores move numbers in every common style', () => {
    expect(movesOf('1. e4 e5 2.Nf3 2... Nc6 3.Bb5')).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
  })

  it('parses a full PGN with headers, comments, variations, NAGs and result', () => {
    const pgn = `[Event "Example"]
[White "Player A"]
[Black "Player B"]

1. e4 e5 {King's pawn} 2. Nf3 Nc6 (2... d6 3. d4 (3. Bc4)) 3. Bb5 $1 a6!?
4. Ba4 Nf6 5. O-O Be7 ; main line
1-0`
    expect(movesOf(pgn)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'])
  })

  it('normalizes SAN via chess.js (castling zeros, missing check suffix)', () => {
    expect(movesOf('e4 e5 Nf3 Nc6 Bc4 Bc5 0-0')).toContain('O-O')
    expect(movesOf('e4 e5 Nf3 d6 Bb5')).toEqual(['e4', 'e5', 'Nf3', 'd6', 'Bb5+'])
  })

  it('starts from the default position without a FEN header', () => {
    const result = loadMoveSequence('e4')
    expect(result.ok && result.game.startFen).toBe(DEFAULT_POSITION)
  })

  it('honours a FEN header', () => {
    const fen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1'
    const result = loadMoveSequence(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. a8=Q+`)
    expect(result).toEqual({ ok: true, game: { startFen: fen, moves: ['a8=Q+'] } })
  })

  it('reports an illegal move with its position in the game', () => {
    const result = loadMoveSequence('e4 e5 Nf3 Nc6 Bb5 a6 Bb5 Nf6')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('"Bb5"')
    expect(!result.ok && result.error).toContain('move 4. (White)')
  })

  it('reports nonsense tokens', () => {
    const result = loadMoveSequence('e4 banana')
    expect(!result.ok && result.error).toContain('"banana" at move 1... (Black)')
  })

  it('rejects empty input and input without moves', () => {
    expect(loadMoveSequence('   ').ok).toBe(false)
    expect(loadMoveSequence('[Event "x"]\n\n*').ok).toBe(false)
  })

  it('rejects an invalid FEN header', () => {
    const result = loadMoveSequence('[FEN "not a fen"]\n\n1. e4')
    expect(!result.ok && result.error).toMatch(/Invalid FEN/)
  })
})
