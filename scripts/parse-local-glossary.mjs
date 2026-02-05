#!/usr/bin/env node

/**
 * Parses a locally downloaded HTML file of the living glossary
 * Run with: node scripts/parse-local-glossary.mjs <path-to-html-file>
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUTPUT_PATH = join(__dirname, '../src/data/glossary.json')

const inputFile = process.argv[2] || '/Users/kgrimes/Downloads/living-glossary'

console.log('Reading glossary from:', inputFile)

try {
  const html = readFileSync(inputFile, 'utf-8')
  console.log('File size:', (html.length / 1024).toFixed(2), 'KB')

  const terms = parseGlossaryHTML(html)

  const glossaryData = {
    terms,
    lastUpdated: new Date().toISOString(),
    version: '1.0.0'
  }

  console.log(`Parsed ${terms.length} terms`)

  // Write to JSON file
  writeFileSync(OUTPUT_PATH, JSON.stringify(glossaryData, null, 2))
  console.log('Glossary data written to:', OUTPUT_PATH)

  // Show first few terms as preview
  console.log('\nFirst 5 terms:')
  terms.slice(0, 5).forEach(term => {
    console.log(`  - ${term.term}`)
  })

} catch (error) {
  console.error('Error parsing glossary:', error)
  process.exit(1)
}

function parseGlossaryHTML(html) {
  const terms = []

  // Pattern: <h4 class="living-glossary_title__y3YTJ">Term Name</h4>
  // followed by <div class="living-glossary_body__...">Definition</div>

  // Find all h4 titles
  const titlePattern = /<h4[^>]*class="[^"]*living-glossary_title[^"]*"[^>]*>([^<]+)<\/h4>/g
  const bodyPattern = /<div[^>]*class="[^"]*living-glossary_body[^"]*"[^>]*>(.*?)<\/div>/gs

  // Extract titles
  const titles = []
  let match
  while ((match = titlePattern.exec(html)) !== null) {
    const term = cleanText(match[1])
    if (term && term !== 'Living Glossary') {
      titles.push({
        term,
        position: match.index
      })
    }
  }

  console.log(`Found ${titles.length} title headings`)

  // For each title, find the next body div
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i]
    const nextTitlePos = i < titles.length - 1 ? titles[i + 1].position : html.length
    const section = html.slice(title.position, nextTitlePos)

    // Find the body/definition in this section (create new regex for each iteration)
    const sectionBodyPattern = /<div[^>]*class="[^"]*living-glossary_body[^"]*"[^>]*>(.*?)<\/div>/s
    const bodyMatch = section.match(sectionBodyPattern)

    if (bodyMatch) {
      const definition = cleanText(bodyMatch[1])
      if (definition) {
        terms.push({
          term: title.term,
          definition
        })
      }
    } else {
      // Try alternate pattern - sometimes content is directly after h4
      const altPattern = /<h4[^>]*>.*?<\/h4>\s*<[^>]*>(.*?)<\//s
      const altMatch = section.match(altPattern)
      if (altMatch) {
        const definition = cleanText(altMatch[1])
        if (definition && definition.length > 10) {
          terms.push({
            term: title.term,
            definition
          })
        }
      }
    }
  }

  return terms
}

function cleanText(text) {
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
