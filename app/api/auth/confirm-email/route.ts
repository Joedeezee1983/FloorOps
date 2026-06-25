import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateAndConsumeToken } from '@/lib/tokens'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Record<string, unknown>
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const { userId, payload: newEmail } = await validateAndConsumeToken(token, 'EMAIL_CONFIRM')

    if (!newEmail) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Verify the new email is still available before committing the change
    const conflict = await prisma.user.findFirst({
      where: { email: newEmail, NOT: { id: userId } },
      select: { id: true },
    })
    if (conflict) {
      return NextResponse.json({ error: 'This email address is already in use' }, { status: 409 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Invalid token' || error.message.includes('already been used') || error.message.includes('expired'))) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[auth/confirm-email] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
