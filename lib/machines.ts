import { prisma } from '@/lib/db'
import { MACHINES_PER_PAGE, GRID_COLS } from '@/constants'
import type { MachineStatus, ProgressiveType, TaskStatus, Prisma } from '@prisma/client'
import type {
  MapMachine,
  MachineDetail,
  MachineListItem,
  MachineListResponse,
  CsvImportResult,
  CsvRowResult,
  ActiveShiftTaskInfo,
  MachineHistory,
  RepairLogEntry,
  StatusChangeEntry,
  MachinePartEntry,
} from '@/types'

// ─── Select shapes ────────────────────────────────────────────────────────────

// Used by mutations (create, update) — no shift task join needed
const MAP_MACHINE_SELECT = {
  id: true,
  assetNumber: true,
  bankNumber: true,
  gameName: true,
  status: true,
  locationId: true,
  gridX: true,
  gridY: true,
} as const

// Active shift task statuses that flag a machine as currently worked on
const ACTIVE_TASK_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS']

// Includes shift task info for the floor map polling endpoint
const MAP_MACHINE_WITH_TASKS_SELECT = {
  ...MAP_MACHINE_SELECT,
  shiftTasks: {
    where: { status: { in: ACTIVE_TASK_STATUSES } },
    select: { id: true, loggedByName: true, createdAt: true },
    take: 1,
    orderBy: { createdAt: 'desc' as const },
  },
} as const

const LIST_ITEM_SELECT = {
  id: true,
  assetNumber: true,
  bankNumber: true,
  gameName: true,
  gameBrand: true,
  gameType: true,
  progressiveType: true,
  denomination: true,
  softwareVersion: true,
  status: true,
  locationId: true,
  location: { select: { name: true } },
} as const

const DETAIL_SELECT = {
  id: true,
  assetNumber: true,
  bankNumber: true,
  gameName: true,
  gameBrand: true,
  gameType: true,
  progressiveType: true,
  denomination: true,
  softwareVersion: true,
  status: true,
  locationId: true,
  gridX: true,
  gridY: true,
  createdAt: true,
  location: { select: { name: true } },
  statusLogs: {
    select: { id: true, status: true, note: true, changedAt: true },
    orderBy: { changedAt: 'desc' as const },
    take: 20,
  },
  shiftTasks: {
    where: { status: { in: ACTIVE_TASK_STATUSES } },
    select: { id: true, loggedByName: true, createdAt: true },
    take: 1,
    orderBy: { createdAt: 'desc' as const },
  },
} as const

// ─── Read queries ─────────────────────────────────────────────────────────────

/**
 * Returns minimal machine data for the floor map grid and polling.
 * Includes active shift task info so the map can render wrench icons.
 */
export async function getAllMapMachines(): Promise<MapMachine[]> {
  const rows = await prisma.machine.findMany({
    select: MAP_MACHINE_WITH_TASKS_SELECT,
    orderBy: { assetNumber: 'asc' },
  })

  return rows.map((r) => ({
    id: r.id,
    assetNumber: r.assetNumber,
    bankNumber: r.bankNumber,
    gameName: r.gameName,
    status: r.status,
    locationId: r.locationId,
    gridX: r.gridX,
    gridY: r.gridY,
    activeShiftTask: toActiveShiftTask(r.shiftTasks[0]),
  }))
}

export interface ListMachinesInput {
  search?: string
  status?: MachineStatus
  gameBrand?: string
  progressiveType?: ProgressiveType
  denomination?: number
  page?: number
  pageSize?: number
}

/**
 * Returns a paginated, filterable list of machines for the registry table.
 */
