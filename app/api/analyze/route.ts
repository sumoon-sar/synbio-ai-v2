import { createSupabaseServer } from '@/lib/supabase-server'
import { gatherContext } from '@/lib/databases'
import { analyzeWithReview } from '@/lib/deepseek'

export const maxDuration = 300

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: '未登录' }), { status: 401 })

  const { molecule, host } = await request.json()
  if (!molecule || !host) return new Response(JSON.stringify({ error: '参数缺失' }), { status: 400 })

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
  if (cached) return new Response(JSON.stringify({ result: cached.result, cached: true }), {
    headers: { 'Content-Type': 'application/json' },
  })

  // Rate limit
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('analysis_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())
  if ((count ?? 0) >= 5)
    return new Response(JSON.stringify({ error: '今日分析次数已达上限（5次）' }), { status: 429 })

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(sse(event, data)))

      try {
        send('progress', { step: 'db', message: '正在查询数据库...' })
        const ctx = await gatherContext(molecule, host)

        send('progress', { step: 'ai', message: 'AI 正在生成分析...' })
        const { result, warnings } = await Promise.race([
          analyzeWithReview({ molecule, host }, ctx),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('分析超时，请重试')), 150000)),
        ])

        send('progress', { step: 'review', message: 'AI 审核完成' })

        const analysisResult = { molecule, host, ...result, reviewWarnings: warnings, literature: ctx.literature }
        await supabase.from('analysis_history').insert({ user_id: user.id, molecule, host, result: analysisResult })

        send('done', { result: analysisResult })
      } catch (err: any) {
        send('error', { error: err.message ?? '分析失败' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
