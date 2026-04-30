'use client'
import { useState, useEffect, useRef } from 'react'
import LiteratureUpload from '@/components/LiteratureUpload'

type Paper = {
  id: string
  title: string
  year: number | null
  journal: string | null
  source: string
  pmid: string | null
  literature_extractions: { host_organism: string | null; titer_mg_per_l: number | null; key_finding: string | null }[]
}

export default function LiteratureClient({ papers: initial }: { papers: Paper[] }) {
  const [papers, setPapers] = useState(initial)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [msg, setMsg] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleSync(minYear?: number) {
    setSyncing(true)
    setSyncProgress(0)
    setMsg('')
    let pct = 0
    timerRef.current = setInterval(() => {
      pct = Math.min(pct + 0.08, 90)
      setSyncProgress(pct)
    }, 400)
    try {
      const res = await fetch('/api/literature/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minYear ? { minYear } : {}),
      })
      const data = await res.json()
      if (timerRef.current) clearInterval(timerRef.current)
      if (!res.ok) throw new Error(data.error)
      setSyncProgress(100)
      setMsg(`新增 ${data.added} 篇文献`)
      setTimeout(() => window.location.reload(), 500)
    } catch (e: any) {
      if (timerRef.current) clearInterval(timerRef.current)
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
            onClick={() => handleSync()}
            disabled={syncing}
            style={{ background: '#0891b2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
          >
            {syncing ? '同步中...' : '同步最新'}
          </button>
          <button
            onClick={() => handleSync(2017)}
            disabled={syncing}
            style={{ background: '#0e7490', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
          >
            抓取历史(2017-2024)
          </button>
        </div>
      </div>

      {syncing && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
            <span>正在抓取并提取文献数据...</span>
            <span>{Math.round(syncProgress)}%</span>
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6 }}>
            <div style={{ background: 'linear-gradient(to right, #06b6d4, #2563eb)', height: 6, borderRadius: 4, width: `${syncProgress}%`, transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

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
                <td style={td}>
                  {p.pmid
                    ? <a href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`} target="_blank" rel="noreferrer" style={{ color: '#0891b2' }}>{p.title}</a>
                    : p.title}
                </td>
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

