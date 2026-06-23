import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveLocations } from '@/lib/locations'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locations = await getActiveLocations()
    return NextResponse.json({ data: locations })
  } catch (error) {
    console.error('[locations] Failed to fetch locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
