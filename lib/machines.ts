import { prisma } from '@/lib/db'
import { MACHINES_PER_PAGE } from '@/constants'
import type { MachineStatus, ProgressiveType, Prisma } from '@prisma/client'
import type {
  MapMachine,
  MachineDetail,
  MachineListItem,
  MachineListResponse,
  CsvImportResult,
  CsvRowResult,
} from '@/types'

// ─── Select shapes ────────────────────────────────────────────────────────────

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
} as const

// ─── Read queries ─────────────────────────────────────────────────────────────

/**
 * Returns minimal machine data for the floor map grid and polling.
 */
export async function getAllMapMachines(): Promise<MapMachine[]> {
  return prisma.machine.findMany({
    select: MAP_MACHINE_SELECT,
    orderBy: { assetNumber: 'asc' },
  })
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

  return machine
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
    return machine
  }

  return prisma.machine.update({
    where: { id },
    data: otherFields,
    select: MAP_MACHINE_SELECT,
  })
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
  return prisma.machine.update({
    where: { id },
    data: { gridX: input.gridX, gridY: input.gridY },
    select: MAP_MACHINE_SELECT,
  })
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
  return machine
}

/**
 * Hard-deletes a machine and cascades to its status logs.
 */
export async function deleteMachine(id: string): Promise<void> {
  await prisma.machine.delete({ where: { id } })
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
