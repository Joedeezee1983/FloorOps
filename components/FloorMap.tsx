'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import MachineTile from '@/components/MachineTile'
import MachineDrawer from '@/components/MachineDrawer'
import MachineForm from '@/components/MachineForm'
import BlueprintUploadModal from '@/components/BlueprintUploadModal'
import BankPlacementSidebar from '@/components/BankPlacementSidebar'
import StatusBadge from '@/components/StatusBadge'
import { useFloorMapPolling } from '@/hooks/useFloorMapPolling'
import {
  GRID_COLS,
  GRID_ROWS,
  GRID_CELL_PX,
  MACHINE_STATUS_LABELS,
  MACHINE_STATUS_STYLES,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  MINIMAP_CELL_PX,
} from '@/constants'
import type { MapMachine, MachineStatus, UserRole, BlueprintSummary } from '@/types'

export interface FloorMapProps {
  initialMachines: MapMachine[]
  userRole: UserRole
  initialBlueprint?: BlueprintSummary | null
}

interface DragState {
  machine: MapMachine
}

const MINIMAP_W = GRID_COLS * MINIMAP_CELL_PX
const MINIMAP_H = GRID_ROWS * MINIMAP_CELL_PX

const MINIMAP_STATUS_COLORS: Record<MachineStatus, string> = {
  ONLINE: '#4ade80',
  OFFLINE: '#f87171',
  WARNING: '#fde047',
  MAINTENANCE: '#fb923c',
}

