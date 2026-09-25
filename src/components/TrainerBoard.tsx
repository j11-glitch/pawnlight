import { useState, type CSSProperties } from 'react'
import { Chessboard, type PieceDropHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import type { Chess, Square } from 'chess.js'
import { getLastMove, isPromotionMove, type MoveAttempt, type Side } from '../chess/gameTrainer'
import { PromotionPicker } from './PromotionPicker'
import { DARK_SQUARE_STYLE, LIGHT_SQUARE_STYLE } from './boardTheme'

interface TrainerBoardProps {
  position: Chess
  orientation: Side
  disabled: boolean
  /** Returns true when the move was accepted. */
  onMove: (attempt: MoveAttempt) => boolean
}

const LAST_MOVE_STYLE: CSSProperties = { backgroundColor: 'rgba(255, 214, 10, 0.42)' }
const SELECTED_STYLE: CSSProperties = { backgroundColor: 'rgba(20, 110, 255, 0.45)' }
const CHECK_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, rgba(230, 30, 30, 0.9) 0%, rgba(230, 30, 30, 0.35) 55%, transparent 75%)',
}
const TARGET_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, rgba(0, 0, 0, 0.28) 22%, transparent 24%)',
}
const CAPTURE_TARGET_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, transparent 58%, rgba(0, 0, 0, 0.28) 60%)',
}

/** Chessboard with drag-and-drop and click-to-move, highlights and a promotion picker. */
export function TrainerBoard({ position, orientation, disabled, onMove }: TrainerBoardProps) {
  const fen = position.fen()
  // Selection and pending promotion are tied to the position they were made in,
  // so they disappear automatically whenever the position changes.
  const [selection, setSelection] = useState<{ fen: string; square: Square } | null>(null)
  const [promotion, setPromotion] = useState<{ fen: string; from: Square; to: Square } | null>(null)
  const selected = selection?.fen === fen ? selection.square : null
  const pendingPromotion = promotion?.fen === fen ? promotion : null

  const turn = position.turn()
  const targets = selected ? position.moves({ square: selected, verbose: true }) : []

  function tryMove(from: Square, to: Square): boolean {
    setSelection(null)
    if (isPromotionMove(position, from, to)) {
      setPromotion({ fen, from, to })
      return false
    }
    return onMove({ from, to })
  }

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (disabled || !targetSquare) return false
    return tryMove(sourceSquare as Square, targetSquare as Square)
  }

  function handleSquareClick({ square, piece }: SquareHandlerArgs) {
    if (disabled || pendingPromotion) return
    const clicked = square as Square
    if (selected && targets.some((move) => move.to === clicked)) {
      tryMove(selected, clicked)
    } else if (piece && piece.pieceType[0] === turn && clicked !== selected) {
      setSelection({ fen, square: clicked })
    } else {
      setSelection(null)
    }
  }

  function choosePromotion(piece: string | null) {
    setPromotion(null)
    if (piece && pendingPromotion) {
      onMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece })
    }
  }

  const squareStyles: Record<string, CSSProperties> = {}
  const lastMove = getLastMove(position)
  if (lastMove) {
    squareStyles[lastMove.from] = LAST_MOVE_STYLE
    squareStyles[lastMove.to] = LAST_MOVE_STYLE
  }
  if (position.inCheck()) {
    const [king] = position.findPiece({ type: 'k', color: turn })
    if (king) squareStyles[king] = CHECK_STYLE
  }
  if (selected) {
    squareStyles[selected] = SELECTED_STYLE
    for (const move of targets) {
      squareStyles[move.to] = move.captured ? CAPTURE_TARGET_STYLE : TARGET_STYLE
    }
  }

  return (
    <div className="board">
      <Chessboard
        options={{
          id: 'trainer-board',
          position: fen,
          boardOrientation: orientation,
          allowDragging: !disabled && !pendingPromotion,
          canDragPiece: ({ piece }) => piece.pieceType[0] === turn,
          onPieceDrop: handleDrop,
          onSquareClick: handleSquareClick,
          squareStyles,
          animationDurationInMs: 150,
          darkSquareStyle: DARK_SQUARE_STYLE,
          lightSquareStyle: LIGHT_SQUARE_STYLE,
        }}
      />
      {pendingPromotion && <PromotionPicker color={turn} onChoose={choosePromotion} />}
    </div>
  )
}
