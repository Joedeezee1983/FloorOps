import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { ShiftDetail, ShiftTaskDetail } from '@/types'

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const SECTION_LABELS: Record<string, string> = {
  PRE_EXISTING_DOWN: 'PRE-EXISTING DOWN',
  FLOOR_GAMES: 'FLOOR GAMES',
  KIOSKS: 'KIOSKS',
  BENCH_OFFICE: 'BENCH / OFFICE',
  MISCELLANEOUS: 'MISCELLANEOUS',
}

const SECTION_ORDER = [
  'PRE_EXISTING_DOWN',
  'FLOOR_GAMES',
  'KIOSKS',
  'BENCH_OFFICE',
  'MISCELLANEOUS',
] as const

// ─── Text helpers ─────────────────────────────────────────────────────────────

/** Strips non-ASCII characters to satisfy WinAnsi encoding constraints. */
function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E\n]/g, '')
}

/**
 * Removes markdown formatting characters so AI-generated text renders as
 * plain prose in the PDF. Handles headings, bold, italic, and underline syntax.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')   // ## Heading
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/__(.+?)__/g, '$1')     // __bold__
    .replace(/\*(.+?)\*/g, '$1')     // *italic*
    .replace(/_(.+?)_/g, '$1')       // _italic_
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(sanitize(candidate), fontSize) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }

  if (current) lines.push(current)
  return lines
}

// ─── Page context ─────────────────────────────────────────────────────────────

interface PageContext {
  page: ReturnType<PDFDocument['addPage']>
  doc: PDFDocument
  regular: Awaited<ReturnType<PDFDocument['embedFont']>>
  bold: Awaited<ReturnType<PDFDocument['embedFont']>>
  y: number
}

function addPage(ctx: PageContext): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  ctx.y = PAGE_HEIGHT - MARGIN
}

function ensureSpace(ctx: PageContext, pts: number): void {
  if (ctx.y - pts < MARGIN + 20) addPage(ctx)
}

function writeLine(
  ctx: PageContext,
  text: string,
  opts: { size?: number; bold?: boolean; x?: number; color?: [number, number, number] } = {}
): void {
  const { size = 10, bold = false, x = MARGIN, color = [0, 0, 0] } = opts
  ensureSpace(ctx, size + 4)
  ctx.page.drawText(sanitize(text), {
    x,
    y: ctx.y,
    size,
    font: bold ? ctx.bold : ctx.regular,
    color: rgb(color[0], color[1], color[2]),
  })
  ctx.y -= size + 4
}

function writeWrapped(
  ctx: PageContext,
  text: string,
  opts: { size?: number; bold?: boolean; x?: number; maxWidth?: number } = {}
): void {
  const { size = 10, bold = false, x = MARGIN, maxWidth = CONTENT_WIDTH } = opts
  const font = bold ? ctx.bold : ctx.regular
  const lines = wrapText(sanitize(text), maxWidth, size, font)
  for (const line of lines) {
    ensureSpace(ctx, size + 4)
    ctx.page.drawText(line, { x, y: ctx.y, size, font, color: rgb(0, 0, 0) })
    ctx.y -= size + 4
  }
}

function drawHRule(ctx: PageContext, thickness = 0.5): void {
  ensureSpace(ctx, 10)
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness,
    color: rgb(0.6, 0.6, 0.6),
  })
  ctx.y -= 8
}

