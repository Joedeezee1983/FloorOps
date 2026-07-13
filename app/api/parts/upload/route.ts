import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const MAX_FILE_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File must be JPG, PNG, or WEBP' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const dir = join(process.cwd(), 'public', 'parts')
    await mkdir(dir, { recursive: true })

    const filename = `${randomUUID()}.${ext}`
    await writeFile(join(dir, filename), Buffer.from(bytes))

    return NextResponse.json({ data: { imageUrl: `/parts/${filename}` } })
  } catch (error) {
    console.error('[parts/upload] Failed to upload part image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
