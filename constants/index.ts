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

// Floor map grid — 100×70 supports Graton-scale floors (5700+ machines)
export const GRID_COLS = 100
export const GRID_ROWS = 70
export const GRID_CELL_PX = 64
export const MAP_POLL_INTERVAL_MS = 10000

// Floor map zoom
export const DEFAULT_ZOOM = 0.25
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 1.5
export const ZOOM_STEP = 0.05
export const MINIMAP_CELL_PX = 3

// Machine registry
export const MACHINES_PER_PAGE = 50

export const GAME_BRANDS = [
  'Aristocrat',
  'IGT',
  'Konami',
  'Everi',
  'Ainsworth',
  'Scientific Games',
  'Other',
] as const

export const GAME_TYPES = [
  'Slot',
  'Video Poker',
  'Kiosk',
  'Table Game',
  'Other',
] as const

export const DENOMINATIONS = [
  0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 25.0, 100.0,
] as const

export const PROGRESSIVE_TYPE_LABELS: Record<string, string> = {
  NONE: 'None',
  STANDALONE: 'Standalone',
  LINKED: 'Linked',
  WIDE_AREA: 'Wide Area',
}

export const CSV_TEMPLATE_HEADER =
  'assetNumber,bankNumber,gameName,gameBrand,gameType,progressiveType,denomination,softwareVersion'

export const CSV_TEMPLATE_EXAMPLE =
  '21257,7-19,Buffalo Gold,Aristocrat,Slot,LINKED,0.01,v4.23.1'

export const VALID_PROGRESSIVE_TYPES = new Set(['NONE', 'STANDALONE', 'LINKED', 'WIDE_AREA'])

export const PROTECTED_ROUTES = {
  ADMIN_ONLY: ['/admin'],
  SUPERVISOR_AND_ABOVE: ['/shifts', '/reports'],
  ALL_ROLES: ['/dashboard', '/machines', '/map'],
}
