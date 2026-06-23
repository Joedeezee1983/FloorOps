import { prisma } from '@/lib/db'
import type { MachineStatus } from '@prisma/client'
import type { MapMachine, MachineDetail } from '@/types'

const MAP_MACHINE_SELECT = {
  id: true,
  machineNumber: true,
  name: true,
  status: true,
  locationId: true,
  gridX: true,
  gridY: true,
} as const

const DETAIL_SELECT = {
  id: true,
  machineNumber: true,
  name: true,
  serialNumber: true,
  model: true,
  manufacturer: true,
  status: true,
  locationId: true,
  gridX: true,
  gridY: true,
  notes: true,
  installedAt: true,
  createdAt: true,
  location: { select: { name: true } },
  statusLogs: {
    select: { id: true, status: true, note: true, changedAt: true },
    orderBy: { changedAt: 'desc' as const },
    take: 20,
  },
} as const

/**
 * Returns all machines with the minimal fields needed to render the floor map grid.
 */
export async function getAllMapMachines(): Promise<MapMachine[]> {
  return prisma.machine.findMany({
    select: MAP_MACHINE_SELECT,
    orderBy: { machineNumber: 'asc' },
  })
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
    locationName: row.location.name,
    installedAt: row.installedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    statusLogs: row.statusLogs.map((log) => ({
      ...log,
      changedAt: log.changedAt.toISOString(),
    })),
  }
}

export interface CreateMachineInput {
  name: string
  locationId: string
  machineNumber?: number
  serialNumber?: string
  model?: string
  manufacturer?: string
  notes?: string
}

/**
 * Creates a machine and writes its initial OFFLINE status log entry.
 */
export async function createMachine(input: CreateMachineInput): Promise<MapMachine> {
  const machine = await prisma.machine.create({
    data: {
      name: input.name,
      locationId: input.locationId,
      machineNumber: input.machineNumber ?? null,
      serialNumber: input.serialNumber || null,
      model: input.model || null,
      manufacturer: input.manufacturer || null,
      notes: input.notes || null,
      status: 'OFFLINE',
    },
    select: MAP_MACHINE_SELECT,
  })

  await prisma.machineStatusLog.create({
    data: { machineId: machine.id, status: 'OFFLINE', note: 'Machine registered' },
  })

  return machine
}

export interface UpdateMachinePositionInput {
  gridX: number
  gridY: number
}

/**
 * Updates a machine's grid position. Validates coordinates are within the grid bounds.
 * Importing GRID_COLS/GRID_ROWS here would create a cross-layer dependency, so callers
 * are expected to validate bounds before calling.
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
