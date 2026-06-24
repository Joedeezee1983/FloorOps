import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateShiftTaskStatus } from '@/lib/shifts'
import type { TaskStatus } from '@prisma/client'

const VALID_TASK_STATUSES = new Set<TaskStatus>(['PENDING', 'IN_PROGRESS', 'RESOLVED'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.status || !VALID_TASK_STATUSES.has(body.status as TaskStatus)) {
      return NextResponse.json({ error: 'status must be PENDING, IN_PROGRESS, or RESOLVED' }, { status: 400 })
    }

    const techName = session.user.name ?? session.user.email ?? undefined
    const task = await updateShiftTaskStatus(params.id, {
      status: body.status as TaskStatus,
      loggedByName: techName,
    })

    return NextResponse.json({ data: task })
  } catch (error) {
    if (error instanceof Error && error.message === 'Shift task not found') {
      return NextResponse.json({ error: 'Shift task not found' }, { status: 404 })
    }
    console.error('[shifts/tasks/id] Failed to update task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
