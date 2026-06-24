import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildMachineCsv } from '@/lib/admin'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const csv = await buildMachineCsv()
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="machines-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('[admin/data/export] Failed to export machines:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
