'use client'
import type { HistoryItem, AnalysisResult } from '@/types'

interface Props {
  history: HistoryItem[]
  onSelect: (result: AnalysisResult) => void
}

export default function HistoryPanel({ history, onSelect }: Props) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">暂无分析历史</p>
  }

  return (
    <div className="space-y-2">
      {history.map(item => (
        <button
          key={item.id}
          onClick={() => onSelect(item.result)}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-colors"
        >
          <p className="text-sm font-medium text-gray-800">{item.molecule}</p>
          <p className="text-xs text-gray-400">{item.host} · {item.created_at.slice(0, 10)}</p>
        </button>
      ))}
    </div>
  )
}
