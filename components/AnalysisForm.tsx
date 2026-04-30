'use client'
import { useState, FormEvent, useEffect, useRef } from 'react'
import type { AnalysisResult } from '@/types'

const HOSTS = ['E. coli', 'S. cerevisiae', 'B. subtilis', '自定义']

const STEPS = [
  { label: '查询 PubChem / KEGG / UniProt', duration: 8000 },
  { label: 'AI 生成分析方案', duration: 30000 },
  { label: 'AI 审核结果', duration: 15000 },
]

interface Props {
  onResult: (result: AnalysisResult) => void
}

export default function AnalysisForm({ onResult }: Props) {
  const [molecule, setMolecule] = useState('')
  const [host, setHost] = useState('E. coli')
  const [customHost, setCustomHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!loading) { setStepIdx(0); setProgress(0); return }
    let step = 0
    let pct = 0
    const tick = () => {
      const dur = STEPS[step]?.duration ?? 10000
      pct += 100 / (dur / 200)
      if (pct >= 95) { pct = 95; step = Math.min(step + 1, STEPS.length - 1); setStepIdx(step) }
      setProgress(Math.min(pct, 95))
    }
    timerRef.current = setInterval(tick, 200)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ molecule, host: host === '自定义' ? customHost : host }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '分析失败')
      if (!data.result) throw new Error(data.error ?? '返回数据为空')
      setProgress(100)
      setTimeout(() => { setLoading(false); onResult(data.result) }, 300)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">目标产物</label>
        <input
          value={molecule} onChange={e => setMolecule(e.target.value)} required
          placeholder="例如：番茄红素、lycopene"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">宿主</label>
        <select
          value={host} onChange={e => setHost(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {HOSTS.map(h => <option key={h}>{h}</option>)}
        </select>
        {host === '自定义' && (
          <input
            value={customHost} onChange={e => setCustomHost(e.target.value)} required
            placeholder="输入宿主名称"
            className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        )}
      </div>
      {loading && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{STEPS[stepIdx]?.label}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit" disabled={loading || !molecule}
        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {loading ? '分析中...' : '开始分析'}
      </button>
    </form>
  )
}

