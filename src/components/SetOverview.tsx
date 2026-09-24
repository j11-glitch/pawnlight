import type { TrainingSet } from '../chess/trainingSet'
import { CHECK_MARK } from '../symbols'

interface SetOverviewProps {
  set: TrainingSet
  passed: boolean
  canAdvance: boolean
  onNext: () => void
  onShowResults: () => void
}

/** Titles and status of the games in the set. Never shows any moves. */
export function SetOverview({ set, passed, canAdvance, onNext, onShowResults }: SetOverviewProps) {
  const completed = set.stats.filter((s) => s.completed).length
  const multiple = set.games.length > 1

  return (
    <section className="card set">
      <header className="set__header">
        <h2>{multiple ? `Game ${set.currentGameIndex + 1} of ${set.games.length}` : set.games[0].title}</h2>
        {multiple && (
          <span className="muted small">
            {completed} / {set.games.length} completed
          </span>
        )}
      </header>

      {multiple && (
        <ol className="set__games">
          {set.games.map((game, i) => {
            const stats = set.stats[i]
            const state = stats.completed ? 'done' : i === set.currentGameIndex ? 'current' : 'pending'
            return (
              <li key={`${game.id}-${i}`} className={`set__game set__game--${state}`}>
                <span className="set__marker" aria-hidden="true">
                  {stats.completed ? CHECK_MARK : i + 1}
                </span>
                <span className="set__title">
                  {game.title}
                  <span className="muted small"> {game.category}</span>
                </span>
                {stats.completed && <StatsLabel mistakes={stats.mistakes} hints={stats.hints} />}
              </li>
            )
          })}
        </ol>
      )}

      {canAdvance && (
        <button type="button" className="primary" onClick={onNext}>
          Next game <kbd>N</kbd>
        </button>
      )}

      {passed && (
        <div className="set__passed">
          <strong>
            {CHECK_MARK} {multiple ? `Set passed! All ${set.games.length} games completed.` : 'Game completed!'}
          </strong>
          <button type="button" className="primary" onClick={onShowResults}>
            See results
          </button>
        </div>
      )}
    </section>
  )
}

function StatsLabel({ mistakes, hints, prefix = '' }: { mistakes: number; hints: number; prefix?: string }) {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return (
    <span className="muted small nowrap">
      {prefix}
      {plural(mistakes, 'mistake')}, {plural(hints, 'hint')}
    </span>
  )
}
