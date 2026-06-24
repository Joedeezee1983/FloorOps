import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDataStats } from '@/lib/admin'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stats = await getDataStats()
    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('[admin/data/stats] Failed to get stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
