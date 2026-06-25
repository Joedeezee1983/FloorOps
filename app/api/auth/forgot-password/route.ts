import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'

const SUCCESS_RESPONSE = NextResponse.json({
  data: { message: 'If that email exists, a reset link has been sent.' },
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Record<string, unknown>
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    })

    // Always return success to avoid revealing whether an email exists
    if (!user || !user.isActive) return SUCCESS_RESPONSE

    const token = await createToken(user.id, 'PASSWORD_RESET')
    await sendPasswordResetEmail(email, token)

    return SUCCESS_RESPONSE
  } catch (error) {
    console.error('[auth/forgot-password] Unexpected error:', error)
    // Return success even on email failure to avoid revealing account existence
    return SUCCESS_RESPONSE
  }
}
