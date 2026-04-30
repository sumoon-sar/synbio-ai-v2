'use client'
import { useState } from 'react'
import LiteratureUpload from '@/components/LiteratureUpload'

type Paper = {
  id: string
  title: string
  year: number | null
  journal: string | null
  source: string
  literature_extractions: { host_organism: string | null; titer_mg_per_l: number | null; key_finding: string | null }[]
}

export default function LiteratureClient({ papers: initial }: { papers: Paper[] }) {
  const [papers, setPapers] = useState(initial)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSync() {
    setSyncing(true)
    setMsg('')
    try {
      const res = await fetch('/api/literature/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg(`新增 ${data.added} 篇文献`)
      window.location.reload()
    } catch (e: any) {
      setMsg(`失败：${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui', color: '#1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: '#0891b2', margin: 0 }}>文献库 — 麦角硫因</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/analyze" style={{ color: '#0891b2', textDecoration: 'none', fontSize: 14 }}>← 返回分析</a>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
          >
            {syncing ? '同步中...' : '同步 PubMed'}
          </button>
        </div>
      </div>

      {msg && <p style={{ color: '#64748b', marginBottom: 16 }}>{msg}</p>}

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#0e7490', fontSize: 16, marginBottom: 8 }}>上传 PDF</h2>
        <LiteratureUpload onDone={() => window.location.reload()} />
      </div>

      <h2 style={{ color: '#0e7490', marginBottom: 12 }}>已收录文献（{papers.length} 篇）</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f9ff' }}>
            <th style={th}>标题</th>
            <th style={th}>年份</th>
            <th style={th}>宿主</th>
            <th style={th}>产量(mg/L)</th>
            <th style={th}>关键发现</th>
          </tr>
        </thead>
        <tbody>
          {papers.map(p => {
            const ext = p.literature_extractions?.[0]
            return (
              <tr key={p.id}>
                <td style={td}>{p.title}</td>
                <td style={td}>{p.year ?? '—'}</td>
                <td style={td}>{ext?.host_organism ?? '—'}</td>
                <td style={td}>{ext?.titer_mg_per_l ?? '—'}</td>
                <td style={td}>{ext?.key_finding ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const th: React.CSSProperties = { border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left', fontWeight: 600 }
const td: React.CSSProperties = { border: '1px solid #e2e8f0', padding: '8px', fontSize: 13, verticalAlign: 'top' }
