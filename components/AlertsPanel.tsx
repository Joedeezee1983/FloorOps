'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ServiceAlertSummary, AlertStatus, UserRole } from '@/types'
import {
  ALERT_TYPE_LABELS,
  ALERT_STATUS_LABELS,
  ALERT_TYPE_STYLES,
  ALERT_STATUS_STYLES,
} from '@/constants'

const ALERTS_POLL_INTERVAL_MS = 30_000

export interface AlertsPanelProps {
  userRole: UserRole
}

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export default function AlertsPanel({ userRole }: AlertsPanelProps) {
  // Hooks
  const [alerts, setAlerts] = useState<ServiceAlertSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadAlerts = useCallback(async () => {
    setFetchError(null)
    try {
      const res = await fetch('/api/alerts')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json() as { data: ServiceAlertSummary[] }
      setAlerts(json.data)
    } catch {
      setFetchError('Failed to load alerts.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAlerts()
    const interval = setInterval(() => void loadAlerts(), ALERTS_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadAlerts])

  // Handlers
  const handleUpdateStatus = async (id: string, status: AlertStatus): Promise<void> => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return
      const json = await res.json() as { data: ServiceAlertSummary }
      setAlerts((prev) => {
        if (status === 'RESOLVED') return prev.filter((a) => a.id !== id)
        return prev.map((a) => (a.id === id ? json.data : a))
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length

  // Render
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Service Alerts</h1>
          {!isLoading && (
            <p className="text-sm text-gray-400 mt-0.5">
              {activeCount > 0
                ? `${activeCount} active alert${activeCount !== 1 ? 's' : ''} requiring attention`
                : 'No active alerts'}
            </p>
          )}
        </div>
        <button
          onClick={() => void loadAlerts()}
          className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-700 rounded-lg hover:text-white hover:bg-gray-800 transition-colors"
        >
          Refresh
        </button>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 mb-4">
          <p className="text-sm text-red-300">{fetchError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/40 p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/20 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-green-900/30 border border-green-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">All clear</p>
          <p className="text-gray-600 text-xs mt-1">No active alerts for your location.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isBusy={updatingId === alert.id}
              userRole={userRole}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AlertCardProps {
  alert: ServiceAlertSummary
  isBusy: boolean
  userRole: UserRole
  onUpdateStatus: (id: string, status: AlertStatus) => Promise<void>
}

function AlertCard({ alert, isBusy, onUpdateStatus }: AlertCardProps) {
  const isActive = alert.status === 'ACTIVE'

  return (
    <div className={`rounded-xl border p-5 transition-colors ${isActive ? 'border-red-800/60 bg-red-950/10' : 'border-gray-800 bg-gray-900/40'}`}>
      {/* Type + status + time */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ALERT_TYPE_STYLES[alert.type] ?? ''}`}>
          {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ALERT_STATUS_STYLES[alert.status] ?? ''}`}>
          {ALERT_STATUS_LABELS[alert.status] ?? alert.status}
        </span>
        <span className="ml-auto text-xs text-gray-500 shrink-0">{formatTimeAgo(alert.createdAt)}</span>
      </div>

      {/* Machine */}
      {alert.machine && (
        <p className="text-sm text-gray-300 mb-1">
          Machine:{' '}
          <span className="font-mono text-white">#{alert.machine.assetNumber}</span>
          {' — '}
          <span className="text-gray-400">{alert.machine.gameName}</span>
        </p>
      )}

      {/* Message */}
      {alert.message && (
        <p className="text-sm text-gray-400 mb-1 italic">&ldquo;{alert.message}&rdquo;</p>
      )}

      {/* Meta */}
      <p className="text-xs text-gray-500 mb-4">
        Sent by{' '}
        <span className="text-gray-400">{alert.createdBy.name ?? 'Unknown'}</span>
        {alert.acknowledgedBy && (
          <> · Acknowledged by <span className="text-gray-400">{alert.acknowledgedBy.name ?? 'Unknown'}</span></>
        )}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        {isActive && (
          <button
            onClick={() => void onUpdateStatus(alert.id, 'ACKNOWLEDGED')}
            disabled={isBusy}
            className="px-3 py-1.5 text-xs font-semibold bg-yellow-900/40 border border-yellow-700 text-yellow-300 rounded-lg hover:bg-yellow-900/70 disabled:opacity-50 transition-colors"
          >
            Acknowledge
          </button>
        )}
        <button
          onClick={() => void onUpdateStatus(alert.id, 'RESOLVED')}
          disabled={isBusy}
          className="px-3 py-1.5 text-xs font-semibold bg-green-900/40 border border-green-700 text-green-300 rounded-lg hover:bg-green-900/70 disabled:opacity-50 transition-colors"
        >
          Resolve
        </button>
      </div>
    </div>
  )
}
