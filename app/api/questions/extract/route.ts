import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = (file.type || 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'image/gif'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Extract the exam question from this image. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- "prompt": the full question text exactly as written
- "type": "mcq" if answer choices are present (A/B/C/D or F/G/H/J), otherwise "written"
- "options": for MCQ, array of the 4 choice texts WITHOUT the letter prefix; null for written
- "correct_answer": the correct choice text if marked or indicated; null if not visible

{"prompt": "...", "type": "mcq", "options": ["...", "...", "...", "..."], "correct_answer": null}`,
          },
        ],
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const parsed = JSON.parse(raw)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not parse extracted content' }, { status: 422 })
  }
}
