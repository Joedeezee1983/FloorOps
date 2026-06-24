import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createShiftTask } from '@/lib/shifts'
import type { TaskType } from '@prisma/client'

const VALID_TASK_TYPES = new Set<TaskType>(['DOWN_MACHINE', 'GENERAL', 'MAINTENANCE_REQUEST'])

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.shiftId || typeof body.shiftId !== 'string') {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }
    if (!body.type || !VALID_TASK_TYPES.has(body.type as TaskType)) {
      return NextResponse.json({ error: 'type must be DOWN_MACHINE, GENERAL, or MAINTENANCE_REQUEST' }, { status: 400 })
    }
    if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    const techName = session.user.name ?? session.user.email ?? undefined
    const task = await createShiftTask({
      shiftId: body.shiftId as string,
      type: body.type as TaskType,
      description: (body.description as string).trim(),
      machineId: typeof body.machineId === 'string' ? body.machineId || undefined : undefined,
      loggedByName: techName,
    })

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (error) {
    console.error('[shifts/tasks] Failed to create task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
