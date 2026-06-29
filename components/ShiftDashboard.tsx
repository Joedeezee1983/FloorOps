'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import StatusBadge from '@/components/StatusBadge'
import {
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_STYLES,
  TASK_SECTION_LABELS,
  TASK_SECTION_ORDER,
  SHIFT_HOURS,
} from '@/constants'
import type {
  ShiftSummary,
  ShiftDetail,
  ShiftTaskDetail,
  LocationSummary,
  TaskType,
  TaskStatus,
  TaskSection,
  ShiftType,
  UserRole,
  MachineSearchResult,
  UserSummary,
  PartUrgency,
} from '@/types'

export interface ShiftDashboardProps {
  userRole: UserRole
  userName: string
  userId: string
}

export default function ShiftDashboard({ userRole, userName, userId }: ShiftDashboardProps) {
  const isSupervisorOrAbove = userRole === 'ADMIN' || userRole === 'SUPERVISOR'

  const [shifts, setShifts] = useState<ShiftSummary[]>([])
  const [selectedShift, setSelectedShift] = useState<ShiftDetail | null>(null)
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showPartForm, setShowPartForm] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isEndingShift, setIsEndingShift] = useState(false)
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const loadShifts = useCallback(async () => {
    setIsLoadingShifts(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/shifts')
      if (!res.ok) throw new Error('Failed to load shifts')
      const json = await res.json() as { data: ShiftSummary[] }
      setShifts(json.data)
    } catch {
      setFetchError('Failed to load shifts. Please refresh.')
    } finally {
      setIsLoadingShifts(false)
    }
  }, [])

  const loadShiftDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true)
    try {
      const res = await fetch(`/api/shifts/${id}`)
      if (!res.ok) return
      const json = await res.json() as { data: ShiftDetail }
      setSelectedShift(json.data)
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => { void loadShifts() }, [loadShifts])

  const handleShiftCreated = useCallback((shift: ShiftDetail) => {
    setShowCreateForm(false)
    setSelectedShift(shift)
    void loadShifts()
  }, [loadShifts])

  const handleTaskCreated = useCallback((task: ShiftTaskDetail) => {
    setShowTaskForm(false)
    setSelectedShift((prev) => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev)
  }, [])

  const handleTaskStatusUpdate = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/shifts/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return
      const json = await res.json() as { data: ShiftTaskDetail }
      setSelectedShift((prev) => {
        if (!prev) return prev
        return { ...prev, tasks: prev.tasks.map((t) => t.id === taskId ? json.data : t) }
      })
    } catch {
      // Non-fatal — user can retry
    }
  }, [])

  const handleEndShift = useCallback(async (shiftId: string) => {
    setIsEndingShift(true)
    try {
      const endRes = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      })
      if (!endRes.ok) return
      const endJson = await endRes.json() as { data: ShiftDetail }
      setSelectedShift(endJson.data)
      void loadShifts()
    } finally {
      setIsEndingShift(false)
    }

    setIsGeneratingBriefing(true)
    try {
      await fetch(`/api/shifts/${shiftId}/briefing`, { method: 'POST' })
    } finally {
      setIsGeneratingBriefing(false)
      void loadShiftDetail(shiftId)
    }
  }, [loadShifts, loadShiftDetail])

  const downMachineCount = selectedShift?.tasks.filter(
    (t) => t.type === 'DOWN_MACHINE' && t.status !== 'RESOLVED'
  ).length ?? 0

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Page header */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Shifts</h1>
            <p className="mt-1 text-gray-400">
              {isLoadingShifts ? 'Loading...' : `${shifts.length} shift${shifts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {isSupervisorOrAbove && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">New Shift</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:h-[calc(100vh-120px)]">
        {/* Left: shifts list — always visible on md+, shown on mobile when in list view */}
        <div className={`md:block md:w-80 md:shrink-0 md:border-r md:border-b-0 border-b border-gray-800 overflow-y-auto ${mobileView === 'list' ? 'block' : 'hidden'}`}>
          {fetchError ? (
            <p className="text-red-400 text-sm p-6">{fetchError}</p>
          ) : isLoadingShifts ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : shifts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm">No shifts yet.</p>
              {isSupervisorOrAbove && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Create the first shift
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-800/50">
              {shifts.map((shift) => (
                <ShiftListItem
                  key={shift.id}
                  shift={shift}
                  isSelected={selectedShift?.id === shift.id}
                  onClick={() => { setMobileView('detail'); void loadShiftDetail(shift.id) }}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Right: shift detail — always visible on md+, shown on mobile when in detail view */}
        <div className={`md:flex md:flex-1 md:flex-col md:overflow-y-auto ${mobileView === 'detail' ? 'flex flex-col flex-1' : 'hidden'}`}>
          {/* Mobile back button */}
          <button
            onClick={() => setMobileView('list')}
            className="md:hidden flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-white border-b border-gray-800 bg-gray-950 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Shifts
          </button>

          {isLoadingDetail ? (
            <div className="p-6 sm:p-8 space-y-4">
              <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
            </div>
          ) : selectedShift ? (
            <ShiftDetailView
              shift={selectedShift}
              downMachineCount={downMachineCount}
              isSupervisorOrAbove={isSupervisorOrAbove}
              isEndingShift={isEndingShift}
              isGeneratingBriefing={isGeneratingBriefing}
              onLogTask={() => setShowTaskForm(true)}
              onRequestPart={() => setShowPartForm(true)}
              onTaskStatusUpdate={handleTaskStatusUpdate}
              onEndShift={handleEndShift}
            />
          ) : (
            <div className="hidden md:flex items-center justify-center h-full text-gray-600">
              <p>Select a shift to view its tasks</p>
            </div>
          )}
        </div>
      </div>

      {showCreateForm && (
        <CreateShiftModal
          userName={userName}
          userId={userId}
          onCreated={handleShiftCreated}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {showTaskForm && selectedShift && (
        <LogTaskModal
          shiftId={selectedShift.id}
          onCreated={handleTaskCreated}
          onClose={() => setShowTaskForm(false)}
        />
      )}

      {showPartForm && selectedShift && (
        <RequestPartModal
          shiftId={selectedShift.id}
          locationId={selectedShift.locationId}
          onClose={() => setShowPartForm(false)}
        />
      )}
    </div>
  )
}

// ─── Shift list item ──────────────────────────────────────────────────────────

function ShiftListItem({
  shift,
  isSelected,
  onClick,
}: {
  shift: ShiftSummary
  isSelected: boolean
  onClick: () => void
}) {
  const start = new Date(shift.startTime)
  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-gray-600',
    ACTIVE: 'bg-green-500',
    COMPLETED: 'bg-blue-600',
  }

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left px-5 py-4 hover:bg-gray-900 transition-colors ${isSelected ? 'bg-gray-900 border-l-2 border-blue-500' : ''}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block w-2 h-2 rounded-full ${statusColors[shift.status] ?? 'bg-gray-600'}`} />
          <span className="text-sm font-semibold text-white">{shift.type} Shift</span>
          <span className="text-xs text-gray-500 ml-auto">{shift.taskCount} task{shift.taskCount !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-xs text-gray-400">
          {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        {shift.supervisorName && (
          <p className="text-xs text-gray-600 mt-0.5">{shift.supervisorName}</p>
        )}
      </button>
    </li>
  )
}

