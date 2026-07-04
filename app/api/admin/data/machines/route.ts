import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { deleteAllMachinesForLocation } from '@/lib/admin'

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

    const deleted = await deleteAllMachinesForLocation(user.locationId)
    return NextResponse.json({ data: { deleted } })
  } catch (error) {
    console.error('[admin/data/machines] Failed to delete machines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
