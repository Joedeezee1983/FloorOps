import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateAlertStatus } from '@/lib/alerts'
import type { AlertStatus } from '@prisma/client'

const VALID_STATUSES = new Set<AlertStatus>(['ACKNOWLEDGED', 'RESOLVED'])

interface RouteParams {
  params: { id: string }
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>
    const status =
      typeof body.status === 'string' && VALID_STATUSES.has(body.status as AlertStatus)
        ? (body.status as AlertStatus)
        : undefined

    if (!status) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const acknowledgedById = status === 'ACKNOWLEDGED' ? session.user.id : undefined
    const alert = await updateAlertStatus(params.id, { status, acknowledgedById })
    return NextResponse.json({ data: alert })
  } catch (error) {
    console.error('[alerts/id] Failed to update alert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
