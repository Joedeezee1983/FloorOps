import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateUser } from '@/lib/admin'
import type { UserRole } from '@prisma/client'

const VALID_ROLES = new Set<UserRole>(['TECH', 'SUPERVISOR', 'ADMIN'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    // Guard: admin cannot modify their own account via this endpoint
    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
    }

    if ('role' in body && !VALID_ROLES.has(body.role as UserRole)) {
      return NextResponse.json({ error: 'role must be TECH, SUPERVISOR, or ADMIN' }, { status: 400 })
    }
    if ('isActive' in body && typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
    }

    const user = await updateUser(params.id, {
      role: 'role' in body ? (body.role as UserRole) : undefined,
      isActive: 'isActive' in body ? (body.isActive as boolean) : undefined,
    })

    return NextResponse.json({ data: user })
  } catch (error) {
    console.error('[admin/users/id] Failed to update user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
