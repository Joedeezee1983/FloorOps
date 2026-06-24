import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getShiftDetail, endShift } from '@/lib/shifts'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await getShiftDetail(params.id)
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json({ data: shift })
  } catch (error) {
    console.error('[shifts/id] Failed to fetch shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    if (body.action !== 'end') {
      return NextResponse.json({ error: 'action must be "end"' }, { status: 400 })
    }

    const existing = await getShiftDetail(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    if (existing.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Only ACTIVE shifts can be ended' }, { status: 409 })
    }

    const shift = await endShift(params.id)
    return NextResponse.json({ data: shift })
  } catch (error) {
    console.error('[shifts/id] Failed to end shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
