import { prisma } from '@/lib/db'
import type { PartUrgency, PartStatus } from '@prisma/client'
import type { PartRequestSummary, MachinePartEntry } from '@/types'

const PART_REQUEST_SELECT = {
  id: true,
  name: true,
  description: true,
  quantity: true,
  urgency: true,
  status: true,
  orderedAt: true,
  receivedAt: true,
  notes: true,
  createdAt: true,
  shiftId: true,
  requestedById: true,
  requestedBy: { select: { name: true } },
  machine: { select: { id: true, assetNumber: true, gameName: true } },
} as const

type PartRequestRow = {
  id: string
  name: string
  description: string | null
  quantity: number
  urgency: PartUrgency
  status: PartStatus
  orderedAt: Date | null
  receivedAt: Date | null
  notes: string | null
  createdAt: Date
  shiftId: string | null
  requestedById: string
  requestedBy: { name: string | null }
  machine: { id: string; assetNumber: string; gameName: string } | null
}

function mapPartRequest(r: PartRequestRow): PartRequestSummary {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    quantity: r.quantity,
    urgency: r.urgency,
    status: r.status,
    orderedAt: r.orderedAt?.toISOString() ?? null,
    receivedAt: r.receivedAt?.toISOString() ?? null,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    shiftId: r.shiftId,
    requestedById: r.requestedById,
    requestedByName: r.requestedBy.name,
    machine: r.machine ?? null,
  }
}

export interface CreatePartRequestInput {
  name: string
  description?: string
  quantity: number
  urgency: PartUrgency
  machineId?: string
  shiftId?: string
  requestedById: string
}

/**
 * Creates a new part request and returns the full summary shape.
 */
export async function createPartRequest(input: CreatePartRequestInput): Promise<PartRequestSummary> {
  const row = await prisma.partRequest.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      quantity: input.quantity,
      urgency: input.urgency,
      machineId: input.machineId ?? null,
      shiftId: input.shiftId ?? null,
      requestedById: input.requestedById,
    },
    select: PART_REQUEST_SELECT,
  })
  return mapPartRequest(row)
}

/**
 * Returns all part requests ordered newest-first for the admin Parts tab.
 */
export async function listPartRequests(): Promise<PartRequestSummary[]> {
  const rows = await prisma.partRequest.findMany({
    select: PART_REQUEST_SELECT,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(mapPartRequest)
}

export interface UpdatePartRequestInput {
  status?: PartStatus
  notes?: string
  orderedAt?: Date | null
  receivedAt?: Date | null
}

/**
 * Updates a part request's status and optional metadata.
 * Automatically sets orderedAt/receivedAt timestamps when status transitions.
 */
export async function updatePartRequest(
  id: string,
  input: UpdatePartRequestInput
): Promise<PartRequestSummary> {
  const data: UpdatePartRequestInput & { orderedAt?: Date | null; receivedAt?: Date | null } = {
    ...input,
  }

  if (input.status === 'ORDERED' && input.orderedAt === undefined) {
    data.orderedAt = new Date()
  }
  if (input.status === 'RECEIVED' && input.receivedAt === undefined) {
    data.receivedAt = new Date()
  }

  const row = await prisma.partRequest.update({
    where: { id },
    data,
    select: PART_REQUEST_SELECT,
  })
  return mapPartRequest(row)
}

/**
 * Returns part requests for a specific machine, newest-first.
 * Used by the Machine History tab.
 */
export async function getPartRequestsForMachine(machineId: string): Promise<MachinePartEntry[]> {
  const rows = await prisma.partRequest.findMany({
    where: { machineId },
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
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity,
    urgency: r.urgency,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    requestedByName: r.requestedBy.name,
  }))
}

/**
 * Returns the inventory tech email from the settings for a given location,
 * or falls back to the first configured location that has one.
 */
export async function getInventoryEmail(locationId?: string): Promise<string | null> {
  if (locationId) {
    const settings = await prisma.systemSettings.findUnique({
      where: { locationId },
      select: { inventoryEmail: true },
    })
    if (settings?.inventoryEmail) return settings.inventoryEmail
  }

  const fallback = await prisma.systemSettings.findFirst({
    where: { inventoryEmail: { not: null } },
    select: { inventoryEmail: true },
  })
  return fallback?.inventoryEmail ?? null
}
