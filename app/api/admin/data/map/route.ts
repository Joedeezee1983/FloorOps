import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { clearFloorMapForLocation } from '@/lib/admin'

export async function DELETE(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locationId: true },
    })

    if (!user?.locationId) {
      return NextResponse.json({ error: 'No location assigned to your account' }, { status: 400 })
    }

    const cleared = await clearFloorMapForLocation(user.locationId)
    return NextResponse.json({ data: { cleared } })
  } catch (error) {
    console.error('[admin/data/map] Failed to clear floor map:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
