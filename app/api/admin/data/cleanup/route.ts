import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteShiftsOlderThan } from '@/lib/admin'

const VALID_DAYS = new Set([30, 60, 90, 180])

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.days || typeof body.days !== 'number' || !VALID_DAYS.has(body.days)) {
      return NextResponse.json(
        { error: 'days must be one of: 30, 60, 90, 180' },
        { status: 400 }
      )
    }

    const deleted = await deleteShiftsOlderThan(body.days)
    return NextResponse.json({ data: { deleted } })
  } catch (error) {
    console.error('[admin/data/cleanup] Failed to clean up shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
