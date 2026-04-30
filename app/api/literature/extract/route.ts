import { extractAndStore } from '@/lib/literature'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase-server'

export const maxDuration = 60

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  // 找出还没有提取记录的文献
  const { data: papers } = await db
    .from('literature_papers')
    .select('id, abstract')
    .not('id', 'in', db.from('literature_extractions').select('paper_id'))
    .limit(5)

  if (!papers?.length) return Response.json({ processed: 0, remaining: 0 })

  let processed = 0
  for (const p of papers) {
    if (p.abstract) {
      await extractAndStore(p.id, p.abstract)
      processed++
    }
  }

  const { count } = await db
    .from('literature_papers')
    .select('id', { count: 'exact', head: true })
    .not('id', 'in', db.from('literature_extractions').select('paper_id'))

  return Response.json({ processed, remaining: (count ?? 0) })
}
