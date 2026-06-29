import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updatePartRequest } from '@/lib/parts'
import type { PartStatus } from '@prisma/client'

const VALID_STATUSES = new Set<PartStatus>(['PENDING', 'ORDERED', 'RECEIVED'])

interface RouteParams {
  params: { id: string }
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    const status = typeof body.status === 'string' && VALID_STATUSES.has(body.status as PartStatus)
      ? (body.status as PartStatus)
      : undefined
    const notes = typeof body.notes === 'string' ? body.notes : undefined

    if (!status && notes === undefined) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const partRequest = await updatePartRequest(params.id, { status, notes })
    return NextResponse.json({ data: partRequest })
  } catch (error) {
    console.error('[parts/id] Failed to update part request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
