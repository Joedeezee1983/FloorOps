import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { placeBankMachines, BankPlacementError } from '@/lib/machines'
import { GRID_COLS, GRID_ROWS } from '@/constants'

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.bankNumber || typeof body.bankNumber !== 'string' || !body.bankNumber.trim()) {
      return NextResponse.json({ error: 'bankNumber is required' }, { status: 400 })
    }

    const gridX = Number(body.gridX)
    const gridY = Number(body.gridY)

    if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) {
      return NextResponse.json({ error: 'gridX and gridY must be integers' }, { status: 400 })
    }
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return NextResponse.json(
        { error: `Position out of bounds (grid is ${GRID_COLS}×${GRID_ROWS})` },
        { status: 400 }
      )
    }

    const count = await placeBankMachines({
      bankNumber: body.bankNumber.trim(),
      gridX,
      gridY,
    })

    if (count === 0) {
      return NextResponse.json({ error: 'No machines found for that bank number' }, { status: 404 })
    }

    return NextResponse.json({ data: { count } })
  } catch (error) {
    if (error instanceof BankPlacementError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[machines/bank] Failed to place bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
