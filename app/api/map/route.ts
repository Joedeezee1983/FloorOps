import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllMapMachines } from '@/lib/machines'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const machines = await getAllMapMachines()
    return NextResponse.json({ data: machines })
  } catch (error) {
    console.error('[map] Failed to fetch map machines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
