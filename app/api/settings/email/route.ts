import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { comparePasswords } from '@/utils/password'
import { createToken } from '@/lib/tokens'
import { sendEmailConfirmEmail } from '@/lib/email'

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as Record<string, unknown>
    const newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : ''
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''

    if (!newEmail) {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 })
    }
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, email: true },
    })
    if (!user?.password) {
      return NextResponse.json({ error: 'Unable to verify identity' }, { status: 400 })
    }

    const isValid = await comparePasswords(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    if (newEmail === user.email) {
      return NextResponse.json({ error: 'New email must be different from your current email' }, { status: 400 })
    }

    const conflict = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    })
    if (conflict) {
      return NextResponse.json({ error: 'This email address is already in use' }, { status: 409 })
    }

    // Token payload stores the new email so the confirmation link is self-contained
    const token = await createToken(session.user.id, 'EMAIL_CONFIRM', newEmail)
    await sendEmailConfirmEmail(newEmail, token)

    return NextResponse.json({ data: { message: 'Confirmation email sent to your new address.' } })
  } catch (error) {
    console.error('[settings/email] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
