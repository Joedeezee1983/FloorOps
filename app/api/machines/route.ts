import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllMapMachines, createMachine } from '@/lib/machines'
import type { CreateMachineInput } from '@/lib/machines'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const machines = await getAllMapMachines()
    return NextResponse.json({ data: machines })
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

class ValidationError extends Error {}

function validateCreateInput(body: unknown): CreateMachineInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Invalid request body')
  const b = body as Record<string, unknown>

  if (!b.name || typeof b.name !== 'string' || b.name.trim() === '') {
    throw new ValidationError('name is required')
  }
  if (!b.locationId || typeof b.locationId !== 'string') {
    throw new ValidationError('locationId is required')
  }

  return {
    name: b.name.trim(),
    locationId: b.locationId,
    machineNumber: typeof b.machineNumber === 'number' ? b.machineNumber : undefined,
    serialNumber: typeof b.serialNumber === 'string' ? b.serialNumber.trim() || undefined : undefined,
    model: typeof b.model === 'string' ? b.model.trim() || undefined : undefined,
    manufacturer: typeof b.manufacturer === 'string' ? b.manufacturer.trim() || undefined : undefined,
    notes: typeof b.notes === 'string' ? b.notes.trim() || undefined : undefined,
  }
}
