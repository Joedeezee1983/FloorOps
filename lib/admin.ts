import { prisma } from '@/lib/db'
import { hashPassword } from '@/utils/password'
import type { UserRole } from '@prisma/client'
import type { AdminUserItem, AdminLocationItem, SystemSettingsData, DataStats } from '@/types'

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  locationId: true,
  createdAt: true,
} as const

const LOCATION_WITH_COUNT_SELECT = {
  id: true,
  name: true,
  floorNumber: true,
  isActive: true,
  createdAt: true,
  _count: { select: { machines: true } },
} as const

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Returns all users ordered by creation date.
 */
export async function listUsers(): Promise<AdminUserItem[]> {
  const rows = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: UserRole
}

/**
 * Creates a new user with a hashed password.
 * Throws a Prisma unique-constraint error if the email is already taken.
 */
export async function createUser(input: CreateUserInput): Promise<AdminUserItem> {
  const password = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, password, role: input.role },
    select: USER_SELECT,
  })
  return { ...user, createdAt: user.createdAt.toISOString() }
}

export interface UpdateUserInput {
  role?: UserRole
  isActive?: boolean
}

/**
 * Updates a user's role or active status.
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<AdminUserItem> {
  const user = await prisma.user.update({
    where: { id },
    data: input,
    select: USER_SELECT,
  })
  return { ...user, createdAt: user.createdAt.toISOString() }
}

// ─── Locations ────────────────────────────────────────────────────────────────

function mapLocationRow(r: {
  id: string
  name: string
  floorNumber: number | null
  isActive: boolean
  createdAt: Date
  _count: { machines: number }
}): AdminLocationItem {
  return {
    id: r.id,
    name: r.name,
    floorNumber: r.floorNumber,
    isActive: r.isActive,
    machineCount: r._count.machines,
    createdAt: r.createdAt.toISOString(),
  }
}

/**
 * Returns all locations with machine counts for admin listing.
 */
export async function listAdminLocations(): Promise<AdminLocationItem[]> {
  const rows = await prisma.location.findMany({
    select: LOCATION_WITH_COUNT_SELECT,
    orderBy: { name: 'asc' },
  })
  return rows.map(mapLocationRow)
}

export interface CreateLocationInput {
  name: string
  floorNumber?: number | null
}

/**
 * Creates a new location.
 */
export async function createLocation(input: CreateLocationInput): Promise<AdminLocationItem> {
  const row = await prisma.location.create({
    data: { name: input.name, floorNumber: input.floorNumber ?? null },
    select: LOCATION_WITH_COUNT_SELECT,
  })
  return mapLocationRow(row)
}

export interface UpdateLocationInput {
  name?: string
  floorNumber?: number | null
  isActive?: boolean
}

/**
 * Updates a location's name, floor, or active status.
 */
export async function updateLocation(id: string, input: UpdateLocationInput): Promise<AdminLocationItem> {
  const row = await prisma.location.update({
    where: { id },
    data: input,
    select: LOCATION_WITH_COUNT_SELECT,
  })
  return mapLocationRow(row)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/**
 * Returns system settings for a location, or null if not yet configured.
 */
export async function getSettingsForLocation(locationId: string): Promise<SystemSettingsData | null> {
  return prisma.systemSettings.findUnique({ where: { locationId } })
}

export interface UpdateSettingsInput {
  dayShiftStart?: string
  dayShiftEnd?: string
  swingShiftStart?: string
  swingShiftEnd?: string
  nightShiftStart?: string
  nightShiftEnd?: string
  shiftTimeoutHours?: number
}

/**
 * Creates or updates system settings for a location.
 */
export async function upsertSettings(
  locationId: string,
  input: UpdateSettingsInput
): Promise<SystemSettingsData> {
  return prisma.systemSettings.upsert({
    where: { locationId },
    create: { locationId, ...input },
    update: input,
  })
}

// ─── Data ─────────────────────────────────────────────────────────────────────

/**
 * Builds a CSV string of all machines in asset-number order.
 * Includes status column to support round-trip import via sync.
 */
export async function buildMachineCsv(): Promise<string> {
  const machines = await prisma.machine.findMany({
    select: {
      assetNumber: true,
      bankNumber: true,
      gameName: true,
      gameBrand: true,
      gameType: true,
      progressiveType: true,
      denomination: true,
      softwareVersion: true,
      status: true,
    },
    orderBy: { assetNumber: 'asc' },
  })

  const header = 'assetNumber,bankNumber,gameName,gameBrand,gameType,progressiveType,denomination,softwareVersion,status'
  const rows = machines.map((m) =>
    [
      m.assetNumber,
      m.bankNumber,
      `"${m.gameName.replace(/"/g, '""')}"`,
      m.gameBrand,
      m.gameType,
      m.progressiveType,
      m.denomination.toString(),
      m.softwareVersion ?? '',
      m.status,
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

/**
 * Deletes COMPLETED shifts whose endTime is older than `days` days.
 * ShiftTasks cascade-delete automatically.
 * Returns the count of deleted shifts.
 */
export async function deleteShiftsOlderThan(days: number): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const result = await prisma.shift.deleteMany({
    where: { status: 'COMPLETED', endTime: { lt: cutoff } },
  })
  return result.count
}

/**
 * Returns aggregate counts for the Data tab stats display.
 */
export async function getDataStats(): Promise<DataStats> {
  const [totalShifts, totalTasks, totalMachines] = await Promise.all([
    prisma.shift.count(),
    prisma.shiftTask.count(),
    prisma.machine.count(),
  ])
  return { totalShifts, totalTasks, totalMachines }
}
