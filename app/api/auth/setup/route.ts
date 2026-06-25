import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/utils/password'
import { validateAndConsumeToken } from '@/lib/tokens'

const MIN_PASSWORD_LENGTH = 8

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Record<string, unknown>

    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 })
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    const { userId } = await validateAndConsumeToken(token, 'INVITE')

    const hashed = await hashPassword(password)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, emailVerified: true, isActive: true },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && (error.message === 'Invalid token' || error.message.includes('already been used') || error.message.includes('expired'))) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[auth/setup] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
