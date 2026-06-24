import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncMachinesFromReport } from '@/lib/sync'
import { VALID_PROGRESSIVE_TYPES, SYNC_REQUIRED_COLUMNS } from '@/constants'
import type { SyncRow } from '@/lib/sync'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as { rows?: unknown }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required and must not be empty' }, { status: 400 })
    }

    const validated: SyncRow[] = []
    const validationErrors: string[] = []

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i] as Record<string, unknown>
      const rowNum = i + 2

      const missing = SYNC_REQUIRED_COLUMNS.filter((col) => !row[col] || typeof row[col] !== 'string' || !(row[col] as string).trim())
      if (missing.length > 0) {
        validationErrors.push(`Row ${rowNum}: missing required fields: ${missing.join(', ')}`)
        continue
      }

      const progressiveType = (row.progressiveType as string ?? 'NONE').toUpperCase()
      if (!VALID_PROGRESSIVE_TYPES.has(progressiveType)) {
        validationErrors.push(`Row ${rowNum}: invalid progressiveType "${row.progressiveType}"`)
        continue
      }

      const denom = parseFloat(row.denomination as string)
      if (isNaN(denom) || denom <= 0) {
        validationErrors.push(`Row ${rowNum}: denomination must be a positive number`)
        continue
      }

      validated.push({
        assetNumber: (row.assetNumber as string).trim(),
        bankNumber: (row.bankNumber as string).trim(),
        gameName: (row.gameName as string).trim(),
        gameBrand: (row.gameBrand as string).trim(),
        gameType: (row.gameType as string).trim(),
        progressiveType,
        denomination: denom,
        softwareVersion: typeof row.softwareVersion === 'string' ? row.softwareVersion.trim() || undefined : undefined,
        status: typeof row.status === 'string' ? row.status.trim() || undefined : undefined,
      })
    }

    if (validationErrors.length > 0 && validated.length === 0) {
      return NextResponse.json({ error: validationErrors[0] }, { status: 400 })
    }

    const result = await syncMachinesFromReport(validated)
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('[machines/sync] Failed to sync machines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
