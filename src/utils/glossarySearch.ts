import type { GlossaryTerm, WikiCategoryInfo } from '../types/glossary'

export interface SearchResult {
  term: GlossaryTerm
  score: number
  source?: 'official' | 'wiki'
}

export interface CategorySearchResult {
  category: WikiCategoryInfo
  score: number
}

/**
 * Search glossary terms with fuzzy matching
 */
export function searchGlossary(
  terms: GlossaryTerm[],
  query: string,
  maxResults: number = 10
): SearchResult[] {
  if (!query.trim()) {
    return []
  }

  const normalizedQuery = query.toLowerCase().trim()
  const results: SearchResult[] = []

  for (const term of terms) {
    const score = calculateScore(term, normalizedQuery)
    if (score > 0) {
      results.push({ term, score })
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, maxResults)
}

/**
 * Search categories by name
 */
export function searchCategories(
  categories: WikiCategoryInfo[],
  query: string
): CategorySearchResult[] {
  if (!query.trim()) return []

  const normalizedQuery = query.toLowerCase().trim()
  const results: CategorySearchResult[] = []

  for (const category of categories) {
    const catLower = category.category.toLowerCase()

    if (catLower === normalizedQuery) {
      results.push({ category, score: 100 })
    } else if (catLower.startsWith(normalizedQuery)) {
      results.push({ category, score: 80 })
    } else if (catLower.includes(normalizedQuery)) {
      results.push({ category, score: 60 })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

function calculateScore(term: GlossaryTerm, query: string): number {
  const termLower = term.term.toLowerCase()
  // Strip parenthetical qualifier: "Berserker (Fighting Art)" -> "berserker"
  const baseTerm = termLower.replace(/\s*\(.*?\)\s*$/, '').trim()

  // Exact match (highest score)
  if (termLower === query || baseTerm === query) {
    return 100
  }

  // Base term starts with query: "berserker" matches "Berserker (Fighting Art)"
  if (baseTerm.startsWith(query)) {
    return 90
  }

  // Full term starts with query
  if (termLower.startsWith(query)) {
    return 80
  }

  // Query matches base term as whole word
  const wordBoundaryPattern = new RegExp(`\\b${escapeRegex(query)}\\b`)
  if (wordBoundaryPattern.test(baseTerm)) {
    return 70
  }

  // Contains query as whole word in full term
  if (wordBoundaryPattern.test(termLower)) {
    return 60
  }

  // Contains query
  if (termLower.includes(query)) {
    return 40
  }

  // Fuzzy match against base term (more forgiving)
  const baseFuzzy = fuzzyMatch(baseTerm, query)
  if (baseFuzzy > 0.6) {
    return Math.floor(baseFuzzy * 35)
  }

  // Fuzzy match against full term
  const fuzzyScore = fuzzyMatch(termLower, query)
  if (fuzzyScore > 0.6) {
    return Math.floor(fuzzyScore * 30)
  }

  // Check definition for matches (lower priority)
  const defLower = term.definition.toLowerCase()
  if (defLower.includes(query)) {
    return 10
  }

  return 0
}

function fuzzyMatch(str: string, query: string): number {
  let strIndex = 0
  let queryIndex = 0
  let matches = 0

  while (strIndex < str.length && queryIndex < query.length) {
    if (str[strIndex] === query[queryIndex]) {
      matches++
      queryIndex++
    }
    strIndex++
  }

  return queryIndex === query.length ? matches / query.length : 0
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get terms by category
 */
export function getTermsByCategory(terms: GlossaryTerm[]): Map<string, GlossaryTerm[]> {
  const categorized = new Map<string, GlossaryTerm[]>()

  for (const term of terms) {
    const category = term.category || 'Uncategorized'
    if (!categorized.has(category)) {
      categorized.set(category, [])
    }
    categorized.get(category)!.push(term)
  }

  return categorized
}
