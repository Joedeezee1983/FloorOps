'use client'

import { useState, useRef } from 'react'
import { CSV_TEMPLATE_HEADER, VALID_PROGRESSIVE_TYPES } from '@/constants'
import type { CsvImportRow, CsvImportResult, CsvRowResult } from '@/types'

export interface MachineImportModalProps {
  onClose: () => void
  onImported: () => void
}

type ImportStep = 'upload' | 'preview' | 'result'

const REQUIRED_COLUMNS = CSV_TEMPLATE_HEADER.split(',')

export default function MachineImportModal({ onClose, onImported }: MachineImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedRows, setParsedRows] = useState<CsvImportRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; error: string }>>([])
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setRowErrors([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const { rows, errors, error } = parseCsv(text)
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

  const handleConfirmImport = async (): Promise<void> => {
    if (parsedRows.length === 0) return
    setIsImporting(true)

    try {
      const res = await fetch('/api/machines/import', {
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
            denomination: parseFloat(r.denomination),
            softwareVersion: r.softwareVersion || undefined,
          })),
        }),
      })

      const json = await res.json() as { data?: CsvImportResult; error?: string }

      if (!res.ok) {
        setParseError(json.error ?? 'Import failed. Please try again.')
        setStep('preview')
        return
      }

      setImportResult(json.data!)
      setStep('result')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDone = () => {
    if (importResult && importResult.imported > 0) {
      onImported()
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-gray-900 border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Import Machines from CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'upload' && 'Upload a CSV file with machine data'}
              {step === 'preview' && `${parsedRows.length} valid row${parsedRows.length !== 1 ? 's' : ''} ready to import`}
              {step === 'result' && 'Import complete'}
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
            <UploadStep
              fileRef={fileRef}
              parseError={parseError}
              onFileChange={handleFileChange}
            />
          )}

          {step === 'preview' && (
            <PreviewStep
              rows={parsedRows}
              rowErrors={rowErrors}
            />
          )}

          {step === 'result' && importResult && (
            <ResultStep result={importResult} />
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
                onClick={handleConfirmImport}
                disabled={isImporting || parsedRows.length === 0}
                className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? `Importing…` : `Import ${parsedRows.length} Machine${parsedRows.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
          {step === 'result' && (
            <button
              onClick={handleDone}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function UploadStep({
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
        <p className="text-gray-400 text-sm mb-3">Select a CSV file to upload</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="block mx-auto text-sm text-gray-400 file:mr-3 file:px-4 file:py-1.5 file:rounded-lg file:bg-blue-600 file:text-white file:text-sm file:font-medium file:border-0 file:cursor-pointer hover:file:bg-blue-500"
        />
      </div>

      {parseError && (
        <div className="rounded-lg bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-400">
          {parseError}
        </div>
      )}

      <div className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3">
        <p className="text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">Expected CSV columns</p>
        <code className="text-xs text-green-400 font-mono break-all">
          {CSV_TEMPLATE_HEADER}
        </code>
        <p className="text-xs text-gray-500 mt-2">
          Valid progressiveType values: NONE, STANDALONE, LINKED, WIDE_AREA
        </p>
        <p className="text-xs text-gray-500">
          denomination must be a positive number (e.g. 0.01, 0.25, 1.00)
        </p>
      </div>
    </div>
  )
}

function PreviewStep({
  rows,
  rowErrors,
}: {
  rows: CsvImportRow[]
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
              <li key={e.row} className="text-xs text-yellow-500">
                Row {e.row}: {e.error}
              </li>
            ))}
            {rowErrors.length > 5 && (
              <li className="text-xs text-yellow-600">…and {rowErrors.length - 5} more</li>
            )}
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
              {['Asset #', 'Bank', 'Game Name', 'Brand', 'Type', 'Progressive', 'Denom', 'Software'].map((h) => (
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
                <td className="px-3 py-2 text-gray-300">{r.progressiveType}</td>
                <td className="px-3 py-2 font-mono text-gray-300">{r.denomination}</td>
                <td className="px-3 py-2 text-gray-500">{r.softwareVersion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <p className="text-xs text-gray-500 text-center">
          …and {hiddenCount} more row{hiddenCount !== 1 ? 's' : ''} not shown
        </p>
      )}
    </div>
  )
}

function ResultStep({ result }: { result: CsvImportResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-green-900/30 border border-green-800 p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{result.imported}</p>
          <p className="text-sm text-green-300 mt-1">Imported</p>
        </div>
        <div className="rounded-lg bg-red-900/30 border border-red-800 p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{result.skipped}</p>
          <p className="text-sm text-red-300 mt-1">Skipped / Failed</p>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Error Details</p>
          </div>
          <ul className="divide-y divide-gray-800 max-h-48 overflow-y-auto">
            {result.errors.map((err: CsvRowResult) => (
              <li key={err.row} className="px-4 py-2.5 text-xs">
                <span className="font-mono text-gray-400">Row {err.row}</span>
                {err.assetNumber && (
                  <span className="text-gray-500"> · Asset #{err.assetNumber}</span>
                )}
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

function parseCsv(text: string): {
  rows: CsvImportRow[]
  errors: Array<{ row: number; error: string }>
  error: string | null
} {
  const lines = text.trim().split('\n').map((l) => l.replace(/\r$/, ''))

  if (lines.length < 2) {
    return { rows: [], errors: [], error: 'CSV must have a header row and at least one data row.' }
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c.toLowerCase()))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [],
      error: `Missing required columns: ${missing.join(', ')}`,
    }
  }

  const colIndex = (name: string) => headers.indexOf(name.toLowerCase())

  const rows: CsvImportRow[] = []
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
    const progressiveType = get('progressiveType').toUpperCase()
    const denomination = get('denomination')
    const softwareVersion = get('softwareVersion')

    if (!assetNumber) { errors.push({ row: rowNum, error: 'assetNumber is required' }); continue }
    if (!bankNumber) { errors.push({ row: rowNum, error: 'bankNumber is required' }); continue }
    if (!gameName) { errors.push({ row: rowNum, error: 'gameName is required' }); continue }
    if (!gameBrand) { errors.push({ row: rowNum, error: 'gameBrand is required' }); continue }
    if (!gameType) { errors.push({ row: rowNum, error: 'gameType is required' }); continue }

    if (!VALID_PROGRESSIVE_TYPES.has(progressiveType)) {
      errors.push({ row: rowNum, error: `Invalid progressiveType: "${progressiveType}"` })
      continue
    }
    if (!denomination || isNaN(parseFloat(denomination)) || parseFloat(denomination) <= 0) {
      errors.push({ row: rowNum, error: 'denomination must be a positive number' })
      continue
    }

    rows.push({ assetNumber, bankNumber, gameName, gameBrand, gameType, progressiveType, denomination, softwareVersion })
  }

  return { rows, errors, error: null }
}
