import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { MachineSearchResult } from '@/types'

const MAX_RESULTS = 10

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() ?? ''

    if (!q) {
      return NextResponse.json({ data: [] })
    }

    const rows = await prisma.machine.findMany({
      where: {
        OR: [
          { assetNumber: { contains: q, mode: 'insensitive' } },
          { gameName: { contains: q, mode: 'insensitive' } },
          { bankNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        assetNumber: true,
        bankNumber: true,
        gameName: true,
        status: true,
      },
      orderBy: { assetNumber: 'asc' },
      take: MAX_RESULTS,
    })

    const data: MachineSearchResult[] = rows
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[machines/search] Failed to search machines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
