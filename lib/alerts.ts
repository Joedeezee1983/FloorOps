import { prisma } from '@/lib/db'
import type { AlertType, AlertStatus } from '@prisma/client'
import type { ServiceAlertSummary } from '@/types'

const ALERT_SELECT = {
  id: true,
  locationId: true,
  type: true,
  message: true,
  status: true,
  createdAt: true,
  acknowledgedAt: true,
  resolvedAt: true,
  createdBy: { select: { id: true, name: true } },
  acknowledgedBy: { select: { id: true, name: true } },
  machine: { select: { id: true, assetNumber: true, gameName: true } },
} as const

type AlertRow = {
  id: string
  locationId: string
  type: AlertType
  message: string | null
  status: AlertStatus
  createdAt: Date
  acknowledgedAt: Date | null
  resolvedAt: Date | null
  createdBy: { id: string; name: string | null }
  acknowledgedBy: { id: string; name: string | null } | null
  machine: { id: string; assetNumber: string; gameName: string } | null
}

function mapAlert(r: AlertRow): ServiceAlertSummary {
  return {
    id: r.id,
    locationId: r.locationId,
    type: r.type,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    createdBy: r.createdBy,
    acknowledgedBy: r.acknowledgedBy,
    machine: r.machine,
  }
}

export interface CreateAlertInput {
  locationId: string
  createdById: string
  machineId?: string
  type: AlertType
  message?: string
}

/**
 * Creates a new service alert with ACTIVE status.
 */
export async function createAlert(input: CreateAlertInput): Promise<ServiceAlertSummary> {
  const row = await prisma.serviceAlert.create({
    data: {
      locationId: input.locationId,
      createdById: input.createdById,
      machineId: input.machineId ?? null,
      type: input.type,
      message: input.message ?? null,
    },
    select: ALERT_SELECT,
  })
  return mapAlert(row)
}

/**
 * Returns all non-resolved alerts for a location, newest-first.
 * Used by the Alerts panel for SUPERVISOR/ADMIN.
 */
export async function listActiveAlerts(locationId: string): Promise<ServiceAlertSummary[]> {
  const rows = await prisma.serviceAlert.findMany({
    where: { locationId, status: { not: 'RESOLVED' } },
    select: ALERT_SELECT,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(mapAlert)
}

/**
 * Returns the count of ACTIVE (unacknowledged) alerts for a location.
 * Used by the nav badge.
 */
export async function getActiveAlertCount(locationId: string): Promise<number> {
  return prisma.serviceAlert.count({
    where: { locationId, status: 'ACTIVE' },
  })
}

export interface UpdateAlertInput {
  status: AlertStatus
  acknowledgedById?: string
}

/**
 * Updates an alert status, setting acknowledgedAt/resolvedAt timestamps on transition.
 */
export async function updateAlertStatus(
  id: string,
  input: UpdateAlertInput
): Promise<ServiceAlertSummary> {
  const data: {
    status: AlertStatus
    acknowledgedById?: string
    acknowledgedAt?: Date
    resolvedAt?: Date
  } = { status: input.status }

  if (input.status === 'ACKNOWLEDGED') {
    data.acknowledgedById = input.acknowledgedById
    data.acknowledgedAt = new Date()
  }
  if (input.status === 'RESOLVED') {
    data.resolvedAt = new Date()
  }

  const row = await prisma.serviceAlert.update({
    where: { id },
    data,
    select: ALERT_SELECT,
  })
  return mapAlert(row)
}

/**
 * Returns emails of all active SUPERVISOR and ADMIN users at a location.
 * Used to notify staff when a new alert is created.
 */
export async function getAlertRecipients(locationId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      locationId,
      role: { in: ['SUPERVISOR', 'ADMIN'] },
      isActive: true,
    },
    select: { email: true },
  })
  return users.map((u) => u.email)
}
