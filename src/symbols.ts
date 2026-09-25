// Built from code points so the source stays ASCII-only.
const glyph = (...codePoints: number[]) => String.fromCodePoint(...codePoints)
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
} as const
