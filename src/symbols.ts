// Built from code points so the source stays ASCII-only.
export const glyph = (...codePoints: number[]) => String.fromCodePoint(...codePoints)
const VS16 = 0xfe0f // renders the preceding symbol as a colour emoji

export const CHECK_MARK = glyph(0x2713)
export const CROSS_MARK = glyph(0x2717)

/** Decorative emoji used as icons next to labels. Always paired with visible text. */
export const EMOJI = {
  brain: glyph(0x1f9e0),
  library: glyph(0x1f4da),
  training: glyph(0x265f, VS16),
  book: glyph(0x1f4d6),
  eyes: glyph(0x1f440),
  pen: glyph(0x270d, VS16),
  shuffle: glyph(0x1f500),
  target: glyph(0x1f3af),
  bulb: glyph(0x1f4a1),
  undo: glyph(0x21a9, VS16),
  restart: glyph(0x1f504),
  flip: glyph(0x1f503),
  scroll: glyph(0x1f4dc),
  next: glyph(0x23ed, VS16),
  trophy: glyph(0x1f3c6),
  party: glyph(0x1f389),
  checkBox: glyph(0x2705),
  crossBox: glyph(0x274c),
  stop: glyph(0x1f6ab),
  info: glyph(0x2139, VS16),
  keyboard: glyph(0x2328, VS16),
  flag: glyph(0x1f3c1),
  sparkles: glyph(0x2728),
  puzzle: glyph(0x1f9e9),
} as const

const keycap = (digit: number) => glyph(0x30 + digit, VS16, 0x20e3)

/** Icon per puzzle category slug (see public/puzzles/index.json). */
export const PUZZLE_ICONS: Record<string, string> = {
  'french-defence': glyph(0x1f1eb, 0x1f1f7),
  'back-rank-mate': glyph(0x1f3f0),
  'mate-in-1': keycap(1),
  'mate-in-2': keycap(2),
  'mate-in-3': keycap(3),
  fork: glyph(0x1f374),
  pin: glyph(0x1f4cc),
  skewer: glyph(0x1f362),
  'discovered-attack': glyph(0x1f4a5),
  sacrifice: glyph(0x1f525),
}
