export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import AnalyzeClient from './AnalyzeClient'

export default async function AnalyzePage() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: history, error } = await supabase
      .from('analysis_history')
      .select('id, molecule, host, created_at, result')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return <AnalyzeClient user={{ email: user.email! }} history={history ?? []} />
  } catch (err: any) {
    return <div style={{padding:'2rem',color:'red'}}><pre>{err?.message ?? String(err)}</pre></div>
  }
}
