import { prisma } from '@/lib/db'
import { VALID_PROGRESSIVE_TYPES, VALID_MACHINE_STATUSES } from '@/constants'
import type { ProgressiveType, MachineStatus } from '@prisma/client'
import type { SyncImportResult, SyncRowResult } from '@/types'

export interface SyncRow {
  assetNumber: string
  bankNumber: string
  gameName: string
  gameBrand: string
  gameType: string
  progressiveType: string
  denomination: string
  softwareVersion?: string
  status?: string
}

/**
 * Upserts machines from an active games report export.
 * Matches by assetNumber: updates existing records, creates new ones.
 * Returns a per-row summary of created / updated / failed counts.
 */
export async function syncMachinesFromReport(rows: SyncRow[]): Promise<SyncImportResult> {
  const errors: SyncRowResult[] = []
  let created = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-indexed + header row

    const progressiveType = row.progressiveType.toUpperCase()
    if (!VALID_PROGRESSIVE_TYPES.has(progressiveType)) {
      failed++
      errors.push({ row: rowNum, assetNumber: row.assetNumber, action: 'failed', error: `Invalid progressiveType: "${row.progressiveType}"` })
      continue
    }

    const rawStatus = row.status?.toUpperCase()
    const status = rawStatus && VALID_MACHINE_STATUSES.has(rawStatus)
      ? (rawStatus as MachineStatus)
      : undefined

    try {
      const existing = await prisma.machine.findUnique({
        where: { assetNumber: row.assetNumber },
        select: { id: true, status: true },
      })

      if (existing) {
        const statusChanged = status !== undefined && status !== existing.status

        await prisma.$transaction(async (tx) => {
          await tx.machine.update({
            where: { assetNumber: row.assetNumber },
            data: {
              bankNumber: row.bankNumber,
              gameName: row.gameName,
              gameBrand: row.gameBrand,
              gameType: row.gameType,
              progressiveType: progressiveType as ProgressiveType,
              denomination: row.denomination,
              softwareVersion: row.softwareVersion || null,
              ...(status !== undefined && { status }),
            },
          })

          if (statusChanged) {
            await tx.machineStatusLog.create({
              data: {
                machineId: existing.id,
                status: status!,
                note: 'Status updated via active games sync',
              },
            })
          }
        })

        updated++
      } else {
        const initialStatus = (status as MachineStatus | undefined) ?? 'ONLINE'
        await prisma.machine.create({
          data: {
            assetNumber: row.assetNumber,
            bankNumber: row.bankNumber,
            gameName: row.gameName,
            gameBrand: row.gameBrand,
            gameType: row.gameType,
            progressiveType: progressiveType as ProgressiveType,
            denomination: row.denomination,
            softwareVersion: row.softwareVersion || null,
            status: initialStatus,
            statusLogs: { create: { status: initialStatus, note: 'Created via active games sync' } },
          },
        })
        created++
      }
    } catch (err) {
      failed++
      errors.push({
        row: rowNum,
        assetNumber: row.assetNumber,
        action: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return { created, updated, failed, errors }
}
