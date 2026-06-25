import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createToken } from '@/lib/tokens'
import { sendInviteEmail } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, emailVerified: true, isActive: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.emailVerified || user.isActive) {
      return NextResponse.json({ error: 'User has already completed setup' }, { status: 400 })
    }

    // Invalidate any existing unused invite tokens before issuing a fresh one
    await prisma.userToken.updateMany({
      where: { userId: params.id, type: 'INVITE', usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = await createToken(params.id, 'INVITE')
    await sendInviteEmail(user.email, token)

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('[admin/users/id/resend-invite] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to resend invite. Please try again.' }, { status: 500 })
  }
}
