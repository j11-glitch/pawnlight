import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'

// PgnView parses these at import time, so one broken file would break the whole app.
const files = import.meta.glob<string>('../../pgns/*/*.pgn', { query: '?raw', import: 'default', eager: true })

describe('bundled pgns folder', () => {
  const entries = Object.entries(files).map(([path, text]) => [path.replace(/^.*?\/pgns\//, ''), text] as const)

  it('contains games', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it.each(entries)('%s is a valid game', (_, text) => {
    const chess = new Chess()
    expect(() => chess.loadPgn(text)).not.toThrow()
    expect(chess.history().length).toBeGreaterThan(0)
  })
})
