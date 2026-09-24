import { buildLibrary } from './gameLibrary'

// Every .pgn file under /games is bundled at build time. Add a file and rebuild to extend the library.
const files = import.meta.glob<string>('../../games/**/*.pgn', { query: '?raw', import: 'default', eager: true })

const relativeFiles = Object.fromEntries(
  Object.entries(files).map(([path, text]) => [path.replace(/^.*?\/games\//, ''), text]),
)

export const library = buildLibrary(relativeFiles)

export type { LibraryCategory, LibraryGame } from './gameLibrary'
