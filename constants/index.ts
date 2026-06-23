import type { UserRole } from '@prisma/client'

export const APP_NAME = 'FloorOps'
export const APP_PORT = 3002

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  TECH: 1,
  SUPERVISOR: 2,
  ADMIN: 3,
}

export const SHIFT_HOURS: Record<string, { start: number; end: number }> = {
  DAY: { start: 6, end: 14 },
  SWING: { start: 14, end: 22 },
  NIGHT: { start: 22, end: 6 },
}

export const MACHINE_STATUS_LABELS: Record<string, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  WARNING: 'Warning',
  MAINTENANCE: 'Maintenance',
}

export const MACHINE_STATUS_STYLES = {
  ONLINE: {
    tile: 'bg-green-900/50 border-green-500 text-green-100',
    dot: 'bg-green-400',
    badge: 'bg-green-900/60 text-green-300 border border-green-700',
  },
  OFFLINE: {
    tile: 'bg-red-900/50 border-red-600 text-red-100',
    dot: 'bg-red-400',
    badge: 'bg-red-900/60 text-red-300 border border-red-700',
  },
  WARNING: {
    tile: 'bg-yellow-900/50 border-yellow-500 text-yellow-100',
    dot: 'bg-yellow-300',
    badge: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  },
  MAINTENANCE: {
    tile: 'bg-orange-900/50 border-orange-500 text-orange-100',
    dot: 'bg-orange-400',
    badge: 'bg-orange-900/60 text-orange-300 border border-orange-700',
  },
} as const

export const GRID_COLS = 20
export const GRID_ROWS = 12
export const GRID_CELL_PX = 64
export const MAP_POLL_INTERVAL_MS = 10000

export const PROTECTED_ROUTES = {
  ADMIN_ONLY: ['/admin'],
  SUPERVISOR_AND_ABOVE: ['/shifts', '/reports'],
  ALL_ROLES: ['/dashboard', '/machines', '/map'],
}
