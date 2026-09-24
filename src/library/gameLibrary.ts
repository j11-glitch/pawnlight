import { loadMoveSequence, type ParsedGame } from '../chess/moveParser'

export interface LibraryGame {
  /** Stable id: file path, plus "#n" when the file holds several games. */
  readonly id: string
  readonly category: string
  readonly title: string
  /** Optional subtitle, from the PGN [Opening] tag. */
  readonly opening?: string
  /** Raw PGN of this single game. */
  readonly pgn: string
  /** Null when the PGN is invalid; `error` then says why. */
  readonly game: ParsedGame | null
  readonly error?: string
}

export interface LibraryCategory {
  readonly name: string
  readonly games: readonly LibraryGame[]
}

/**
 * Builds the library from PGN files keyed by path relative to the games folder,
 * e.g. "french/01-start-1.pgn". The folder path becomes the category and the
 * file name (or the [Event] tag) the title. Leading "01-" prefixes only set the order.
 */
export function buildLibrary(files: Record<string, string>): LibraryCategory[] {
  const byCategory = new Map<string, LibraryGame[]>()
  const paths = Object.keys(files).sort(naturalCompare)

  for (const path of paths) {
    const segments = path.split('/')
    const fileName = segments.pop() ?? path
    const category = segments.length > 0 ? segments.map(humanize).join(' / ') : 'Uncategorized'
    const fileTitle = humanize(fileName.replace(/\.pgn$/i, ''))
    const chunks = splitPgnGames(files[path])

    const games = chunks.map((pgn, i): LibraryGame => {
      const tags = readTags(pgn)
      const event = tags.event && tags.event !== '?' ? tags.event : undefined
      const title = event ?? (chunks.length > 1 ? `${fileTitle} (${i + 1})` : fileTitle)
      const parsed = loadMoveSequence(pgn)
      return {
        id: chunks.length > 1 ? `${path}#${i + 1}` : path,
        category,
        title,
        opening: tags.opening,
        pgn,
        game: parsed.ok ? parsed.game : null,
        error: parsed.ok ? undefined : parsed.error,
      }
    })

    byCategory.set(category, [...(byCategory.get(category) ?? []), ...games])
  }

  return [...byCategory].map(([name, games]) => ({ name, games }))
}

/** Splits a PGN file into single games: a tag line after movetext starts a new game. */
export function splitPgnGames(text: string): string[] {
  const games: string[] = []
  let current: string[] = []
  let seenMoves = false

  for (const line of text.split(/\r?\n/)) {
    const isTag = /^\s*\[\w+\s+"[^"]*"\]\s*$/.test(line)
    if (isTag && seenMoves) {
      games.push(current.join('\n'))
      current = []
      seenMoves = false
    }
    if (!isTag && line.trim() !== '') seenMoves = true
    current.push(line)
  }
  if (current.some((line) => line.trim() !== '')) games.push(current.join('\n'))

  return games.map((game) => game.trim()).filter(Boolean)
}

function readTags(pgn: string): Record<string, string> {
  const tags: Record<string, string> = {}
  for (const match of pgn.matchAll(/^\s*\[(\w+)\s+"([^"]*)"\]\s*$/gm)) {
    tags[match[1].toLowerCase()] = match[2].trim()
  }
  return tags
}

/** "01-french_defence" gives "French defence". */
export function humanize(name: string): string {
  const words = name.replace(/^\d+[-_. ]+/, '').replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}