function skip(ctx: PageContext, pts = 10): void {
  ctx.y -= pts
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderHeader(ctx: PageContext, shift: ShiftDetail): void {
  writeLine(ctx, 'RIVER ROCK CASINO', { size: 20, bold: true })
  skip(ctx, 2)
  writeLine(ctx, 'Slot Technical Shift Report', { size: 13 })
  skip(ctx, 4)

  const start = new Date(shift.startTime)
  const end = new Date(shift.endTime)
  const dateStr = start.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  writeLine(ctx, `${shift.type} Shift  |  ${dateStr}  |  ${timeStr}`, { size: 10 })
  if (shift.locationName) writeLine(ctx, `Location: ${shift.locationName}`, { size: 10 })
  skip(ctx, 6)
  drawHRule(ctx, 1)
}

function renderStaffTable(ctx: PageContext, shift: ShiftDetail): void {
  skip(ctx, 4)
  writeLine(ctx, 'STAFF ON SHIFT', { size: 11, bold: true })
  skip(ctx, 4)
  drawHRule(ctx)

  const start = new Date(shift.startTime)
  const end = new Date(shift.endTime)
  const timeIn = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const timeOut = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const COL_NAME = MARGIN
  const COL_IN = MARGIN + 200
  const COL_OUT = MARGIN + 280
  const COL_ROLE = MARGIN + 360

  writeLine(ctx, 'Name', { size: 9, bold: true, x: COL_NAME })
  ctx.y += 9 + 4
  writeLine(ctx, 'Time In', { size: 9, bold: true, x: COL_IN })
  ctx.y += 9 + 4
  writeLine(ctx, 'Time Out', { size: 9, bold: true, x: COL_OUT })
  ctx.y += 9 + 4
  writeLine(ctx, 'Assignment', { size: 9, bold: true, x: COL_ROLE })

  drawHRule(ctx)

  const members = shift.staff.length > 0 ? shift.staff : [{ userId: '', name: shift.supervisorName }]
  for (const member of members) {
    const name = member.name ?? 'Unknown'
    writeLine(ctx, name, { size: 9, x: COL_NAME })
    ctx.y += 9 + 4
    writeLine(ctx, timeIn, { size: 9, x: COL_IN })
    ctx.y += 9 + 4
    writeLine(ctx, timeOut, { size: 9, x: COL_OUT })
    ctx.y += 9 + 4
    writeLine(ctx, 'SLOT TECH', { size: 9, x: COL_ROLE })
    skip(ctx, 2)
  }

  skip(ctx, 6)
  drawHRule(ctx, 1)
}

function renderTaskSection(ctx: PageContext, label: string, tasks: ShiftTaskDetail[]): void {
  if (tasks.length === 0) return

  skip(ctx, 6)
  writeLine(ctx, `${label} (${tasks.length})`, { size: 10, bold: true })
  drawHRule(ctx)

  for (const task of tasks) {
    ensureSpace(ctx, 40)
    const machineStr = task.machine
      ? `[#${task.machine.assetNumber}] ${task.machine.gameName}`
      : '[No machine]'

    writeLine(ctx, machineStr, { size: 9, bold: true })

    writeWrapped(ctx, task.description, { size: 9, x: MARGIN + 12, maxWidth: CONTENT_WIDTH - 12 })

    const meta = `Status: ${task.status}${task.loggedByName ? `  |  By: ${task.loggedByName}` : ''}`
    writeLine(ctx, meta, { size: 8, x: MARGIN + 12, color: [0.4, 0.4, 0.4] })
    skip(ctx, 4)
  }
}

function renderTasksBySection(ctx: PageContext, shift: ShiftDetail): void {
  skip(ctx, 4)
  writeLine(ctx, 'TASKS BY SECTION', { size: 11, bold: true })

  for (const sectionKey of SECTION_ORDER) {
    const label = SECTION_LABELS[sectionKey] ?? sectionKey
    const sectionTasks = shift.tasks.filter((t) => t.section === sectionKey)
    renderTaskSection(ctx, label, sectionTasks)
  }

  skip(ctx, 6)
  drawHRule(ctx, 1)
}

function renderAiBriefing(ctx: PageContext, aiSummary: string): void {
  skip(ctx, 4)
  writeLine(ctx, 'AI SHIFT SUMMARY', { size: 11, bold: true })
  skip(ctx, 4)
  drawHRule(ctx)
  skip(ctx, 4)

  const paragraphs = aiSummary.split('\n').filter((p) => p.trim())
  for (const paragraph of paragraphs) {
    writeWrapped(ctx, stripMarkdown(paragraph), { size: 10 })
    skip(ctx, 6)
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates a Slot Technical Shift Report PDF for the given shift.
 * Returns the raw bytes for streaming to the client.
 */
export async function generateShiftPdf(shift: ShiftDetail): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const ctx: PageContext = {
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    doc,
    regular,
    bold,
    y: PAGE_HEIGHT - MARGIN,
  }

  renderHeader(ctx, shift)
  renderStaffTable(ctx, shift)
  renderTasksBySection(ctx, shift)

  if (shift.aiSummary) {
    renderAiBriefing(ctx, shift.aiSummary)
  }

  return doc.save()
}
