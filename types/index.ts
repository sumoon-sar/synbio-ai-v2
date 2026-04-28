export interface AnalysisInput {
  molecule: string
  host: string
}

export interface AnalysisResult {
  molecule: string
  host: string
  structureInfo: {
    formula: string
    weight: string
    iupacName: string
    synonyms: string[]
  } | null
  metabolicRoute: {
    step: string
    enzyme: string
    source: 'KEGG' | 'AI'
  }[]
  keyEnzymes: {
    name: string
    gene: string
    organism: string
    accession: string
    function: string
  }[]
  engineeringStrategy: {
    overexpress: string[]
    knockout: string[]
    cofactors: string[]
    notes: string
  }
  reviewWarnings: string[]
  rawAnalysis: string
}

export interface HistoryItem {
  id: string
  molecule: string
  host: string
  created_at: string
  result: AnalysisResult
}
