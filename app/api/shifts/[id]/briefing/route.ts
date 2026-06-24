import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getShiftDetail, storeShiftBriefing } from '@/lib/shifts'
import { generateShiftBriefing } from '@/lib/briefing'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const shift = await getShiftDetail(params.id)
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const content = await generateShiftBriefing({
      shiftType: shift.type,
      locationName: shift.locationName ?? 'Unknown Location',
      startTime: shift.startTime,
      endTime: shift.endTime,
      staff: shift.staff,
      tasks: shift.tasks.map((t) => ({
        section: t.section,
        type: t.type,
        status: t.status,
        description: t.description,
        machine: t.machine
          ? { assetNumber: t.machine.assetNumber, gameName: t.machine.gameName }
          : null,
        loggedByName: t.loggedByName,
      })),
    })

    await storeShiftBriefing(params.id, content)

    return NextResponse.json({ data: { content } }, { status: 201 })
  } catch (error) {
    console.error('[shifts/id/briefing] Failed to generate briefing:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
