'use client'
import type { AnalysisResult } from '@/types'

interface Props {
  result: AnalysisResult
}

export default function AnalysisResult({ result }: Props) {
  if (!result || typeof result !== 'object') return <div className="p-4 text-red-500">结果格式错误</div>
  const exportReport = () => {
    try {
      const esc = (s: string) => (s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SynBio AI - ${esc(result.molecule)}</title>
<style>body{font-family:system-ui;margin:40px;color:#1e293b;line-height:1.6}h1{color:#0891b2}h2{color:#0e7490;margin-top:2rem}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f0f9ff}.warn{background:#fef3c7;padding:8px;border-radius:4px;margin:4px 0}</style>
</head><body>
<h1>SynBio AI 分析报告</h1>
<p><strong>目标产物：</strong>${esc(result.molecule)} &nbsp; <strong>宿主：</strong>${esc(result.host)}</p>
${result.structureInfo ? `<h2>结构信息</h2><p>分子式：${esc(result.structureInfo.formula)}，分子量：${esc(result.structureInfo.weight)}</p><p>IUPAC：${esc(result.structureInfo.iupacName)}</p>` : ''}
<h2>代谢路径</h2><ol>${(result.metabolicRoute ?? []).map(r => `<li>${esc(r.step)} <em>(${esc(r.enzyme)}, ${esc(r.source)})</em></li>`).join('')}</ol>
<h2>关键酶</h2><table><tr><th>名称</th><th>基因</th><th>物种</th><th>功能</th></tr>${(result.keyEnzymes ?? []).map(e => `<tr><td>${esc(e.name)}</td><td>${esc(e.gene)}</td><td>${esc(e.organism)}</td><td>${esc(e.function)}</td></tr>`).join('')}</table>
<h2>工程策略</h2><p><strong>过表达：</strong>${esc((result.engineeringStrategy?.overexpress ?? []).join(', '))}</p><p><strong>敲除：</strong>${esc((result.engineeringStrategy?.knockout ?? []).join(', '))}</p><p><strong>辅因子：</strong>${esc((result.engineeringStrategy?.cofactors ?? []).join(', '))}</p><p>${esc(result.engineeringStrategy?.notes ?? '')}</p>
<h2>AI 分析报告</h2><pre style="white-space:pre-wrap;background:#f8fafc;padding:1rem;border-radius:8px">${esc(result.rawAnalysis)}</pre>
${(result.reviewWarnings ?? []).length ? `<h2>审核警告</h2>${result.reviewWarnings.map(w => `<div class="warn">⚠️ ${esc(w)}</div>`).join('')}` : ''}
</body></html>`
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `SynBio-${result.molecule}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (e) {
      alert('导出失败: ' + (e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{result.molecule}</h2>
          <p className="text-sm text-gray-500">宿主：{result.host}</p>
        </div>
        <button onClick={exportReport} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
          导出报告
        </button>
      </div>

      {result.structureInfo && (
        <Section title="结构信息">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="分子式" value={result.structureInfo.formula} />
            <Info label="分子量" value={result.structureInfo.weight} />
            <Info label="IUPAC" value={result.structureInfo.iupacName} />
            {(result.structureInfo.synonyms ?? []).length > 0 && (
              <Info label="同义词" value={(result.structureInfo.synonyms ?? []).join(', ')} />
            )}
          </div>
        </Section>
      )}

      <Section title="代谢路径">
        <ol className="space-y-2">
          {result.metabolicRoute.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              <span className="text-gray-700">{r.step} <span className="text-gray-400">({r.enzyme}, {r.source})</span></span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="关键酶">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">{['名称','基因','物种','功能'].map(h => <th key={h} className="text-left px-3 py-2 text-gray-600 font-medium">{h}</th>)}</tr></thead>
            <tbody>{result.keyEnzymes.map((e, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{e.name}</td>
                <td className="px-3 py-2 text-cyan-600">{e.gene}</td>
                <td className="px-3 py-2 text-gray-500 italic">{e.organism}</td>
                <td className="px-3 py-2 text-gray-600">{e.function}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Section>

      <Section title="工程策略">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <StrategyCard title="过表达" items={result.engineeringStrategy.overexpress} color="green" />
          <StrategyCard title="敲除" items={result.engineeringStrategy.knockout} color="red" />
          <StrategyCard title="辅因子/前体" items={result.engineeringStrategy.cofactors} color="blue" />
        </div>
        {result.engineeringStrategy.notes && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{result.engineeringStrategy.notes}</p>
        )}
      </Section>

      <Section title="AI 详细分析">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg leading-relaxed">{result.rawAnalysis}</pre>
      </Section>

      {result.reviewWarnings.length > 0 && (
        <Section title="审核警告">
          {result.reviewWarnings.map((w, i) => (
            <div key={i} className="flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span>⚠️</span><span>{w}</span>
            </div>
          ))}
        </Section>
      )}

      {result.literature && result.literature.length > 0 && (
        <Section title="相关文献">
          <ul className="space-y-2">
            {result.literature.map((p) => (
              <li key={p.pmid} className="text-sm">
                <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`} target="_blank" rel="noreferrer"
                  className="text-cyan-600 hover:underline">{p.title}</a>
                {p.year && <span className="text-gray-400 ml-2">({p.year})</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <p><span className="text-gray-500">{label}：</span><span className="text-gray-900">{value}</span></p>
}

function StrategyCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const colors: Record<string, string> = { green: 'bg-green-50 border-green-200 text-green-800', red: 'bg-red-50 border-red-200 text-red-800', blue: 'bg-blue-50 border-blue-200 text-blue-800' }
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="font-medium mb-2">{title}</p>
      <ul className="space-y-1">{items.map((item, i) => <li key={i}>• {item}</li>)}</ul>
    </div>
  )
}
