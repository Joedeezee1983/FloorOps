'use client'

import { useState, useEffect } from 'react'
import { GAME_BRANDS, GAME_TYPES, DENOMINATIONS, PROGRESSIVE_TYPE_LABELS } from '@/constants'
import type { LocationSummary, MapMachine, MachineListItem } from '@/types'

export interface MachineFormProps {
  onClose: () => void
  onCreated: (machine: MapMachine) => void
  initialMachine?: MachineListItem
}

interface FormState {
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: string
  denomination: string
  softwareVersion: string
  locationId: string
  status: string
}

function toFormState(m?: MachineListItem): FormState {
  if (!m) {
    return {
      assetNumber: '',
      bankNumber: '',
      gameName: '',
      gameBrand: '',
      gameType: '',
      progressiveType: 'NONE',
      denomination: '0.01',
      softwareVersion: '',
      locationId: '',
      status: 'ONLINE',
    }
  }
  return {
    assetNumber: m.assetNumber,
    bankNumber: m.bankNumber,
    gameName: m.gameName,
    gameBrand: m.gameBrand,
    gameType: m.gameType,
    progressiveType: m.progressiveType,
    denomination: m.denomination,
    softwareVersion: m.softwareVersion ?? '',
    locationId: m.locationId ?? '',
    status: m.status,
  }
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function MachineForm({ onClose, onCreated, initialMachine }: MachineFormProps) {
  const isEditMode = Boolean(initialMachine)
  const [form, setForm] = useState<FormState>(() => toFormState(initialMachine))
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((json: { data: LocationSummary[] }) => {
        setLocations(json.data)
        if (!isEditMode && !form.locationId && json.data.length === 1) {
          setForm((prev) => ({ ...prev, locationId: json.data[0].id }))
        }
      })
      .catch(() => setError('Failed to load locations'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const payload = {
      assetNumber: form.assetNumber.trim(),
      bankNumber: form.bankNumber.trim(),
      gameName: form.gameName.trim(),
      gameBrand: form.gameBrand,
      gameType: form.gameType,
      progressiveType: form.progressiveType,
      denomination: form.denomination,
      softwareVersion: form.softwareVersion.trim() || undefined,
      locationId: form.locationId || undefined,
      status: form.status,
    }

    try {
      const url = isEditMode ? `/api/machines/${initialMachine!.id}` : '/api/machines'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json() as { data?: MapMachine; error?: string }

      if (!res.ok) {
        setError(json.error ?? `Failed to ${isEditMode ? 'update' : 'create'} machine`)
        return
      }

      onCreated(json.data!)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl bg-gray-900 sm:border border-gray-700 shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            {isEditMode ? `Edit Machine — ${initialMachine!.assetNumber}` : 'Add Machine'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">

            <Field label="Asset Number *">
              <input
                required
                value={form.assetNumber}
                onChange={handleChange('assetNumber')}
                className={INPUT_CLS}
                placeholder="21257"
              />
            </Field>

            <Field label="Bank Number *">
              <input
                required
                value={form.bankNumber}
                onChange={handleChange('bankNumber')}
                className={INPUT_CLS}
                placeholder="7-19"
              />
            </Field>

            <Field label="Game Name *" className="col-span-2">
              <input
                required
                value={form.gameName}
                onChange={handleChange('gameName')}
                className={INPUT_CLS}
                placeholder="Buffalo Gold"
              />
            </Field>

            <Field label="Game Brand *">
              <select required value={form.gameBrand} onChange={handleChange('gameBrand')} className={INPUT_CLS}>
                <option value="">Select brand…</option>
                {GAME_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>

            <Field label="Game Type *">
              <select required value={form.gameType} onChange={handleChange('gameType')} className={INPUT_CLS}>
                <option value="">Select type…</option>
                {GAME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Progressive Type">
              <select value={form.progressiveType} onChange={handleChange('progressiveType')} className={INPUT_CLS}>
                {Object.entries(PROGRESSIVE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Denomination *">
              <select required value={form.denomination} onChange={handleChange('denomination')} className={INPUT_CLS}>
                {DENOMINATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>

            <Field label="Software Version">
              <input
                value={form.softwareVersion}
                onChange={handleChange('softwareVersion')}
                className={INPUT_CLS}
                placeholder="v4.23.1"
              />
            </Field>

            <Field label="Location">
              <select value={form.locationId} onChange={handleChange('locationId')} className={INPUT_CLS}>
                <option value="">No location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select value={form.status} onChange={handleChange('status')} className={INPUT_CLS}>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="WARNING">Warning</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </Field>

          </div>

          {error && (
            <p className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (isEditMode ? 'Saving…' : 'Adding…') : (isEditMode ? 'Save Changes' : 'Add Machine')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

function Field({ label, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  )
}
