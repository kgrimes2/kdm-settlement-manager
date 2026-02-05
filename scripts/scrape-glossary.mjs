#!/usr/bin/env node

/**
 * Scrapes the Kingdom Death Monster Living Glossary
 * Run with: node scripts/scrape-glossary.mjs
 *
 * If you encounter SSL/TLS errors, you can run with:
 * NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/scrape-glossary.mjs
 *
 * WARNING: Only use NODE_TLS_REJECT_UNAUTHORIZED=0 if you trust the source!
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const GLOSSARY_URL = 'https://kingdomdeath.com/rules/living-glossary'
const OUTPUT_PATH = join(__dirname, '../src/data/glossary.json')

// Create an HTTPS agent that may help with connection issues
const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 30000,
})

async function scrapeGlossary() {
  console.log('Fetching glossary from:', GLOSSARY_URL)
  console.log('Note: If this fails with connection errors, try:')
  console.log('  NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/scrape-glossary.mjs')

  try {
    const response = await fetch(GLOSSARY_URL, {
      agent: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()

    // Parse HTML - we'll use a simple approach without external dependencies
    // This will need to be adjusted based on the actual HTML structure
    const terms = parseGlossaryHTML(html)

    const glossaryData = {
      terms,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    }

    console.log(`Scraped ${terms.length} terms`)

    // Write to JSON file
    writeFileSync(OUTPUT_PATH, JSON.stringify(glossaryData, null, 2))
    console.log('Glossary data written to:', OUTPUT_PATH)

  } catch (error) {
    console.error('Error scraping glossary:', error)
    process.exit(1)
  }
}

function parseGlossaryHTML(html) {
  const terms = []

  // The Kingdom Death glossary is a Next.js app with data in __NEXT_DATA__ script tag
  const nextDataPattern = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
  const match = html.match(nextDataPattern)

  if (match) {
    try {
      const jsonData = JSON.parse(match[1])
      const glossaryItems = jsonData?.props?.pageProps?.data?.allGlossaryEntries || []

      console.log(`Found ${glossaryItems.length} glossary items in Next.js data`)

      for (const item of glossaryItems) {
        const term = {
          term: item.title || item.name || 'Unknown',
          definition: cleanText(item.body || item.description || item.content || '')
        }

        // Add optional fields if they exist
        if (item.category) term.category = item.category
        if (item.relatedTerms) term.relatedTerms = item.relatedTerms

        if (term.definition) {
          terms.push(term)
        }
      }

      return terms
    } catch (e) {
      console.error('Error parsing Next.js JSON data:', e.message)
    }
  }

  console.warn('No Next.js data found! The HTML structure may have changed.')
  console.warn('Try downloading the page and using: node scripts/parse-local-glossary.mjs <file>')

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
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

scrapeGlossary()
