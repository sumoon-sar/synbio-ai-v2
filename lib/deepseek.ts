import type { AnalysisInput, AnalysisResult } from '@/types'
import type { DatabaseContext } from './databases'

const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions'

async function callDeepSeek(prompt: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`)
      const data = await res.json()
      return data.choices[0].message.content
    } catch (err) {
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 1000 * 2 ** i))
    }
  }
  throw new Error('unreachable')
}

function buildContext(ctx: DatabaseContext): string {
  const lines: string[] = []
  if (ctx.pubchem) {
    lines.push(`PubChem: 分子式=${ctx.pubchem.formula}, 分子量=${ctx.pubchem.weight}, IUPAC=${ctx.pubchem.iupacName}`)
  }
  if (ctx.kegg) {
    lines.push(`KEGG ID: ${ctx.kegg.id}`)
    if (ctx.kegg.enzymes.length) lines.push(`相关酶(EC): ${ctx.kegg.enzymes.slice(0, 8).join(', ')}`)
    if (ctx.kegg.pathways.length) lines.push(`相关通路: ${ctx.kegg.pathways.slice(0, 5).join(', ')}`)
    if (ctx.kegg.reactionDetails.length) {
      lines.push(`KEGG反应方程式（用于路径推断，以此为准）:`)
      ctx.kegg.reactionDetails.forEach(r => {
        lines.push(`  ${r.id}: ${r.equation}${r.enzymes.length ? ` [EC:${r.enzymes.join('/')}]` : ''}`)
      })
    }
  }
  if (ctx.uniprot.length) {
    ctx.uniprot.forEach(e => {
      lines.push(`UniProt ${e.accession}: ${e.name} (${e.organism})${e.gene ? ` 基因:${e.gene}` : ''}${e.function ? ` 功能:${e.function.slice(0, 100)}` : ''}`)
    })
  }
  if (ctx.hostGenome) {
    lines.push(`\n宿主内源基因: ${ctx.hostGenome.hasGenes.join(', ')}`)
    lines.push(`宿主缺失通路/基因: ${ctx.hostGenome.lackPathways.join(', ')}`)
  }
  if (ctx.precursorHint) {
    lines.push(`\n前体类型提示: ${ctx.precursorHint}`)
  }
  return lines.join('\n') || '（未找到数据库信息）'
}

type CoreResult = Omit<AnalysisResult, 'molecule' | 'host' | 'reviewWarnings'>

export async function analyzeWithReview(
  input: AnalysisInput,
  ctx: DatabaseContext
): Promise<{ result: CoreResult; warnings: string[] }> {
  const dbContext = buildContext(ctx)

  const generatePrompt = `你是代谢工程专家。基于以下数据库信息，分析目标产物的合成生物学方案。

目标产物: ${input.molecule}
宿主: ${input.host}

数据库信息:
${dbContext}

严格要求：
1. 禁止生成任何DNA序列
2. 代谢路径中的EC编号必须来自上方KEGG数据；若KEGG无数据则标注"AI推断"，不得编造
3. 代谢路径每步必须标注酶的EC编号和数据来源(KEGG或AI推断)
4. 工程策略中"过表达"和"敲除"的基因必须存在于宿主内源基因列表中，不存在则不得列入
5. 宿主缺失的通路/基因需在notes中注明"需异源引入"，不得列入过表达或敲除
6. 同一基因不得同时出现在过表达和敲除列表中
7. notes中只描述与目标产物合成直接相关的信息，不得列出与目标产物无关的宿主缺失基因
8. 敲除基因必须同时满足：(a)该基因编码的酶直接消耗目标产物的直接前体或目标产物本身；(b)敲除该基因不会导致细胞生长停滞；不满足以上两个条件的基因不得列入敲除列表
9. 只返回JSON，不含任何其他文字

返回格式：
{
  "structureInfo": { "formula": "", "weight": "", "iupacName": "", "synonyms": [] },
  "metabolicRoute": [{ "step": "步骤描述", "enzyme": "EC x.x.x.x", "source": "KEGG" }],
  "keyEnzymes": [{ "name": "", "gene": "", "organism": "", "accession": "", "function": "" }],
  "engineeringStrategy": { "overexpress": [], "knockout": [], "cofactors": [], "notes": "" },
  "rawAnalysis": "完整文字分析报告"
}`

  const raw = await callDeepSeek(generatePrompt)

  // 提取 JSON
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式错误')
  let result: CoreResult
  try {
    result = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('AI 返回 JSON 解析失败')
  }

  // 数据清洗：确保所有字段类型正确
  if (result.structureInfo) {
    result.structureInfo.synonyms = Array.isArray(result.structureInfo.synonyms) ? result.structureInfo.synonyms : []
  }
  result.metabolicRoute = (result.metabolicRoute ?? []).map(r => ({
    step: String(r.step ?? ''),
    enzyme: String(r.enzyme ?? ''),
    source: (String(r.source ?? '') as 'KEGG' | 'AI') || 'AI',
  }))
  result.keyEnzymes = (result.keyEnzymes ?? []).map(e => ({
    name: String(e.name ?? ''),
    gene: String(e.gene ?? ''),
    organism: String(e.organism ?? ''),
    accession: String(e.accession ?? ''),
    function: String(e.function ?? ''),
  }))
  if (result.engineeringStrategy) {
    result.engineeringStrategy.overexpress = Array.isArray(result.engineeringStrategy.overexpress) ? result.engineeringStrategy.overexpress.map(String) : []
    result.engineeringStrategy.knockout = Array.isArray(result.engineeringStrategy.knockout) ? result.engineeringStrategy.knockout.map(String) : []
    result.engineeringStrategy.cofactors = Array.isArray(result.engineeringStrategy.cofactors) ? result.engineeringStrategy.cofactors.map(String) : []
    result.engineeringStrategy.notes = String(result.engineeringStrategy.notes ?? '')
  }
  result.rawAnalysis = String(result.rawAnalysis ?? '')

  // 用数据库数据补充 structureInfo
  if (ctx.pubchem && !result.structureInfo?.formula) {
    result.structureInfo = {
      formula: ctx.pubchem.formula,
      weight: ctx.pubchem.weight,
      iupacName: ctx.pubchem.iupacName,
      synonyms: ctx.pubchem.synonyms,
    }
  }

  // 审核调用
  const keggReactions = ctx.kegg?.reactionDetails?.length
    ? `\nKEGG已知反应（以此为准判断EC编号正确性）：\n${ctx.kegg.reactionDetails.map(r => `  ${r.id}: ${r.equation}${r.enzymes.length ? ` [EC:${r.enzymes.join('/')}]` : ''}`).join('\n')}`
    : ''

  const reviewPrompt = `你是合成生物学审稿人。只报告以下两类确定错误，其他一律不报告。
${keggReactions}
报告内容（JSON）：
${JSON.stringify({ metabolicRoute: result.metabolicRoute, keyEnzymes: result.keyEnzymes, engineeringStrategy: result.engineeringStrategy }, null, 2)}

两类错误（缺一不报）：
1. 同一基因同时出现在overexpress和knockout列表中
2. overexpress或knockout列表中出现了完全相同的基因名（重复）

绝对禁止报告：EC编号正确性、反应底物、步骤合理性、物种选择、accession号、需验证的内容

格式：每条≤20字，只说错误本身。无错误返回 []

只返回JSON数组，不含其他文字。`

  let warnings: string[] = []
  try {
    const reviewRaw = await callDeepSeek(reviewPrompt)
    const arrMatch = reviewRaw.match(/\[[\s\S]*\]/)
    if (arrMatch) warnings = JSON.parse(arrMatch[0])
  } catch { /* 审核失败不影响主结果 */ }

  // 服务端强制过滤：过表达/敲除只能包含宿主内源基因，且不能包含化合物禁止基因
  if (ctx.hostGenome || ctx.forbiddenGenes) {
    const hasGenes = ctx.hostGenome?.hasGenes ?? []
    const forbidden = new Set(ctx.forbiddenGenes ?? [])
    const s = result.engineeringStrategy
    if (s) {
      s.overexpress = (s.overexpress ?? []).filter((g: string) =>
        (!hasGenes.length || hasGenes.includes(g)) && !forbidden.has(g)
      )
      s.knockout = (s.knockout ?? []).filter((g: string) =>
        (!hasGenes.length || hasGenes.includes(g)) && !forbidden.has(g)
      )
    }
  }

  return { result, warnings }
}
