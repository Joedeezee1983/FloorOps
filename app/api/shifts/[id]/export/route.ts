import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getShiftDetail } from '@/lib/shifts'
import { generateShiftPdf } from '@/lib/shift-pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await getShiftDetail(params.id)
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const pdfBytes = await generateShiftPdf(shift)
    // Cast required: TypeScript 5.x made Uint8Array generic; BodyInit still references non-generic form
    const pdfBuffer = pdfBytes.buffer as ArrayBuffer

    const start = new Date(shift.startTime)
    const dateStr = start.toISOString().split('T')[0]
    const filename = `shift-report-${shift.type.toLowerCase()}-${dateStr}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBytes.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('[shifts/id/export] Failed to generate PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
