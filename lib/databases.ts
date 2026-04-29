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

type PrecursorType = 'terpenoid' | 'phenylpropanoid' | 'alkaloid' | 'organic_acid' | 'amino_acid' | 'other'

interface CompoundEntry {
  en: string
  precursor: PrecursorType
  hint?: string
  forbiddenGenes?: string[]
}

const COMPOUND_MAP: Record<string, CompoundEntry> = {
  // 萜类 — 前体 IPP/DMAPP (MEP/MVA途径)
  '番茄红素': { en: 'lycopene', precursor: 'terpenoid' },
  '青蒿素': { en: 'artemisinin', precursor: 'terpenoid' },
  '虾青素': { en: 'astaxanthin', precursor: 'terpenoid', hint: '前体为IPP/DMAPP（萜类），相关内源基因为MEP途径(dxs,idi,ispA等)。关键异源酶：crtW（β-胡萝卜素酮化酶，推荐来自Brevundimonas vesicularis）、crtZ（β-胡萝卜素羟化酶，推荐来自Pantoea ananatis）、crtYB（番茄红素环化酶/八氢番茄红素合酶，推荐来自Phaffia rhodozyma）' },
  '紫杉醇': { en: 'paclitaxel', precursor: 'terpenoid' },
  '胡萝卜素': { en: 'beta-carotene', precursor: 'terpenoid' },
  'β-胡萝卜素': { en: 'beta-carotene', precursor: 'terpenoid' },
  '法尼烯': { en: 'farnesene', precursor: 'terpenoid' },
  '异戊二烯': { en: 'isoprene', precursor: 'terpenoid' },
  '角鲨烯': { en: 'squalene', precursor: 'terpenoid' },
  '紫穗槐二烯': { en: 'amorphadiene', precursor: 'terpenoid' },
  '香叶醇': { en: 'geraniol', precursor: 'terpenoid' },
  '芳樟醇': { en: 'linalool', precursor: 'terpenoid' },
  '柠檬烯': { en: 'limonene', precursor: 'terpenoid' },
  '薄荷醇': { en: 'menthol', precursor: 'terpenoid' },
  '紫杉二烯': { en: 'taxadiene', precursor: 'terpenoid' },
  '玉米黄质': { en: 'zeaxanthin', precursor: 'terpenoid' },
  '叶黄素': { en: 'lutein', precursor: 'terpenoid' },
  '角黄素': { en: 'canthaxanthin', precursor: 'terpenoid' },
  '辅酶Q10': { en: 'coenzyme Q10', precursor: 'terpenoid' },
  // 酚类 / 黄酮 — 前体 苯丙氨酸/酪氨酸 (莽草酸途径)
  '白藜芦醇': { en: 'resveratrol', precursor: 'phenylpropanoid' },
  '姜黄素': { en: 'curcumin', precursor: 'phenylpropanoid' },
  '花青素': { en: 'anthocyanin', precursor: 'phenylpropanoid' },
  '槲皮素': { en: 'quercetin', precursor: 'phenylpropanoid' },
  '芹菜素': { en: 'apigenin', precursor: 'phenylpropanoid' },
  '柚皮素': { en: 'naringenin', precursor: 'phenylpropanoid' },
  '圣草酚': { en: 'eriodictyol', precursor: 'phenylpropanoid' },
  '木犀草素': { en: 'luteolin', precursor: 'phenylpropanoid' },
  '山奈酚': { en: 'kaempferol', precursor: 'phenylpropanoid' },
  '对香豆酸': { en: 'p-coumaric acid', precursor: 'phenylpropanoid' },
  '咖啡酸': { en: 'caffeic acid', precursor: 'phenylpropanoid' },
  '阿魏酸': { en: 'ferulic acid', precursor: 'phenylpropanoid' },
  '香兰素': { en: 'vanillin', precursor: 'phenylpropanoid' },
  // 生物碱 — 前体 氨基酸 (酪氨酸/色氨酸等)
  '咖啡因': { en: 'caffeine', precursor: 'alkaloid' },
  '可可碱': { en: 'theobromine', precursor: 'alkaloid' },
  '茶碱': { en: 'theophylline', precursor: 'alkaloid' },
  '吗啡': { en: 'morphine', precursor: 'alkaloid' },
  '可待因': { en: 'codeine', precursor: 'alkaloid' },
  '那可丁': { en: 'noscapine', precursor: 'alkaloid' },
  '小檗碱': { en: 'berberine', precursor: 'alkaloid' },
  '长春碱': { en: 'vinblastine', precursor: 'alkaloid' },
  '长春新碱': { en: 'vincristine', precursor: 'alkaloid' },
  // 有机酸 — 前体 丙酮酸/草酰乙酸 (TCA途径)
  '琥珀酸': { en: 'succinic acid', precursor: 'organic_acid' },
  '乳酸': { en: 'lactic acid', precursor: 'organic_acid' },
  '衣康酸': { en: 'itaconic acid', precursor: 'organic_acid' },
  '富马酸': { en: 'fumaric acid', precursor: 'organic_acid' },
  '苹果酸': { en: 'malic acid', precursor: 'organic_acid' },
  '柠檬酸': { en: 'citric acid', precursor: 'organic_acid' },
  '葡萄糖酸': { en: 'gluconic acid', precursor: 'organic_acid' },
  '丙酮酸': { en: 'pyruvic acid', precursor: 'organic_acid' },
  '丁二酸': { en: 'succinic acid', precursor: 'organic_acid' },
  '3-羟基丙酸': { en: '3-hydroxypropionic acid', precursor: 'organic_acid' },
  '己二酸': { en: 'adipic acid', precursor: 'organic_acid' },
  // 醇类 / 燃料 — 前体 丙酮酸/乙酰CoA
  '1,4-丁二醇': { en: '1,4-butanediol', precursor: 'organic_acid' },
  '2,3-丁二醇': { en: '2,3-butanediol', precursor: 'organic_acid' },
  '异丁醇': { en: 'isobutanol', precursor: 'organic_acid' },
  '正丁醇': { en: 'n-butanol', precursor: 'organic_acid' },
  '乙醇': { en: 'ethanol', precursor: 'organic_acid' },
  '丙二醇': { en: 'propanediol', precursor: 'organic_acid' },
  '1,3-丙二醇': { en: '1,3-propanediol', precursor: 'organic_acid' },
  // 氨基酸 / 维生素
  '赖氨酸': { en: 'lysine', precursor: 'amino_acid' },
  '色氨酸': { en: 'tryptophan', precursor: 'amino_acid' },
  '苯丙氨酸': { en: 'phenylalanine', precursor: 'amino_acid' },
  '酪氨酸': { en: 'tyrosine', precursor: 'amino_acid' },
  '谷氨酸': { en: 'glutamic acid', precursor: 'amino_acid' },
  '丙氨酸': { en: 'alanine', precursor: 'amino_acid' },
  '维生素C': { en: 'ascorbic acid', precursor: 'amino_acid' },
  '维生素B2': { en: 'riboflavin', precursor: 'amino_acid' },
  '维生素B12': { en: 'cobalamin', precursor: 'amino_acid' },
  // 含硫氨基酸衍生物 — 前体 组氨酸/半胱氨酸
  '麦角硫因': { en: 'ergothioneine', precursor: 'amino_acid', hint: '前体为L-组氨酸和S-腺苷甲硫氨酸（SAM），只过表达组氨酸合成相关基因（hisG,hisD,hisB,hisH,hisA,hisF,hisI）和SAM合成基因（metK），禁止过表达MEP途径(dxs,idi,isp*)基因。关键酶必须使用Mycobacterium smegmatis的egtD（EC 2.1.1.44）、egtB（EC 2.5.1.112）、egtE（EC 4.4.1.36）三步合成路径，禁止使用其他物种的转运蛋白替代合成酶', forbiddenGenes: ['dxs','idi','ispA','ispB','ispC','ispD','ispE','ispF','ispG','ispH','pgi','zwf'] },
  '谷胱甘肽': { en: 'glutathione', precursor: 'amino_acid' },
  // 聚酮/脂肪酸衍生物
  '脂肪酸': { en: 'fatty acid', precursor: 'organic_acid' },
  '己内酰胺': { en: 'caprolactam', precursor: 'organic_acid' },
  // 其他
  '紫草素': { en: 'shikonin', precursor: 'other' },
  '人参皂苷': { en: 'ginsenoside', precursor: 'terpenoid' },
  '大麻素': { en: 'cannabinoid', precursor: 'other' },
  '大麻二酚': { en: 'cannabidiol', precursor: 'other' },
  '四氢大麻酚': { en: 'tetrahydrocannabinol', precursor: 'other' },
}

