import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { authOptions } from '@/lib/auth'
import { getFirstBlueprint, upsertBlueprint, updateBlueprintOpacity } from '@/lib/blueprints'

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'])
const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')

    if (locationId) {
      const { getBlueprintForLocation } = await import('@/lib/blueprints')
      const blueprint = await getBlueprintForLocation(locationId)
      return NextResponse.json({ data: blueprint })
    }

    const blueprint = await getFirstBlueprint()
    return NextResponse.json({ data: blueprint })
  } catch (error) {
    console.error('[floor/blueprint] Failed to fetch blueprint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const locationId = (formData.get('locationId') as string | null)?.trim()
    const opacityStr = formData.get('opacity') as string | null

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File must be PNG, JPG, or PDF' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File must be under 20 MB' }, { status: 400 })
    }

    const ext = file.type === 'application/pdf' ? 'pdf'
      : file.type === 'image/png' ? 'png'
      : 'jpg'

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'blueprints')
    await mkdir(uploadsDir, { recursive: true })

    const filename = `${locationId}.${ext}`
    await writeFile(join(uploadsDir, filename), Buffer.from(bytes))

    const imageUrl = `/uploads/blueprints/${filename}`
    const opacity = opacityStr ? Math.min(1, Math.max(0, parseFloat(opacityStr))) : 0.3

    const blueprint = await upsertBlueprint(locationId, imageUrl, opacity)
    return NextResponse.json({ data: blueprint }, { status: 200 })
  } catch (error) {
    console.error('[floor/blueprint] Failed to upload blueprint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as { locationId?: unknown; opacity?: unknown }

    if (!body.locationId || typeof body.locationId !== 'string') {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }
    if (typeof body.opacity !== 'number' || body.opacity < 0 || body.opacity > 1) {
      return NextResponse.json({ error: 'opacity must be a number between 0 and 1' }, { status: 400 })
    }

    const blueprint = await updateBlueprintOpacity(body.locationId, body.opacity)
    if (!blueprint) {
      return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 })
    }

    return NextResponse.json({ data: blueprint })
  } catch (error) {
    console.error('[floor/blueprint] Failed to update opacity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
