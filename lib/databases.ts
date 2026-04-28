import { createClient } from '@supabase/supabase-js'

let _supabaseAdmin: ReturnType<typeof createClient> | null = null
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabaseAdmin
}

const CACHE_TTL_DAYS = 7

const COMPOUND_MAP: Record<string, string> = {
  // 萜类
  '番茄红素': 'lycopene', '青蒿素': 'artemisinin', '虾青素': 'astaxanthin',
  '紫杉醇': 'paclitaxel', '胡萝卜素': 'beta-carotene', 'β-胡萝卜素': 'beta-carotene',
  '法尼烯': 'farnesene', '异戊二烯': 'isoprene', '角鲨烯': 'squalene',
  '紫穗槐二烯': 'amorphadiene', '香叶醇': 'geraniol', '芳樟醇': 'linalool',
  '柠檬烯': 'limonene', '薄荷醇': 'menthol', '紫杉二烯': 'taxadiene',
  // 酚类 / 黄酮
  '白藜芦醇': 'resveratrol', '姜黄素': 'curcumin', '花青素': 'anthocyanin',
  '槲皮素': 'quercetin', '芹菜素': 'apigenin', '柚皮素': 'naringenin',
  '圣草酚': 'eriodictyol', '木犀草素': 'luteolin', '山奈酚': 'kaempferol',
  '对香豆酸': 'p-coumaric acid', '咖啡酸': 'caffeic acid', '阿魏酸': 'ferulic acid',
  // 生物碱
  '咖啡因': 'caffeine', '可可碱': 'theobromine', '茶碱': 'theophylline',
  '吗啡': 'morphine', '可待因': 'codeine', '那可丁': 'noscapine',
  '小檗碱': 'berberine', '长春碱': 'vinblastine', '长春新碱': 'vincristine',
  // 有机酸
  '琥珀酸': 'succinic acid', '乳酸': 'lactic acid', '衣康酸': 'itaconic acid',
  '富马酸': 'fumaric acid', '苹果酸': 'malic acid', '柠檬酸': 'citric acid',
  '葡萄糖酸': 'gluconic acid', '丙酮酸': 'pyruvic acid', '丁二酸': 'succinic acid',
  '3-羟基丙酸': '3-hydroxypropionic acid', '己二酸': 'adipic acid',
  // 醇类 / 燃料
  '1,4-丁二醇': '1,4-butanediol', '2,3-丁二醇': '2,3-butanediol',
  '异丁醇': 'isobutanol', '正丁醇': 'n-butanol', '乙醇': 'ethanol',
  '丙二醇': 'propanediol', '1,3-丙二醇': '1,3-propanediol',
  // 氨基酸 / 维生素
  '赖氨酸': 'lysine', '色氨酸': 'tryptophan', '苯丙氨酸': 'phenylalanine',
  '酪氨酸': 'tyrosine', '谷氨酸': 'glutamic acid', '丙氨酸': 'alanine',
  '维生素C': 'ascorbic acid', '维生素B2': 'riboflavin', '维生素B12': 'cobalamin',
  // 其他天然产物
  '香兰素': 'vanillin', '紫草素': 'shikonin', '人参皂苷': 'ginsenoside',
  '大麻素': 'cannabinoid', '大麻二酚': 'cannabidiol', '四氢大麻酚': 'tetrahydrocannabinol',
  '辅酶Q10': 'coenzyme Q10', '玉米黄质': 'zeaxanthin',
  '叶黄素': 'lutein', '角黄素': 'canthaxanthin',
}

function normalizeName(name: string): string {
  const trimmed = name.trim()
  if (COMPOUND_MAP[trimmed]) return COMPOUND_MAP[trimmed]
  const lower = trimmed.toLowerCase()
  const key = Object.keys(COMPOUND_MAP).find(k => lower.includes(k))
  return COMPOUND_MAP[key ?? ''] || trimmed
}

export const HOST_GENOME: Record<string, { hasGenes: string[]; lackPathways: string[] }> = {
  'E. coli': {
    hasGenes: ['dxs', 'idi', 'ispA', 'ispB', 'ispC', 'ispD', 'ispE', 'ispF', 'ispG', 'ispH', 'ldhA', 'fumC', 'pgi', 'zwf'],
    lackPathways: ['MVA途径', 'crtY', 'crtZ', 'crtW', 'crtS'],
  },
  'S. cerevisiae': {
    hasGenes: ['ERG10', 'ERG13', 'ERG12', 'ERG8', 'ERG19', 'IDI1', 'ERG20', 'HMG1', 'HMG2'],
    lackPathways: ['MEP途径', 'crtI', 'crtB', 'crtE'],
  },
  'B. subtilis': {
    hasGenes: ['dxs', 'idi', 'ispA', 'alsS', 'alsD'],
    lackPathways: ['MVA途径'],
  },
}