const PRECURSOR_HINT: Record<PrecursorType, string> = {
  terpenoid: '前体为IPP/DMAPP（萜类），相关内源基因为MEP途径(dxs,idi,ispA等)或MVA途径，只过表达与萜类合成直接相关的基因',
  phenylpropanoid: '前体为苯丙氨酸/酪氨酸（莽草酸途径），相关内源基因为aroG,aroB,aroD,aroE,aroK,aroA,aroC,pheA,tyrA等，只过表达莽草酸途径相关基因',
  alkaloid: '前体为氨基酸（酪氨酸/色氨酸/组氨酸等），只过表达与该氨基酸合成直接相关的基因',
  organic_acid: '前体为丙酮酸/草酰乙酸（TCA途径），相关内源基因为ppc,pck,mdh,sdhABCD等，只过表达TCA途径相关基因',
  amino_acid: '前体为氨基酸（组氨酸/赖氨酸/色氨酸等），只过表达与目标氨基酸合成直接相关的基因（如hisG,hisD等），禁止过表达MEP途径(dxs,idi,isp*)或TCA途径基因',
  other: '根据KEGG数据判断前体类型，只过表达与目标产物合成直接相关的基因',
}

function normalizeName(name: string): { en: string; precursorHint?: string; forbiddenGenes?: string[] } {
  const trimmed = name.trim()
  const entry = COMPOUND_MAP[trimmed]
  if (entry) return { en: entry.en, precursorHint: entry.hint ?? PRECURSOR_HINT[entry.precursor], forbiddenGenes: entry.forbiddenGenes }
  const lower = trimmed.toLowerCase()
  const key = Object.keys(COMPOUND_MAP).find(k => lower.includes(k.toLowerCase()))
  if (key) return { en: COMPOUND_MAP[key].en, precursorHint: PRECURSOR_HINT[COMPOUND_MAP[key].precursor], forbiddenGenes: COMPOUND_MAP[key].forbiddenGenes }
  return { en: trimmed }
}

