import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const supabase = await createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('content-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('content-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
