import { extractAndStore } from '@/lib/literature'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase-server'

export const maxDuration = 300

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const text = await extractTextFromPdf(Buffer.from(arrayBuffer))

  const title = file.name.replace(/\.pdf$/i, '')
  const db = getDb()
  const { data: paper, error } = await db.from('literature_papers').insert({
    title,
    full_text: text.slice(0, 50000),
    source: 'manual_upload',
    molecule: 'ergothioneine',
  }).select('id').single()

  if (error || !paper) return Response.json({ error: 'DB insert failed' }, { status: 500 })

  await extractAndStore(paper.id, text)
  return Response.json({ id: paper.id, title })
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Basic: extract readable ASCII text from PDF buffer
  const str = buffer.toString('latin1')
  const chunks: string[] = []
  const re = /\(([^)]{2,200})\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(str)) !== null) {
    const s = m[1].replace(/\\[nrt\\()]/g, ' ').trim()
    if (s.length > 10 && /[a-zA-Z]{3}/.test(s)) chunks.push(s)
  }
  return chunks.join(' ')
}
