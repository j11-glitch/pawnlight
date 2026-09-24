interface GameControlsProps {
  hasGame: boolean
  canHint: boolean
  canUndo: boolean
  showHistory: boolean
  onHint: () => void
  onUndo: () => void
  onRestart: () => void
  onFlip: () => void
  onToggleHistory: () => void
  onLoadNew: () => void
}

export function GameControls(props: GameControlsProps) {
  const { hasGame, canHint, canUndo, showHistory } = props
  return (
    <div className="controls">
      <ControlButton label="Hint" shortcut="H" onClick={props.onHint} disabled={!canHint} />
      <ControlButton label="Undo" shortcut="U" onClick={props.onUndo} disabled={!canUndo} />
      <ControlButton label="Restart" shortcut="R" onClick={props.onRestart} disabled={!hasGame} />
      <ControlButton label="Flip" shortcut="F" onClick={props.onFlip} />
      <ControlButton label={showHistory ? 'Hide history' : 'Show history'} onClick={props.onToggleHistory} />
      <ControlButton label="Load new game" onClick={props.onLoadNew} />
    </div>
  )
}

interface ControlButtonProps {
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
}

function ControlButton({ label, shortcut, disabled, onClick }: ControlButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={shortcut ? `${label} (${shortcut})` : label}>
      {label}
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  )
}
