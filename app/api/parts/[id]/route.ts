import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updatePartRequest } from '@/lib/parts'
import { prisma } from '@/lib/db'
import type { PartStatus } from '@prisma/client'

const VALID_STATUSES = new Set<PartStatus>(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'])

interface RouteParams {
  params: { id: string }
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { role, id: userId } = session.user
    const isPrivileged = role === 'ADMIN' || role === 'SUPERVISOR'

    const body = await req.json() as Record<string, unknown>
    const status = typeof body.status === 'string' && VALID_STATUSES.has(body.status as PartStatus)
      ? (body.status as PartStatus)
      : undefined
    const notes = typeof body.notes === 'string' ? body.notes : undefined

    if (!isPrivileged) {
      // Original requester may only cancel their own PENDING request
      if (status !== 'CANCELLED') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const existing = await prisma.partRequest.findUnique({
        where: { id: params.id },
        select: { requestedById: true, status: true },
      })
      if (!existing || existing.requestedById !== userId || existing.status !== 'PENDING') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

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
