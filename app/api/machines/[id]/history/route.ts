import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMachineHistory } from '@/lib/machines'

interface RouteParams {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const history = await getMachineHistory(params.id)
    if (!history) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    return NextResponse.json({ data: history })
  } catch (error) {
    console.error('[machines/id/history] Failed to fetch machine history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
