'use client'

import { useState, useCallback } from 'react'
import MachineTile from '@/components/MachineTile'
import MachineDrawer from '@/components/MachineDrawer'
import MachineForm from '@/components/MachineForm'
import StatusBadge from '@/components/StatusBadge'
import { useFloorMapPolling } from '@/hooks/useFloorMapPolling'
import { GRID_COLS, GRID_ROWS, GRID_CELL_PX, MACHINE_STATUS_LABELS, MACHINE_STATUS_STYLES } from '@/constants'
import type { MapMachine, MachineStatus, UserRole } from '@/types'

export interface FloorMapProps {
  initialMachines: MapMachine[]
  userRole: UserRole
}

interface DragState {
  machine: MapMachine
}

export default function FloorMap({ initialMachines, userRole }: FloorMapProps) {
  const { machines, lastUpdated, refreshMachines, optimisticMove, revertMove } =
    useFloorMapPolling(initialMachines)

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const isAdmin = userRole === 'ADMIN'
  const machineGrid = buildGrid(machines)
  const unplaced = machines.filter((m) => m.gridX === null || m.gridY === null)

  const handleDragStart = useCallback((machine: MapMachine) => {
    setDragState({ machine })
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragState(null)
    setDragOverCell(null)
  }, [])

  const handleDrop = useCallback(async (targetX: number, targetY: number) => {
    if (!dragState) return
    const { machine } = dragState
    const prevX = machine.gridX
    const prevY = machine.gridY

    // Reject drops onto occupied cells (other than the machine's own cell)
    const occupant = machineGrid.get(cellKey(targetX, targetY))
    if (occupant && occupant.id !== machine.id) return

    setDragState(null)
    setDragOverCell(null)
    optimisticMove(machine.id, targetX, targetY)

    const res = await fetch(`/api/machines/${machine.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gridX: targetX, gridY: targetY }),
    })

    if (!res.ok) {
      revertMove(machine.id, prevX, prevY)
    }
  }, [dragState, machineGrid, optimisticMove, revertMove])

  const handleStatusChanged = useCallback((id: string, status: MachineStatus) => {
    optimisticMove(id, machines.find((m) => m.id === id)?.gridX ?? 0, machines.find((m) => m.id === id)?.gridY ?? 0)
    // Refresh so poll picks up the new status
    void refreshMachines()
  }, [machines, optimisticMove, refreshMachines])

  const handleMachineAdded = useCallback((machine: MapMachine) => {
    setShowAddForm(false)
    void refreshMachines()
  }, [refreshMachines])

  return (
    <div className="flex flex-col h-full">
      <MapHeader
        isAdmin={isAdmin}
        lastUpdated={lastUpdated}
        onAddMachine={() => setShowAddForm(true)}
      />

      {isAdmin && unplaced.length > 0 && (
        <UnplacedBar
          machines={unplaced}
          isDragging={!!dragState}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={(m) => setSelectedId(m.id)}
        />
      )}

      <div className="overflow-auto flex-1 p-4">
        <div
          className="inline-grid border border-gray-800 rounded-lg overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${GRID_CELL_PX}px)` }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOverCell(null)
            }
          }}
        >
          {Array.from({ length: GRID_ROWS }, (_, y) =>
            Array.from({ length: GRID_COLS }, (_, x) => {
              const machine = machineGrid.get(cellKey(x, y)) ?? null
              const isHovered = dragOverCell?.x === x && dragOverCell?.y === y
              const isOccupied = machine !== null && machine.id !== dragState?.machine.id

              return (
                <GridCell
                  key={cellKey(x, y)}
                  x={x}
                  y={y}
                  machine={machine}
                  isAdmin={isAdmin}
                  isDragging={!!dragState}
                  isHovered={isHovered}
                  isOccupied={isOccupied}
                  onDragOver={() => setDragOverCell({ x, y })}
                  onDrop={() => handleDrop(x, y)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={(m) => setSelectedId(m.id)}
                />
              )
            })
          )}
        </div>
      </div>

      <MapLegend />

      <MachineDrawer
        machineId={selectedId}
        isAdmin={isAdmin}
        onClose={() => setSelectedId(null)}
        onStatusChanged={handleStatusChanged}
      />

      {showAddForm && (
        <MachineForm
          onCreated={handleMachineAdded}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MapHeaderProps {
  isAdmin: boolean
  lastUpdated: Date
  onAddMachine: () => void
}

function MapHeader({ isAdmin, lastUpdated, onAddMachine }: MapHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-white">Floor Map</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Updated {lastUpdated.toLocaleTimeString()} · polls every 10s
        </p>
      </div>
      {isAdmin && (
        <button
          onClick={onAddMachine}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Machine
        </button>
      )}
    </div>
  )
}

interface UnplacedBarProps {
  machines: MapMachine[]
  isDragging: boolean
  onDragStart: (m: MapMachine) => void
  onDragEnd: () => void
  onClick: (m: MapMachine) => void
}

function UnplacedBar({ machines, isDragging, onDragStart, onDragEnd, onClick }: UnplacedBarProps) {
  return (
    <div className="px-6 py-3 border-b border-gray-800 bg-gray-950">
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">
        Unplaced machines — drag onto the grid
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {machines.map((m) => (
          <div key={m.id} className="shrink-0">
            <MachineTile
              machine={m}
              isDraggable={true}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={onClick}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface GridCellProps {
  x: number
  y: number
  machine: MapMachine | null
  isAdmin: boolean
  isDragging: boolean
  isHovered: boolean
  isOccupied: boolean
  onDragOver: () => void
  onDrop: () => void
  onDragStart: (m: MapMachine) => void
  onDragEnd: () => void
  onClick: (m: MapMachine) => void
}

function GridCell({
  x, y, machine, isAdmin, isDragging, isHovered, isOccupied,
  onDragOver, onDrop, onDragStart, onDragEnd, onClick,
}: GridCellProps) {
  const canDrop = isDragging && !isOccupied
  const dropHighlight = isHovered && canDrop
    ? 'bg-blue-900/40 border-blue-500'
    : isHovered && isOccupied
    ? 'bg-red-900/30 border-red-700'
    : ''

  return (
    <div
      style={{ width: GRID_CELL_PX, height: GRID_CELL_PX }}
      className={`border-r border-b border-gray-800/60 relative transition-colors duration-75 ${dropHighlight}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
    >
      {machine && (
        <MachineTile
          machine={machine}
          isDraggable={isAdmin}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={onClick}
        />
      )}
      {!machine && (
        <div className="absolute bottom-0.5 right-1 text-[8px] text-gray-800 select-none">
          {x},{y}
        </div>
      )}
    </div>
  )
}

function MapLegend() {
  return (
    <div className="flex items-center gap-6 px-6 py-3 border-t border-gray-800 bg-gray-950">
      <span className="text-xs text-gray-600 uppercase tracking-wider">Legend</span>
      {(Object.keys(MACHINE_STATUS_LABELS) as MachineStatus[]).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${MACHINE_STATUS_STYLES[s].dot}`} />
          <span className="text-xs text-gray-400">{MACHINE_STATUS_LABELS[s]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellKey(x: number, y: number): string {
  return `${x}:${y}`
}

function buildGrid(machines: MapMachine[]): Map<string, MapMachine> {
  const grid = new Map<string, MapMachine>()
  for (const m of machines) {
    if (m.gridX !== null && m.gridY !== null) {
      grid.set(cellKey(m.gridX, m.gridY), m)
    }
  }
  return grid
}
