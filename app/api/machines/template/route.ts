import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE } from '@/constants'

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const csv = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}\n`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="machines-import-template.csv"',
      },
    })
  } catch (error) {
    console.error('[machines/template] Failed to generate template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
