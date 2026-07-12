import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getMachineDetail,
  updateMachinePosition,
  clearMachinePosition,
  updateMachineStatus,
  updateMachineFields,
  deleteMachine,
} from '@/lib/machines'
import { GRID_COLS, GRID_ROWS, VALID_PROGRESSIVE_TYPES } from '@/constants'
import type { MachineStatus, ProgressiveType } from '@prisma/client'
import type { UpdateMachineFieldsInput } from '@/lib/machines'

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

    // Grid position update (from floor map drag)
    if ('gridX' in body || 'gridY' in body) {
      return handlePositionUpdate(params.id, body)
    }

    // Status update with optional note (from MachineDrawer)
    if ('status' in body && !('assetNumber' in body) && !('gameName' in body)) {
      return handleStatusUpdate(params.id, body)
    }

    // Full registry field update (from MachineForm edit mode)
    if ('assetNumber' in body || 'gameName' in body || 'gameBrand' in body) {
      return handleFieldsUpdate(params.id, body)
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

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await getMachineDetail(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    await deleteMachine(params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[machines/id] Failed to delete machine:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Update handlers ──────────────────────────────────────────────────────────

class ValidationError extends Error {}

async function handlePositionUpdate(
  id: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  // null on both axes means "remove from map" — machine returns to unplaced sidebar
  if (body.gridX === null && body.gridY === null) {
    const machine = await clearMachinePosition(id)
    return NextResponse.json({ data: machine })
  }

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

async function handleFieldsUpdate(
  id: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const input: UpdateMachineFieldsInput = {}

  if (typeof body.assetNumber === 'string' && body.assetNumber.trim()) {
    input.assetNumber = body.assetNumber.trim()
  }
  if (typeof body.bankNumber === 'string' && body.bankNumber.trim()) {
    input.bankNumber = body.bankNumber.trim()
  }
  if (typeof body.gameName === 'string' && body.gameName.trim()) {
    input.gameName = body.gameName.trim()
  }
  if (typeof body.gameBrand === 'string' && body.gameBrand.trim()) {
    input.gameBrand = body.gameBrand.trim()
  }
  if (typeof body.gameType === 'string' && body.gameType.trim()) {
    input.gameType = body.gameType.trim()
  }
  if (typeof body.progressiveType === 'string') {
    if (!VALID_PROGRESSIVE_TYPES.has(body.progressiveType)) {
      throw new ValidationError('Invalid progressiveType')
    }
    input.progressiveType = body.progressiveType as ProgressiveType
  }
  if (typeof body.denomination === 'string' && body.denomination.trim()) {
    input.denomination = body.denomination.trim()
  }
  if ('softwareVersion' in body) {
    input.softwareVersion =
      typeof body.softwareVersion === 'string' ? body.softwareVersion.trim() || null : null
  }
  if ('locationId' in body) {
    input.locationId =
      typeof body.locationId === 'string' && body.locationId ? body.locationId : null
  }
  if (typeof body.status === 'string') {
    if (!VALID_STATUSES.has(body.status as MachineStatus)) {
      throw new ValidationError('Invalid status')
    }
    input.status = body.status as MachineStatus
  }

  const machine = await updateMachineFields(id, input)
  return NextResponse.json({ data: machine })
}
