import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllMachinesForList, createMachine } from '@/lib/machines'
import { VALID_PROGRESSIVE_TYPES, DENOMINATIONS, GAME_BRANDS, GAME_TYPES } from '@/constants'
import type { CreateMachineInput } from '@/lib/machines'
import type { MachineStatus, ProgressiveType } from '@prisma/client'

const VALID_STATUSES = new Set<MachineStatus>(['ONLINE', 'OFFLINE', 'WARNING', 'MAINTENANCE'])
const VALID_DENOMS = new Set(DENOMINATIONS.map(String))

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? undefined
    const statusParam = searchParams.get('status')
    const gameBrand = searchParams.get('brand') ?? undefined
    const progressiveParam = searchParams.get('progressive')
    const denomParam = searchParams.get('denom')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10)

    const status =
      statusParam && VALID_STATUSES.has(statusParam as MachineStatus)
        ? (statusParam as MachineStatus)
        : undefined

    const progressiveType =
      progressiveParam && VALID_PROGRESSIVE_TYPES.has(progressiveParam)
        ? (progressiveParam as ProgressiveType)
        : undefined

    const denomination =
      denomParam && VALID_DENOMS.has(denomParam) ? denomParam : undefined

    const result = await getAllMachinesForList({
      search,
      status,
      gameBrand,
      progressiveType,
      denomination,
      page: isNaN(page) ? 1 : page,
      pageSize: isNaN(pageSize) ? 50 : Math.min(pageSize, 200),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[machines] Failed to fetch machines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = validateCreateInput(body)

    const machine = await createMachine(validated)
    return NextResponse.json({ data: machine }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[machines] Failed to create machine:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

class ValidationError extends Error {}

function validateCreateInput(body: unknown): CreateMachineInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Invalid request body')
  const b = body as Record<string, unknown>

  if (!b.assetNumber || typeof b.assetNumber !== 'string' || b.assetNumber.trim() === '') {
    throw new ValidationError('assetNumber is required')
  }
  if (!b.bankNumber || typeof b.bankNumber !== 'string' || b.bankNumber.trim() === '') {
    throw new ValidationError('bankNumber is required')
  }
  if (!b.gameName || typeof b.gameName !== 'string' || b.gameName.trim() === '') {
    throw new ValidationError('gameName is required')
  }
  if (!b.gameBrand || typeof b.gameBrand !== 'string' || b.gameBrand.trim() === '') {
    throw new ValidationError('gameBrand is required')
  }
  if (!b.gameType || typeof b.gameType !== 'string' || b.gameType.trim() === '') {
    throw new ValidationError('gameType is required')
  }
  if (!b.progressiveType || !VALID_PROGRESSIVE_TYPES.has(b.progressiveType as string)) {
    throw new ValidationError('progressiveType must be NONE, STANDALONE, LINKED, or WIDE_AREA')
  }
  if (!b.denomination || typeof b.denomination !== 'string' || b.denomination.trim() === '') {
    throw new ValidationError('denomination is required')
  }

  const statusParam = b.status as string | undefined
  if (statusParam !== undefined && !VALID_STATUSES.has(statusParam as MachineStatus)) {
    throw new ValidationError('Invalid status value')
  }

  return {
    assetNumber: (b.assetNumber as string).trim(),
    bankNumber: (b.bankNumber as string).trim(),
    gameName: (b.gameName as string).trim(),
    gameBrand: (b.gameBrand as string).trim(),
    gameType: (b.gameType as string).trim(),
    progressiveType: b.progressiveType as ProgressiveType,
    denomination: (b.denomination as string).trim(),
    softwareVersion:
      typeof b.softwareVersion === 'string' ? b.softwareVersion.trim() || undefined : undefined,
    locationId: typeof b.locationId === 'string' ? b.locationId || undefined : undefined,
    status: statusParam as MachineStatus | undefined,
  }
}
