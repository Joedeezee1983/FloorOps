'use client'

import { useState, useEffect, useCallback } from 'react'
import StatusBadge from '@/components/StatusBadge'
import MachineDrawer from '@/components/MachineDrawer'
import MachineForm from '@/components/MachineForm'
import MachineImportModal from '@/components/MachineImportModal'
import MachineSyncModal from '@/components/MachineSyncModal'
import {
  MACHINES_PER_PAGE,
  GAME_BRANDS,
  DENOMINATIONS,
  PROGRESSIVE_TYPE_LABELS,
  MACHINE_STATUS_LABELS,
} from '@/constants'
import type {
  MachineListItem,
  MachineListResponse,
  MapMachine,
  MachineStatus,
  UserRole,
} from '@/types'

export interface MachinesTableProps {
  userRole: UserRole
}

const EMPTY_FILTERS = {
  search: '',
  status: '',
  brand: '',
  progressive: '',
  denom: '',
}

export default function MachinesTable({ userRole }: MachinesTableProps) {
  const isAdmin = userRole === 'ADMIN'

  const [machines, setMachines] = useState<MachineListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editMachine, setEditMachine] = useState<MachineListItem | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showSync, setShowSync] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => clearTimeout(t)
  }, [filters.search])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filters.status, filters.brand, filters.progressive, filters.denom])

  const fetchMachines = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filters.status) params.set('status', filters.status)
      if (filters.brand) params.set('brand', filters.brand)
      if (filters.progressive) params.set('progressive', filters.progressive)
      if (filters.denom) params.set('denom', filters.denom)
      params.set('page', String(page))
      params.set('pageSize', String(MACHINES_PER_PAGE))

      const res = await fetch(`/api/machines?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load machines')
      const json = await res.json() as MachineListResponse
      setMachines(json.data)
      setTotal(json.total)
    } catch {
      setFetchError('Failed to load machines. Please refresh.')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, filters.status, filters.brand, filters.progressive, filters.denom, page])

  useEffect(() => {
    void fetchMachines()
  }, [fetchMachines])

  const handleFilterChange = (field: keyof typeof EMPTY_FILTERS) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }))

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const handleSaved = useCallback((_machine: MapMachine) => {
    setShowAddForm(false)
    setEditMachine(null)
    void fetchMachines()
  }, [fetchMachines])

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirmId(null)
        void fetchMachines()
      }
    } finally {
      setIsDeleting(false)
    }
  }, [fetchMachines])

  const handleStatusChanged = useCallback((_id: string, _status: MachineStatus) => {
    void fetchMachines()
  }, [fetchMachines])

  const totalPages = Math.max(1, Math.ceil(total / MACHINES_PER_PAGE))
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Page header */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Machine Registry</h1>
            <p className="mt-1 text-gray-400">
              {isLoading ? 'Loading…' : `${total.toLocaleString()} machine${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          {(isAdmin || userRole === 'SUPERVISOR') && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isAdmin && (
                <a
                  href="/api/machines/template"
                  download
                  className="hidden sm:inline-flex px-4 py-2 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  CSV Template
                </a>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowImport(true)}
                  className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-600 border border-gray-600 transition-colors"
                >
                  Import CSV
                </button>
              )}
              <button
                onClick={() => setShowSync(true)}
                className="px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-purple-700 rounded-lg hover:bg-purple-600 border border-purple-600 transition-colors"
              >
                Sync
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  <span className="text-lg leading-none">+</span>
                  <span className="hidden sm:inline">Add Machine</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-800 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search asset #, bank, game name…"
          value={filters.search}
          onChange={handleFilterChange('search')}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none w-full sm:w-72"
        />

        <FilterSelect
          value={filters.status}
          onChange={handleFilterChange('status')}
          label="All Statuses"
        >
          {(Object.keys(MACHINE_STATUS_LABELS) as MachineStatus[]).map((s) => (
            <option key={s} value={s}>{MACHINE_STATUS_LABELS[s]}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={filters.brand}
          onChange={handleFilterChange('brand')}
          label="All Brands"
        >
          {GAME_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </FilterSelect>

        <FilterSelect
          value={filters.progressive}
          onChange={handleFilterChange('progressive')}
          label="All Progressives"
        >
          {Object.entries(PROGRESSIVE_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={filters.denom}
          onChange={handleFilterChange('denom')}
          label="All Denoms"
        >
          {DENOMINATIONS.map((d) => (
            <option key={d} value={String(d)}>${d.toFixed(2)}</option>
          ))}
        </FilterSelect>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="px-4 sm:px-8 py-4">
        {fetchError ? (
          <p className="text-red-400 text-sm py-8 text-center">{fetchError}</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    <Th>Asset #</Th>
                    <Th className="hidden sm:table-cell">Bank</Th>
                    <Th>Game Name</Th>
                    <Th className="hidden md:table-cell">Brand</Th>
                    <Th className="hidden md:table-cell">Type</Th>
                    <Th className="hidden lg:table-cell">Progressive</Th>
                    <Th className="hidden lg:table-cell">Denom</Th>
                    <Th className="hidden xl:table-cell">Software</Th>
                    <Th>Status</Th>
                    <Th className="hidden sm:table-cell">Location</Th>
                    {isAdmin && <Th>Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="hidden sm:table-cell px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="hidden md:table-cell px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="hidden md:table-cell px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="hidden lg:table-cell px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="hidden lg:table-cell px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="hidden xl:table-cell px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        <td className="hidden sm:table-cell px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                        {isAdmin && <td className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>}
                      </tr>
                    ))
                  ) : machines.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 10} className="px-4 py-12 text-center text-gray-500">
                        {hasFilters ? 'No machines match your filters.' : 'No machines registered yet.'}
                      </td>
                    </tr>
                  ) : (
                    machines.map((m) => (
                      <MachineRow
                        key={m.id}
                        machine={m}
                        isAdmin={isAdmin}
                        isDeleteConfirm={deleteConfirmId === m.id}
                        isDeleting={isDeleting && deleteConfirmId === m.id}
                        onRowClick={() => setSelectedId(m.id)}
                        onEdit={(e) => { e.stopPropagation(); setEditMachine(m) }}
                        onDeleteRequest={(e) => { e.stopPropagation(); setDeleteConfirmId(m.id) }}
                        onDeleteConfirm={(e) => { e.stopPropagation(); void handleDelete(m.id) }}
                        onDeleteCancel={(e) => { e.stopPropagation(); setDeleteConfirmId(null) }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > MACHINES_PER_PAGE && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages} · {total.toLocaleString()} total
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MachineDrawer */}
      <MachineDrawer
        machineId={selectedId}
        isAdmin={isAdmin}
        onClose={() => setSelectedId(null)}
        onStatusChanged={handleStatusChanged}
      />

      {/* Add / Edit form */}
      {(showAddForm || editMachine) && (
        <MachineForm
          onClose={() => { setShowAddForm(false); setEditMachine(null) }}
          onCreated={handleSaved}
          initialMachine={editMachine ?? undefined}
        />
      )}

      {/* CSV import */}
      {showImport && (
        <MachineImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); void fetchMachines() }}
        />
      )}

      {/* Active games sync */}
      {showSync && (
        <MachineSyncModal
          onClose={() => setShowSync(false)}
          onSynced={() => { setShowSync(false); void fetchMachines() }}
        />
      )}
    </div>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

interface MachineRowProps {
  machine: MachineListItem
  isAdmin: boolean
  isDeleteConfirm: boolean
  isDeleting: boolean
  onRowClick: () => void
  onEdit: (e: React.MouseEvent) => void
  onDeleteRequest: (e: React.MouseEvent) => void
  onDeleteConfirm: (e: React.MouseEvent) => void
  onDeleteCancel: (e: React.MouseEvent) => void
}

function MachineRow({
  machine, isAdmin, isDeleteConfirm, isDeleting,
  onRowClick, onEdit, onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: MachineRowProps) {
  return (
    <tr
      className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors cursor-pointer"
      onClick={onRowClick}
    >
      <Td className="font-mono font-semibold text-white">{machine.assetNumber}</Td>
      <Td className="hidden sm:table-cell">{machine.bankNumber}</Td>
      <Td className="text-white">{machine.gameName}</Td>
      <Td className="hidden md:table-cell">{machine.gameBrand}</Td>
      <Td className="hidden md:table-cell">{machine.gameType}</Td>
      <Td className="hidden lg:table-cell">{PROGRESSIVE_TYPE_LABELS[machine.progressiveType] ?? machine.progressiveType}</Td>
      <Td className="hidden lg:table-cell font-mono">${machine.denomination.toFixed(2)}</Td>
      <Td className="hidden xl:table-cell text-gray-500">{machine.softwareVersion ?? '—'}</Td>
      <Td><StatusBadge status={machine.status} size="sm" /></Td>
      <Td className="hidden sm:table-cell">{machine.locationName ?? <span className="text-gray-600">—</span>}</Td>
      {isAdmin && (
        <Td>
          {isDeleteConfirm ? (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onDeleteConfirm}
                disabled={isDeleting}
                className="px-2 py-0.5 text-xs text-white bg-red-700 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? '…' : 'Confirm'}
              </button>
              <button
                onClick={onDeleteCancel}
                className="px-2 py-0.5 text-xs text-gray-400 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={onEdit}
                className="px-2 py-0.5 text-xs text-gray-300 bg-gray-800 rounded hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={onDeleteRequest}
                className="px-2 py-0.5 text-xs text-red-400 bg-gray-800 rounded hover:bg-red-900/40 border border-gray-700 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </Td>
      )}
    </tr>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${className}`}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-gray-300 whitespace-nowrap ${className}`}>
      {children}
    </td>
  )
}

interface FilterSelectProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  label: string
  children: React.ReactNode
}

function FilterSelect({ value, onChange, label, children }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
    >
      <option value="">{label}</option>
      {children}
    </select>
  )
}