export const HOST_GENOME: Record<string, { hasGenes: string[]; lackPathways: string[] }> = {
  'E. coli': {
    hasGenes: [
      // MEP途径
      'dxs', 'idi', 'ispA', 'ispB', 'ispC', 'ispD', 'ispE', 'ispF', 'ispG', 'ispH',
      // 糖代谢/NADPH
      'pgi', 'zwf', 'gnd', 'tktA', 'tktB', 'talB',
      // TCA途径
      'sdhA', 'sdhB', 'sdhC', 'sdhD', 'fumA', 'fumB', 'fumC', 'mdh', 'sucA', 'sucB', 'sucC', 'sucD', 'icd', 'acnA', 'acnB',
      // 糖酵解/丙酮酸
      'ppc', 'pck', 'pykA', 'pykF', 'ldhA', 'pta', 'ackA',
      // 莽草酸途径
      'aroG', 'aroB', 'aroD', 'aroE', 'aroK', 'aroA', 'aroC', 'pheA', 'tyrA', 'trpE', 'trpD', 'trpC', 'trpB', 'trpA',
      // 组氨酸合成
      'hisG', 'hisD', 'hisB', 'hisH', 'hisA', 'hisF', 'hisI', 'hisC', 'hisE',
      // SAM/甲硫氨酸
      'metK', 'metA', 'metB', 'metC', 'metE', 'metH',
      // 赖氨酸/天冬氨酸族
      'lysA', 'lysC', 'asd', 'dapA', 'dapB', 'dapD', 'dapE', 'dapF',
      // 脂肪酸
      'fabB', 'fabF', 'fabH', 'fabI', 'fabZ', 'fabA', 'fabD', 'fabG',
      // 辅因子
      'ubiA', 'ubiC', 'ubiD', 'ubiE', 'ubiF', 'ubiG', 'ubiH',
    ],
    lackPathways: ['MVA途径', 'crtY', 'crtZ', 'crtW', 'crtS'],
  },
  'S. cerevisiae': {
    hasGenes: [
      // MVA途径
      'ERG10', 'ERG13', 'ERG12', 'ERG8', 'ERG19', 'IDI1', 'ERG20', 'HMG1', 'HMG2',
      // 类固醇/萜类
      'ERG1', 'ERG2', 'ERG3', 'ERG4', 'ERG5', 'ERG6', 'ERG7', 'ERG9', 'ERG11', 'ERG24', 'ERG25', 'ERG26', 'ERG27',
      // 莽草酸途径
      'ARO1', 'ARO2', 'ARO3', 'ARO4', 'ARO7', 'ARO8', 'ARO9', 'TRP1', 'TRP2', 'TRP3', 'TRP4', 'TRP5',
      // 糖酵解/TCA
      'PYK1', 'PYK2', 'PDC1', 'PDC5', 'PDC6', 'ADH1', 'ADH2', 'CIT1', 'ACO1', 'IDH1', 'IDH2', 'KGD1', 'KGD2',
      // 脂肪酸
      'FAS1', 'FAS2', 'ACC1',
      // 辅因子
      'MET6', 'SAM1', 'SAM2',
    ],
    lackPathways: ['MEP途径', 'crtI', 'crtB', 'crtE'],
  },
  'B. subtilis': {
    hasGenes: [
      // MEP途径
      'dxs', 'idi', 'ispA',
      // MVA途径（B. subtilis有完整MVA途径）
      'mvaA', 'mvaS', 'mvaK1', 'mvaK2', 'mvaD', 'mvaE',
      // 莽草酸途径
      'aroA', 'aroB', 'aroC', 'aroD', 'aroE', 'aroF', 'aroG', 'aroH',
      // 组氨酸合成
      'hisG', 'hisD', 'hisB', 'hisH', 'hisA', 'hisF', 'hisI', 'hisC', 'hisE',
      // SAM/甲硫氨酸
      'metK', 'metA', 'metB', 'metC', 'metE', 'metH',
      // TCA途径
      'citA', 'citB', 'icd', 'odhA', 'odhB', 'sdhA', 'sdhB', 'sdhC', 'fumC', 'mdh',
      // 糖酵解
      'pgi', 'pfkA', 'fbaA', 'tpiA', 'gapA', 'pgk', 'pgm', 'eno', 'pykA',
      // 脂肪酸
      'fabHA', 'fabHB', 'fabI', 'fabF', 'fabG',
    ],
    lackPathways: ['crtY', 'crtZ', 'crtW', 'crtS', 'crtI', 'crtB', 'crtE'],
  },
}