export default function FloorMap({ initialMachines, userRole, initialBlueprint }: FloorMapProps) {
  const { machines, lastUpdated, refreshMachines, optimisticMove, revertMove } =
    useFloorMapPolling(initialMachines)

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM)
  const [showMobileGrid, setShowMobileGrid] = useState(false)

  const [blueprint, setBlueprint] = useState<BlueprintSummary | null>(initialBlueprint ?? null)
  const [showBlueprint, setShowBlueprint] = useState(true)
  const [blueprintOpacity, setBlueprintOpacity] = useState(initialBlueprint?.opacity ?? 0.3)
  const [showBlueprintUpload, setShowBlueprintUpload] = useState(false)

  const [bankPlacementMode, setBankPlacementMode] = useState(false)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [isPlacingBank, setIsPlacingBank] = useState(false)
  const [bankPlaceError, setBankPlaceError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 })

  const isPanningRef = useRef(false)
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, scrollX: 0, scrollY: 0 })
  const [isGrabbing, setIsGrabbing] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => setScrollPos({ x: el.scrollLeft, y: el.scrollTop })
    const handleResize = () => setViewportSize({ w: el.clientWidth, h: el.clientHeight })

    handleResize()
    el.addEventListener('scroll', handleScroll, { passive: true })
    const ro = new ResizeObserver(handleResize)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', handleScroll)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return
      const el = scrollRef.current
      if (!el) return
      const dx = e.clientX - panStartRef.current.mouseX
      const dy = e.clientY - panStartRef.current.mouseY
      el.scrollLeft = panStartRef.current.scrollX - dx
      el.scrollTop = panStartRef.current.scrollY - dy
    }

    const stopPan = () => {
      if (!isPanningRef.current) return
      isPanningRef.current = false
      setIsGrabbing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopPan)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopPan)
    }
  }, [])

  const cellPx = Math.max(4, Math.round(GRID_CELL_PX * zoomLevel))
  const gridW = GRID_COLS * cellPx
  const gridH = GRID_ROWS * cellPx

  const isAdmin = userRole === 'ADMIN'
  const machineGrid = buildGrid(machines)
  const unplaced = machines.filter((m) => m.gridX === null || m.gridY === null)

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(MAX_ZOOM, parseFloat((prev + ZOOM_STEP).toFixed(2))))
  }, [])

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(MIN_ZOOM, parseFloat((prev - ZOOM_STEP).toFixed(2))))
  }, [])

  const fitToScreen = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const zoomForWidth = el.clientWidth / (GRID_COLS * GRID_CELL_PX)
    const zoomForHeight = el.clientHeight / (GRID_ROWS * GRID_CELL_PX)
    const fit = Math.min(zoomForWidth, zoomForHeight, MAX_ZOOM)
    setZoomLevel(Math.max(MIN_ZOOM, parseFloat(fit.toFixed(2))))
  }, [])

  const startPan = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't capture mousedown on draggable machine tiles — let HTML5 drag proceed
    const target = e.target as HTMLElement
    if (target.closest('[draggable="true"]')) return
    // Don't pan when clicking the bank placement overlay — let onClick handle it
    if (target.closest('[data-bank-placement-overlay]')) return

    const el = scrollRef.current
    if (!el) return

    isPanningRef.current = true
    setIsGrabbing(true)
    panStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
    }
  }, [])

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

  const handleStatusChanged = useCallback((_id: string, _status: MachineStatus) => {
    void refreshMachines()
  }, [refreshMachines])

  const handleRemovedFromMap = useCallback((_id: string) => {
    setSelectedId(null)
    void refreshMachines()
  }, [refreshMachines])

  const handleMachineAdded = useCallback((_machine: MapMachine) => {
    setShowAddForm(false)
    void refreshMachines()
  }, [refreshMachines])

  const handleBlueprintUploaded = useCallback((uploaded: BlueprintSummary) => {
    setBlueprint(uploaded)
    setBlueprintOpacity(uploaded.opacity)
    setShowBlueprint(true)
    setShowBlueprintUpload(false)
  }, [])

  const handleEnterBankPlacement = useCallback(() => {
    setBankPlacementMode(true)
    setSelectedBank(null)
    setBankPlaceError(null)
  }, [])

  const handleExitBankPlacement = useCallback(() => {
    setBankPlacementMode(false)
    setSelectedBank(null)
    setBankPlaceError(null)
  }, [])

  const handleSelectBank = useCallback((bankNumber: string) => {
    setSelectedBank(bankNumber)
    setBankPlaceError(null)
  }, [])

  const handleOverlayClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedBank) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellPx)
    const y = Math.floor((e.clientY - rect.top) / cellPx)

    setIsPlacingBank(true)
    setBankPlaceError(null)

    const res = await fetch('/api/machines/bank', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankNumber: selectedBank, gridX: x, gridY: y }),
    })

    setIsPlacingBank(false)

    if (res.ok) {
      void refreshMachines()
      setSelectedBank(null)
    } else {
      const data = await res.json() as { error?: string }
      setBankPlaceError(data.error ?? 'Failed to place bank')
    }
  }, [selectedBank, cellPx, refreshMachines])

  return (
    <div className="flex flex-col h-full relative">
      <MapHeader
        isAdmin={isAdmin}
        lastUpdated={lastUpdated}
        zoomLevel={zoomLevel}
        blueprint={blueprint}
        showBlueprint={showBlueprint}
        blueprintOpacity={blueprintOpacity}
        showMobileGrid={showMobileGrid}
        bankPlacementMode={bankPlacementMode}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToScreen={fitToScreen}
        onAddMachine={() => setShowAddForm(true)}
        onToggleBlueprint={() => setShowBlueprint((v) => !v)}
        onOpacityChange={setBlueprintOpacity}
        onUploadBlueprint={() => setShowBlueprintUpload(true)}
        onToggleMobileGrid={() => setShowMobileGrid((v) => !v)}
        onEnterBankPlacement={handleEnterBankPlacement}
        onExitBankPlacement={handleExitBankPlacement}
      />

      {/* Mobile status summary — hidden on md+ screens */}
      <div className={`md:hidden flex-1 overflow-y-auto ${showMobileGrid ? 'hidden' : ''}`}>
        <MobileStatusSummary machines={machines} onShowFullMap={() => setShowMobileGrid(true)} />
      </div>

      {/* Full map — always visible on md+, toggled by showMobileGrid on mobile */}
      <div className={`flex flex-1 overflow-hidden ${showMobileGrid ? '' : 'hidden md:flex'}`}>
        {/* Bank placement sidebar — visible to admin in placement mode only */}
        {isAdmin && bankPlacementMode && (
          <BankPlacementSidebar
            machines={machines}
            selectedBank={selectedBank}
            isPlacing={isPlacingBank}
            onSelectBank={handleSelectBank}
          />
        )}

        {/* Main grid column */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {isAdmin && unplaced.length > 0 && !bankPlacementMode && (
            <UnplacedBar
              machines={unplaced}
              isDragging={!!dragState}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={(m) => setSelectedId(m.id)}
            />
          )}

          {bankPlacementMode && selectedBank && (
            <div className="mx-4 mt-2 px-3 py-1.5 bg-amber-900/20 border border-amber-700/40 rounded-lg text-xs text-amber-300 text-center shrink-0">
              Click on the map to place bank{' '}
              <span className="font-mono font-semibold">{selectedBank}</span>
            </div>
          )}

          {bankPlaceError && (
            <div className="mx-4 mt-1 px-3 py-1.5 bg-red-900/20 border border-red-700/40 rounded-lg text-xs text-red-300 text-center shrink-0">
              {bankPlaceError}
            </div>
          )}

          <div
            ref={scrollRef}
            className={`overflow-auto flex-1 p-4 ${isGrabbing ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            onMouseDown={startPan}
          >
            <div className="relative" style={{ width: gridW, height: gridH }}>
              {/* Blueprint overlay — sits behind the grid cells */}
              {blueprint && showBlueprint && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blueprint.imageUrl}
                  alt="Floor blueprint"
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  style={{ opacity: blueprintOpacity, objectFit: 'fill', zIndex: 0 }}
                />
              )}

              {/* Grid */}
              <div
                className="absolute inset-0 border border-gray-800 rounded-lg overflow-hidden"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, ${cellPx}px)`, zIndex: 1 }}
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
                        cellPx={cellPx}
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

              {/* Bank placement overlay — captures clicks and converts to grid coords */}
              {bankPlacementMode && selectedBank && !isPlacingBank && (
                <div
                  data-bank-placement-overlay="true"
                  className="absolute inset-0 cursor-crosshair"
                  style={{ zIndex: 10 }}
                  onClick={handleOverlayClick}
                />
              )}
            </div>
          </div>

          <MapLegend />

          <MinimapPanel
            machines={machines}
            cellPx={cellPx}
            scrollPos={scrollPos}
            viewportSize={viewportSize}
          />
        </div>
      </div>

      <MachineDrawer
        machineId={selectedId}
        isAdmin={isAdmin}
        onClose={() => setSelectedId(null)}
        onStatusChanged={handleStatusChanged}
        onRemovedFromMap={handleRemovedFromMap}
      />

      {showAddForm && (
        <MachineForm
          onCreated={handleMachineAdded}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {showBlueprintUpload && (
        <BlueprintUploadModal
          onUploaded={handleBlueprintUploaded}
          onClose={() => setShowBlueprintUpload(false)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MapHeaderProps {
  isAdmin: boolean
  lastUpdated: Date
  zoomLevel: number
  blueprint: BlueprintSummary | null
  showBlueprint: boolean
  blueprintOpacity: number
  showMobileGrid: boolean
  bankPlacementMode: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onAddMachine: () => void
  onToggleBlueprint: () => void
  onOpacityChange: (v: number) => void
  onUploadBlueprint: () => void
  onToggleMobileGrid: () => void
  onEnterBankPlacement: () => void
  onExitBankPlacement: () => void
}

function MapHeader({
  isAdmin, lastUpdated, zoomLevel, blueprint, showBlueprint, blueprintOpacity, showMobileGrid,
  bankPlacementMode,
  onZoomIn, onZoomOut, onFitToScreen, onAddMachine, onToggleBlueprint, onOpacityChange, onUploadBlueprint, onToggleMobileGrid,
  onEnterBankPlacement, onExitBankPlacement,
}: MapHeaderProps) {
  const BTN = 'px-3 py-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors'

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800 gap-3 flex-wrap">
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Floor Map</h1>
        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
          Updated {lastUpdated.toLocaleTimeString()} · polls every 10s · {GRID_COLS}×{GRID_ROWS} grid
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Mobile: toggle between summary and full map */}
        <button
          onClick={onToggleMobileGrid}
          className={`md:hidden ${BTN} text-xs`}
        >
          {showMobileGrid ? 'Summary View' : 'Full Map'}
        </button>

        {/* Blueprint controls — hidden on mobile */}
        {blueprint && (
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={onToggleBlueprint} className={`${BTN} ${showBlueprint ? 'text-blue-300 border-blue-700 bg-blue-900/30' : ''}`}>
              Blueprint {showBlueprint ? 'On' : 'Off'}
            </button>
            {showBlueprint && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Opacity</span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={blueprintOpacity}
                  onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                  className="w-20 accent-blue-500"
                />
                <span className="text-xs text-gray-400 font-mono w-8">{Math.round(blueprintOpacity * 100)}%</span>
              </div>
            )}
          </div>
        )}

        {isAdmin && !bankPlacementMode && (
          <button onClick={onUploadBlueprint} className={`${BTN} hidden sm:block`}>
            {blueprint ? 'Replace Blueprint' : 'Upload Blueprint'}
          </button>
        )}

        <div className="hidden md:block">
          <ZoomControls
            zoomLevel={zoomLevel}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onFitToScreen={onFitToScreen}
          />
        </div>

        {isAdmin && !bankPlacementMode && (
          <>
            <button onClick={onEnterBankPlacement} className={`${BTN} hidden sm:block`}>
              Place Banks
            </button>
            <button
              onClick={onAddMachine}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Add Machine</span>
            </button>
          </>
        )}

        {bankPlacementMode && (
          <button
            onClick={onExitBankPlacement}
            className="px-3 sm:px-4 py-2 text-sm font-semibold bg-amber-700 text-white rounded-lg hover:bg-amber-600 border border-amber-600 transition-colors"
          >
            Exit Placement Mode
          </button>
        )}
      </div>
    </div>
  )
}

interface ZoomControlsProps {
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
}

function ZoomControls({ zoomLevel, onZoomIn, onZoomOut, onFitToScreen }: ZoomControlsProps) {
  const BTN = 'px-2 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition-colors'
  return (
    <div className="flex items-center gap-1">
      <button onClick={onZoomOut} className={BTN} title="Zoom out">−</button>
      <span className="text-xs text-gray-400 font-mono w-10 text-center">
        {Math.round(zoomLevel * 100)}%
      </span>
      <button onClick={onZoomIn} className={BTN} title="Zoom in">+</button>
      <button onClick={onFitToScreen} className={`${BTN} px-3 ml-1`} title="Fit to screen">
        Fit
      </button>
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
  cellPx: number
  onDragOver: () => void
  onDrop: () => void
  onDragStart: (m: MapMachine) => void
  onDragEnd: () => void
  onClick: (m: MapMachine) => void
}

function GridCell({
  x, y, machine, isAdmin, isDragging, isHovered, isOccupied, cellPx,
  onDragOver, onDrop, onDragStart, onDragEnd, onClick,
}: GridCellProps) {
  const canDrop = isDragging && !isOccupied
  const dropHighlight = isHovered && canDrop
    ? 'bg-blue-900/40 border-blue-500'
    : isHovered && isOccupied
    ? 'bg-red-900/30 border-red-700'
    : ''

  const showCoord = cellPx >= 32

  return (
    <div
      style={{ width: cellPx, height: cellPx }}
      className={`border-r border-b border-gray-800/60 relative transition-colors duration-75 ${dropHighlight}`}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDrop={(e) => { e.preventDefault(); onDrop() }}
    >
      {machine && (
        <MachineTile
          machine={machine}
          isDraggable={isAdmin}
          cellPx={cellPx}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={onClick}
        />
      )}
      {!machine && showCoord && (
        <div className="absolute bottom-0.5 right-1 text-[8px] text-gray-800 select-none">
          {x},{y}
        </div>
      )}
    </div>
  )
}

interface MobileStatusSummaryProps {
  machines: MapMachine[]
  onShowFullMap: () => void
}

function MobileStatusSummary({ machines, onShowFullMap }: MobileStatusSummaryProps) {
  const counts: Record<MachineStatus, number> = {
    ONLINE: 0,
    OFFLINE: 0,
    WARNING: 0,
    MAINTENANCE: 0,
  }
  for (const m of machines) counts[m.status]++

  const alertMachines = machines.filter((m) => m.status === 'OFFLINE' || m.status === 'WARNING')

  const statusConfig: { status: MachineStatus; label: string; dotClass: string; countClass: string }[] = [
    { status: 'ONLINE', label: 'Online', dotClass: 'bg-green-400', countClass: 'text-green-300' },
    { status: 'OFFLINE', label: 'Offline', dotClass: 'bg-red-400', countClass: 'text-red-300' },
    { status: 'WARNING', label: 'Warning', dotClass: 'bg-yellow-400', countClass: 'text-yellow-300' },
    { status: 'MAINTENANCE', label: 'Maint.', dotClass: 'bg-orange-400', countClass: 'text-orange-300' },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Status count grid */}
      <div className="grid grid-cols-2 gap-3">
        {statusConfig.map(({ status, label, dotClass, countClass }) => (
          <div key={status} className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full shrink-0 ${dotClass}`} />
            <div>
              <p className={`text-xl font-bold ${countClass}`}>{counts[status]}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert machines list */}
      {alertMachines.length > 0 ? (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2.5 border-b border-gray-800 bg-gray-900">
            Needs Attention ({alertMachines.length})
          </p>
          <ul className="divide-y divide-gray-800/50">
            {alertMachines.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${m.status === 'OFFLINE' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                <span className="font-mono text-xs text-white">#{m.assetNumber}</span>
                <span className="text-sm text-gray-300 truncate flex-1">{m.gameName}</span>
                {m.bankNumber && <span className="text-xs text-gray-500 shrink-0">{m.bankNumber}</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-6 text-center">
          <p className="text-sm text-green-400 font-medium">All machines online</p>
          <p className="text-xs text-gray-500 mt-1">No machines require attention</p>
        </div>
      )}

      <button
        onClick={onShowFullMap}
        className="w-full py-2.5 text-sm font-semibold text-white bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition-colors"
      >
        Open Full Map
      </button>
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
      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-xs text-orange-300">🔧</span>
        <span className="text-xs text-gray-400">Shift task</span>
      </div>
    </div>
  )
}

interface MinimapPanelProps {
  machines: MapMachine[]
  cellPx: number
  scrollPos: { x: number; y: number }
  viewportSize: { w: number; h: number }
}

function MinimapPanel({ machines, cellPx, scrollPos, viewportSize }: MinimapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

    for (const m of machines) {
      if (m.gridX === null || m.gridY === null) continue
      ctx.fillStyle = MINIMAP_STATUS_COLORS[m.status]
      ctx.fillRect(
        m.gridX * MINIMAP_CELL_PX,
        m.gridY * MINIMAP_CELL_PX,
        MINIMAP_CELL_PX,
        MINIMAP_CELL_PX
      )
    }
  }, [machines])

  const fullW = GRID_COLS * cellPx
  const fullH = GRID_ROWS * cellPx
  const scaleX = MINIMAP_W / fullW
  const scaleY = MINIMAP_H / fullH

  const indicatorLeft = Math.round(scrollPos.x * scaleX)
  const indicatorTop = Math.round(scrollPos.y * scaleY)
  const indicatorW = Math.min(Math.round(viewportSize.w * scaleX), MINIMAP_W)
  const indicatorH = Math.min(Math.round(viewportSize.h * scaleY), MINIMAP_H)

  return (
    <div className="absolute bottom-14 right-4 z-30 rounded-lg border border-gray-700 bg-gray-950/90 backdrop-blur-sm shadow-xl overflow-hidden">
      <p className="text-[9px] text-gray-600 uppercase tracking-wider px-2 pt-1.5 pb-1">
        {GRID_COLS}×{GRID_ROWS} minimap
      </p>
      <div className="relative">
        <canvas ref={canvasRef} width={MINIMAP_W} height={MINIMAP_H} />
        {viewportSize.w > 0 && (
          <div
            className="absolute border border-blue-400/80 bg-blue-400/10 pointer-events-none"
            style={{
              left: indicatorLeft,
              top: indicatorTop,
              width: indicatorW,
              height: indicatorH,
            }}
          />
        )}
      </div>
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
