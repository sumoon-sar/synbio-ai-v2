import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LiteratureClient from './LiteratureClient'

const PAGE_SIZE = 20

export default async function LiteraturePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE

  const { data: papers, count } = await supabase
    .from('literature_papers')
    .select('id, title, year, journal, source, pmid, literature_extractions(host_organism, titer_mg_per_l, key_finding)', { count: 'exact' })
    .order('year', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return <LiteratureClient papers={papers ?? []} page={page} totalPages={totalPages} total={total} />
}
