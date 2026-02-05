import type { GlossaryTerm } from '../types/glossary'

export interface SearchResult {
  term: GlossaryTerm
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

function calculateScore(term: GlossaryTerm, query: string): number {
  const termLower = term.term.toLowerCase()

  // Exact match (highest score)
  if (termLower === query) {
    return 100
  }

  // Starts with query
  if (termLower.startsWith(query)) {
    return 80
  }

  // Contains query as whole word
  const wordBoundaryPattern = new RegExp(`\\b${escapeRegex(query)}\\b`)
  if (wordBoundaryPattern.test(termLower)) {
    return 60
  }

  // Contains query
  if (termLower.includes(query)) {
    return 40
  }

  // Fuzzy match (allow some character differences)
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
