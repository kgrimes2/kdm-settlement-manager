export interface GlossaryTerm {
  term: string
  definition: string
  category?: string
  relatedTerms?: string[]
  url?: string
}

export interface GlossaryData {
  terms: GlossaryTerm[]
  lastUpdated: string
  version: string
}
