import Anthropic from '@anthropic-ai/sdk'
import type { TaskSection, TaskType } from '@prisma/client'

export interface BriefingTask {
  section: TaskSection
  type: TaskType
  status: string
  description: string
  machine: { assetNumber: string; gameName: string } | null
  loggedByName: string | null
}

export interface ShiftBriefingInput {
  shiftType: string
  locationName: string
  startTime: string
  endTime: string
  staff: Array<{ name: string | null }>
  tasks: BriefingTask[]
}

const SECTION_LABELS: Record<string, string> = {
  PRE_EXISTING_DOWN: 'Pre-Existing Down',
  FLOOR_GAMES: 'Floor Games',
  KIOSKS: 'Kiosks',
  BENCH_OFFICE: 'Bench/Office',
  MISCELLANEOUS: 'Miscellaneous',
}

const TYPE_LABELS: Record<string, string> = {
  DOWN_MACHINE: 'Down Machine',
  GENERAL: 'General',
  MAINTENANCE_REQUEST: 'Maintenance Request',
}

const SECTION_ORDER: TaskSection[] = [
  'PRE_EXISTING_DOWN',
  'FLOOR_GAMES',
  'KIOSKS',
  'BENCH_OFFICE',
  'MISCELLANEOUS',
]

function buildPromptBody(input: ShiftBriefingInput): string {
  const start = new Date(input.startTime)
  const end = new Date(input.endTime)
  const durationHours = ((end.getTime() - start.getTime()) / 3_600_000).toFixed(1)

  const staffList =
    input.staff.length > 0
      ? input.staff.map((s) => s.name ?? 'Unknown').join(', ')
      : 'None listed'

  const tasksBySection = SECTION_ORDER.map((section) => {
    const sectionTasks = input.tasks.filter((t) => t.section === section)
    if (sectionTasks.length === 0) return ''

    const taskLines = sectionTasks
      .map((t) => {
        const machineStr = t.machine
          ? `#${t.machine.assetNumber} ${t.machine.gameName} - `
          : ''
        return `  - ${machineStr}${t.description} [${TYPE_LABELS[t.type] ?? t.type}, ${t.status}]`
      })
      .join('\n')

    return `${SECTION_LABELS[section] ?? section} (${sectionTasks.length}):\n${taskLines}`
  })
    .filter(Boolean)
    .join('\n\n')

  const stillDown = input.tasks.filter(
    (t) => t.type === 'DOWN_MACHINE' && t.status !== 'RESOLVED'
  ).length
  const restored = input.tasks.filter(
    (t) => t.type === 'DOWN_MACHINE' && t.status === 'RESOLVED'
  ).length

  return `Generate a professional shift summary for the incoming slot tech team.

Shift: ${input.shiftType} | ${start.toLocaleDateString()} | ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${durationHours} hours)
Location: ${input.locationName}
Staff: ${staffList}
Total tasks: ${input.tasks.length} | Machines still down: ${stillDown} | Machines restored: ${restored}

${tasksBySection || 'No tasks logged.'}

Write a plain-English operations summary in short paragraphs covering: what happened during the shift, what is still open and needs attention, and what the incoming team must focus on. Be concise and professional. Under 350 words. No bullet points.`
}

/**
 * Calls Claude to generate a plain-English shift summary for the incoming team.
 */
export async function generateShiftBriefing(input: ShiftBriefingInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing required env var: ANTHROPIC_API_KEY')

  const anthropic = new Anthropic({ apiKey })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:
      'You are an operations analyst for a casino slot technical department. You write clear, concise shift summary reports for incoming teams. Write in plain paragraphs without bullet points or headers.',
    messages: [{ role: 'user', content: buildPromptBody(input) }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}
