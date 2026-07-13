import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateLocation, deleteLocation } from '@/lib/admin'

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

    if ('isActive' in body && typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
    }
    if ('name' in body && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
    }

    const floorNumber =
      'floorNumber' in body
        ? typeof body.floorNumber === 'number'
          ? body.floorNumber
          : body.floorNumber === null || body.floorNumber === ''
            ? null
            : typeof body.floorNumber === 'string'
              ? parseInt(body.floorNumber, 10)
              : undefined
        : undefined

    const location = await updateLocation(params.id, {
      name: 'name' in body ? (body.name as string).trim() : undefined,
      floorNumber,
      isActive: 'isActive' in body ? (body.isActive as boolean) : undefined,
    })

    return NextResponse.json({ data: location })
  } catch (error) {
    console.error('[admin/locations/id] Failed to update location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteLocation(params.id)
    return NextResponse.json({ data: null })
  } catch (error) {
    if (error instanceof Error && error.message === 'LAST_LOCATION') {
      return NextResponse.json({ error: 'Cannot delete the last remaining location.' }, { status: 409 })
    }
    console.error('[admin/locations/id] Failed to delete location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
