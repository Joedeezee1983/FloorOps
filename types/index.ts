import type { UserRole, MachineStatus, ShiftType, ShiftStatus } from '@prisma/client'

export type { UserRole, MachineStatus, ShiftType, ShiftStatus }

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

export interface MachineSummary {
  id: string
  machineNumber: number | null
  name: string
  serialNumber: string | null
  status: MachineStatus
  locationId: string
  gridX: number | null
  gridY: number | null
}

// Lightweight shape used by the floor map grid and polling
export interface MapMachine {
  id: string
  machineNumber: number | null
  name: string
  status: MachineStatus
  locationId: string
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
  machineNumber: number | null
  name: string
  serialNumber: string | null
  model: string | null
  manufacturer: string | null
  status: MachineStatus
  locationId: string
  locationName: string
  gridX: number | null
  gridY: number | null
  notes: string | null
  installedAt: string | null
  createdAt: string
  statusLogs: StatusLogEntry[]
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
