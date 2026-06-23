import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getMachineDetail,
  updateMachinePosition,
  updateMachineStatus,
} from '@/lib/machines'
import { GRID_COLS, GRID_ROWS } from '@/constants'
import type { MachineStatus } from '@prisma/client'

const VALID_STATUSES = new Set<MachineStatus>(['ONLINE', 'OFFLINE', 'WARNING', 'MAINTENANCE'])

interface RouteParams {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const machine = await getMachineDetail(params.id)
    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    return NextResponse.json({ data: machine })
  } catch (error) {
    console.error('[machines/id] Failed to fetch machine:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    if ('gridX' in body || 'gridY' in body) {
      return handlePositionUpdate(params.id, body)
    }

    if ('status' in body) {
      return handleStatusUpdate(params.id, body)
    }

    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[machines/id] Failed to update machine:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

class ValidationError extends Error {}

async function handlePositionUpdate(
  id: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const gridX = Number(body.gridX)
  const gridY = Number(body.gridY)

  if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) {
    throw new ValidationError('gridX and gridY must be integers')
  }
  if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
    throw new ValidationError(`Position out of bounds (grid is ${GRID_COLS}x${GRID_ROWS})`)
  }

  const machine = await updateMachinePosition(id, { gridX, gridY })
  return NextResponse.json({ data: machine })
}

async function handleStatusUpdate(
  id: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const status = body.status as string
  if (!VALID_STATUSES.has(status as MachineStatus)) {
    throw new ValidationError(`Invalid status: ${status}`)
  }

  const note = typeof body.note === 'string' ? body.note.trim() || undefined : undefined
  const machine = await updateMachineStatus(id, status as MachineStatus, note)
  return NextResponse.json({ data: machine })
}
