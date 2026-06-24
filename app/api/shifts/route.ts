import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllShifts, createShift } from '@/lib/shifts'
import type { ShiftType } from '@prisma/client'

const VALID_SHIFT_TYPES = new Set<ShiftType>(['DAY', 'SWING', 'NIGHT'])

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shifts = await getAllShifts()
    return NextResponse.json({ data: shifts })
  } catch (error) {
    console.error('[shifts] Failed to fetch shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.type || !VALID_SHIFT_TYPES.has(body.type as ShiftType)) {
      return NextResponse.json({ error: 'type must be DAY, SWING, or NIGHT' }, { status: 400 })
    }
    if (!body.locationId || typeof body.locationId !== 'string') {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }
    if (!body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'startTime and endTime are required' }, { status: 400 })
    }

    const startTime = new Date(body.startTime as string)
    const endTime = new Date(body.endTime as string)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json({ error: 'startTime and endTime must be valid ISO dates' }, { status: 400 })
    }

    const staffIds = Array.isArray(body.staffIds)
      ? (body.staffIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : [session.user.id]

    const shift = await createShift({
      type: body.type as ShiftType,
      locationId: body.locationId as string,
      supervisorId: session.user.id,
      startTime,
      endTime,
      headcount: typeof body.headcount === 'number' ? body.headcount : 0,
      briefing: typeof body.briefing === 'string' ? body.briefing || undefined : undefined,
      notes: typeof body.notes === 'string' ? body.notes || undefined : undefined,
      staffIds,
    })

    return NextResponse.json({ data: shift }, { status: 201 })
  } catch (error) {
    console.error('[shifts] Failed to create shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
