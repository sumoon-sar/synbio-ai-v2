import { syncPubMedLiterature } from '@/lib/literature'
import { createSupabaseServer } from '@/lib/supabase-server'

export const maxDuration = 300

export async function POST(request: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const added = await syncPubMedLiterature('ergothioneine', body.minYear)
    return Response.json({ added })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
