'use client'

import { MACHINE_STATUS_STYLES, GRID_CELL_PX } from '@/constants'
import type { MapMachine } from '@/types'

export interface MachineTileProps {
  machine: MapMachine
  isDraggable: boolean
  cellPx?: number
  onDragStart: (machine: MapMachine) => void
  onDragEnd: () => void
  onClick: (machine: MapMachine) => void
}

export default function MachineTile({
  machine,
  isDraggable,
  cellPx = GRID_CELL_PX,
  onDragStart,
  onDragEnd,
  onClick,
}: MachineTileProps) {
  const styles = MACHINE_STATUS_STYLES[machine.status]
  const showLabel = cellPx >= 28
  const showName = cellPx >= 48

  return (
    <div
      draggable={isDraggable}
      onDragStart={() => onDragStart(machine)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(machine)}
      title={`${machine.assetNumber} — ${machine.gameName}`}
      style={{ width: cellPx, height: cellPx }}
      className={`
        flex flex-col items-center justify-center gap-0.5
        rounded border cursor-pointer select-none
        transition-all duration-150
        hover:brightness-125 active:scale-95
        ${styles.tile}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
    >
      <span className={`rounded-full shrink-0 ${styles.dot}`}
        style={{ width: Math.max(4, cellPx * 0.1), height: Math.max(4, cellPx * 0.1) }}
      />
      {showLabel && (
        <span className="font-bold leading-none truncate max-w-full px-0.5"
          style={{ fontSize: Math.max(7, cellPx * 0.16) }}
        >
          {machine.assetNumber}
        </span>
      )}
      {showName && (
        <span className="leading-none text-center px-0.5 truncate max-w-full opacity-80"
          style={{ fontSize: Math.max(6, cellPx * 0.13) }}
        >
          {machine.gameName}
        </span>
      )}
    </div>
  )
}
