import { prisma } from '@/lib/db'
import type { ShiftType, ShiftStatus, TaskType, TaskStatus } from '@prisma/client'
import type { ShiftSummary, ShiftDetail, ShiftTaskDetail } from '@/types'

// ─── Select shapes ────────────────────────────────────────────────────────────

const TASK_SELECT = {
  id: true,
  shiftId: true,
  type: true,
  description: true,
  status: true,
  machineId: true,
  loggedByName: true,
  createdAt: true,
  updatedAt: true,
  machine: {
    select: {
      assetNumber: true,
      gameName: true,
      bankNumber: true,
      status: true,
    },
  },
} as const

const SHIFT_SUMMARY_SELECT = {
  id: true,
  type: true,
  status: true,
  locationId: true,
  supervisorId: true,
  startTime: true,
  endTime: true,
  headcount: true,
  location: { select: { name: true } },
  supervisor: { select: { name: true } },
  _count: { select: { tasks: true } },
} as const

// ─── Read queries ─────────────────────────────────────────────────────────────

/**
 * Returns shifts for a location, most recent first.
 */
export async function getShiftsForLocation(locationId: string): Promise<ShiftSummary[]> {
  const rows = await prisma.shift.findMany({
    where: { locationId },
    select: SHIFT_SUMMARY_SELECT,
    orderBy: { startTime: 'desc' },
    take: 50,
  })

  return rows.map((r) => mapShiftSummary(r))
}

/**
 * Returns all shifts across all locations, most recent first.
 */
export async function getAllShifts(): Promise<ShiftSummary[]> {
  const rows = await prisma.shift.findMany({
    select: SHIFT_SUMMARY_SELECT,
    orderBy: { startTime: 'desc' },
    take: 100,
  })

  return rows.map((r) => mapShiftSummary(r))
}

/**
 * Returns full shift detail including all tasks and linked machine info.
 */
export async function getShiftDetail(id: string): Promise<ShiftDetail | null> {
  const row = await prisma.shift.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      locationId: true,
      supervisorId: true,
      startTime: true,
      endTime: true,
      headcount: true,
      briefing: true,
      notes: true,
      createdAt: true,
      location: { select: { name: true } },
      supervisor: { select: { name: true } },
      tasks: {
        select: TASK_SELECT,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!row) return null

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    supervisorId: row.supervisorId,
    supervisorName: row.supervisor?.name ?? null,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    headcount: row.headcount,
    briefing: row.briefing,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    tasks: row.tasks.map(mapTaskDetail),
  }
}

// ─── Write mutations ──────────────────────────────────────────────────────────

export interface CreateShiftInput {
  type: ShiftType
  status?: ShiftStatus
  locationId: string
  supervisorId?: string
  startTime: Date
  endTime: Date
  headcount?: number
  briefing?: string
  notes?: string
}

/**
 * Creates a new shift for a location.
 */
export async function createShift(input: CreateShiftInput): Promise<ShiftDetail> {
  const row = await prisma.shift.create({
    data: {
      type: input.type,
      status: input.status ?? 'SCHEDULED',
      locationId: input.locationId,
      supervisorId: input.supervisorId ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      headcount: input.headcount ?? 0,
      briefing: input.briefing ?? null,
      notes: input.notes ?? null,
    },
    select: {
      id: true,
      type: true,
      status: true,
      locationId: true,
      supervisorId: true,
      startTime: true,
      endTime: true,
      headcount: true,
      briefing: true,
      notes: true,
      createdAt: true,
      location: { select: { name: true } },
      supervisor: { select: { name: true } },
      tasks: { select: TASK_SELECT },
    },
  })

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    supervisorId: row.supervisorId,
    supervisorName: row.supervisor?.name ?? null,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    headcount: row.headcount,
    briefing: row.briefing,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    tasks: [],
  }
}

export interface CreateShiftTaskInput {
  shiftId: string
  type: TaskType
  description: string
  machineId?: string
  loggedByName?: string
}

/**
 * Creates a shift task. If type is DOWN_MACHINE and machineId is provided,
 * updates machine status to OFFLINE in the same transaction and logs the change.
 */
export async function createShiftTask(input: CreateShiftTaskInput): Promise<ShiftTaskDetail> {
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.shiftTask.create({
      data: {
        shiftId: input.shiftId,
        type: input.type,
        description: input.description,
        machineId: input.machineId ?? null,
        loggedByName: input.loggedByName ?? null,
        status: 'PENDING',
      },
      select: TASK_SELECT,
    })

    if (input.type === 'DOWN_MACHINE' && input.machineId) {
      await tx.machine.update({
        where: { id: input.machineId },
        data: { status: 'OFFLINE' },
      })
      await tx.machineStatusLog.create({
        data: {
          machineId: input.machineId,
          status: 'OFFLINE',
          note: `Logged down by ${input.loggedByName ?? 'Unknown'} via shift task`,
        },
      })
    }

    return created
  })

  return mapTaskDetail(task)
}

export interface UpdateShiftTaskStatusInput {
  status: TaskStatus
  loggedByName?: string
}

/**
 * Updates a shift task status. If status is RESOLVED and the task has a linked
 * machine, restores the machine to ONLINE in the same transaction.
 */
export async function updateShiftTaskStatus(
  id: string,
  input: UpdateShiftTaskStatusInput
): Promise<ShiftTaskDetail> {
  const existing = await prisma.shiftTask.findUnique({
    where: { id },
    select: { machineId: true, type: true },
  })

  if (!existing) throw new Error('Shift task not found')

  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.shiftTask.update({
      where: { id },
      data: { status: input.status },
      select: TASK_SELECT,
    })

    if (input.status === 'RESOLVED' && existing.type === 'DOWN_MACHINE' && existing.machineId) {
      await tx.machine.update({
        where: { id: existing.machineId },
        data: { status: 'ONLINE' },
      })
      await tx.machineStatusLog.create({
        data: {
          machineId: existing.machineId,
          status: 'ONLINE',
          note: `Restored by ${input.loggedByName ?? 'Unknown'} during shift`,
        },
      })
    }

    return updated
  })

  return mapTaskDetail(task)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type ShiftSummaryRow = {
  id: string
  type: ShiftType
  status: ShiftStatus
  locationId: string
  supervisorId: string | null
  startTime: Date
  endTime: Date
  headcount: number
  location: { name: string } | null
  supervisor: { name: string | null } | null
  _count: { tasks: number }
}

function mapShiftSummary(r: ShiftSummaryRow): ShiftSummary {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    locationId: r.locationId,
    locationName: r.location?.name ?? null,
    supervisorName: r.supervisor?.name ?? null,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime.toISOString(),
    headcount: r.headcount,
    taskCount: r._count.tasks,
    downMachineCount: 0, // computed below if needed
  }
}

type TaskRow = {
  id: string
  shiftId: string
  type: TaskType
  description: string
  status: TaskStatus
  machineId: string | null
  loggedByName: string | null
  createdAt: Date
  updatedAt: Date
  machine: {
    assetNumber: string
    gameName: string
    bankNumber: string
    status: import('@prisma/client').MachineStatus
  } | null
}

function mapTaskDetail(r: TaskRow): ShiftTaskDetail {
  return {
    id: r.id,
    shiftId: r.shiftId,
    type: r.type,
    description: r.description,
    status: r.status,
    machineId: r.machineId,
    loggedByName: r.loggedByName,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    machine: r.machine ?? null,
  }
}
