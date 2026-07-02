'use client'

import { useState, useEffect, useRef } from 'react'
import type { AlertType, MachineSearchResult } from '@/types'
import {
  ALERT_TYPE_LABELS,
  ALERT_TYPE_ACTIVE_STYLES,
} from '@/constants'

const ALERT_TYPES: AlertType[] = ['NEED_ASSISTANCE', 'MACHINE_DOWN', 'SECURITY', 'CUSTOM']
const MACHINE_SEARCH_DELAY_MS = 250

export interface AlertModalProps {
  onClose: () => void
}

export default function AlertModal({ onClose }: AlertModalProps) {
  // Hooks
  const [alertType, setAlertType] = useState<AlertType>('NEED_ASSISTANCE')
  const [message, setMessage] = useState('')
  const [assetQuery, setAssetQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MachineSearchResult[]>([])
  const [selectedMachine, setSelectedMachine] = useState<MachineSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [])

  // Handlers
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
    }, MACHINE_SEARCH_DELAY_MS)
  }

  const handleSelectMachine = (m: MachineSearchResult) => {
    setSelectedMachine(m)
    setAssetQuery(m.assetNumber)
    setSearchResults([])
  }

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: alertType,
          message: message.trim() || undefined,
          machineId: selectedMachine?.id ?? undefined,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to send alert.'); return }
      setIsSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full sm:max-w-md bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Send Service Alert</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold text-base mb-1">Alert sent to supervisors</p>
            <p className="text-gray-400 text-sm mb-6">The on-duty team has been notified.</p>
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
              {/* Alert type */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Alert Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALERT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setAlertType(t)}
                      className={`py-2.5 px-3 text-xs font-medium rounded-lg border transition-colors text-left ${
                        alertType === t
                          ? ALERT_TYPE_ACTIVE_STYLES[t] ?? ''
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {ALERT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Machine (optional) */}
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
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMachine && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-900/20 border border-blue-800 px-3 py-2">
                    <span className="font-mono text-xs text-white">#{selectedMachine.assetNumber}</span>
                    <span className="text-xs text-gray-300">{selectedMachine.gameName}</span>
                    <button
                      onClick={() => { setSelectedMachine(null); setAssetQuery('') }}
                      className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Message (optional) */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-900/20 border border-red-800 px-3 py-2">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Alert'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
