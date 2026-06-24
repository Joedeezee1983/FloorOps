import type { UserRole, MachineStatus, ShiftType, ShiftStatus, ProgressiveType } from '@prisma/client'

export type { UserRole, MachineStatus, ShiftType, ShiftStatus, ProgressiveType }

export interface SessionUser {
  id: string
  name: string | null
  email: string
  role: UserRole
}

export interface LocationSummary {
  id: string
  name: string
  floorNumber: number | null
  isActive: boolean
}

// Lightweight shape used by the floor map grid and polling
export interface MapMachine {
  id: string
  assetNumber: string
  bankNumber: string
  gameName: string
  status: MachineStatus
  locationId: string | null
  gridX: number | null
  gridY: number | null
}

export interface StatusLogEntry {
  id: string
  status: MachineStatus
  note: string | null
  changedAt: string
}

// Full detail fetched when a machine tile is clicked
export interface MachineDetail {
  id: string
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: ProgressiveType
  denomination: number
  softwareVersion: string | null
  status: MachineStatus
  locationId: string | null
  locationName: string | null
  gridX: number | null
  gridY: number | null
  createdAt: string
  statusLogs: StatusLogEntry[]
}

// Full item shape used by the machines registry table
export interface MachineListItem {
  id: string
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: ProgressiveType
  denomination: number
  softwareVersion: string | null
  status: MachineStatus
  locationId: string | null
  locationName: string | null
}

export interface MachineListResponse {
  data: MachineListItem[]
  total: number
  page: number
  pageSize: number
}

// CSV import types
export interface CsvImportRow {
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: string
  denomination: string
  softwareVersion: string
}

export interface CsvRowResult {
  row: number
  assetNumber: string
  success: boolean
  error?: string
}

export interface CsvImportResult {
  imported: number
  skipped: number
  errors: CsvRowResult[]
}

export interface ShiftSummary {
  id: string
  type: ShiftType
  status: ShiftStatus
  locationId: string
  startTime: Date
  endTime: Date
  headcount: number
}

export interface UserSummary {
  id: string
  name: string | null
  email: string
  role: UserRole
  locationId: string | null
}
