import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LiteratureClient from './LiteratureClient'

export default async function LiteraturePage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: papers } = await supabase
    .from('literature_papers')
    .select('id, title, year, journal, source, literature_extractions(host_organism, titer_mg_per_l, key_finding)')
    .order('year', { ascending: false })
    .limit(50)

  return <LiteratureClient papers={papers ?? []} />
}
