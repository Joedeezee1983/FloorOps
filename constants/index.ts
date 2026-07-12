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
  '0.01', '0.02', '0.05', '0.10', '0.25', '0.50', '1.00', '2.00', '5.00', '10.00', '25.00', '100.00',
] as const

export const PROGRESSIVE_TYPE_LABELS: Record<string, string> = {
  NONE: 'None',
  STANDALONE: 'Standalone',
  LINKED: 'Linked',
  WIDE_AREA: 'Wide Area',
}

export const TASK_TYPE_LABELS: Record<string, string> = {
  DOWN_MACHINE: 'Down Machine',
  GENERAL: 'General',
  MAINTENANCE_REQUEST: 'Maintenance Request',
}

export const TASK_SECTION_LABELS: Record<string, string> = {
  PRE_EXISTING_DOWN: 'Pre-Existing Down',
  FLOOR_GAMES: 'Floor Games',
  KIOSKS: 'Kiosks',
  BENCH_OFFICE: 'Bench/Office',
  MISCELLANEOUS: 'Miscellaneous',
}

export const TASK_SECTION_ORDER = [
  'PRE_EXISTING_DOWN',
  'FLOOR_GAMES',
  'KIOSKS',
  'BENCH_OFFICE',
  'MISCELLANEOUS',
] as const

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
}

export const TASK_STATUS_STYLES = {
  PENDING: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  IN_PROGRESS: 'bg-blue-900/40 text-blue-300 border border-blue-700',
  RESOLVED: 'bg-green-900/40 text-green-300 border border-green-700',
} as const

export const CSV_TEMPLATE_HEADER =
  'assetNumber,bankNumber,gameName,gameBrand,gameType,progressiveType,denomination,softwareVersion'

export const CSV_TEMPLATE_EXAMPLE =
  '21257,7-19,Buffalo Gold,Aristocrat,Slot,LINKED,0.01,v4.23.1'

// Active games sync — superset of import; status column is optional
export const SYNC_TEMPLATE_HEADER =
  'assetNumber,bankNumber,gameName,gameBrand,gameType,progressiveType,denomination,softwareVersion,status'

export const SYNC_REQUIRED_COLUMNS = ['assetNumber', 'bankNumber', 'gameName', 'gameBrand', 'gameType']

export const VALID_PROGRESSIVE_TYPES = new Set(['NONE', 'STANDALONE', 'LINKED', 'WIDE_AREA'])

export const VALID_MACHINE_STATUSES = new Set(['ONLINE', 'OFFLINE', 'WARNING', 'MAINTENANCE'])

export const PROTECTED_ROUTES = {
  ADMIN_ONLY: ['/admin'],
  SUPERVISOR_AND_ABOVE: ['/shifts', '/reports', '/alerts'],
  ALL_ROLES: ['/dashboard', '/machines', '/map'],
}

export const ALERT_TYPE_LABELS: Record<string, string> = {
  NEED_ASSISTANCE: 'Need Assistance',
  MACHINE_DOWN: 'Machine Down',
  SECURITY: 'Security',
  CUSTOM: 'Custom',
}

export const ALERT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
}

export const ALERT_TYPE_STYLES: Record<string, string> = {
  NEED_ASSISTANCE: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  MACHINE_DOWN: 'bg-red-900/40 text-red-300 border border-red-700',
  SECURITY: 'bg-purple-900/40 text-purple-300 border border-purple-700',
  CUSTOM: 'bg-gray-700/60 text-gray-300 border border-gray-600',
}

export const ALERT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-red-900/40 text-red-300 border border-red-700',
  ACKNOWLEDGED: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  RESOLVED: 'bg-green-900/40 text-green-300 border border-green-700',
}

// Active-selection styles for the alert type picker in the create-alert modal
export const ALERT_TYPE_ACTIVE_STYLES: Record<string, string> = {
  NEED_ASSISTANCE: 'bg-yellow-900/60 border-yellow-500 text-yellow-200',
  MACHINE_DOWN: 'bg-red-900/60 border-red-500 text-red-200',
  SECURITY: 'bg-purple-900/60 border-purple-500 text-purple-200',
  CUSTOM: 'bg-blue-900/60 border-blue-500 text-blue-200',
}

export const ALERT_POLL_INTERVAL_MS = 30_000
