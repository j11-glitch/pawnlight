import { describe, expect, it } from 'vitest'
import { buildLibrary, humanize, splitPgnGames } from './gameLibrary'
import { library } from './index'

describe('buildLibrary', () => {
  it('groups games by folder and orders them naturally', () => {
    const result = buildLibrary({
      'french/10-change-9.pgn': '1. e4 e6',
      'french/02-change-1.pgn': '1. e4 e6 2. d4',
      'french/01-start-1.pgn': '1. e4 e6 2. d4 d5',
      'italian/01-giuoco-piano.pgn': '1. e4 e5',
    })
    expect(result.map((c) => c.name)).toEqual(['French', 'Italian'])
    expect(result[0].games.map((g) => g.title)).toEqual(['Start 1', 'Change 1', 'Change 9'])
    expect(result[0].games[0]).toMatchObject({ id: 'french/01-start-1.pgn', category: 'French' })
    expect(result[0].games[0].game?.moves).toEqual(['e4', 'e6', 'd4', 'd5'])
  })

  it('uses the [Event] and [Opening] tags when present', () => {
    const [category] = buildLibrary({
      'x/01-a.pgn': '[Event "Main line"]\n[Opening "French Defence"]\n\n1. e4 e6',
      'x/02-b.pgn': '[Event "?"]\n\n1. d4',
    })
    expect(category.games.map((g) => [g.title, g.opening])).toEqual([
      ['Main line', 'French Defence'],
      ['B', undefined],
    ])
  })

  it('supports nested folders and files at the root', () => {
    const result = buildLibrary({ 'french/advance/01-main.pgn': '1. e4', 'loose.pgn': '1. d4' })
    expect(result.map((c) => c.name)).toEqual(['French / Advance', 'Uncategorized'])
  })

  it('splits files that contain several games', () => {
    const [category] = buildLibrary({
      'study/lines.pgn': '[Event "A"]\n\n1. e4 e5 *\n\n[Event "B"]\n\n1. d4 d5 *\n\n1. c4 *',
    })
    expect(category.games.map((g) => [g.id, g.title])).toEqual([
      ['study/lines.pgn#1', 'A'],
      ['study/lines.pgn#2', 'B'],
    ])
  })

  it('keeps invalid games in the list with an error instead of crashing', () => {
    const [category] = buildLibrary({ 'bad/01-oops.pgn': '1. e4 e5 2. Ke3' })
    expect(category.games[0].game).toBeNull()
    expect(category.games[0].error).toContain('"Ke3"')
  })
})

describe('splitPgnGames', () => {
  it('keeps a header-less move list as one game', () => {
    expect(splitPgnGames('e4 e5\nNf3 Nc6')).toEqual(['e4 e5\nNf3 Nc6'])
  })

  it('ignores blank files', () => {
    expect(splitPgnGames('  \n\n')).toEqual([])
  })
})

describe('humanize', () => {
  it('strips order prefixes and separators', () => {
    expect(humanize('01-french_defence')).toBe('French defence')
    expect(humanize('start-1')).toBe('Start 1')
  })
})

describe('bundled games folder', () => {
  const games = library.flatMap((c) => c.games)

  it('contains games', () => {
    expect(games.length).toBeGreaterThan(0)
  })

  it.each(games.map((g) => [g.id, g] as const))('%s is a valid game', (_, game) => {
    expect(game.error).toBeUndefined()
    expect(game.game?.moves.length).toBeGreaterThan(0)
  })
})
