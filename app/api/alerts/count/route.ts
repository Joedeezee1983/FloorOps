import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getActiveAlertCount } from '@/lib/alerts'

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ data: { count: 0 } })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locationId: true },
    })
    if (!user?.locationId) {
      return NextResponse.json({ data: { count: 0 } })
    }

    const count = await getActiveAlertCount(user.locationId)
    return NextResponse.json({ data: { count } })
  } catch (error) {
    console.error('[alerts/count] Failed to get alert count:', error)
    // Return 0 rather than 500 — badge is non-critical
    return NextResponse.json({ data: { count: 0 } })
  }
}
