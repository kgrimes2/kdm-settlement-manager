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

export interface WikiCategoryInfo {
  category: string
  slug: string
  count: number
}

export interface WikiIndexEntry {
  term: string
  category: string
  url: string
}

export interface WikiIndex {
  categories: WikiCategoryInfo[]
  termsBySlug: Record<string, string[]>
  totalTerms: number
  lastUpdated: string
}

export interface WikiCategoryData {
  category: string
  terms: GlossaryTerm[]
  lastUpdated: string
}
