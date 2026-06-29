'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  AdminUserItem,
  AdminLocationItem,
  SystemSettingsData,
  DataStats,
  UserRole,
  PartRequestSummary,
  PartStatus,
} from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_BADGE_STYLES: Record<string, string> = {
  TECH: 'bg-gray-700 text-gray-300 border border-gray-600',
  SUPERVISOR: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  ADMIN: 'bg-purple-900/60 text-purple-300 border border-purple-700',
}

const ROLE_LABELS: Record<string, string> = {
  TECH: 'Tech',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Admin',
}

const CLEANUP_DAYS_OPTIONS = [30, 60, 90, 180] as const
type CleanupDays = typeof CLEANUP_DAYS_OPTIONS[number]

const ADMIN_TABS = [
  { id: 'users', label: 'Users' },
  { id: 'locations', label: 'Locations' },
  { id: 'settings', label: 'Settings' },
  { id: 'parts', label: 'Parts' },
  { id: 'data', label: 'Data' },
] as const

type AdminTab = typeof ADMIN_TABS[number]['id']

const PART_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
}

const PART_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  ORDERED: 'bg-blue-900/40 text-blue-300 border border-blue-700',
  RECEIVED: 'bg-green-900/40 text-green-300 border border-green-700',
}

const PART_URGENCY_STYLES: Record<string, string> = {
  URGENT: 'bg-red-900/40 text-red-300 border border-red-700',
  NORMAL: 'bg-gray-700/60 text-gray-300 border border-gray-600',
}

const DEFAULT_SETTINGS: Omit<SystemSettingsData, 'id' | 'locationId'> = {
  dayShiftStart: '06:00',
  dayShiftEnd: '14:00',
  swingShiftStart: '14:00',
  swingShiftEnd: '22:00',
  nightShiftStart: '22:00',
  nightShiftEnd: '06:00',
  shiftTimeoutHours: 10,
  inventoryEmail: null,
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE_STYLES[role] ?? ROLE_BADGE_STYLES.TECH}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/40 text-red-400 border border-red-800'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function UserStatusBadge({ isActive, emailVerified }: { isActive: boolean; emailVerified: boolean }) {
  if (!emailVerified) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300 border border-yellow-700">
        Pending
      </span>
    )
  }
  return <ActiveBadge isActive={isActive} />
}