export interface DatabaseContext {
  pubchem: { formula: string; weight: string; iupacName: string; synonyms: string[] } | null
  kegg: { id: string; pathways: string[]; enzymes: string[]; reactions: string[]; reactionDetails: { id: string; equation: string; enzymes: string[] }[] } | null
  uniprot: { accession: string; name: string; organism: string; gene?: string; length?: number; function?: string }[]
  searchedName: string
  precursorHint?: string
  forbiddenGenes?: string[]
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

    const reactions = await parse(rxnRes)
    const rxnIds = reactions.slice(0, 8).map(r => r.replace('rn:', ''))

    let reactionDetails: { id: string; equation: string; enzymes: string[] }[] = []
    if (rxnIds.length) {
      try {
        const detailRes = await fetch(`https://rest.kegg.jp/get/${rxnIds.join('+')}`, { signal: AbortSignal.timeout(15000) })
        if (detailRes.ok) {
          const text = await detailRes.text()
          const entries = text.split('///').filter(Boolean)
          reactionDetails = entries.map(entry => {
            const idMatch = entry.match(/^ENTRY\s+(\S+)/m)
            const eqMatch = entry.match(/^EQUATION\s+(.+)/m)
            const ecMatches = [...entry.matchAll(/\[EC:([\d.]+)\]/g)].map(m => m[1])
            return {
              id: idMatch?.[1] ?? '',
              equation: eqMatch?.[1]?.trim() ?? '',
              enzymes: ecMatches,
            }
          }).filter(r => r.id)
        }
      } catch { /* non-fatal */ }
    }

    return {
      id,
      pathways: await parse(pwRes),
      enzymes: await parse(ecRes),
      reactions,
      reactionDetails,
    }
  } catch { return null }
}

async function queryUniProt(name: string): Promise<DatabaseContext['uniprot']> {
  try {
    const query = `${name} biosynthesis NOT transport NOT permease NOT transporter`
    const res = await fetch(
      `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}&format=json&size=5`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? [])
      .filter((r: any) => {
        const name = r.proteinDescription?.recommendedName?.fullName?.value ?? ''
        return !/(transport|permease|binding protein|ABC)/i.test(name)
      })
      .slice(0, 3)
      .map((r: any) => ({
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
  const { en: searchedName, precursorHint, forbiddenGenes } = normalizeName(molecule)
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
      return { ...cached.context, hostGenome, precursorHint, forbiddenGenes, literature }
    }
  }

  const [pubchem, kegg, uniprot, literature] = await Promise.all([
    queryPubChem(searchedName),
    queryKEGG(searchedName),
    queryUniProt(searchedName),
    queryPubMed(`${searchedName} biosynthesis metabolic engineering`),
  ])
  const ctx: DatabaseContext = { pubchem, kegg, uniprot, searchedName, precursorHint, forbiddenGenes, hostGenome, literature }

  try {
    await db
      .from('compound_cache')
      .upsert({ name: searchedName, context: ctx, cached_at: new Date().toISOString() })
  } catch { /* cache write failure is non-fatal */ }

  return ctx
}
