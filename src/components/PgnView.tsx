import { useState } from 'react'
import { Chess } from 'chess.js'
import { humanize } from '../library'
import { EMOJI } from '../symbols'

// Every .pgn file under /pgns is bundled at build time, one subfolder per category.
const files = import.meta.glob<string>('../../pgns/*/*.pgn', { query: '?raw', import: 'default', eager: true })

interface MovePair {
  number: number
  white: string
  black?: string
}

/** chess.js drops "!?"-style annotations, so read them from the movetext, one per move in order. */
function moveAnnotations(pgn: string): string[] {
  const movetext = pgn
    .replace(/^\[.*\]$/gm, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\d+\.(\.\.)?/g, ' ')
  return movetext
    .split(/\s+/)
    .filter((token) => token && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token))
    .map((token) => token.match(/[?!]+$/)?.[0] ?? '')
}

function parsePgn(pgn: string, id: string) {
  const chess = new Chess()
  chess.loadPgn(pgn)
  const annotations = moveAnnotations(pgn)
  const moves = chess.history().map((san, i) => san + (annotations[i] ?? ''))
  const pairs: MovePair[] = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] })
  }
  // chess.js fills missing tags with "?" placeholders (e.g. "????.??.??"); treat those as absent.
  const headers = Object.fromEntries(Object.entries(chess.getHeaders()).filter(([, value]) => !value.startsWith('?')))
  // Real games are named by their players; opening lines without players by their Event.
  const hasPlayers = Boolean(headers.White && headers.Black)
  return {
    id,
    title: hasPlayers ? `${headers.White} vs ${headers.Black}` : (headers.Event ?? humanize(id.replace(/\.pgn$/i, ''))),
    details: [hasPlayers ? headers.Event : (headers.Variation ?? headers.Opening), headers.Date?.slice(0, 4)]
      .filter(Boolean)
      .join(', '),
    result: headers.Result === '*' ? undefined : headers.Result,
    pairs,
  }
}

function buildGroups() {
  const byFolder = new Map<string, ReturnType<typeof parsePgn>[]>()
  const paths = Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  for (const path of paths) {
    const [folder, fileName] = path.split('/').slice(-2)
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), parsePgn(files[path], `${folder}/${fileName}`)])
  }
  return [...byFolder].map(([folder, games]) => ({ name: humanize(folder), games }))
}

const GROUPS = buildGroups()
const ALL_GAMES = GROUPS.flatMap((g) => g.games)

export function PgnView() {
  const [selectedId, setSelectedId] = useState(ALL_GAMES[0].id)
  // Categories start collapsed; the user opens the ones they want.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const game = ALL_GAMES.find((g) => g.id === selectedId) ?? ALL_GAMES[0]

  function toggleGroup(name: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <main className="pgn">
      <section className="card category">
        <header className="category__header">
          <h2>
            <span aria-hidden="true">{EMOJI.library}</span> Games
          </h2>
          <span className="category__count">{ALL_GAMES.length}</span>
        </header>
        <ul className="pgn__groups">
          {GROUPS.map((group) => {
            const open = expanded.has(group.name)
            return (
              <li key={group.name}>
                <button
                  type="button"
                  className="pgn__group"
                  aria-expanded={open}
                  onClick={() => toggleGroup(group.name)}
                >
                  <span className="pgn__chevron" aria-hidden="true" />
                  <span aria-hidden="true">{EMOJI.book}</span> {group.name}
                  <span className="category__count">{group.games.length}</span>
                </button>
                {open && (
                  <ul className="category__games pgn__games">
                    {group.games.map((entry) => (
                      <li key={entry.id} className={`game-row${entry.id === game.id ? ' game-row--active' : ''}`}>
                        <button
                          type="button"
                          className="game-row__title"
                          aria-current={entry.id === game.id}
                          onClick={() => setSelectedId(entry.id)}
                        >
                          <span>{entry.title}</span>
                          <span className="muted small">{entry.details}</span>
                        </button>
                        <span className="muted small nowrap">{entry.pairs.length} moves</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card">
        <h2 className="pgn__title">
          <span aria-hidden="true">{EMOJI.scroll}</span> {game.title}
        </h2>
        {game.details && <p className="muted">{game.details}</p>}
        <ol className="pgn__moves">
          {game.pairs.map((pair) => (
            <li key={pair.number}>
              <span className="pgn__number">{pair.number}.</span>
              <span>{pair.white}</span>
              <span>{pair.black ?? ''}</span>
            </li>
          ))}
        </ol>
        {game.result && <p className="pgn__result">{game.result}</p>}
      </section>
    </main>
  )
}
