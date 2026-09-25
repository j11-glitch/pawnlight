import type { CSSProperties } from 'react'

// Wood-grain squares. Colours and grain live in CSS custom properties (styles.css)
// so the look can be tuned without touching components.
export const LIGHT_SQUARE_STYLE: CSSProperties = {
  backgroundColor: 'var(--square-light)',
  backgroundImage: 'var(--square-grain)',
}

export const DARK_SQUARE_STYLE: CSSProperties = {
  backgroundColor: 'var(--square-dark)',
  backgroundImage: 'var(--square-grain)',
}
