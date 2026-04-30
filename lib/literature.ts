import { createClient } from '@supabase/supabase-js'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface LocalLiteratureEntry {
  title: string
  year: number
  host: string
  titer?: number
  genesOverexpressed: string[]
  genesKnockedOut: string[]
  heterologousGenes: string[]
  keyFinding: string
}

async function callDeepSeekJson(prompt: string): Promise<any> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`)
  const data = await res.json()
  const text = data.choices[0].message.content
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  return JSON.parse(match[0])
}

export async function extractAndStore(paperId: string, text: string): Promise<void> {
  const prompt = `从以下生物学文献摘要/全文中提取实验数据，只返回JSON，无其他文字。
重点提取：基因名（如egtD、egtB、egtE、metK、hisG等）、宿主、产量数值。

文本：
${text.slice(0, 3000)}

返回格式：
{
  "host_organism": "宿主菌株名，如 E. coli / B. subtilis / S. cerevisiae，无则null",
  "genes_overexpressed": ["过表达或异源引入的基因名列表，从文本中直接提取，无则[]"],
  "genes_knocked_out": ["敲除的基因名列表，无则[]"],
  "heterologous_genes": ["异源引入的基因名列表（来自其他物种），无则[]"],
  "titer_mg_per_l": 产量数值(mg/L)，若文中为g/L则乘以1000转换，无则null,
  "key_finding": "1-2句关键发现，重点描述工程策略和产量提升"
}`

  try {
    const extracted = await callDeepSeekJson(prompt)
    const db = getDb()
    await db.from('literature_extractions').upsert({
      paper_id: paperId,
      host_organism: extracted.host_organism ?? null,
      genes_overexpressed: extracted.genes_overexpressed ?? [],
      genes_knocked_out: extracted.genes_knocked_out ?? [],
      heterologous_genes: extracted.heterologous_genes ?? [],
      titer_mg_per_l: extracted.titer_mg_per_l ?? null,
      key_finding: extracted.key_finding ?? '',
      extraction_method: 'ai_extracted',
    })
  } catch { /* non-fatal */ }
}

export async function syncPubMedLiterature(molecule = 'ergothioneine', minYear?: number): Promise<number> {
  const yearFilter = minYear ? ` AND ${minYear}:3000[pdat]` : ''
  const query = `${molecule} AND (biosynthesis OR "metabolic engineering" OR "microbial production" OR "fermentation" OR "yield improvement") AND (bacteria OR yeast OR "E. coli" OR "Escherichia coli" OR "Saccharomyces" OR "Bacillus" OR "Corynebacterium" OR "Yarrowia")${yearFilter}`
  const searchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=100&retmode=json`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!searchRes.ok) return 0
  const searchData = await searchRes.json()
  const pmids: string[] = searchData.esearchresult?.idlist ?? []
  if (!pmids.length) return 0

  const summaryRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!summaryRes.ok) return 0
  const summaryData = await summaryRes.json()

  const db = getDb()
  let added = 0

  for (const pmid of pmids) {
    const s = summaryData.result[pmid]
    if (!s) continue
    const { data: existing } = await db.from('literature_papers').select('id').eq('pmid', pmid).single()
    if (existing) continue

    const abstract = await fetchAbstract(pmid)
    const { data: paper } = await db.from('literature_papers').insert({
      pmid,
      title: s.title ?? '',
      abstract,
      authors: s.authors?.map((a: any) => a.name) ?? [],
      journal: s.fulljournalname ?? s.source ?? '',
      year: parseInt(s.pubdate?.split(' ')[0]) || null,
      doi: s.elocationid?.replace('doi: ', '') ?? null,
      source: 'pubmed',
      molecule,
    }).select('id').single()

    if (paper?.id && abstract) {
      await extractAndStore(paper.id, abstract)
    }
    added++
  }

  return added
}

async function fetchAbstract(pmid: string): Promise<string> {
  try {
    const res = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`,
      { signal: AbortSignal.timeout(10000) }
    )
    return res.ok ? await res.text() : ''
  } catch { return '' }
}

export async function queryLiteratureContext(molecule: string, host: string): Promise<LocalLiteratureEntry[]> {
  const db = getDb()
  const { data } = await db
    .from('literature_extractions')
    .select(`
      host_organism, genes_overexpressed, genes_knocked_out, heterologous_genes,
      titer_mg_per_l, key_finding,
      literature_papers!inner(title, year, molecule)
    `)
    .ilike('literature_papers.molecule', `%${molecule.split(' ')[0]}%`)
    .order('titer_mg_per_l', { ascending: false })
    .limit(5)

  if (!data) return []

  return data
    .filter((r: any) => r.key_finding)
    .map((r: any) => ({
      title: r.literature_papers?.title ?? '',
      year: r.literature_papers?.year ?? 0,
      host: r.host_organism ?? 'unknown',
      titer: r.titer_mg_per_l ?? undefined,
      genesOverexpressed: r.genes_overexpressed ?? [],
      genesKnockedOut: r.genes_knocked_out ?? [],
      heterologousGenes: r.heterologous_genes ?? [],
      keyFinding: r.key_finding ?? '',
    }))
}
