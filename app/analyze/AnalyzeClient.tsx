'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AnalysisForm from '@/components/AnalysisForm'
import AnalysisResult from '@/components/AnalysisResult'
import HistoryPanel from '@/components/HistoryPanel'
import type { AnalysisResult as AnalysisResultType, HistoryItem } from '@/types'

interface Props {
  user: { email: string }
  history: HistoryItem[]
}

export default function AnalyzeClient({ user, history }: Props) {
  const router = useRouter()
  const [results, setResults] = useState<AnalysisResultType[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(history)

  const handleResult = (r: AnalysisResultType) => {
    setResults(prev => compareMode ? [...prev.slice(-1), r] : [r])
    setHistoryItems(prev => [{
      id: Date.now().toString(),
      molecule: r.molecule,
      host: r.host,
      created_at: new Date().toISOString(),
      result: r,
    }, ...prev])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SB</span>
          </div>
          <span className="font-bold text-gray-900">SynBio AI</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/literature" className="text-sm text-cyan-600 hover:underline">文献库</a>
          <span className="text-sm text-gray-500">{user.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">登出</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">输入分析</h2>
            <AnalysisForm onResult={handleResult} />
            <label className="flex items-center gap-2 text-sm text-gray-600 mt-3 cursor-pointer">
              <input type="checkbox" checked={compareMode} onChange={e => setCompareMode(e.target.checked)} />
              对比模式（保留上一次结果）
            </label>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">分析历史</h2>
            <HistoryPanel history={historyItems} onSelect={r => setResults([r])} />
          </div>
        </aside>

        <main>
          {results.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm flex items-center justify-center min-h-[400px]">
              <div className="text-center text-gray-400">
                <p className="text-4xl mb-3">🧬</p>
                <p className="text-lg font-medium">输入目标产物，开始分析</p>
                <p className="text-sm mt-1">AI 将基于 PubChem / KEGG / UniProt 数据库生成方案</p>
              </div>
            </div>
          ) : (
            <div className={results.length === 2 ? 'grid grid-cols-2 gap-4' : ''}>
              {results.map((r, i) => <AnalysisResult key={i} result={r} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
