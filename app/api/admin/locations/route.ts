import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listAdminLocations, createLocation } from '@/lib/admin'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const locations = await listAdminLocations()
    return NextResponse.json({ data: locations })
  } catch (error) {
    console.error('[admin/locations] Failed to list locations:', error)
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

    const floorNumber =
      typeof body.floorNumber === 'number'
        ? body.floorNumber
        : typeof body.floorNumber === 'string' && body.floorNumber !== ''
          ? parseInt(body.floorNumber, 10)
          : null

    const location = await createLocation({
      name: (body.name as string).trim(),
      floorNumber: floorNumber ?? undefined,
    })

    return NextResponse.json({ data: location }, { status: 201 })
  } catch (error) {
    console.error('[admin/locations] Failed to create location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
