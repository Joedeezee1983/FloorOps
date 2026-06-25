'use client'

import { useState, useRef } from 'react'
import type { BlueprintSummary, LocationSummary } from '@/types'

export interface BlueprintUploadModalProps {
  onUploaded: (blueprint: BlueprintSummary) => void
  onClose: () => void
}

const ACCEPTED_TYPES = '.png,.jpg,.jpeg,.pdf'

export default function BlueprintUploadModal({ onUploaded, onClose }: BlueprintUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [locationId, setLocationId] = useState('')
  const [opacity, setOpacity] = useState(0.3)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationsLoaded, setLocationsLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadLocations = async () => {
    if (locationsLoaded) return
    try {
      const res = await fetch('/api/locations')
      const json = await res.json() as { data: LocationSummary[] }
      setLocations(json.data ?? [])
      if (json.data?.length === 1) setLocationId(json.data[0].id)
      setLocationsLoaded(true)
    } catch {
      // Non-fatal — user can type locationId manually if needed
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setError(null)
    void loadLocations()
  }

  const handleUpload = async (): Promise<void> => {
    if (!file || !locationId.trim()) {
      setError('Please select a file and choose a location.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('locationId', locationId.trim())
      formData.append('opacity', String(opacity))

      const res = await fetch('/api/floor/blueprint', { method: 'POST', body: formData })
      const json = await res.json() as { data?: BlueprintSummary; error?: string }

      if (!res.ok) {
        setError(json.error ?? 'Upload failed. Please try again.')
        return
      }

      onUploaded(json.data!)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-md sm:rounded-xl bg-gray-900 sm:border border-gray-700 shadow-2xl mx-4 sm:mx-0">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Upload Floor Blueprint</h2>
            <p className="text-xs text-gray-500 mt-0.5">PNG, JPG, or PDF — displayed behind the grid</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* File picker */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Blueprint file
            </label>
            <div className="rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 transition-colors p-6 text-center">
              {file ? (
                <div className="space-y-1">
                  <p className="text-sm text-white font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                  <button
                    onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-2">Select blueprint file</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleFileChange}
                    className="block mx-auto text-sm text-gray-400 file:mr-3 file:px-4 file:py-1.5 file:rounded-lg file:bg-blue-600 file:text-white file:text-sm file:font-medium file:border-0 file:cursor-pointer hover:file:bg-blue-500"
                  />
                </>
              )}
            </div>
          </div>

          {/* Location selector */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Location
            </label>
            {locations.length > 0 ? (
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="Location ID"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* Opacity slider */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Initial opacity — {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5% (subtle)</span>
              <span>100% (solid)</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !file || !locationId.trim()}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading…' : 'Upload Blueprint'}
          </button>
        </div>

      </div>
    </div>
  )
}
