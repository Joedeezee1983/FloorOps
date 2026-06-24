import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getShiftDetail } from '@/lib/shifts'

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