export async function getAllMachinesForList(
  input: ListMachinesInput
): Promise<MachineListResponse> {
  const page = Math.max(1, input.page ?? 1)
  const pageSize = input.pageSize ?? MACHINES_PER_PAGE
  const skip = (page - 1) * pageSize
  const where = buildWhere(input)

  const [rows, total] = await Promise.all([
    prisma.machine.findMany({
      where,
      select: LIST_ITEM_SELECT,
      orderBy: { assetNumber: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.machine.count({ where }),
  ])

  const data: MachineListItem[] = rows.map((r) => ({
    ...r,
    locationName: r.location?.name ?? null,
  }))

  return { data, total, page, pageSize }
}

/**
 * Returns a single machine with full detail and its last 20 status log entries.
 * Includes any active shift task so the drawer can show who downed it.
 */
export async function getMachineDetail(id: string): Promise<MachineDetail | null> {
  const row = await prisma.machine.findUnique({
    where: { id },
    select: DETAIL_SELECT,
  })
  if (!row) return null

  return {
    ...row,
    locationName: row.location?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    statusLogs: row.statusLogs.map((log) => ({
      ...log,
      changedAt: log.changedAt.toISOString(),
    })),
    activeShiftTask: toActiveShiftTask(row.shiftTasks[0]),
  }
}

/**
 * Returns full repair log, status change history, and downtime stats for a machine.
 * Status changes derive old→new from the chronological log order.
 */
export async function getMachineHistory(id: string): Promise<MachineHistory | null> {
  const exists = await prisma.machine.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return null

  const [tasks, statusLogs, partRows] = await Promise.all([
    prisma.shiftTask.findMany({
      where: { machineId: id },
      select: {
        id: true,
        description: true,
        section: true,
        status: true,
        loggedByName: true,
        createdAt: true,
        shift: { select: { startTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.machineStatusLog.findMany({
      where: { machineId: id },
      select: { id: true, status: true, note: true, changedAt: true },
      orderBy: { changedAt: 'asc' },
    }),
    prisma.partRequest.findMany({
      where: { machineId: id },
      select: {
        id: true,
        name: true,
        quantity: true,
        urgency: true,
        status: true,
        createdAt: true,
        requestedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Derive old → new transitions from the chronological log, then reverse to newest-first
  const statusChanges: StatusChangeEntry[] = statusLogs
    .map((log, i) => ({
      id: log.id,
      changedAt: log.changedAt.toISOString(),
      oldStatus: i > 0 ? statusLogs[i - 1].status : null,
      newStatus: log.status,
      note: log.note,
    }))
    .reverse()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const timesLoggedAllTime = tasks.length
  const timesLoggedThisMonth = tasks.filter((t) => t.createdAt >= startOfMonth).length
  const mostRecentIssueDate = tasks[0]?.createdAt.toISOString() ?? null

  const repairLog: RepairLogEntry[] = tasks.map((t) => ({
    id: t.id,
    date: t.shift.startTime.toISOString(),
    techName: t.loggedByName,
    description: t.description,
    section: t.section,
    taskStatus: t.status,
  }))

  const partRequests: MachinePartEntry[] = partRows.map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    urgency: p.urgency,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    requestedByName: p.requestedBy.name,
  }))

  return {
    repairLog,
    statusChanges,
    downtimeStats: { timesLoggedThisMonth, timesLoggedAllTime, mostRecentIssueDate },
    partRequests,
  }
}

// ─── Write mutations ──────────────────────────────────────────────────────────

export interface CreateMachineInput {
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: ProgressiveType
  denomination: number
  softwareVersion?: string
  locationId?: string
  status?: MachineStatus
}

/**
 * Creates a machine and writes its initial status log entry.
 */
export async function createMachine(input: CreateMachineInput): Promise<MapMachine> {
  const initialStatus = input.status ?? 'ONLINE'

  const machine = await prisma.machine.create({
    data: {
      assetNumber: input.assetNumber,
      bankNumber: input.bankNumber,
      gameName: input.gameName,
      gameBrand: input.gameBrand,
      gameType: input.gameType,
      progressiveType: input.progressiveType,
      denomination: input.denomination,
      softwareVersion: input.softwareVersion || null,
      locationId: input.locationId || null,
      status: initialStatus,
      statusLogs: {
        create: { status: initialStatus, note: 'Machine registered' },
      },
    },
    select: MAP_MACHINE_SELECT,
  })

  return { ...machine, activeShiftTask: null }
}

export interface UpdateMachineFieldsInput {
  assetNumber?: string
  bankNumber?: string
  gameName?: string
  gameBrand?: string
  gameType?: string
  progressiveType?: ProgressiveType
  denomination?: number
  softwareVersion?: string | null
  locationId?: string | null
  status?: MachineStatus
}

/**
 * Updates machine registry fields. If status changes, appends a status log entry.
 */
export async function updateMachineFields(
  id: string,
  input: UpdateMachineFieldsInput
): Promise<MapMachine> {
  const { status, ...otherFields } = input

  if (status !== undefined) {
    const [machine] = await prisma.$transaction([
      prisma.machine.update({
        where: { id },
        data: { ...otherFields, status },
        select: MAP_MACHINE_SELECT,
      }),
      prisma.machineStatusLog.create({
        data: { machineId: id, status, note: 'Status updated via machine registry' },
      }),
    ])
    return { ...machine, activeShiftTask: null }
  }

  const machine = await prisma.machine.update({
    where: { id },
    data: otherFields,
    select: MAP_MACHINE_SELECT,
  })
  return { ...machine, activeShiftTask: null }
}

export interface UpdateMachinePositionInput {
  gridX: number
  gridY: number
}

/**
 * Updates a machine's grid position.
 * Callers are responsible for validating that coordinates are within bounds.
 */
export async function updateMachinePosition(
  id: string,
  input: UpdateMachinePositionInput
): Promise<MapMachine> {
  const machine = await prisma.machine.update({
    where: { id },
    data: { gridX: input.gridX, gridY: input.gridY },
    select: MAP_MACHINE_SELECT,
  })
  return { ...machine, activeShiftTask: null }
}

/**
 * Clears a machine's grid position, returning it to the unplaced sidebar.
 */
export async function clearMachinePosition(id: string): Promise<MapMachine> {
  const machine = await prisma.machine.update({
    where: { id },
    data: { gridX: null, gridY: null },
    select: MAP_MACHINE_SELECT,
  })
  return { ...machine, activeShiftTask: null }
}

/**
 * Updates a machine's status and appends a log entry recording the change.
 */
export async function updateMachineStatus(
  id: string,
  status: MachineStatus,
  note?: string
): Promise<MapMachine> {
  const [machine] = await prisma.$transaction([
    prisma.machine.update({
      where: { id },
      data: { status },
      select: MAP_MACHINE_SELECT,
    }),
    prisma.machineStatusLog.create({
      data: { machineId: id, status, note: note ?? null },
    }),
  ])
  return { ...machine, activeShiftTask: null }
}

/**
 * Hard-deletes a machine and cascades to its status logs.
 */
export async function deleteMachine(id: string): Promise<void> {
  await prisma.machine.delete({ where: { id } })
}

export class BankPlacementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BankPlacementError'
  }
}

export interface PlaceBankInput {
  bankNumber: string
  gridX: number
  gridY: number
}

/**
 * Places all machines in a bank at consecutive horizontal positions starting at (gridX, gridY).
 * Machines are ordered by assetNumber for deterministic placement.
 * Throws BankPlacementError if the bank would extend past the right edge of the grid.
 * Returns the count of machines updated.
 */
export async function placeBankMachines(input: PlaceBankInput): Promise<number> {
  const machines = await prisma.machine.findMany({
    where: { bankNumber: input.bankNumber },
    select: { id: true },
    orderBy: { assetNumber: 'asc' },
  })

  if (machines.length === 0) return 0

  if (input.gridX + machines.length - 1 >= GRID_COLS) {
    throw new BankPlacementError(
      `Bank ${input.bankNumber} has ${machines.length} machines and would extend past column ${GRID_COLS - 1} — choose an X position of ${GRID_COLS - machines.length} or less`
    )
  }

  await prisma.$transaction(
    machines.map((machine, i) =>
      prisma.machine.update({
        where: { id: machine.id },
        data: { gridX: input.gridX + i, gridY: input.gridY },
      })
    )
  )

  return machines.length
}

// ─── Bulk import ──────────────────────────────────────────────────────────────

export interface BulkImportRow {
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: ProgressiveType
  denomination: number
  softwareVersion?: string
  locationId?: string
  gridX?: number
  gridY?: number
}

/**
 * Inserts rows individually so a duplicate assetNumber on one row doesn't
 * block the rest of the batch. Returns a per-row result summary.
 */
export async function bulkImportMachines(rows: BulkImportRow[]): Promise<CsvImportResult> {
  const errors: CsvRowResult[] = []
  let imported = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      await prisma.machine.create({
        data: {
          assetNumber: row.assetNumber,
          bankNumber: row.bankNumber,
          gameName: row.gameName,
          gameBrand: row.gameBrand,
          gameType: row.gameType,
          progressiveType: row.progressiveType,
          denomination: row.denomination,
          softwareVersion: row.softwareVersion || null,
          locationId: row.locationId || null,
          gridX: row.gridX ?? null,
          gridY: row.gridY ?? null,
          status: 'ONLINE',
          statusLogs: { create: { status: 'ONLINE', note: 'Bulk import' } },
        },
      })
      imported++
    } catch (err) {
      skipped++
      errors.push({
        row: i + 2, // +2: 1-indexed rows + header row
        assetNumber: row.assetNumber,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return { imported, skipped, errors }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toActiveShiftTask(
  row: { id: string; loggedByName: string | null; createdAt: Date } | undefined
): ActiveShiftTaskInfo | null {
  if (!row) return null
  return { id: row.id, loggedByName: row.loggedByName, createdAt: row.createdAt.toISOString() }
}

function buildWhere(input: ListMachinesInput): Prisma.MachineWhereInput {
  const conditions: Prisma.MachineWhereInput[] = []

  if (input.search) {
    conditions.push({
      OR: [
        { assetNumber: { contains: input.search, mode: 'insensitive' } },
        { bankNumber: { contains: input.search, mode: 'insensitive' } },
        { gameName: { contains: input.search, mode: 'insensitive' } },
        { gameBrand: { contains: input.search, mode: 'insensitive' } },
      ],
    })
  }
  if (input.status) conditions.push({ status: input.status })
  if (input.gameBrand) conditions.push({ gameBrand: input.gameBrand })
  if (input.progressiveType) conditions.push({ progressiveType: input.progressiveType })
  if (input.denomination !== undefined) conditions.push({ denomination: input.denomination })

  return conditions.length > 0 ? { AND: conditions } : {}
}
