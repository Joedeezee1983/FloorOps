import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { bulkImportMachines } from '@/lib/machines'
import { VALID_PROGRESSIVE_TYPES, GAME_BRANDS, GAME_TYPES } from '@/constants'
import type { BulkImportRow } from '@/lib/machines'
import type { ProgressiveType } from '@prisma/client'

const VALID_BRANDS = new Set(GAME_BRANDS)
const VALID_TYPES = new Set(GAME_TYPES)

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as { rows?: unknown }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: 'rows array is required and must not be empty' }, { status: 400 })
    }
    if (body.rows.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 rows per import' }, { status: 400 })
    }

    const { valid, errors } = validateRows(body.rows)

    if (valid.length === 0) {
      return NextResponse.json({ error: 'No valid rows to import', errors }, { status: 400 })
    }

    const result = await bulkImportMachines(valid)

    // Merge client-side validation errors with DB-level errors
    const allErrors = [
      ...errors,
      ...result.errors,
    ]

    return NextResponse.json({
      data: {
        imported: result.imported,
        skipped: result.skipped + errors.length,
        errors: allErrors,
      },
    })
  } catch (error) {
    console.error('[machines/import] Failed to import machines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function validateRows(
  rows: unknown[]
): { valid: BulkImportRow[]; errors: Array<{ row: number; assetNumber: string; success: false; error: string }> } {
  const valid: BulkImportRow[] = []
  const errors: Array<{ row: number; assetNumber: string; success: false; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>
    const rowNum = i + 2 // +2: 1-indexed + header
    const assetNumber = String(row.assetNumber ?? '').trim()

    const validationError = getRowError(row)
    if (validationError) {
      errors.push({ row: rowNum, assetNumber, success: false, error: validationError })
      continue
    }

    valid.push({
      assetNumber,
      bankNumber: String(row.bankNumber).trim(),
      gameName: String(row.gameName).trim(),
      gameBrand: String(row.gameBrand).trim(),
      gameType: String(row.gameType).trim(),
      progressiveType: String(row.progressiveType).trim() as ProgressiveType,
      denomination: parseFloat(String(row.denomination)),
      softwareVersion: row.softwareVersion ? String(row.softwareVersion).trim() : undefined,
      locationId: row.locationId ? String(row.locationId).trim() : undefined,
    })
  }

  return { valid, errors }
}

function getRowError(row: Record<string, unknown>): string | null {
  if (!row.assetNumber || String(row.assetNumber).trim() === '') return 'assetNumber is required'
  if (!row.bankNumber || String(row.bankNumber).trim() === '') return 'bankNumber is required'
  if (!row.gameName || String(row.gameName).trim() === '') return 'gameName is required'
  if (!row.gameBrand || String(row.gameBrand).trim() === '') return 'gameBrand is required'
  if (!row.gameType || String(row.gameType).trim() === '') return 'gameType is required'

  if (!row.progressiveType || !VALID_PROGRESSIVE_TYPES.has(String(row.progressiveType).trim())) {
    return 'progressiveType must be NONE, STANDALONE, LINKED, or WIDE_AREA'
  }

  const denom = parseFloat(String(row.denomination))
  if (isNaN(denom) || denom <= 0) return 'denomination must be a positive number'

  return null
}
