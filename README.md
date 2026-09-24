# Chess Move Trainer

A small browser tool for recovering and memorizing known chess games move by move.
Pick games from the built-in library (or paste your own), then play every move on the
board yourself (both sides). Correct moves stay on the board. Wrong moves are taken back
immediately, and the answer stays hidden unless you ask for a hint.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the dev server                          |
| `npm run build`     | Type-check and build for production (`dist/`) |
| `npm run preview`   | Serve the production build                    |
| `npm test`          | Run the unit tests once                       |
| `npm run typecheck` | Type-check only                               |

## Game library

The **Library** tab lists every `.pgn` file in the [`games/`](games/) folder, grouped by
folder:

```text
games/
  french/
    01-start-1.pgn      -> "Start 1"
    02-change-1.pgn     -> "Change 1"
  italian/
    01-giuoco-piano.pgn
```

- **Category** = folder name (subfolders give "French / Advance"). **Title** = the
  `[Event]` tag, or the file name when that tag is missing. Leading numbers such as `01-`
  only control the order and are not shown. The `[Opening]` tag shows as a subtitle.
- A file may contain several games (for example a Lichess study export); each game
  becomes its own entry.
- Click a title to **preview** a game: step through it with the buttons, the arrow keys,
  or by clicking a move.
- Tick several games (or **Select all** in a category) and press **Start training**.
  Optionally shuffle the order.

### Adding games

Drop a `.pgn` file into a folder under `games/` and commit it. `npm test` checks that
every file in the library is valid, so a broken PGN fails the build before it is
deployed. Locally, `npm run dev` picks up new files after a page reload.

## Training sets

A training set is the list of games you started together. You **pass** the set by
completing every game in it. After finishing a game, press **Next game** (`N`). The set
panel shows each game's status with mistakes and hints used.

Passing a set opens a results screen with confetti, a 1-3 star rating and your stats
(games, moves, accuracy, hints). Three stars means no mistakes and no hints; two stars
means at least 85% accuracy and no more hints than games. **Train again** restarts the
whole set. **See results** on the set panel reopens the screen later.

## Loading your own game

Under **Paste your own game** in the Library tab you can train a game that isn't in the
library.

All of these formats work:

```text
e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7
e4, e5, Nf3, Nc6, Bb5, a6
1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
```

Standard PGN works too. Tag pairs, `{comments}`, `; comments`, `(variations)`, NAGs
(`$1`), annotation glyphs (`!?`) and the result are ignored. A `[FEN "..."]` tag sets
the starting position. `0-0` is accepted for castling, and check suffixes are optional.

Every move is replayed with chess.js when the game loads. If a move is illegal, you get
an error that names the move and where it occurs, for example
`Invalid move "Bb5" at move 4. (White)`.

The input box clears when the game loads, so the full move list is never on screen
while you train.

## Training

- Drag a piece, or click it and then click a highlighted target square.
- **Correct**: the move stays and you continue with the next move.
- **Wrong**: the move is taken back, the board stays at the last correct position,
  and you see *Wrong move. Try again.*
- **Illegal**: the piece snaps back.
- When a pawn promotes, a picker asks which piece. Picking the wrong piece counts as a
  wrong move.

The board highlights the previous move, the selected piece, its legal target squares,
and a king in check.

### Controls

| Control            | Shortcut | Effect                                                   |
| ------------------ | -------- | -------------------------------------------------------- |
| Hint               | `H`      | Shows the next expected move; you still have to play it |
| Undo               | `U`      | Takes back the last correct move so you can replay it   |
| Restart game       | `R`      | Returns to move 1 of the current game                   |
| Next game          | `N`      | Moves on once the current game is completed             |
| Flip               | `F`      | Switches board orientation between White and Black      |
| Show/Hide history  |          | Toggles the list of moves recovered so far               |

Shortcuts are ignored while you type in the input box.

The move history only ever shows moves you have already recovered, and the set panel
shows only game titles. Future moves are shown only through a hint, or in the library
preview if you choose to open it.

### Saved sessions

The current training set (with each game's PGN), your progress in it, the per-game stats,
the board orientation and the history toggle are saved in `localStorage`. When you reopen the page, you
continue where you stopped. If storage is unavailable (for example in some private
windows), the app still works; it just won't remember the session.

## Project structure

```text
games/                    PGN library, one folder per category
src/
  chess/                  Pure game logic with no React. Fully unit-tested.
    moveParser.ts         loadMoveSequence(): input/PGN -> validated SAN list
    gameTrainer.ts        attemptMove, undoMove, resetGame, getProgress, getExpectedMove, ...
    trainingSet.ts        Several games in a row: playMove, takeHint, nextGame, isSetPassed, ...
  library/
    gameLibrary.ts        buildLibrary(): PGN files -> categories and games (pure)
    index.ts              Bundles games/**/*.pgn via import.meta.glob
  hooks/
    useTrainingSession.ts React state around the pure functions: feedback, hint, persistence
    useKeyboardShortcuts.ts
  components/
    LibraryView.tsx       Categories, selection, custom game input
    GamePreview.tsx       Read-only board to step through a game
    SetOverview.tsx       Games in the set, status, stats, pass summary
    TrainerBoard.tsx      react-chessboard with click-to-move, highlights, promotion
    PromotionPicker.tsx
    GameStatus.tsx        Turn, move counter, progress, feedback, hint
    GameControls.tsx
    MoveHistory.tsx
    GameInput.tsx
  storage.ts              localStorage load/save (fails safely)
  App.tsx                 Library / Training views and wiring
```

### Design notes

- `TrainerState` is immutable and holds only `startFen`, `moves` and `currentMoveIndex`.
  The board position is always derived by replaying the moves with chess.js, so a
  rejected move can never leave the board out of sync.
- Moves are compared as chess.js SAN generated from the same position, never by hand-written
  SAN parsing. Disambiguation, captures, check and mate suffixes, castling and promotion all
  compare exactly.
- chess.js enforces all the chess rules: legality, castling, en passant, promotion, check
  and checkmate.

## Tech

React 19, TypeScript, Vite, [chess.js](https://github.com/jhlywa/chess.js),
[react-chessboard](https://github.com/Clariity/react-chessboard) v5, Vitest.

## Deployment

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages
via `.github/workflows/deploy.yml`. Assets use relative paths (`base: './'` in
`vite.config.ts`), so `dist/` also works on any other static host.
