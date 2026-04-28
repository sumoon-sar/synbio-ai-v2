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
2. 禁止编造不在上述数据库中的EC编号
3. 代谢路径每步必须标注酶的EC编号和数据来源(KEGG或AI推断)
4. 工程策略中"敲除"的基因必须存在于宿主内源基因列表中，不存在则不得列入敲除
5. 宿主缺失的通路/基因需在notes中注明"需异源引入"
6. 只返回JSON，不含任何其他文字

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
  const reviewPrompt = `你是合成生物学审稿人。检查以下分析报告，找出明确的错误。

${JSON.stringify(result, null, 2)}

检查项：
1. EC编号与对应反应是否匹配（不要检查格式，只检查酶和反应是否对应）
2. 敲除基因是否在宿主中真实存在
3. 代谢路径步骤是否有逻辑错误
4. 是否有明显事实错误

要求：
- 每条警告不超过30字，直接说明错误，不要解释正确答案
- 只报告确定的错误，不要报告"需确认"或"可能"的问题
- 无问题则返回空数组

只返回JSON数组 []`

  let warnings: string[] = []
  try {
    const reviewRaw = await callDeepSeek(reviewPrompt)
    const arrMatch = reviewRaw.match(/\[[\s\S]*\]/)
    if (arrMatch) warnings = JSON.parse(arrMatch[0])
  } catch { /* 审核失败不影响主结果 */ }

  return { result, warnings }
}
