'use client'

import { useEffect, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import { MACHINE_STATUS_LABELS } from '@/constants'
import type { MachineDetail, MachineStatus } from '@/types'

export interface MachineDrawerProps {
  machineId: string | null
  isAdmin: boolean
  onClose: () => void
  onStatusChanged: (id: string, status: MachineStatus) => void
}

export default function MachineDrawer({
  machineId,
  isAdmin,
  onClose,
  onStatusChanged,
}: MachineDrawerProps) {
  const [detail, setDetail] = useState<MachineDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [statusNote, setStatusNote] = useState('')

  useEffect(() => {
    if (!machineId) { setDetail(null); return }
    setIsLoading(true)
    fetch(`/api/machines/${machineId}`)
      .then((r) => r.json())
      .then((json: { data: MachineDetail }) => { setDetail(json.data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [machineId])

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
            <DrawerStatusHistory detail={detail} />
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
              {detail?.machineNumber != null ? `M-${detail.machineNumber}` : 'Machine Detail'}
            </p>
            <h2 className="text-xl font-bold text-white">{detail?.name ?? '—'}</h2>
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

function DrawerMeta({ detail }: { detail: MachineDetail }) {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: 'Serial', value: detail.serialNumber },
    { label: 'Model', value: detail.model },
    { label: 'Manufacturer', value: detail.manufacturer },
    { label: 'Location', value: detail.locationName },
    {
      label: 'Grid position',
      value: detail.gridX != null ? `(${detail.gridX}, ${detail.gridY})` : 'Unplaced',
    },
    {
      label: 'Installed',
      value: detail.installedAt ? new Date(detail.installedAt).toLocaleDateString() : null,
    },
    { label: 'Notes', value: detail.notes },
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
