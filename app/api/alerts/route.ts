import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAlert, listActiveAlerts, getAlertRecipients } from '@/lib/alerts'
import { sendServiceAlertEmail } from '@/lib/email'
import { ALERT_TYPE_LABELS } from '@/constants'
import type { AlertType } from '@prisma/client'

const VALID_ALERT_TYPES = new Set<AlertType>([
  'NEED_ASSISTANCE',
  'MACHINE_DOWN',
  'SECURITY',
  'CUSTOM',
])

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as Record<string, unknown>

    const type =
      typeof body.type === 'string' && VALID_ALERT_TYPES.has(body.type as AlertType)
        ? (body.type as AlertType)
        : undefined
    if (!type) return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 })

    const message = typeof body.message === 'string' ? body.message.trim() || undefined : undefined
    const machineId = typeof body.machineId === 'string' ? body.machineId : undefined

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locationId: true, name: true },
    })
    if (!user || !user.locationId) {
      return NextResponse.json(
        { error: 'You must be assigned to a location to send alerts.' },
        { status: 400 }
      )
    }

    const alert = await createAlert({
      locationId: user.locationId,
      createdById: session.user.id,
      type,
      message,
      machineId,
    })

    // Fire-and-forget: email all supervisors/admins at this location
    void (async () => {
      try {
        const recipients = await getAlertRecipients(user.locationId!)
        if (recipients.length > 0) {
          await sendServiceAlertEmail(recipients, {
            alertType: ALERT_TYPE_LABELS[type] ?? type,
            message: message ?? null,
            machineInfo: alert.machine
              ? `#${alert.machine.assetNumber} — ${alert.machine.gameName}`
              : null,
            createdByName: user.name,
          })
        }
      } catch (emailError) {
        console.error('[alerts] Failed to send email notification:', emailError)
      }
    })()

    return NextResponse.json({ data: alert }, { status: 201 })
  } catch (error) {
    console.error('[alerts] Failed to create alert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locationId: true },
    })
    if (!user?.locationId) {
      return NextResponse.json({ data: [] })
    }

    const alerts = await listActiveAlerts(user.locationId)
    return NextResponse.json({ data: alerts })
  } catch (error) {
    console.error('[alerts] Failed to list alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
