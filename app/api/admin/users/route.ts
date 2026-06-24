import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUsers, createUser } from '@/lib/admin'
import type { UserRole } from '@prisma/client'

const VALID_ROLES = new Set<UserRole>(['TECH', 'SUPERVISOR', 'ADMIN'])

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await listUsers()
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('[admin/users] Failed to list users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    if (!body.password || typeof body.password !== 'string' || body.password.length < 8) {
      return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 })
    }
    if (!body.role || !VALID_ROLES.has(body.role as UserRole)) {
      return NextResponse.json({ error: 'role must be TECH, SUPERVISOR, or ADMIN' }, { status: 400 })
    }

    const user = await createUser({
      name: (body.name as string).trim(),
      email: (body.email as string).trim().toLowerCase(),
      password: body.password as string,
      role: body.role as UserRole,
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 })
    }
    console.error('[admin/users] Failed to create user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