// ─── Shift detail view ────────────────────────────────────────────────────────

function ShiftDetailView({
  shift,
  downMachineCount,
  isSupervisorOrAbove,
  isEndingShift,
  isGeneratingBriefing,
  onLogTask,
  onRequestPart,
  onTaskStatusUpdate,
  onEndShift,
}: {
  shift: ShiftDetail
  downMachineCount: number
  isSupervisorOrAbove: boolean
  isEndingShift: boolean
  isGeneratingBriefing: boolean
  onLogTask: () => void
  onRequestPart: () => void
  onTaskStatusUpdate: (taskId: string, status: TaskStatus) => void
  onEndShift: (shiftId: string) => void
}) {
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const start = new Date(shift.startTime)
  const end = new Date(shift.endTime)

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{shift.type} Shift</h2>
            <ShiftStatusBadge status={shift.status} />
          </div>
          <p className="text-gray-400 text-sm">
            {start.toLocaleDateString()} &middot; {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &mdash; {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {shift.locationName && ` · ${shift.locationName}`}
            {shift.supervisorName && ` · ${shift.supervisorName}`}
          </p>

          {/* Staff on shift */}
          {shift.staff.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Staff: {shift.staff.map((s) => s.name ?? 'Unknown').join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end shrink-0">
          {downMachineCount > 0 && (
            <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2">
              <span className="text-red-300 text-sm font-semibold">{downMachineCount} machine{downMachineCount !== 1 ? 's' : ''} down</span>
            </div>
          )}

          {shift.status === 'COMPLETED' && (
            <a
              href={`/api/shifts/${shift.id}/export`}
              download
              className="px-3 py-2 text-sm font-semibold bg-gray-700 text-gray-200 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Export PDF
            </a>
          )}

          {shift.status === 'ACTIVE' && (
            <button
              onClick={onRequestPart}
              className="px-3 py-2 text-sm font-semibold bg-gray-700 text-gray-200 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Request Part
            </button>
          )}

          {isSupervisorOrAbove && shift.status === 'ACTIVE' && (
            <button
              onClick={() => setShowEndConfirm(true)}
              disabled={isEndingShift}
              className="px-3 py-2 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEndingShift ? 'Ending...' : 'End Shift'}
            </button>
          )}
        </div>
      </div>

      {/* Tasks toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Tasks ({shift.tasks.length})
        </p>
        {isSupervisorOrAbove && shift.status === 'ACTIVE' && (
          <button
            onClick={onLogTask}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            <span className="text-base leading-none">+</span> Log Task
          </button>
        )}
      </div>

      {/* Tasks */}
      {shift.tasks.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-8 text-center text-gray-600">
          <p>No tasks logged for this shift.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shift.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSupervisorOrAbove={isSupervisorOrAbove}
              onStatusUpdate={(status) => onTaskStatusUpdate(task.id, status)}
            />
          ))}
        </div>
      )}

      {/* AI Briefing */}
      {isGeneratingBriefing && (
        <div className="mt-8 rounded-xl border border-blue-800 bg-blue-900/20 p-6">
          <p className="text-sm font-semibold text-blue-300 mb-1">Generating AI shift summary...</p>
          <p className="text-xs text-blue-400">This usually takes 5-10 seconds.</p>
        </div>
      )}

      {!isGeneratingBriefing && shift.aiSummary && (
        <div className="mt-8 rounded-xl border border-gray-700 bg-gray-900/40 p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Shift Summary</p>
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{shift.aiSummary}</div>
        </div>
      )}

      {/* End shift confirmation */}
      {showEndConfirm && (
        <EndShiftConfirmDialog
          onConfirm={() => {
            setShowEndConfirm(false)
            onEndShift(shift.id)
          }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  )
}

function ShiftStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: 'bg-gray-700 text-gray-300',
    ACTIVE: 'bg-green-900/60 text-green-300 border border-green-700',
    COMPLETED: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? styles.SCHEDULED}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

function EndShiftConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-700 shadow-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">End this shift?</h3>
        <p className="text-sm text-gray-400 mb-6">
          The shift will be marked as Completed and an AI summary will be generated. Machines still offline will remain offline.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-500 transition-colors"
          >
            End Shift
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  isSupervisorOrAbove,
  onStatusUpdate,
}: {
  task: ShiftTaskDetail
  isSupervisorOrAbove: boolean
  onStatusUpdate: (status: TaskStatus) => void
}) {
  const isDown = task.type === 'DOWN_MACHINE'
  const isActive = task.status !== 'RESOLVED'

  return (
    <div className={`rounded-xl border p-4 ${isDown && isActive ? 'border-red-800 bg-red-900/10' : 'border-gray-800 bg-gray-900/40'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {TASK_TYPE_LABELS[task.type] ?? task.type}
            </span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-xs text-gray-500">{TASK_SECTION_LABELS[task.section] ?? task.section}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${TASK_STATUS_STYLES[task.status]}`}>
              {TASK_STATUS_LABELS[task.status] ?? task.status}
            </span>
          </div>

          <p className="text-sm text-gray-200">{task.description}</p>

          {task.machine && (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-xs text-white bg-gray-800 px-2 py-0.5 rounded">
                #{task.machine.assetNumber}
              </span>
              <span className="text-xs text-gray-400">{task.machine.gameName}</span>
              <span className="text-xs text-gray-500">{task.machine.bankNumber}</span>
              <StatusBadge status={task.machine.status} size="sm" />
            </div>
          )}

          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
            {task.loggedByName && <span>by {task.loggedByName}</span>}
            <span>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {isSupervisorOrAbove && task.status !== 'RESOLVED' && (
          <div className="flex flex-col gap-1.5 shrink-0">
            {isDown && task.status === 'PENDING' && (
              <button
                onClick={() => onStatusUpdate('IN_PROGRESS')}
                className="px-2.5 py-1 text-xs text-blue-300 bg-blue-900/40 border border-blue-700 rounded-lg hover:bg-blue-900/60 transition-colors"
              >
                Start
              </button>
            )}
            <button
              onClick={() => onStatusUpdate('RESOLVED')}
              className="px-2.5 py-1 text-xs text-green-300 bg-green-900/40 border border-green-700 rounded-lg hover:bg-green-900/60 transition-colors"
            >
              {isDown ? 'Mark Restored' : 'Resolve'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create shift modal ───────────────────────────────────────────────────────

function CreateShiftModal({
  userName,
  userId,
  onCreated,
  onClose,
}: {
  userName: string
  userId: string
  onCreated: (shift: ShiftDetail) => void
  onClose: () => void
}) {
  const [type, setType] = useState<ShiftType>('DAY')
  const [locationId, setLocationId] = useState('')
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [headcount, setHeadcount] = useState('')
  const [briefing, setBriefing] = useState('')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([userId])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((json: { data: LocationSummary[] }) => {
        setLocations(json.data ?? [])
        if (json.data?.length === 1) setLocationId(json.data[0].id)
      })
      .catch(() => undefined)

    fetch('/api/users')
      .then((r) => r.json())
      .then((json: { data: UserSummary[] }) => setUsers(json.data ?? []))
      .catch(() => undefined)
  }, [])

  const toggleUser = (id: string) => {
    if (id === userId) return // current user cannot be deselected
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (): Promise<void> => {
    if (!locationId) { setError('Please select a location.'); return }
    setIsSubmitting(true)
    setError(null)

    const hours = SHIFT_HOURS[type]
    const now = new Date()
    const startTime = new Date(now)
    startTime.setHours(hours.start, 0, 0, 0)
    const endTime = new Date(now)
    endTime.setHours(hours.end, 0, 0, 0)
    if (hours.end < hours.start) endTime.setDate(endTime.getDate() + 1)

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          locationId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          headcount: headcount ? parseInt(headcount, 10) : 0,
          briefing: briefing || undefined,
          status: 'ACTIVE',
          staffIds: selectedUserIds,
        }),
      })

      const json = await res.json() as { data?: ShiftDetail; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to create shift.'); return }
      onCreated(json.data!)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl bg-gray-900 sm:border border-gray-700 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-white">Start New Shift</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2">
            <span className="text-xs text-gray-400">Starting as</span>
            <span className="text-xs font-medium text-white">{userName}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Shift Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['DAY', 'SWING', 'NIGHT'] as ShiftType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 text-sm font-medium rounded-lg border transition-colors ${type === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a location...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Headcount</label>
            <input
              type="number"
              min={0}
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Staff selection */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Staff on Shift
            </label>
            {users.length === 0 ? (
              <p className="text-xs text-gray-500">Loading staff...</p>
            ) : (
              <div className="rounded-lg border border-gray-700 bg-gray-800 divide-y divide-gray-700 max-h-44 overflow-y-auto">
                {users.map((user) => {
                  const isCurrentUser = user.id === userId
                  const isChecked = selectedUserIds.includes(user.id)
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 px-3 py-2.5 ${isCurrentUser ? 'cursor-default' : 'cursor-pointer hover:bg-gray-700/50 transition-colors'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isCurrentUser}
                        onChange={() => toggleUser(user.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-60"
                      />
                      <span className="text-sm text-white flex-1 truncate">{user.name ?? user.email}</span>
                      {isCurrentUser && (
                        <span className="text-xs text-blue-400 shrink-0">You</span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Briefing notes (optional)</label>
            <textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              rows={3}
              placeholder="Pre-shift briefing notes..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 sticky bottom-0 bg-gray-900">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Starting...' : 'Start Shift'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Request part modal ───────────────────────────────────────────────────────

function RequestPartModal({
  shiftId,
  locationId,
  onClose,
}: {
  shiftId: string
  locationId: string
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [urgency, setUrgency] = useState<PartUrgency>('NORMAL')
  const [assetQuery, setAssetQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MachineSearchResult[]>([])
  const [selectedMachine, setSelectedMachine] = useState<MachineSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [])

  const handleAssetQueryChange = (q: string) => {
    setAssetQuery(q)
    setSelectedMachine(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults([]); return }

    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/machines/search?q=${encodeURIComponent(q)}`)
        const json = await res.json() as { data: MachineSearchResult[] }
        setSearchResults(json.data ?? [])
      } finally {
        setIsSearching(false)
      }
    }, 250)
  }

  const handleSelectMachine = (m: MachineSearchResult) => {
    setSelectedMachine(m)
    setAssetQuery(m.assetNumber)
    setSearchResults([])
  }

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) { setError('Part name is required.'); return }
    const qty = parseInt(quantity, 10)
    if (!qty || qty < 1) { setError('Quantity must be at least 1.'); return }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          quantity: qty,
          urgency,
          shiftId,
          locationId,
          machineId: selectedMachine?.id ?? undefined,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to submit request.'); return }
      setSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl bg-gray-900 sm:border border-gray-700 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-white">Request Part</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <p className="text-green-300 font-semibold text-base mb-2">Request submitted</p>
            <p className="text-gray-400 text-sm mb-6">The inventory tech will be notified.</p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Part name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bill validator, TITO printer"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Model number, additional details..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Priority</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['NORMAL', 'URGENT'] as PartUrgency[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => setUrgency(u)}
                        className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                          urgency === u
                            ? u === 'URGENT' ? 'bg-red-700 border-red-600 text-white' : 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {u === 'URGENT' ? 'Urgent' : 'Normal'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Machine (optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={assetQuery}
                    onChange={(e) => handleAssetQueryChange(e.target.value)}
                    placeholder="Search by asset # or game name..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5 text-xs text-gray-500">Searching...</div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 shadow-xl overflow-hidden">
                      {searchResults.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMachine(m)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left"
                        >
                          <span className="font-mono text-sm text-white">{m.assetNumber}</span>
                          <span className="text-xs text-gray-400 flex-1 truncate">{m.gameName}</span>
                          <span className="text-xs text-gray-500">{m.bankNumber}</span>
                          <StatusBadge status={m.status} size="sm" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMachine && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-900/20 border border-blue-800 px-3 py-2">
                    <span className="font-mono text-xs text-white">#{selectedMachine.assetNumber}</span>
                    <span className="text-xs text-gray-300">{selectedMachine.gameName}</span>
                    <StatusBadge status={selectedMachine.status} size="sm" />
                    <button
                      onClick={() => { setSelectedMachine(null); setAssetQuery('') }}
                      className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 sticky bottom-0 bg-gray-900">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Log task modal ───────────────────────────────────────────────────────────

function LogTaskModal({
  shiftId,
  onCreated,
  onClose,
}: {
  shiftId: string
  onCreated: (task: ShiftTaskDetail) => void
  onClose: () => void
}) {
  const [section, setSection] = useState<TaskSection>('MISCELLANEOUS')
  const [taskType, setTaskType] = useState<TaskType>('GENERAL')
  const [description, setDescription] = useState('')
  const [assetQuery, setAssetQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MachineSearchResult[]>([])
  const [selectedMachine, setSelectedMachine] = useState<MachineSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [])

  // PRE_EXISTING_DOWN forces DOWN_MACHINE, and DOWN_MACHINE defaults to PRE_EXISTING_DOWN
  useEffect(() => {
    if (section === 'PRE_EXISTING_DOWN') setTaskType('DOWN_MACHINE')
  }, [section])

  useEffect(() => {
    if (taskType === 'DOWN_MACHINE') setSection('PRE_EXISTING_DOWN')
  }, [taskType])

  const showMachineSearch = taskType === 'DOWN_MACHINE'

  const handleAssetQueryChange = (q: string) => {
    setAssetQuery(q)
    setSelectedMachine(null)

    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults([]); return }

    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/machines/search?q=${encodeURIComponent(q)}`)
        const json = await res.json() as { data: MachineSearchResult[] }
        setSearchResults(json.data ?? [])
      } finally {
        setIsSearching(false)
      }
    }, 250)
  }

  const handleSelectMachine = (m: MachineSearchResult) => {
    setSelectedMachine(m)
    setAssetQuery(m.assetNumber)
    setSearchResults([])
    if (!description) setDescription(`Machine #${m.assetNumber} — ${m.gameName} reported down`)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!description.trim()) { setError('Description is required.'); return }
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/shifts/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          type: taskType,
          section,
          description: description.trim(),
          machineId: selectedMachine?.id ?? undefined,
        }),
      })

      const json = await res.json() as { data?: ShiftTaskDetail; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to log task.'); return }
      onCreated(json.data!)
    } finally {
      setIsSubmitting(false)
    }
  }

  const TASK_TYPES: TaskType[] = ['DOWN_MACHINE', 'GENERAL', 'MAINTENANCE_REQUEST']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl bg-gray-900 sm:border border-gray-700 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-white">Log Shift Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Section selector */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Section</label>
            <div className="grid grid-cols-3 gap-2">
              {TASK_SECTION_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`py-2 px-1 text-xs font-medium rounded-lg border transition-colors leading-tight ${section === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                >
                  {TASK_SECTION_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Task type (disabled when section forces DOWN_MACHINE) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Task type</label>
            <div className="grid grid-cols-3 gap-2">
              {TASK_TYPES.map((t) => {
                const isForced = section === 'PRE_EXISTING_DOWN' && t !== 'DOWN_MACHINE'
                return (
                  <button
                    key={t}
                    onClick={() => !isForced && setTaskType(t)}
                    disabled={isForced}
                    className={`py-2 px-1 text-xs font-medium rounded-lg border transition-colors leading-tight ${taskType === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'} disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {TASK_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Asset number search (only for DOWN_MACHINE) */}
          {showMachineSearch && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Asset number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={assetQuery}
                  onChange={(e) => handleAssetQueryChange(e.target.value)}
                  placeholder="Search by asset # or game name..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5 text-xs text-gray-500">Searching...</div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 shadow-xl overflow-hidden">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMachine(m)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left"
                      >
                        <span className="font-mono text-sm text-white">{m.assetNumber}</span>
                        <span className="text-xs text-gray-400 flex-1 truncate">{m.gameName}</span>
                        <span className="text-xs text-gray-500">{m.bankNumber}</span>
                        <StatusBadge status={m.status} size="sm" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedMachine && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-900/20 border border-blue-800 px-3 py-2">
                  <span className="font-mono text-xs text-white">#{selectedMachine.assetNumber}</span>
                  <span className="text-xs text-gray-300">{selectedMachine.gameName}</span>
                  <StatusBadge status={selectedMachine.status} size="sm" />
                  <button
                    onClick={() => { setSelectedMachine(null); setAssetQuery('') }}
                    className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}

              {assetQuery && !selectedMachine && searchResults.length === 0 && !isSearching && (
                <p className="mt-1.5 text-xs text-gray-500">
                  No machine found — task will be logged without a registry link.
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue or task..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 sticky bottom-0 bg-gray-900">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Logging...' : 'Log Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
