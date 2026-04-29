'use client'
import { useState, FormEvent } from 'react'
import type { AnalysisResult } from '@/types'

const HOSTS = ['E. coli', 'S. cerevisiae', 'B. subtilis', '自定义']

interface Props {
  onResult: (result: AnalysisResult) => void
}

export default function AnalysisForm({ onResult }: Props) {
  const [molecule, setMolecule] = useState('')
  const [host, setHost] = useState('E. coli')
  const [customHost, setCustomHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setProgress('分析中...')
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
      onResult(data.result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setProgress('')
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
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit" disabled={loading || !molecule}
        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg disabled:opacity-50"
      >
        {loading ? (progress || '分析中...') : '开始分析'}
      </button>
    </form>
  )
}
