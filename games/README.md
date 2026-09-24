# Game library

Every `.pgn` file in this folder appears in the app's Library tab.

- One subfolder per category (`french/`, `italian/`, ...). Nested folders work too.
- Title: the `[Event]` tag, or the file name. `01-` style prefixes only set the order.
- Optional `[Opening]` tag: shown as a subtitle.
- A file may contain several games.

Run `npm test` after adding files: it fails if any PGN here contains an illegal move.
