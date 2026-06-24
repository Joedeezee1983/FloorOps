import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSettingsForLocation, upsertSettings } from '@/lib/admin'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const locationId = req.nextUrl.searchParams.get('locationId')
    if (!locationId) {
      return NextResponse.json({ error: 'locationId query param is required' }, { status: 400 })
    }

    const settings = await getSettingsForLocation(locationId)
    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('[admin/settings] Failed to get settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.locationId || typeof body.locationId !== 'string') {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    const settings = await upsertSettings(body.locationId as string, {
      dayShiftStart: typeof body.dayShiftStart === 'string' ? body.dayShiftStart : undefined,
      dayShiftEnd: typeof body.dayShiftEnd === 'string' ? body.dayShiftEnd : undefined,
      swingShiftStart: typeof body.swingShiftStart === 'string' ? body.swingShiftStart : undefined,
      swingShiftEnd: typeof body.swingShiftEnd === 'string' ? body.swingShiftEnd : undefined,
      nightShiftStart: typeof body.nightShiftStart === 'string' ? body.nightShiftStart : undefined,
      nightShiftEnd: typeof body.nightShiftEnd === 'string' ? body.nightShiftEnd : undefined,
      shiftTimeoutHours:
        typeof body.shiftTimeoutHours === 'number' ? body.shiftTimeoutHours : undefined,
    })

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('[admin/settings] Failed to update settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
