'use client'

import { MACHINE_STATUS_STYLES, GRID_CELL_PX } from '@/constants'
import type { MapMachine } from '@/types'

export interface MachineTileProps {
  machine: MapMachine
  isDraggable: boolean
  onDragStart: (machine: MapMachine) => void
  onDragEnd: () => void
  onClick: (machine: MapMachine) => void
}

export default function MachineTile({
  machine,
  isDraggable,
  onDragStart,
  onDragEnd,
  onClick,
}: MachineTileProps) {
  const styles = MACHINE_STATUS_STYLES[machine.status]
  const label = machine.machineNumber != null ? `M-${machine.machineNumber}` : machine.id.slice(-4)

  return (
    <div
      draggable={isDraggable}
      onDragStart={() => onDragStart(machine)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(machine)}
      title={machine.name}
      style={{ width: GRID_CELL_PX, height: GRID_CELL_PX }}
      className={`
        flex flex-col items-center justify-center gap-0.5
        rounded border cursor-pointer select-none
        transition-all duration-150
        hover:brightness-125 active:scale-95
        ${styles.tile}
        ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${styles.dot}`} />
      <span className="text-[10px] font-bold leading-none">{label}</span>
      <span className="text-[9px] leading-none text-center px-0.5 truncate max-w-full opacity-80">
        {machine.name}
      </span>
    </div>
  )
}