export interface DatabaseContext {
  pubchem: { formula: string; weight: string; iupacName: string; synonyms: string[] } | null
  kegg: { id: string; pathways: string[]; enzymes: string[]; reactions: string[] } | null
  uniprot: { accession: string; name: string; organism: string; gene?: string; length?: number; function?: string }[]
  searchedName: string
  hostGenome?: { hasGenes: string[]; lackPathways: string[] }
  literature: { title: string; pmid: string; year: string }[]
}

async function queryPubChem(name: string): Promise<DatabaseContext['pubchem']> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const prop = data.PropertyTable?.Properties?.[0]
    if (!prop) return null

    let synonyms: string[] = []
    try {
      const synRes = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${prop.CID}/synonyms/JSON`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (synRes.ok) {
        const synData = await synRes.json()
        synonyms = synData.InformationList?.Information?.[0]?.Synonym?.slice(0, 5) ?? []
      }
    } catch { /* ignore */ }

    return { formula: prop.MolecularFormula, weight: prop.MolecularWeight, iupacName: prop.IUPACName, synonyms }
  } catch { return null }
}

async function queryKEGG(name: string): Promise<DatabaseContext['kegg']> {
  try {
    const findRes = await fetch(`https://rest.kegg.jp/find/compound/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(10000) })
    if (!findRes.ok) return null
    const firstLine = (await findRes.text()).split('\n')[0]
    if (!firstLine) return null
    const id = firstLine.split('\t')[0]

    const [pwRes, ecRes, rxnRes] = await Promise.all([
      fetch(`https://rest.kegg.jp/link/pathway/${id}`, { signal: AbortSignal.timeout(10000) }),
      fetch(`https://rest.kegg.jp/link/enzyme/${id}`, { signal: AbortSignal.timeout(10000) }),
      fetch(`https://rest.kegg.jp/link/reaction/${id}`, { signal: AbortSignal.timeout(10000) }),
    ])

    const parse = async (r: Response) =>
      r.ok ? (await r.text()).trim().split('\n').map(l => l.split('\t')[1]).filter(Boolean) : []

    return {
      id,
      pathways: await parse(pwRes),
      enzymes: await parse(ecRes),
      reactions: await parse(rxnRes),
    }
  } catch { return null }
}

async function queryUniProt(name: string): Promise<DatabaseContext['uniprot']> {
  try {
    const res = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(name)}&format=json&size=3`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((r: any) => ({
      accession: r.primaryAccession,
      name: r.proteinDescription?.recommendedName?.fullName?.value ?? 'Unknown',
      organism: r.organism?.scientificName ?? 'Unknown',
      gene: r.genes?.[0]?.geneName?.value,
      length: r.sequence?.length,
      function: r.comments?.find((c: any) => c.commentType === 'FUNCTION')?.text?.[0]?.value,
    }))
  } catch { return [] }
}

async function queryPubMed(query: string): Promise<{ title: string; pmid: string; year: string }[]> {
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=3&retmode=json`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const pmids: string[] = searchData.esearchresult?.idlist ?? []
    if (!pmids.length) return []

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!summaryRes.ok) return []
    const summaryData = await summaryRes.json()

    return pmids.map(id => ({
      title: summaryData.result[id]?.title ?? 'Unknown',
      pmid: id,
      year: summaryData.result[id]?.pubdate?.split(' ')[0] ?? '',
    }))
  } catch { return [] }
}

export async function gatherContext(molecule: string, host?: string): Promise<DatabaseContext> {
  const searchedName = normalizeName(molecule)
  const hostGenome = host ? HOST_GENOME[host] : undefined

  const db = getSupabaseAdmin() as any
  const { data: cached } = await db
    .from('compound_cache')
    .select('context, cached_at')
    .eq('name', searchedName)
    .single() as { data: { context: DatabaseContext; cached_at: string } | null }

  if (cached) {
    const age = (Date.now() - new Date(cached.cached_at).getTime()) / 86400000
    if (age < CACHE_TTL_DAYS) {
      const literature = await queryPubMed(`${searchedName} biosynthesis metabolic engineering`)
      return { ...cached.context, hostGenome, literature }
    }
  }

  const [pubchem, kegg, uniprot, literature] = await Promise.all([
    queryPubChem(searchedName),
    queryKEGG(searchedName),
    queryUniProt(searchedName),
    queryPubMed(`${searchedName} biosynthesis metabolic engineering`),
  ])
  const ctx: DatabaseContext = { pubchem, kegg, uniprot, searchedName, hostGenome, literature }

  try {
    await db
      .from('compound_cache')
      .upsert({ name: searchedName, context: ctx, cached_at: new Date().toISOString() })
  } catch { /* cache write failure is non-fatal */ }

  return ctx
}
