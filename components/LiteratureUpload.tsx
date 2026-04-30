'use client'
import { useState } from 'react'

export default function LiteratureUpload({ onDone }: { onDone?: () => void }) {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    if (!file.name.endsWith('.pdf')) { setStatus('请上传 PDF 文件'); return }
    setLoading(true)
    setStatus('上传中...')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/literature/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus(`已导入：${data.title}`)
      onDone?.()
    } catch (e: any) {
      setStatus(`失败：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <label
        style={{ display: 'block', border: '2px dashed #cbd5e1', borderRadius: 8, padding: '1rem', textAlign: 'center', cursor: 'pointer' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        {loading ? '处理中...' : '点击或拖拽 PDF 上传'}
        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </label>
      {status && <p style={{ marginTop: 8, fontSize: 14, color: '#64748b' }}>{status}</p>}
    </div>
  )
}
