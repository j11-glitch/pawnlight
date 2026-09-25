import type { GameStats } from './chess/trainingSet'
import type { Side } from './chess/gameTrainer'

export interface SavedGame {
  readonly id: string
  readonly title: string
  readonly category: string
  readonly pgn: string
}

/** Games are saved with their PGN so a set survives changes to the games folder. */
export interface SavedSet {
  readonly games: readonly SavedGame[]
  readonly currentGameIndex: number
  readonly currentMoveIndex: number
  readonly stats: readonly GameStats[]
}

export interface SavedSession {
  readonly set: SavedSet | null
  readonly orientation: Side
  readonly showHistory: boolean
}

// Keys keep the app's original name so sessions saved before the rename to Pawnlight survive.
const STORAGE_KEY = 'chess-move-trainer:session:v2'
const LEGACY_KEY = 'chess-move-trainer:session:v1'

export function loadSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data: unknown = JSON.parse(raw)
      return isSavedSession(data) ? data : null
    }
    return loadLegacySession()
  } catch {
    return null
  }
}

export function saveSession(session: SavedSession): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage may be unavailable (private mode, quota); training still works without it.
  }
}

/** Converts a single-game session from the first version into a one-game set. */
function loadLegacySession(): SavedSession | null {
  const raw = window.localStorage.getItem(LEGACY_KEY)
  if (!raw) return null
  const v = JSON.parse(raw) as Record<string, unknown>
  if (typeof v.input !== 'string' || typeof v.currentMoveIndex !== 'number') return null
  return {
    set: {
      games: [{ id: 'custom', title: 'Custom game', category: 'Custom', pgn: v.input }],
      currentGameIndex: 0,
      currentMoveIndex: v.currentMoveIndex,
      stats: [{ mistakes: 0, hints: 0, completed: false }],
    },
    orientation: v.orientation === 'black' ? 'black' : 'white',
    showHistory: v.showHistory !== false,
  }
}

function isSavedSession(value: unknown): value is SavedSession {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (v.orientation === 'white' || v.orientation === 'black') &&
    typeof v.showHistory === 'boolean' &&
    (v.set === null || isSavedSet(v.set))
  )
}

function isSavedSet(value: unknown): value is SavedSet {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.games) &&
    v.games.every((g: Record<string, unknown>) => typeof g?.pgn === 'string' && typeof g?.id === 'string') &&
    typeof v.currentGameIndex === 'number' &&
    typeof v.currentMoveIndex === 'number' &&
    Array.isArray(v.stats)
  )
}
