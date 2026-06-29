import type {
  UserRole,
  MachineStatus,
  ShiftType,
  ShiftStatus,
  ProgressiveType,
  TaskType,
  TaskStatus,
  TaskSection,
  PartUrgency,
  PartStatus,
} from '@prisma/client'

export type { UserRole, MachineStatus, ShiftType, ShiftStatus, ProgressiveType, TaskType, TaskStatus, TaskSection, PartUrgency, PartStatus }

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

export interface BlueprintSummary {
  id: string
  locationId: string
  imageUrl: string
  opacity: number
}

export interface ActiveShiftTaskInfo {
  id: string
  loggedByName: string | null
  createdAt: string
}

// Lightweight shape used by the floor map grid and polling.
// activeShiftTask is only populated from getAllMapMachines — mutations leave it undefined.
export interface MapMachine {
  id: string
  assetNumber: string
  bankNumber: string
  gameName: string
  status: MachineStatus
  locationId: string | null
  gridX: number | null
  gridY: number | null
  activeShiftTask?: ActiveShiftTaskInfo | null
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
  activeShiftTask?: ActiveShiftTaskInfo | null
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

// CSV import types (new machines only — no upsert)
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

// Active games sync (upsert — matches by assetNumber)
export interface SyncRowResult {
  row: number
  assetNumber: string
  action: 'created' | 'updated' | 'failed'
  error?: string
}

export interface SyncImportResult {
  created: number
  updated: number
  failed: number
  errors: SyncRowResult[]
}

// Machine search (autocomplete)
export interface MachineSearchResult {
  id: string
  assetNumber: string
  bankNumber: string
  gameName: string
  status: MachineStatus
}

// Shift types
export interface ShiftSummary {
  id: string
  type: ShiftType
  status: ShiftStatus
  locationId: string
  locationName: string | null
  supervisorName: string | null
  startTime: string
  endTime: string
  headcount: number
  taskCount: number
  downMachineCount: number
}

export interface ShiftStaffMember {
  userId: string
  name: string | null
}

export interface ShiftTaskDetail {
  id: string
  shiftId: string
  type: TaskType
  section: TaskSection
  description: string
  status: TaskStatus
  machineId: string | null
  loggedByName: string | null
  createdAt: string
  updatedAt: string
  machine: {
    assetNumber: string
    gameName: string
    bankNumber: string
    status: MachineStatus
  } | null
}

export interface ShiftDetail {
  id: string
  type: ShiftType
  status: ShiftStatus
  locationId: string
  locationName: string | null
  supervisorId: string | null
  supervisorName: string | null
  startTime: string
  endTime: string
  headcount: number
  briefing: string | null
  notes: string | null
  createdAt: string
  tasks: ShiftTaskDetail[]
  staff: ShiftStaffMember[]
  aiSummary: string | null
}

export interface UserSummary {
  id: string
  name: string | null
  email: string
  role: UserRole
  locationId: string | null
}

// ─── Admin types ──────────────────────────────────────────────────────────────

export interface AdminUserItem {
  id: string
  name: string | null
  email: string
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  locationId: string | null
  createdAt: string
}

export interface AdminLocationItem {
  id: string
  name: string
  floorNumber: number | null
  isActive: boolean
  machineCount: number
  createdAt: string
}

export interface SystemSettingsData {
  id: string
  locationId: string
  dayShiftStart: string
  dayShiftEnd: string
  swingShiftStart: string
  swingShiftEnd: string
  nightShiftStart: string
  nightShiftEnd: string
  shiftTimeoutHours: number
  inventoryEmail: string | null
}

export interface DataStats {
  totalShifts: number
  totalTasks: number
  totalMachines: number
}

export interface RepairLogEntry {
  id: string
  date: string
  techName: string | null
  description: string
  section: TaskSection
  taskStatus: TaskStatus
}

export interface StatusChangeEntry {
  id: string
  changedAt: string
  oldStatus: MachineStatus | null
  newStatus: MachineStatus
  note: string | null
}

export interface DowntimeStats {
  timesLoggedThisMonth: number
  timesLoggedAllTime: number
  mostRecentIssueDate: string | null
}

export interface MachinePartEntry {
  id: string
  name: string
  quantity: number
  urgency: PartUrgency
  status: PartStatus
  requestedByName: string | null
  createdAt: string
}

export interface PartRequestSummary {
  id: string
  name: string
  description: string | null
  quantity: number
  urgency: PartUrgency
  status: PartStatus
  orderedAt: string | null
  receivedAt: string | null
  notes: string | null
  createdAt: string
  shiftId: string | null
  requestedByName: string | null
  machine: { id: string; assetNumber: string; gameName: string } | null
}

export interface MachineHistory {
  repairLog: RepairLogEntry[]
  statusChanges: StatusChangeEntry[]
  downtimeStats: DowntimeStats
  partRequests: MachinePartEntry[]
}
