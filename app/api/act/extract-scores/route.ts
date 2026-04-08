import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'File must be an image (JPEG, PNG, GIF, or WebP)' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
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
            text: 'This is an ACT score report image. Extract the English, Math, Reading, and Science section scores and the composite score. All scores are on a 1–36 scale. Respond ONLY with valid JSON, no markdown: {"english":N,"math":N,"reading":N,"science":N,"composite":N}. Use null for any score not visible in the image.',
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  try {
    const scores = JSON.parse(text)
    return NextResponse.json(scores)
  } catch {
    return NextResponse.json({ error: 'Could not parse scores from image', raw: text }, { status: 422 })
  }
}
