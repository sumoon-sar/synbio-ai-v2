import { createSupabaseServer } from '@/lib/supabase-server'
import { gatherContext } from '@/lib/databases'
import { analyzeWithReview } from '@/lib/deepseek'

export const maxDuration = 300

export async function POST(request: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: '未登录' }, { status: 401 })

  const { molecule, host } = await request.json()
  if (!molecule || !host) return Response.json({ error: '参数缺失' }, { status: 400 })

  // Check analysis cache
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: cached } = await supabase
    .from('analysis_history')
    .select('result')
    .eq('user_id', user.id)
    .eq('molecule', molecule)
    .eq('host', host)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (cached) return Response.json({ result: cached.result, cached: true })

  // Rate limit
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('analysis_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())
  if ((count ?? 0) >= 5)
    return Response.json({ error: '今日分析次数已达上限（5次）' }, { status: 429 })

  try {
    const ctx = await gatherContext(molecule, host)
    const { result, warnings } = await analyzeWithReview({ molecule, host }, ctx)
    const analysisResult = { molecule, host, ...result, reviewWarnings: warnings, literature: ctx.literature }
    await supabase.from('analysis_history').insert({ user_id: user.id, molecule, host, result: analysisResult })
    return Response.json({ result: analysisResult })
  } catch (err: any) {
    return Response.json({ error: err.message ?? '分析失败' }, { status: 500 })
  }
}
