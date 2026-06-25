import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { isActive: true, emailVerified: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only permit deletion of users who have never completed setup
    if (user.isActive || user.emailVerified) {
      return NextResponse.json({ error: 'Only pending invite users can be cancelled' }, { status: 400 })
    }

    // Tokens cascade-delete via onDelete: Cascade on UserToken
    await prisma.user.delete({ where: { id: params.id } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('[admin/users/id/cancel-invite] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
