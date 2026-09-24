import { useEffect } from 'react'

/**
 * Binds single-letter shortcuts (case-insensitive). Ignored while the user is typing
 * in a form field, or when a modifier key is held so browser shortcuts keep working.
 */
export function useKeyboardShortcuts(bindings: Record<string, () => void>): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      if (isEditable(event.target)) return
      const action = bindings[event.key.toLowerCase()]
      if (action) {
        event.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings])
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
