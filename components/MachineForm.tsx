'use client'

import { useState, useEffect } from 'react'
import type { LocationSummary, MapMachine } from '@/types'

export interface MachineFormProps {
  onCreated: (machine: MapMachine) => void
  onClose: () => void
}

interface FormState {
  name: string
  machineNumber: string
  serialNumber: string
  model: string
  manufacturer: string
  locationId: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  machineNumber: '',
  serialNumber: '',
  model: '',
  manufacturer: '',
  locationId: '',
  notes: '',
}

export default function MachineForm({ onCreated, onClose }: MachineFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((json: { data: LocationSummary[] }) => {
        setLocations(json.data)
        if (json.data.length === 1) {
          setForm((prev) => ({ ...prev, locationId: json.data[0].id }))
        }
      })
      .catch(() => setError('Failed to load locations'))
  }, [])

  const handleChange = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          locationId: form.locationId,
          machineNumber: form.machineNumber ? Number(form.machineNumber) : undefined,
          serialNumber: form.serialNumber || undefined,
          model: form.model || undefined,
          manufacturer: form.manufacturer || undefined,
          notes: form.notes || undefined,
        }),
      })

      const json = await res.json() as { data?: MapMachine; error?: string }

      if (!res.ok) {
        setError(json.error ?? 'Failed to create machine')
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
      <div className="w-full max-w-lg rounded-xl bg-gray-900 border border-gray-700 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Add Machine</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Machine Name *" className="col-span-2">
              <input required value={form.name} onChange={handleChange('name')}
                className={INPUT_CLS} placeholder="CNC Lathe #3" />
            </Field>
            <Field label="Machine #">
              <input type="number" value={form.machineNumber} onChange={handleChange('machineNumber')}
                className={INPUT_CLS} placeholder="101" min="1" />
            </Field>
            <Field label="Serial Number">
              <input value={form.serialNumber} onChange={handleChange('serialNumber')}
                className={INPUT_CLS} placeholder="SN-00123" />
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={handleChange('model')}
                className={INPUT_CLS} placeholder="Haas VF-2" />
            </Field>
            <Field label="Manufacturer">
              <input value={form.manufacturer} onChange={handleChange('manufacturer')}
                className={INPUT_CLS} placeholder="Haas Automation" />
            </Field>
            <Field label="Location *" className="col-span-2">
              <select required value={form.locationId} onChange={handleChange('locationId')} className={INPUT_CLS}>
                <option value="">Select location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes" className="col-span-2">
              <textarea value={form.notes} onChange={handleChange('notes')}
                className={`${INPUT_CLS} resize-none h-20`} placeholder="Optional notes…" />
            </Field>
          </div>

          {error && (
            <p className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {isSubmitting ? 'Adding…' : 'Add Machine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

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
