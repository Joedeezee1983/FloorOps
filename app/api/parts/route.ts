import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPartRequest, listPartRequests, getInventoryEmail } from '@/lib/parts'
import { sendPartRequestEmail } from '@/lib/email'
import type { PartUrgency } from '@prisma/client'

const VALID_URGENCIES = new Set<PartUrgency>(['NORMAL', 'URGENT'])

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as Record<string, unknown>

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Part name is required' }, { status: 400 })
    }
    if (!body.quantity || typeof body.quantity !== 'number' || body.quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }
    const urgency: PartUrgency = VALID_URGENCIES.has(body.urgency as PartUrgency)
      ? (body.urgency as PartUrgency)
      : 'NORMAL'

    const partRequest = await createPartRequest({
      name: body.name.trim(),
      description: typeof body.description === 'string' ? body.description.trim() || undefined : undefined,
      quantity: body.quantity,
      urgency,
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : undefined,
      partNumber: typeof body.partNumber === 'string' ? body.partNumber.trim() || undefined : undefined,
      machineId: typeof body.machineId === 'string' ? body.machineId : undefined,
      shiftId: typeof body.shiftId === 'string' ? body.shiftId : undefined,
      requestedById: session.user.id,
    })

    // Send notification email to inventory tech if configured
    const locationId = typeof body.locationId === 'string' ? body.locationId : undefined
    const inventoryEmail = await getInventoryEmail(locationId)
    if (inventoryEmail) {
      await sendPartRequestEmail(inventoryEmail, {
        partName: partRequest.name,
        quantity: partRequest.quantity,
        urgency: partRequest.urgency,
        description: partRequest.description,
        imageUrl: partRequest.imageUrl,
        partNumber: partRequest.partNumber,
        machineInfo: partRequest.machine
          ? `#${partRequest.machine.assetNumber} — ${partRequest.machine.gameName}`
          : null,
        requestedByName: partRequest.requestedByName,
        notes: partRequest.notes,
      }).catch((err: unknown) => {
        console.error('[parts] Failed to send notification email:', err)
      })
    }

    return NextResponse.json({ data: partRequest }, { status: 201 })
  } catch (error) {
    console.error('[parts] Failed to create part request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parts = await listPartRequests()
    return NextResponse.json({ data: parts })
  } catch (error) {
    console.error('[parts] Failed to list part requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
