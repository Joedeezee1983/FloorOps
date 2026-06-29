'use client'

import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import {
  MACHINE_STATUS_LABELS,
  PROGRESSIVE_TYPE_LABELS,
  TASK_SECTION_LABELS,
  TASK_STATUS_STYLES,
} from '@/constants'
import type {
  MachineDetail,
  MachineStatus,
  MachineHistory,
  RepairLogEntry,
  StatusChangeEntry,
  DowntimeStats,
  MachinePartEntry,
} from '@/types'

export interface MachineDrawerProps {
  machineId: string | null
  isAdmin: boolean
  onClose: () => void
  onStatusChanged: (id: string, status: MachineStatus) => void
  onRemovedFromMap?: (id: string) => void
}

export default function MachineDrawer({
  machineId,
  isAdmin,
  onClose,
  onStatusChanged,
  onRemovedFromMap,
}: MachineDrawerProps) {
  const [detail, setDetail] = useState<MachineDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isRemovingFromMap, setIsRemovingFromMap] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [history, setHistory] = useState<MachineHistory | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    if (!machineId) {
      setDetail(null)
      setHistory(null)
      setActiveTab('details')
      return
    }
    setIsLoading(true)
    setActiveTab('details')
    setHistory(null)
    fetch(`/api/machines/${machineId}`)
      .then((r) => r.json())
      .then((json: { data: MachineDetail }) => { setDetail(json.data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [machineId])

  const handleTabChange = (tab: 'details' | 'history'): void => {
    setActiveTab(tab)
    if (tab === 'history' && machineId && !history && !isLoadingHistory) {
      setIsLoadingHistory(true)
      fetch(`/api/machines/${machineId}/history`)
        .then((r) => r.json())
        .then((json: { data: MachineHistory }) => { setHistory(json.data); setIsLoadingHistory(false) })
        .catch(() => setIsLoadingHistory(false))
    }
  }

  const handleRemoveFromMap = async (): Promise<void> => {
    if (!detail) return
    setIsRemovingFromMap(true)
    try {
      const res = await fetch(`/api/machines/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridX: null, gridY: null }),
      })
      if (res.ok) {
        onRemovedFromMap?.(detail.id)
      }
    } finally {
      setIsRemovingFromMap(false)
    }
  }

  const handleStatusChange = async (status: MachineStatus): Promise<void> => {
    if (!detail) return
    setIsChangingStatus(true)
    try {
      const res = await fetch(`/api/machines/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: statusNote || undefined }),
      })
      if (res.ok) {
        onStatusChanged(detail.id, status)
        setDetail((prev) => prev ? { ...prev, status } : null)
        setStatusNote('')
        // Invalidate cached history so it refreshes on next tab visit
        setHistory(null)
      }
    } finally {
      setIsChangingStatus(false)
    }
  }

  if (!machineId) return null

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex">
      <div className="w-screen max-w-md bg-gray-900 border-l border-gray-700 shadow-2xl overflow-y-auto flex flex-col">
        <DrawerHeader detail={detail} onClose={onClose} isLoading={isLoading} />
        {detail && (
          <>
            {detail.activeShiftTask && (
              <DrawerShiftTaskBanner task={detail.activeShiftTask} />
            )}
            <DrawerTabs activeTab={activeTab} onTabChange={handleTabChange} />
            {activeTab === 'details' && (
              <>
                <DrawerMeta detail={detail} />
                {isAdmin && (
                  <DrawerStatusControls
                    detail={detail}
                    statusNote={statusNote}
                    isChangingStatus={isChangingStatus}
                    onNoteChange={setStatusNote}
                    onStatusChange={handleStatusChange}
                  />
                )}
                {isAdmin && detail.gridX !== null && (
                  <DrawerMapControls
                    isRemoving={isRemovingFromMap}
                    onRemove={handleRemoveFromMap}
                  />
                )}
                <DrawerStatusHistory detail={detail} />
              </>
            )}
            {activeTab === 'history' && (
              <DrawerHistory history={history} isLoading={isLoadingHistory} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DrawerHeader({
  detail,
  onClose,
  isLoading,
}: {
  detail: MachineDetail | null
  onClose: () => void
  isLoading: boolean
}) {
  return (
    <div className="flex items-start justify-between p-6 border-b border-gray-700">
      <div>
        {isLoading ? (
          <div className="h-6 w-40 bg-gray-700 rounded animate-pulse" />
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-1">
              {detail?.assetNumber != null ? `Asset #${detail.assetNumber}` : 'Machine Detail'}
            </p>
            <h2 className="text-xl font-bold text-white">{detail?.gameName ?? '—'}</h2>
            {detail && <div className="mt-2"><StatusBadge status={detail.status} /></div>}
          </>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors ml-4 mt-1"
        aria-label="Close drawer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function DrawerShiftTaskBanner({
  task,
}: {
  task: NonNullable<MachineDetail['activeShiftTask']>
}) {
  const since = new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const by = task.loggedByName ?? 'Unknown'

  return (
    <div className="mx-4 mt-4 rounded-lg bg-orange-900/30 border border-orange-700 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-orange-300 text-base">🔧</span>
        <p className="text-sm font-semibold text-orange-300">Active shift task</p>
      </div>
      <p className="text-xs text-orange-400 mt-1">
        Logged down by <span className="font-medium text-orange-300">{by}</span> at {since}
      </p>
    </div>
  )
}

function DrawerTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: 'details' | 'history'
  onTabChange: (tab: 'details' | 'history') => void
}) {
  return (
    <div className="flex border-b border-gray-700 mt-2">
      {(['details', 'history'] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize
            ${activeTab === tab
              ? 'text-white border-blue-500'
              : 'text-gray-500 hover:text-gray-300 border-transparent'
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function DrawerMeta({ detail }: { detail: MachineDetail }) {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: 'Bank', value: detail.bankNumber },
    { label: 'Brand', value: detail.gameBrand },
    { label: 'Game Type', value: detail.gameType },
    { label: 'Progressive', value: PROGRESSIVE_TYPE_LABELS[detail.progressiveType] ?? detail.progressiveType },
    { label: 'Denomination', value: `$${detail.denomination.toFixed(2)}` },
    { label: 'Software', value: detail.softwareVersion },
    { label: 'Location', value: detail.locationName },
    {
      label: 'Grid position',
      value: detail.gridX != null ? `(${detail.gridX}, ${detail.gridY})` : 'Unplaced',
    },
    {
      label: 'Registered',
      value: new Date(detail.createdAt).toLocaleDateString(),
    },
  ]

  return (
    <dl className="px-6 py-4 border-b border-gray-700 grid grid-cols-2 gap-x-4 gap-y-3">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs text-gray-500">{label}</dt>
          <dd className="text-sm text-gray-200 mt-0.5">{value ?? <span className="text-gray-600">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

function DrawerStatusControls({
  detail,
  statusNote,
  isChangingStatus,
  onNoteChange,
  onStatusChange,
}: {
  detail: MachineDetail
  statusNote: string
  isChangingStatus: boolean
  onNoteChange: (v: string) => void
  onStatusChange: (s: MachineStatus) => void
}) {
  const statuses = Object.keys(MACHINE_STATUS_LABELS) as MachineStatus[]

  return (
    <div className="px-6 py-4 border-b border-gray-700">
      <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Change Status</p>
      <input
        type="text"
        value={statusNote}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Optional note (e.g. sensor replaced)"
        className="w-full mb-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            disabled={s === detail.status || isChangingStatus}
            onClick={() => onStatusChange(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
              ${s === detail.status
                ? 'opacity-40 cursor-not-allowed bg-gray-700 text-gray-400'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
              }`}
          >
            {MACHINE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

function DrawerMapControls({
  isRemoving,
  onRemove,
}: {
  isRemoving: boolean
  onRemove: () => void
}) {
  return (
    <div className="px-6 py-4 border-b border-gray-700">
      <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Map Placement</p>
      <button
        disabled={isRemoving}
        onClick={onRemove}
        className="w-full rounded-lg px-3 py-2 text-sm font-medium border border-red-800 bg-red-900/20 text-red-400 hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isRemoving ? 'Removing…' : 'Remove from Map'}
      </button>
      <p className="text-xs text-gray-600 mt-2">Returns machine to the unplaced sidebar</p>
    </div>
  )
}

function DrawerStatusHistory({ detail }: { detail: MachineDetail }) {
  return (
    <div className="px-6 py-4 flex-1">
      <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Status History</p>
      {detail.statusLogs.length === 0 ? (
        <p className="text-sm text-gray-600">No history recorded.</p>
      ) : (
        <ul className="space-y-2">
          {detail.statusLogs.map((log) => (
            <li key={log.id} className="flex items-start gap-3">
              <StatusBadge status={log.status} size="sm" />
              <div className="flex-1 min-w-0">
                {log.note && <p className="text-xs text-gray-300 truncate">{log.note}</p>}
                <p className="text-xs text-gray-600">
                  {new Date(log.changedAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── History tab ──────────────────────────────────────────────────────────────

function DrawerHistory({
  history,
  isLoading,
}: {
  history: MachineHistory | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!history) return null

  return (
    <div className="flex-1">
      <DowntimeStatsPanel stats={history.downtimeStats} />
      <RepairLogSection entries={history.repairLog} />
      <PartsRequestedSection entries={history.partRequests} />
      <StatusChangesSection entries={history.statusChanges} />
    </div>
  )
}

function DowntimeStatsPanel({ stats }: { stats: DowntimeStats }) {
  return (
    <div className="px-6 py-4 border-b border-gray-700">
      <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Downtime Stats</p>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{stats.timesLoggedThisMonth}</p>
          <p className="text-xs text-gray-500 mt-0.5">This month</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{stats.timesLoggedAllTime}</p>
          <p className="text-xs text-gray-500 mt-0.5">All time</p>
        </div>
        <div>
          <p className="text-sm font-medium text-white leading-tight">
            {stats.mostRecentIssueDate
              ? new Date(stats.mostRecentIssueDate).toLocaleDateString()
              : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Last issue</p>
        </div>
      </div>
    </div>
  )
}

function RepairLogSection({ entries }: { entries: RepairLogEntry[] }) {
  return (
    <div className="px-6 py-4 border-b border-gray-700">
      <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Repair Log</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-600">No repair history.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <RepairLogItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RepairLogItem({ entry }: { entry: RepairLogEntry }) {
  return (
    <li className="rounded-lg bg-gray-800 border border-gray-700 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-gray-400">
          {new Date(entry.date).toLocaleDateString()}
        </span>
        <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${TASK_STATUS_STYLES[entry.taskStatus]}`}>
          {entry.taskStatus.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-gray-200">{entry.description}</p>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="text-xs text-gray-500">
          {TASK_SECTION_LABELS[entry.section] ?? entry.section}
        </span>
        {entry.techName && (
          <span className="text-xs text-gray-500">{entry.techName}</span>
        )}
      </div>
    </li>
  )
}

const PART_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  ORDERED: 'bg-blue-900/40 text-blue-300 border border-blue-700',
  RECEIVED: 'bg-green-900/40 text-green-300 border border-green-700',
}

function PartsRequestedSection({ entries }: { entries: MachinePartEntry[] }) {
  return (
    <div className="px-6 py-4 border-b border-gray-700">
      <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Parts Requested</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-600">No parts requested for this machine.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg bg-gray-800 border border-gray-700 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-gray-200">{entry.name}</span>
                <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${PART_STATUS_STYLES[entry.status] ?? ''}`}>
                  {entry.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">Qty: {entry.quantity}</span>
                {entry.urgency === 'URGENT' && (
                  <span className="text-xs text-red-400 font-medium">Urgent</span>
                )}
                <span className="text-xs text-gray-600 ml-auto">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
              {entry.requestedByName && (
                <p className="text-xs text-gray-600 mt-1">{entry.requestedByName}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusChangesSection({ entries }: { entries: StatusChangeEntry[] }) {
  return (
    <div className="px-6 py-4 flex-1">
      <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Status Changes</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-600">No status history.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <StatusChangeItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusChangeItem({ entry }: { entry: StatusChangeEntry }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
        {entry.oldStatus ? (
          <>
            <StatusBadge status={entry.oldStatus} size="sm" />
            <span className="text-gray-600 text-xs">→</span>
          </>
        ) : null}
        <StatusBadge status={entry.newStatus} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        {entry.note && <p className="text-xs text-gray-300 truncate">{entry.note}</p>}
        <p className="text-xs text-gray-600">
          {new Date(entry.changedAt).toLocaleString()}
        </p>
      </div>
    </li>
  )
}
