import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('pdf') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const supabase = await createClient()
  const path = `${crypto.randomUUID()}.pdf`

  const { error } = await supabase.storage
    .from('task-pdfs')
    .upload(path, file, { contentType: 'application/pdf', upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('task-pdfs').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