function LoadingRows({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-gray-800 bg-gray-900">
        {cols.map((col) => (
          <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface AdminDashboardProps {
  currentUserId: string
}

export default function AdminDashboard({ currentUserId }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 border-b border-gray-800">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-5">Admin</h1>
        <div className="flex gap-1 overflow-x-auto pb-px">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'text-white border-blue-500'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-8">
        {activeTab === 'users' && <UsersTab currentUserId={currentUserId} />}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'parts' && <PartsTab />}
        {activeTab === 'data' && <DataTab />}
      </div>
    </div>
  )
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json() as { data: AdminUserItem[] }
      setUsers(json.data)
    } catch {
      setFetchError('Failed to load users.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadUsers() }, [loadUsers])

  const handleRoleChange = async (id: string, role: UserRole): Promise<void> => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) return
    const json = await res.json() as { data: AdminUserItem }
    setUsers((prev) => prev.map((u) => u.id === id ? json.data : u))
  }

  const handleToggleActive = async (id: string, isActive: boolean): Promise<void> => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    if (!res.ok) return
    const json = await res.json() as { data: AdminUserItem }
    setUsers((prev) => prev.map((u) => u.id === id ? json.data : u))
  }

  const handleResendInvite = async (id: string): Promise<void> => {
    setActionLoadingId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${id}/resend-invite`, { method: 'POST' })
      const json = await res.json() as { error?: string }
      if (!res.ok) setActionError(json.error ?? 'Failed to resend invite.')
    } catch {
      setActionError('Failed to resend invite.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancelInvite = async (id: string): Promise<void> => {
    setConfirmCancelId(null)
    setActionLoadingId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/admin/users/${id}/cancel-invite`, { method: 'DELETE' })
      const json = await res.json() as { error?: string }
      if (!res.ok) {
        setActionError(json.error ?? 'Failed to cancel invite.')
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== id))
      }
    } catch {
      setActionError('Failed to cancel invite.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const isPending = (user: AdminUserItem) => !user.emailVerified && !user.isActive

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Users <span className="text-gray-500 font-normal text-sm">({users.length})</span>
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Invite User
        </button>
      </div>

      {fetchError && <p className="text-red-400 text-sm mb-4">{fetchError}</p>}
      {actionError && <p className="text-red-400 text-sm mb-4">{actionError}</p>}

      {isLoading ? <LoadingRows count={4} /> : (
        <div className="rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <TableHeader cols={['Name', 'Email', 'Role', 'Status', 'Created', 'Actions']} />
            <tbody className="divide-y divide-gray-800/50">
              {users.map((user) => (
                <tr key={user.id} className="bg-gray-900/30 hover:bg-gray-900/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{user.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.id === currentUserId ? (
                      <RoleBadge role={user.role} />
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => void handleRoleChange(user.id, e.target.value as UserRole)}
                        className="text-xs rounded-lg border border-gray-700 bg-gray-800 text-white px-2 py-1 cursor-pointer focus:outline-none focus:border-blue-500"
                      >
                        {(['TECH', 'SUPERVISOR', 'ADMIN'] as UserRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3"><UserStatusBadge isActive={user.isActive} emailVerified={user.emailVerified} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.id !== currentUserId && (
                      <div className="flex items-center justify-end gap-2">
                        {isPending(user) ? (
                          <>
                            <button
                              onClick={() => void handleResendInvite(user.id)}
                              disabled={actionLoadingId === user.id}
                              className="text-xs px-2.5 py-1 rounded-lg border border-yellow-700 text-yellow-400 hover:bg-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {actionLoadingId === user.id ? '…' : 'Resend Invite'}
                            </button>
                            <button
                              onClick={() => setConfirmCancelId(user.id)}
                              disabled={actionLoadingId === user.id}
                              className="text-xs px-2.5 py-1 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Cancel Invite
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => void handleToggleActive(user.id, !user.isActive)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                              user.isActive
                                ? 'text-red-400 border-red-800 hover:bg-red-900/20'
                                : 'text-green-400 border-green-800 hover:bg-green-900/20'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onCreated={(user) => { setUsers((prev) => [...prev, user]); setShowCreate(false) }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {confirmCancelId !== null && (
        <ConfirmDialog
          title="Cancel Invite"
          message={`This will permanently delete the pending user account. They will no longer be able to use their invite link.`}
          confirmLabel="Delete User"
          onConfirm={() => void handleCancelInvite(confirmCancelId)}
          onClose={() => setConfirmCancelId(null)}
        />
      )}
    </div>
  )
}

// ─── Locations tab ────────────────────────────────────────────────────────────

function LocationsTab() {
  const [locations, setLocations] = useState<AdminLocationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingLocation, setEditingLocation] = useState<AdminLocationItem | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const loadLocations = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/admin/locations')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json() as { data: AdminLocationItem[] }
      setLocations(json.data)
    } catch {
      setFetchError('Failed to load locations.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadLocations() }, [loadLocations])

  const handleToggleActive = async (id: string, isActive: boolean): Promise<void> => {
    const res = await fetch(`/api/admin/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    if (!res.ok) return
    const json = await res.json() as { data: AdminLocationItem }
    setLocations((prev) => prev.map((l) => l.id === id ? json.data : l))
  }

  const handleSaved = (location: AdminLocationItem): void => {
    setLocations((prev) => {
      const exists = prev.find((l) => l.id === location.id)
      return exists ? prev.map((l) => l.id === location.id ? location : l) : [...prev, location]
    })
    setShowAdd(false)
    setEditingLocation(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Locations <span className="text-gray-500 font-normal text-sm">({locations.length})</span>
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Location
        </button>
      </div>

      {fetchError && <p className="text-red-400 text-sm mb-4">{fetchError}</p>}

      {isLoading ? <LoadingRows count={3} /> : (
        <div className="rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <TableHeader cols={['Name', 'Floor', 'Status', 'Machines', 'Created', 'Actions']} />
            <tbody className="divide-y divide-gray-800/50">
              {locations.map((loc) => (
                <tr key={loc.id} className="bg-gray-900/30 hover:bg-gray-900/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{loc.name}</td>
                  <td className="px-4 py-3 text-gray-400">{loc.floorNumber ?? '—'}</td>
                  <td className="px-4 py-3"><ActiveBadge isActive={loc.isActive} /></td>
                  <td className="px-4 py-3 text-gray-300">{loc.machineCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(loc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingLocation(loc)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleToggleActive(loc.id, !loc.isActive)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          loc.isActive
                            ? 'text-red-400 border-red-800 hover:bg-red-900/20'
                            : 'text-green-400 border-green-800 hover:bg-green-900/20'
                        }`}
                      >
                        {loc.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showAdd || editingLocation) && (
        <LocationModal
          location={editingLocation ?? undefined}
          onSaved={handleSaved}
          onClose={() => { setShowAdd(false); setEditingLocation(null) }}
        />
      )}
    </div>
  )
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

interface SettingsForm {
  dayShiftStart: string
  dayShiftEnd: string
  swingShiftStart: string
  swingShiftEnd: string
  nightShiftStart: string
  nightShiftEnd: string
  shiftTimeoutHours: number
  inventoryEmail: string
}

function SettingsTab() {
  const [locations, setLocations] = useState<AdminLocationItem[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [form, setForm] = useState<SettingsForm>({ ...DEFAULT_SETTINGS, inventoryEmail: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((json: { data: AdminLocationItem[] }) => {
        setLocations(json.data ?? [])
        if (json.data?.length === 1) setSelectedLocationId(json.data[0].id)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!selectedLocationId) return
    fetch(`/api/admin/settings?locationId=${selectedLocationId}`)
      .then((r) => r.json())
      .then((json: { data: SystemSettingsData | null }) => {
        setForm(json.data ? {
          dayShiftStart: json.data.dayShiftStart,
          dayShiftEnd: json.data.dayShiftEnd,
          swingShiftStart: json.data.swingShiftStart,
          swingShiftEnd: json.data.swingShiftEnd,
          nightShiftStart: json.data.nightShiftStart,
          nightShiftEnd: json.data.nightShiftEnd,
          shiftTimeoutHours: json.data.shiftTimeoutHours,
          inventoryEmail: json.data.inventoryEmail ?? '',
        } : { ...DEFAULT_SETTINGS, inventoryEmail: '' })
      })
      .catch(() => undefined)
  }, [selectedLocationId])

  const handleSave = async (): Promise<void> => {
    if (!selectedLocationId) return
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocationId,
          ...form,
          inventoryEmail: form.inventoryEmail.trim() || null,
        }),
      })
      setSaveMessage(res.ok
        ? { type: 'success', text: 'Settings saved.' }
        : { type: 'error', text: 'Failed to save settings.' }
      )
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save settings.' })
    } finally {
      setIsSaving(false)
    }
  }

  const setField = (key: keyof SettingsForm, value: string | number): void => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }


  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
          Location
        </label>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {selectedLocationId && (
        <div className="space-y-6">
          <ShiftTimeBlock
            label="Day Shift"
            startKey="dayShiftStart"
            endKey="dayShiftEnd"
            form={form}
            setField={setField}
          />
          <ShiftTimeBlock
            label="Swing Shift"
            startKey="swingShiftStart"
            endKey="swingShiftEnd"
            form={form}
            setField={setField}
          />
          <ShiftTimeBlock
            label="Night Shift"
            startKey="nightShiftStart"
            endKey="nightShiftEnd"
            form={form}
            setField={setField}
          />

          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <p className="text-sm font-medium text-white mb-4">Auto-timeout</p>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400">Shift timeout (hours)</label>
              <input
                type="number"
                min={1}
                max={24}
                value={form.shiftTimeoutHours}
                onChange={(e) => setField('shiftTimeoutHours', parseInt(e.target.value, 10) || 1)}
                className="w-20 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <p className="text-sm font-medium text-white mb-1">Inventory Tech Email</p>
            <p className="text-xs text-gray-500 mb-4">
              Part request notifications will be sent to this address.
            </p>
            <input
              type="email"
              value={form.inventoryEmail}
              onChange={(e) => setField('inventoryEmail', e.target.value)}
              placeholder="inventory@example.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {saveMessage && (
            <p className={`text-sm ${saveMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage.text}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  )
}

function ShiftTimeBlock({
  label,
  startKey,
  endKey,
  form,
  setField,
}: {
  label: string
  startKey: keyof SettingsForm
  endKey: keyof SettingsForm
  form: SettingsForm
  setField: (key: keyof SettingsForm, value: string | number) => void
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
      <p className="text-sm font-medium text-white mb-4">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Start</label>
          <input
            type="time"
            value={form[startKey] as string}
            onChange={(e) => setField(startKey, e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">End</label>
          <input
            type="time"
            value={form[endKey] as string}
            onChange={(e) => setField(endKey, e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Parts tab ────────────────────────────────────────────────────────────────

function PartsTab() {
  const [parts, setParts] = useState<PartRequestSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadParts = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/parts')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json() as { data: PartRequestSummary[] }
      setParts(json.data)
    } catch {
      setFetchError('Failed to load part requests.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadParts() }, [loadParts])

  const handleStatusChange = async (id: string, status: PartStatus): Promise<void> => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/parts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return
      const json = await res.json() as { data: PartRequestSummary }
      setParts((prev) => prev.map((p) => p.id === id ? json.data : p))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Part Requests <span className="text-gray-500 font-normal text-sm">({parts.length})</span>
        </h2>
      </div>

      {fetchError && <p className="text-red-400 text-sm mb-4">{fetchError}</p>}

      {isLoading ? <LoadingRows count={4} /> : parts.length === 0 ? (
        <div className="rounded-xl border border-gray-800 p-10 text-center">
          <p className="text-gray-500 text-sm">No part requests yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <TableHeader cols={['Part', 'Machine', 'Qty', 'Priority', 'Status', 'Requested By', 'Date', 'Update']} />
            <tbody className="divide-y divide-gray-800/50">
              {parts.map((part) => (
                <tr key={part.id} className="bg-gray-900/30 hover:bg-gray-900/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{part.name}</p>
                    {part.description && (
                      <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{part.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {part.machine ? (
                      <span className="font-mono text-xs">#{part.machine.assetNumber}</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{part.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PART_URGENCY_STYLES[part.urgency] ?? ''}`}>
                      {part.urgency === 'URGENT' ? 'Urgent' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PART_STATUS_STYLES[part.status] ?? ''}`}>
                      {PART_STATUS_LABELS[part.status] ?? part.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{part.requestedByName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(part.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={part.status}
                      disabled={updatingId === part.id}
                      onChange={(e) => void handleStatusChange(part.id, e.target.value as PartStatus)}
                      className="text-xs rounded-lg border border-gray-700 bg-gray-800 text-white px-2 py-1 cursor-pointer focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      {(['PENDING', 'ORDERED', 'RECEIVED'] as PartStatus[]).map((s) => (
                        <option key={s} value={s}>{PART_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Data tab ─────────────────────────────────────────────────────────────────

function DataTab() {
  const [stats, setStats] = useState<DataStats | null>(null)
  const [cleanupDays, setCleanupDays] = useState<CleanupDays>(90)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/data/stats')
      .then((r) => r.json())
      .then((json: { data: DataStats }) => setStats(json.data))
      .catch(() => undefined)
  }, [])

  const handleExport = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/admin/data/export')
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `machines-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCleanup = async (): Promise<void> => {
    setShowConfirm(false)
    setIsCleaning(true)
    setCleanupResult(null)
    try {
      const res = await fetch('/api/admin/data/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: cleanupDays }),
      })
      const json = await res.json() as { data?: { deleted: number }; error?: string }
      if (!res.ok) {
        setCleanupResult(`Error: ${json.error ?? 'Unknown error'}`)
      } else {
        setCleanupResult(`Deleted ${json.data?.deleted ?? 0} completed shift${json.data?.deleted !== 1 ? 's' : ''}.`)
      }
    } catch {
      setCleanupResult('Request failed. Please try again.')
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Stats */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">History Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Shifts" value={stats?.totalShifts} />
          <StatCard label="Total Tasks" value={stats?.totalTasks} />
          <StatCard label="Machines Tracked" value={stats?.totalMachines} />
        </div>
      </div>

      {/* Export */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Export Machine Registry</h3>
        <p className="text-xs text-gray-400 mb-4">
          Downloads a CSV of all machines — compatible with the sync import format.
        </p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          {isExporting ? 'Exporting…' : 'Download CSV'}
        </button>
      </div>

      {/* Cleanup */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Clear Shift History</h3>
        <p className="text-xs text-gray-400 mb-4">
          Permanently deletes completed shifts and all their tasks. Active shifts are not affected.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs text-gray-400 shrink-0">Delete shifts older than</label>
          <select
            value={cleanupDays}
            onChange={(e) => setCleanupDays(parseInt(e.target.value, 10) as CleanupDays)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {CLEANUP_DAYS_OPTIONS.map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={isCleaning}
          className="px-4 py-2 text-sm font-semibold bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {isCleaning ? 'Deleting…' : 'Clear History'}
        </button>

        {cleanupResult && (
          <p className="mt-3 text-xs text-gray-400">{cleanupResult}</p>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Clear Shift History"
          message={`This will permanently delete all completed shifts older than ${cleanupDays} days and all their tasks. This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleCleanup}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">
        {value !== undefined ? value.toLocaleString() : '—'}
      </p>
    </div>
  )
}

// ─── Create user modal ────────────────────────────────────────────────────────

function CreateUserModal({
  onCreated,
  onClose,
}: {
  onCreated: (user: AdminUserItem) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('TECH')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      })
      const json = await res.json() as { data?: AdminUserItem; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to send invite.'); return }
      onCreated(json.data!)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Invite User" onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <p className="text-xs text-gray-500">
          An invite email will be sent to the user with a link to set their password.
        </p>
        <FormField label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={INPUT_CLS}
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={INPUT_CLS}
          />
        </FormField>
        <FormField label="Role">
          <div className="grid grid-cols-3 gap-2">
            {(['TECH', 'SUPERVISOR', 'ADMIN'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-2 text-xs font-medium rounded-lg border transition-colors ${role === r ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </FormField>
        {error && <ErrorBanner message={error} />}
      </div>
      <ModalFooter
        onClose={onClose}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Send Invite"
        submittingLabel="Sending…"
      />
    </Modal>
  )
}

// ─── Location modal (add + edit) ──────────────────────────────────────────────

function LocationModal({
  location,
  onSaved,
  onClose,
}: {
  location?: AdminLocationItem
  onSaved: (location: AdminLocationItem) => void
  onClose: () => void
}) {
  const [name, setName] = useState(location?.name ?? '')
  const [floorNumber, setFloorNumber] = useState(
    location?.floorNumber != null ? String(location.floorNumber) : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!location

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) { setError('Name is required.'); return }

    setIsSubmitting(true)
    setError(null)
    const floorNum = floorNumber.trim() !== '' ? parseInt(floorNumber, 10) : null

    try {
      const url = isEditing ? `/api/admin/locations/${location.id}` : '/api/admin/locations'
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), floorNumber: floorNum }),
      })
      const json = await res.json() as { data?: AdminLocationItem; error?: string }
      if (!res.ok) { setError(json.error ?? 'Failed to save location.'); return }
      onSaved(json.data!)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title={isEditing ? 'Edit Location' : 'Add Location'} onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <FormField label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main Floor"
            className={INPUT_CLS}
          />
        </FormField>
        <FormField label="Floor number (optional)">
          <input
            type="number"
            value={floorNumber}
            onChange={(e) => setFloorNumber(e.target.value)}
            placeholder="e.g. 1"
            className={INPUT_CLS}
          />
        </FormField>
        {error && <ErrorBanner message={error} />}
      </div>
      <ModalFooter
        onClose={onClose}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? 'Save Changes' : 'Add Location'}
        submittingLabel={isEditing ? 'Saving…' : 'Adding…'}
      />
    </Modal>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-xl bg-gray-900 border border-gray-700 shadow-2xl p-6">
        <h2 className="text-base font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared modal primitives ──────────────────────────────────────────────────

const INPUT_CLS =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none'

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl bg-gray-900 sm:border border-gray-700 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({
  onClose,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
}: {
  onClose: () => void
  onSubmit: () => void
  isSubmitting: boolean
  submitLabel: string
  submittingLabel: string
}) {
  return (
    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-900/40 border border-red-800 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  )
}

