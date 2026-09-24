# Chess Move Trainer

A small browser tool for recovering and memorizing a known chess game move by move.
Paste a game, then play every move on the board yourself (both sides). Correct moves
stay on the board. Wrong moves are taken back immediately, and the answer stays hidden
unless you ask for a hint.

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

## Loading a game

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

When a game loads, the input box closes and clears, so the full move list is never on
screen while you train.

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
| Restart            | `R`      | Returns to move 1 and keeps the loaded game             |
| Flip               | `F`      | Switches board orientation between White and Black      |
| Show/Hide history  |          | Toggles the list of moves recovered so far               |
| Load new game      |          | Opens the input box                                      |

Shortcuts are ignored while you type in the input box.

The move history only ever shows moves you have already recovered. Future moves are
shown only through a hint.

### Saved sessions

The current game, your progress, the moves you have recovered, the board orientation
and the history toggle are saved in `localStorage`. When you reopen the page, you
continue where you stopped. If storage is unavailable (for example in some private
windows), the app still works; it just won't remember the session.

## Project structure

```text
src/
  chess/                  Pure game logic with no React. Fully unit-tested.
    moveParser.ts         loadMoveSequence(): input/PGN -> validated SAN list
    gameTrainer.ts        attemptMove, undoMove, resetGame, getProgress, getExpectedMove, ...
    *.test.ts
  hooks/
    useTrainer.ts         React state around the pure functions: feedback, hint, persistence
    useKeyboardShortcuts.ts
  components/
    TrainerBoard.tsx      react-chessboard with click-to-move, highlights, promotion
    PromotionPicker.tsx
    GameStatus.tsx        Turn, move counter, progress, feedback, hint
    GameControls.tsx
    MoveHistory.tsx
    GameInput.tsx
  storage.ts              localStorage load/save (fails safely)
  App.tsx                 Layout and wiring
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
