import {
  attemptMove,
  createTrainer,
  getExpectedMove,
  isCompleted,
  resetGame,
  undoMove,
  type AttemptOutcome,
  type MoveAttempt,
  type TrainerState,
} from './gameTrainer'
import type { ParsedGame } from './moveParser'

export interface SetGame {
  readonly id: string
  readonly title: string
  readonly category: string
  /** Source text, kept so a saved set can be re-validated on restore. */
  readonly pgn: string
  readonly game: ParsedGame
}

export interface GameStats {
  readonly mistakes: number
  readonly hints: number
  /** Sticky: stays true after the game was completed once, even if moves are undone. */
  readonly completed: boolean
}

/** A series of games that must all be completed to pass. */
export interface TrainingSet {
  readonly games: readonly SetGame[]
  readonly currentGameIndex: number
  /** Trainer for the current game. */
  readonly trainer: TrainerState
  readonly stats: readonly GameStats[]
}

export interface SetMoveResult {
  readonly set: TrainingSet
  readonly outcome: AttemptOutcome
}

const EMPTY_STATS: GameStats = { mistakes: 0, hints: 0, completed: false }

export function createTrainingSet(
  games: readonly SetGame[],
  options: { shuffle?: boolean; random?: () => number } = {},
): TrainingSet {
  if (games.length === 0) throw new Error('A training set needs at least one game.')
  const ordered = options.shuffle ? shuffled(games, options.random ?? Math.random) : [...games]
  return {
    games: ordered,
    currentGameIndex: 0,
    trainer: createTrainer(ordered[0].game),
    stats: ordered.map(() => EMPTY_STATS),
  }
}

export function getCurrentGame(set: TrainingSet): SetGame {
  return set.games[set.currentGameIndex]
}

export function playMove(set: TrainingSet, attempt: MoveAttempt): SetMoveResult {
  const { state, outcome } = attemptMove(set.trainer, attempt)
  switch (outcome.kind) {
    case 'correct':
      return {
        set: updateStats({ ...set, trainer: state }, (s) => (outcome.completed ? { ...s, completed: true } : s)),
        outcome,
      }
    case 'wrong':
      return { set: updateStats(set, (s) => ({ ...s, mistakes: s.mistakes + 1 })), outcome }
    default:
      return { set, outcome }
  }
}

/** Reveals the next move of the current game and counts the hint. */
export function takeHint(set: TrainingSet): { set: TrainingSet; hint: string | null } {
  const hint = getExpectedMove(set.trainer)
  if (hint === null) return { set, hint }
  return { set: updateStats(set, (s) => ({ ...s, hints: s.hints + 1 })), hint }
}

export function undoInSet(set: TrainingSet): TrainingSet {
  const trainer = undoMove(set.trainer)
  return trainer === set.trainer ? set : { ...set, trainer }
}

export function restartCurrentGame(set: TrainingSet): TrainingSet {
  return { ...set, trainer: resetGame(set.trainer) }
}

/** Starts the whole set again from the first game with fresh stats (same order). */
export function restartSet(set: TrainingSet): TrainingSet {
  return {
    ...set,
    currentGameIndex: 0,
    trainer: createTrainer(set.games[0].game),
    stats: set.games.map(() => EMPTY_STATS),
  }
}

export function canAdvance(set: TrainingSet): boolean {
  return isCompleted(set.trainer) && set.currentGameIndex < set.games.length - 1
}

/** Moves on to the next game. Only possible once the current game is completed. */
export function nextGame(set: TrainingSet): TrainingSet {
  if (!canAdvance(set)) return set
  const index = set.currentGameIndex + 1
  return { ...set, currentGameIndex: index, trainer: createTrainer(set.games[index].game) }
}

/** The set is passed when every game in it has been completed. */
export function isSetPassed(set: TrainingSet): boolean {
  return set.stats.every((s) => s.completed)
}

export function getSetProgress(set: TrainingSet) {
  return {
    gameNumber: set.currentGameIndex + 1,
    totalGames: set.games.length,
    completedGames: set.stats.filter((s) => s.completed).length,
  }
}

/** Rebuilds a set from saved data; returns null if it no longer fits the games. */
export function restoreTrainingSet(
  games: readonly SetGame[],
  saved: { currentGameIndex: number; currentMoveIndex: number; stats: readonly GameStats[] },
): TrainingSet | null {
  const index = saved.currentGameIndex
  if (games.length === 0 || saved.stats.length !== games.length || index < 0 || index >= games.length) {
    return null
  }
  return {
    games: [...games],
    currentGameIndex: index,
    trainer: createTrainer(games[index].game, saved.currentMoveIndex),
    stats: saved.stats.map((s) => ({ mistakes: s.mistakes, hints: s.hints, completed: s.completed })),
  }
}

function updateStats(set: TrainingSet, change: (stats: GameStats) => GameStats): TrainingSet {
  return { ...set, stats: set.stats.map((s, i) => (i === set.currentGameIndex ? change(s) : s)) }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export interface SetSummary {
  readonly games: number
  /** Total moves (plies) across all games. */
  readonly moves: number
  readonly mistakes: number
  readonly hints: number
  /** Correct moves as a share of all attempts (correct + wrong), 0-100. */
  readonly accuracy: number
  /** 3 = flawless, 2 = strong, 1 = passed. */
  readonly stars: 1 | 2 | 3
}

export function getSetSummary(set: TrainingSet): SetSummary {
  const moves = set.games.reduce((sum, g) => sum + g.game.moves.length, 0)
  const mistakes = set.stats.reduce((sum, s) => sum + s.mistakes, 0)
  const hints = set.stats.reduce((sum, s) => sum + s.hints, 0)
  const accuracy = moves + mistakes === 0 ? 100 : Math.round((moves / (moves + mistakes)) * 100)
  const stars = mistakes === 0 && hints === 0 ? 3 : accuracy >= 85 && hints <= set.games.length ? 2 : 1
  return { games: set.games.length, moves, mistakes, hints, accuracy, stars }
}
