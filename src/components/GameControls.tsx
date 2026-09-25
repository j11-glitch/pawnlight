import { EMOJI } from '../symbols'

interface GameControlsProps {
  canHint: boolean
  canUndo: boolean
  canRestart: boolean
  showHistory: boolean
  onHint: () => void
  onUndo: () => void
  onRestart: () => void
  onFlip: () => void
  onToggleHistory: () => void
}

export function GameControls(props: GameControlsProps) {
  const { canHint, canUndo, canRestart, showHistory } = props
  return (
    <div className="controls">
      <ControlButton icon={EMOJI.bulb} label="Hint" shortcut="H" onClick={props.onHint} disabled={!canHint} />
      <ControlButton icon={EMOJI.undo} label="Undo" shortcut="U" onClick={props.onUndo} disabled={!canUndo} />
      <ControlButton
        icon={EMOJI.restart}
        label="Restart game"
        shortcut="R"
        onClick={props.onRestart}
        disabled={!canRestart}
      />
      <ControlButton icon={EMOJI.flip} label="Flip" shortcut="F" onClick={props.onFlip} />
      <ControlButton
        icon={EMOJI.scroll}
        label={showHistory ? 'Hide history' : 'Show history'}
        onClick={props.onToggleHistory}
      />
    </div>
  )
}

interface ControlButtonProps {
  icon: string
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
}

function ControlButton({ icon, label, shortcut, disabled, onClick }: ControlButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={shortcut ? `${label} (${shortcut})` : label}>
      <span className="btn-icon" aria-hidden="true">
        {icon}
      </span>
      {label}
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  )
}
