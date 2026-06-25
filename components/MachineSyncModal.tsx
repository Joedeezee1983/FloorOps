'use client'

import { useState, useRef } from 'react'
import { SYNC_TEMPLATE_HEADER, SYNC_REQUIRED_COLUMNS, VALID_PROGRESSIVE_TYPES } from '@/constants'
import type { SyncImportResult } from '@/types'

export interface MachineSyncModalProps {
  onClose: () => void
  onSynced: () => void
}

type SyncStep = 'upload' | 'preview' | 'result'

interface ParsedSyncRow {
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: string
  denomination: string
  softwareVersion: string
  status: string
}

export default function MachineSyncModal({ onClose, onSynced }: MachineSyncModalProps) {
  const [step, setStep] = useState<SyncStep>('upload')
  const [parsedRows, setParsedRows] = useState<ParsedSyncRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; error: string }>>([])
  const [syncResult, setSyncResult] = useState<SyncImportResult | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setRowErrors([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const { rows, errors, error } = parseSyncCsv(text)
      if (error) {
        setParseError(error)
        return
      }
      setParsedRows(rows)
      setRowErrors(errors)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  const handleConfirmSync = async (): Promise<void> => {
    if (parsedRows.length === 0) return
    setIsSyncing(true)

    try {
      const res = await fetch('/api/machines/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows.map((r) => ({
            assetNumber: r.assetNumber,
            bankNumber: r.bankNumber,
            gameName: r.gameName,
            gameBrand: r.gameBrand,
            gameType: r.gameType,
            progressiveType: r.progressiveType,
            denomination: r.denomination,
            softwareVersion: r.softwareVersion || undefined,
            status: r.status || undefined,
          })),
        }),
      })

      const json = await res.json() as { data?: SyncImportResult; error?: string }

      if (!res.ok) {
        setParseError(json.error ?? 'Sync failed. Please try again.')
        setStep('preview')
        return
      }

      setSyncResult(json.data!)
      setStep('result')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDone = () => {
    const result = syncResult
    if (result && (result.created > 0 || result.updated > 0)) {
      onSynced()
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-xl bg-gray-900 sm:border border-gray-700 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Sync Active Games Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload' && 'Upload a CSV from your slot management system (Optx, IGT, Aristocrat)'}
              {step === 'preview' && `${parsedRows.length} row${parsedRows.length !== 1 ? 's' : ''} ready — existing machines will be updated`}
              {step === 'result' && 'Sync complete'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 'upload' && (
            <SyncUploadStep fileRef={fileRef} parseError={parseError} onFileChange={handleFileChange} />
          )}
          {step === 'preview' && (
            <SyncPreviewStep rows={parsedRows} rowErrors={rowErrors} />
          )}
          {step === 'result' && syncResult && (
            <SyncResultStep result={syncResult} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 shrink-0">
          {step === 'upload' && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setParsedRows([]); if (fileRef.current) fileRef.current.value = '' }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmSync}
                disabled={isSyncing || parsedRows.length === 0}
                className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSyncing ? 'Syncing…' : `Sync ${parsedRows.length} Row${parsedRows.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
          {step === 'result' && (
            <button onClick={handleDone} className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function SyncUploadStep({
  fileRef,
  parseError,
  onFileChange,
}: {
  fileRef: React.RefObject<HTMLInputElement>
  parseError: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 transition-colors p-8 text-center">
        <p className="text-gray-400 text-sm mb-3">Select a CSV export from your slot management system</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="block mx-auto text-sm text-gray-400 file:mr-3 file:px-4 file:py-1.5 file:rounded-lg file:bg-purple-600 file:text-white file:text-sm file:font-medium file:border-0 file:cursor-pointer hover:file:bg-purple-500"
        />
      </div>

      {parseError && (
        <div className="rounded-lg bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-400">
          {parseError}
        </div>
      )}

      <div className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">How sync works</p>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>If <span className="font-mono text-gray-300">assetNumber</span> matches an existing machine — fields are updated</li>
          <li>If asset number is new — a new machine is created</li>
          <li>The <span className="font-mono text-gray-300">status</span> column is optional (ONLINE, OFFLINE, WARNING, MAINTENANCE)</li>
        </ul>
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider pt-1">Expected columns</p>
        <code className="text-xs text-purple-400 font-mono break-all">{SYNC_TEMPLATE_HEADER}</code>
        <p className="text-xs text-gray-500">Required: {SYNC_REQUIRED_COLUMNS.join(', ')}</p>
      </div>
    </div>
  )
}

function SyncPreviewStep({
  rows,
  rowErrors,
}: {
  rows: ParsedSyncRow[]
  rowErrors: Array<{ row: number; error: string }>
}) {
  const previewRows = rows.slice(0, 5)
  const hiddenCount = rows.length - previewRows.length

  return (
    <div className="space-y-4">
      {rowErrors.length > 0 && (
        <div className="rounded-lg bg-yellow-900/30 border border-yellow-800 px-4 py-3">
          <p className="text-sm font-semibold text-yellow-400 mb-2">
            {rowErrors.length} row{rowErrors.length !== 1 ? 's' : ''} skipped (invalid data)
          </p>
          <ul className="space-y-1">
            {rowErrors.slice(0, 5).map((e) => (
              <li key={e.row} className="text-xs text-yellow-500">Row {e.row}: {e.error}</li>
            ))}
            {rowErrors.length > 5 && <li className="text-xs text-yellow-600">…and {rowErrors.length - 5} more</li>}
          </ul>
        </div>
      )}

      <p className="text-sm text-gray-400">
        Preview — first {previewRows.length} of {rows.length} row{rows.length !== 1 ? 's' : ''}:
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800">
              {['Asset #', 'Bank', 'Game Name', 'Brand', 'Type', 'Denom', 'Status'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-gray-400 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50">
                <td className="px-3 py-2 font-mono text-white">{r.assetNumber}</td>
                <td className="px-3 py-2 text-gray-300">{r.bankNumber}</td>
                <td className="px-3 py-2 text-gray-300">{r.gameName}</td>
                <td className="px-3 py-2 text-gray-300">{r.gameBrand}</td>
                <td className="px-3 py-2 text-gray-300">{r.gameType}</td>
                <td className="px-3 py-2 font-mono text-gray-300">{r.denomination}</td>
                <td className="px-3 py-2 text-gray-500">{r.status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <p className="text-xs text-gray-500 text-center">…and {hiddenCount} more row{hiddenCount !== 1 ? 's' : ''} not shown</p>
      )}
    </div>
  )
}

function SyncResultStep({ result }: { result: SyncImportResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-green-900/30 border border-green-800 p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{result.created}</p>
          <p className="text-sm text-green-300 mt-1">Created</p>
        </div>
        <div className="rounded-lg bg-blue-900/30 border border-blue-800 p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{result.updated}</p>
          <p className="text-sm text-blue-300 mt-1">Updated</p>
        </div>
        <div className="rounded-lg bg-red-900/30 border border-red-800 p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{result.failed}</p>
          <p className="text-sm text-red-300 mt-1">Failed</p>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Error Details</p>
          </div>
          <ul className="divide-y divide-gray-800 max-h-48 overflow-y-auto">
            {result.errors.map((err, i) => (
              <li key={i} className="px-4 py-2.5 text-xs">
                <span className="font-mono text-gray-400">Row {err.row}</span>
                {err.assetNumber && <span className="text-gray-500"> · Asset #{err.assetNumber}</span>}
                <span className="text-red-400 ml-2">{err.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseSyncCsv(text: string): {
  rows: ParsedSyncRow[]
  errors: Array<{ row: number; error: string }>
  error: string | null
} {
  const lines = text.trim().split('\n').map((l) => l.replace(/\r$/, ''))

  if (lines.length < 2) {
    return { rows: [], errors: [], error: 'CSV must have a header row and at least one data row.' }
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const missingRequired = SYNC_REQUIRED_COLUMNS.filter((c) => !headers.includes(c.toLowerCase()))
  if (missingRequired.length > 0) {
    return { rows: [], errors: [], error: `Missing required columns: ${missingRequired.join(', ')}` }
  }

  const colIndex = (name: string) => headers.indexOf(name.toLowerCase())

  const rows: ParsedSyncRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = parseCsvLine(lines[i])
    const rowNum = i + 1
    const get = (col: string) => (cols[colIndex(col)] ?? '').trim()

    const assetNumber = get('assetNumber')
    const bankNumber = get('bankNumber')
    const gameName = get('gameName')
    const gameBrand = get('gameBrand')
    const gameType = get('gameType')
    const progressiveType = (get('progressiveType') || 'NONE').toUpperCase()
    const denomination = get('denomination')
    const softwareVersion = get('softwareVersion')
    const status = get('status').toUpperCase()

    if (!assetNumber) { errors.push({ row: rowNum, error: 'assetNumber is required' }); continue }
    if (!bankNumber) { errors.push({ row: rowNum, error: 'bankNumber is required' }); continue }
    if (!gameName) { errors.push({ row: rowNum, error: 'gameName is required' }); continue }
    if (!gameBrand) { errors.push({ row: rowNum, error: 'gameBrand is required' }); continue }
    if (!gameType) { errors.push({ row: rowNum, error: 'gameType is required' }); continue }

    if (!VALID_PROGRESSIVE_TYPES.has(progressiveType)) {
      errors.push({ row: rowNum, error: `Invalid progressiveType: "${progressiveType}"` })
      continue
    }

    const denomNum = denomination ? parseFloat(denomination) : NaN
    if (isNaN(denomNum) || denomNum <= 0) {
      errors.push({ row: rowNum, error: 'denomination must be a positive number' })
      continue
    }

    rows.push({ assetNumber, bankNumber, gameName, gameBrand, gameType, progressiveType, denomination, softwareVersion, status })
  }

  return { rows, errors, error: null }
}
