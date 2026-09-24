import type { Side } from './chess/gameTrainer'

/** What we persist between visits. The move list itself is re-derived from `input`. */
export interface SavedSession {
  readonly input: string
  readonly currentMoveIndex: number
  readonly completedMoves: readonly string[]
  readonly orientation: Side
  readonly showHistory: boolean
}

const STORAGE_KEY = 'chess-move-trainer:session:v1'

export function loadSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    return isSavedSession(data) ? data : null
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

export function clearSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore: nothing to clear if storage is unavailable.
  }
}

function isSavedSession(value: unknown): value is SavedSession {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.input === 'string' &&
    typeof v.currentMoveIndex === 'number' &&
    Array.isArray(v.completedMoves) &&
    (v.orientation === 'white' || v.orientation === 'black') &&
    typeof v.showHistory === 'boolean'
  )
}
