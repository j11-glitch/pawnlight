import { Chess, DEFAULT_POSITION, validateFen } from 'chess.js'

/** A validated game: the starting position plus every move in canonical SAN. */
export interface ParsedGame {
  readonly startFen: string
  readonly moves: readonly string[]
  /**
   * Puzzle mode: the side the user plays ('w' or 'b'). The other side's moves are
   * played automatically. Set with the PGN tag [PlayerSide "white"|"black"].
   */
  readonly playerSide?: 'w' | 'b'
}

export type ParseResult =
  | { readonly ok: true; readonly game: ParsedGame }
  | { readonly ok: false; readonly error: string }

// Built from char codes to keep the source ASCII-only.
const HALF = String.fromCharCode(0x00bd) // one-half glyph, as in a compact draw result
const ELLIPSIS = String.fromCharCode(0x2026) // single-glyph "..." used after Black move numbers

const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', `${HALF}-${HALF}`, '*'])
const MOVE_NUMBER = new RegExp(`^\\d+\\s*(\\.+|${ELLIPSIS})`)

/**
 * Parses a plain move list ("e4 e5 Nf3", "e4, e5, Nf3", "1. e4 e5 2. Nf3")
 * or a PGN (headers, comments, variations and NAGs are ignored).
 *
 * Every move is replayed with chess.js, so the returned moves are guaranteed
 * legal and normalized to chess.js SAN (e.g. "0-0" becomes "O-O", "Qh5" becomes "Qh5+").
 */
export function loadMoveSequence(input: string): ParseResult {
  if (!input.trim()) {
    return failure('Please paste a move sequence or PGN.')
  }

  const { fen, playerSide: sideTag, body } = extractHeaders(input)
  let playerSide: 'w' | 'b' | undefined
  if (sideTag !== undefined) {
    const side = sideTag.toLowerCase()
    if (side !== 'white' && side !== 'black') {
      return failure(`Invalid PlayerSide tag "${sideTag}". Use "white" or "black".`)
    }
    playerSide = side === 'white' ? 'w' : 'b'
  }
  let startFen = DEFAULT_POSITION
  if (fen !== undefined) {
    const check = validateFen(fen)
    if (!check.ok) {
      return failure(`Invalid FEN in PGN header: ${check.error ?? fen}`)
    }
    startFen = fen
  }

  const tokens = tokenize(body)
  if (tokens.length === 0) {
    return failure('No moves found in the input.')
  }

  const chess = new Chess(startFen)
  const moves: string[] = []
  for (const token of tokens) {
    const label = plyLabel(chess)
    try {
      moves.push(chess.move(token).san)
    } catch {
      return failure(`Invalid move "${token}" at ${label}. Check the notation and the move order.`)
    }
  }

  return { ok: true, game: playerSide ? { startFen, moves, playerSide } : { startFen, moves } }
}

function failure(error: string): ParseResult {
  return { ok: false, error }
}

/** Removes PGN tag pairs and returns the FEN and PlayerSide tags if present. */
function extractHeaders(input: string): { fen?: string; playerSide?: string; body: string } {
  let fen: string | undefined
  let playerSide: string | undefined
  const body = input.replace(/^\s*\[\s*(\w+)\s+"([^"]*)"\s*\]\s*$/gm, (_, tag: string, value: string) => {
    const name = tag.toLowerCase()
    if (name === 'fen') fen = value.trim()
    if (name === 'playerside') playerSide = value.trim()
    return ''
  })
  return { fen, playerSide, body }
}

function tokenize(body: string): string[] {
  let text = body
    .replace(/\{[^}]*\}/g, ' ') // {comments}
    .replace(/;[^\n]*/g, ' ') // ; rest-of-line comments
    .replace(/\$\d+/g, ' ') // NAGs such as $1

  // Strip (variations), innermost first so nested ones are handled.
  const variation = /\([^()]*\)/g
  while (variation.test(text)) {
    text = text.replace(variation, ' ')
  }

  return text
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token !== '' && !RESULT_TOKENS.has(token))
}

function normalizeToken(raw: string): string {
  if (RESULT_TOKENS.has(raw)) return raw
  return raw
    .replace(MOVE_NUMBER, '') // move numbers: "1.", "1...", "12.Nf3"
    .replace(/e\.p\.$/i, '') // optional en passant marker
    .replace(/[!?]+$/, '') // annotation glyphs: !, ?, !?, ?!
    .replace(/^0-0-0/, 'O-O-O')
    .replace(/^0-0/, 'O-O')
}

/** Human-readable label for the ply about to be played, e.g. "move 3. (White)". */
function plyLabel(chess: Chess): string {
  const number = chess.moveNumber()
  return chess.turn() === 'w' ? `move ${number}. (White)` : `move ${number}... (Black)`
}
