#!/usr/bin/env node

/**
 * Parses the __NEXT_DATA__ JSON from the living glossary page
 * Run with: node scripts/parse-glossary-json.mjs <path-to-json-file>
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUTPUT_PATH = join(__dirname, '../src/data/glossary.json')

const inputFile = process.argv[2] || '/tmp/glossary-data.json'

console.log('Reading JSON data from:', inputFile)

try {
  const jsonData = JSON.parse(readFileSync(inputFile, 'utf-8'))

  // Navigate the Next.js data structure to find glossary items
  const glossaryItems = jsonData?.props?.pageProps?.data?.allGlossaryEntries || []

  console.log(`Found ${glossaryItems.length} glossary items`)

  if (glossaryItems.length === 0) {
    console.log('No glossary items found. JSON structure:', Object.keys(jsonData))
    if (jsonData.props) console.log('props keys:', Object.keys(jsonData.props))
    if (jsonData.props?.pageProps) console.log('pageProps keys:', Object.keys(jsonData.props.pageProps))
    if (jsonData.props?.pageProps?.data) console.log('data keys:', Object.keys(jsonData.props.pageProps.data))
    process.exit(1)
  }

  const terms = glossaryItems.map(item => {
    const term = {
      term: item.title || item.name || 'Unknown',
      definition: cleanText(item.body || item.description || item.content || '')
    }

    // Add optional fields if they exist
    if (item.category) term.category = item.category
    if (item.relatedTerms) term.relatedTerms = item.relatedTerms

    return term
  }).filter(term => term.definition) // Only include terms with definitions

  const glossaryData = {
    terms,
    lastUpdated: new Date().toISOString(),
    version: '1.0.0'
  }

  console.log(`Parsed ${terms.length} valid terms`)

  // Write to JSON file
  writeFileSync(OUTPUT_PATH, JSON.stringify(glossaryData, null, 2))
  console.log('Glossary data written to:', OUTPUT_PATH)

  // Show first few terms as preview
  console.log('\nFirst 10 terms:')
  terms.slice(0, 10).forEach(term => {
    console.log(`  - ${term.term}`)
  })

  console.log(`\n...and ${terms.length - 10} more terms`)

} catch (error) {
  console.error('Error parsing glossary:', error.message)
  process.exit(1)
}

function cleanText(text) {
  if (!text) return ''

  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}
