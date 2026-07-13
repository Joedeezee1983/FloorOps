import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'

interface IdentifyBody {
  imageBase64?: unknown
  mimeType?: unknown
  partNumber?: unknown
  machineName?: unknown
}

export interface PartIdentification {
  partName: string
  description: string
  confidence: 'high' | 'medium' | 'low'
}

type AllowedMimeType = 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp'
const ALLOWED_VISION_TYPES = new Set<string>(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI identification is not configured' }, { status: 503 })
    }

    const body = await req.json() as IdentifyBody
    const anthropic = new Anthropic({ apiKey })

    if (typeof body.imageBase64 === 'string' && typeof body.mimeType === 'string' && ALLOWED_VISION_TYPES.has(body.mimeType)) {
      const result = await identifyFromImage(anthropic, body.imageBase64, body.mimeType as AllowedMimeType)
      return NextResponse.json({ data: result })
    }

    if (typeof body.partNumber === 'string' && body.partNumber.trim()) {
      const result = await identifyFromPartNumber(
        anthropic,
        body.partNumber.trim(),
        typeof body.machineName === 'string' ? body.machineName : undefined,
      )
      return NextResponse.json({ data: result })
    }

    return NextResponse.json({ error: 'imageBase64 with mimeType or partNumber is required' }, { status: 400 })
  } catch (error) {
    console.error('[parts/identify] Failed to identify part:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function identifyFromImage(
  anthropic: Anthropic,
  imageBase64: string,
  mimeType: AllowedMimeType,
): Promise<PartIdentification> {
  const normalizedType = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: normalizedType as 'image/jpeg' | 'image/png' | 'image/webp', data: imageBase64 },
        },
        {
          type: 'text',
          text: `Identify this slot machine or gaming equipment part. Provide:
1. A concise part name (e.g. "Bill Validator", "TITO Printer Head", "Main Logic Board")
2. A description an inventory tech could use to order it — include likely manufacturer and part number if visible, physical characteristics, and common use
3. Confidence level: high, medium, or low

Respond ONLY with valid JSON in this exact format with no extra text:
{"partName":"...","description":"...","confidence":"high"}`,
        },
      ],
    }],
  })

  return parseClaudeJson(response.content[0])
}

async function identifyFromPartNumber(
  anthropic: Anthropic,
  partNumber: string,
  machineName?: string,
): Promise<PartIdentification> {
  const context = machineName ? ` used in a ${machineName}` : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `For slot machine / gaming equipment part number "${partNumber}"${context}, provide:
1. A concise part name (e.g. "Bill Validator", "Printer Head", "Power Supply")
2. A description an inventory tech could use to order it
3. Confidence level: high, medium, or low

Respond ONLY with valid JSON in this exact format with no extra text:
{"partName":"...","description":"...","confidence":"medium"}`,
    }],
  })

  return parseClaudeJson(response.content[0])
}

function parseClaudeJson(block: Anthropic.ContentBlock): PartIdentification {
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  const raw = block.text.trim()
  // Extract JSON from within a code block if Claude wrapped it
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not extract JSON from Claude response')
  return JSON.parse(jsonMatch[0]) as PartIdentification
}
