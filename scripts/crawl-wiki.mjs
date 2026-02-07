#!/usr/bin/env node

/**
 * Crawls the KDM Fandom Wiki (kingdeath.fandom.com) via MediaWiki API
 * Run with: node scripts/crawl-wiki.mjs
 *
 * Outputs:
 *   src/data/wiki-index.json       — lightweight index (term, category, url)
 *   src/data/wiki/<category>.json  — full terms per category
 *
 * Supports resume: interrupted crawls continue from scripts/.wiki-cache/
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const API_BASE = 'https://kingdomdeath.fandom.com/api.php'
const CACHE_DIR = join(__dirname, '.wiki-cache')
const OUTPUT_DIR = join(__dirname, '../public/wiki')
const INDEX_PATH = join(__dirname, '../src/data/wiki-index.json')

const RATE_LIMIT_MS = 1000
const BATCH_SIZE = 50

// Category priority — first match wins when a page has multiple categories
const CATEGORY_PRIORITY = [
  { pattern: /Fighting Art/i, name: 'Fighting Arts' },
  { pattern: /Disorder/i, name: 'Disorders' },
  { pattern: /Secret Fighting Art/i, name: 'Secret Fighting Arts' },
  { pattern: /Weapon/i, name: 'Weapons' },
  { pattern: /Armor/i, name: 'Armor' },
  { pattern: /Gear/i, name: 'Gear' },
  { pattern: /Resource/i, name: 'Resources' },
  { pattern: /Innovation/i, name: 'Innovations' },
  { pattern: /Settlement Location/i, name: 'Settlement Locations' },
  { pattern: /Settlement Event/i, name: 'Settlement Events' },
  { pattern: /Severe Injur/i, name: 'Severe Injuries' },
  { pattern: /Hunt Event/i, name: 'Hunt Events' },
  { pattern: /Terrain/i, name: 'Terrain' },
  { pattern: /Ability/i, name: 'Abilities' },
  { pattern: /Principle/i, name: 'Principles' },
  { pattern: /Milestone/i, name: 'Milestones' },
  { pattern: /Quarr(?:y|ies)/i, name: 'Quarries' },
  { pattern: /Nemesis/i, name: 'Nemeses' },
  { pattern: /Monster/i, name: 'Monsters' },
  { pattern: /Story Event/i, name: 'Story Events' },
  { pattern: /Showdown/i, name: 'Showdowns' },
  { pattern: /Expansion/i, name: 'Expansions' },
  { pattern: /Campaign/i, name: 'Campaigns' },
  { pattern: /Survivor/i, name: 'Survivors' },
  { pattern: /Glossary/i, name: 'Glossary' },
  { pattern: /Rule/i, name: 'Rules' },
  { pattern: /Keyword/i, name: 'Keywords' },
]

// Categories to skip entirely (meta/admin pages)
const SKIP_CATEGORIES = [
  /^Category:/i,
  /^Template:/i,
  /^User:/i,
  /^File:/i,
  /^Module:/i,
  /^MediaWiki:/i,
  /^Thread:/i,
  /^Board:/i,
  /^Message Wall:/i,
  /Candidates for deletion/i,
  /Stubs/i,
  /Pages needing/i,
  /Community/i,
  /Blog post/i,
  /Browse/i,
]

// --- Helpers ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'KDMSettlementManager/1.0 (fan wiki crawler)',
          'Accept': 'application/json',
        }
      })

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt + 1) * 1000
        console.warn(`Rate limited, waiting ${waitTime}ms...`)
        await sleep(waitTime)
        continue
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (attempt === retries - 1) throw error
      const waitTime = Math.pow(2, attempt) * 1000
      console.warn(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${waitTime}ms...`)
      await sleep(waitTime)
    }
  }
}

function loadCache(filename) {
  const path = join(CACHE_DIR, filename)
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'))
  }
  return null
}

function saveCache(filename, data) {
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(join(CACHE_DIR, filename), JSON.stringify(data))
}

// --- Step 1: Enumerate all pages ---

async function fetchAllPages() {
  const cached = loadCache('pages.json')
  if (cached) {
    console.log(`Loaded ${cached.length} pages from cache`)
    return cached
  }

  console.log('Enumerating all wiki pages...')
  const pages = []
  let apcontinue = undefined

  while (true) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'allpages',
      aplimit: '500',
      apnamespace: '0', // Main namespace only
      format: 'json',
    })
    if (apcontinue) params.set('apcontinue', apcontinue)

    const data = await fetchWithRetry(`${API_BASE}?${params}`)
    const batch = data.query.allpages

    for (const page of batch) {
      // Skip pages matching skip patterns
      const shouldSkip = SKIP_CATEGORIES.some(p => p.test(page.title))
      if (!shouldSkip) {
        pages.push({ pageid: page.pageid, title: page.title })
      }
    }

    console.log(`  ...${pages.length} pages so far`)

    if (data.continue?.apcontinue) {
      apcontinue = data.continue.apcontinue
      await sleep(RATE_LIMIT_MS)
    } else {
      break
    }
  }

  saveCache('pages.json', pages)
  console.log(`Found ${pages.length} pages total`)
  return pages
}

// --- Step 2: Fetch categories for all pages ---

async function fetchCategories(pages) {
  const cached = loadCache('categories.json')
  if (cached) {
    console.log(`Loaded categories from cache (${Object.keys(cached).length} pages)`)
    return cached
  }

  console.log('Fetching categories for all pages...')
  const categoryMap = {} // pageid -> category[]

  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE)
    const pageIds = batch.map(p => p.pageid).join('|')

    const params = new URLSearchParams({
      action: 'query',
      pageids: pageIds,
      prop: 'categories',
      cllimit: '500',
      format: 'json',
    })

    const data = await fetchWithRetry(`${API_BASE}?${params}`)

    for (const [pid, pageData] of Object.entries(data.query.pages)) {
      const cats = (pageData.categories || []).map(c => c.title.replace('Category:', ''))
      categoryMap[pid] = cats
    }

    if (i % 200 === 0) {
      console.log(`  ...fetched categories for ${Math.min(i + BATCH_SIZE, pages.length)}/${pages.length} pages`)
    }

    await sleep(RATE_LIMIT_MS)
  }

  saveCache('categories.json', categoryMap)
  console.log(`Fetched categories for ${Object.keys(categoryMap).length} pages`)
  return categoryMap
}

// --- Step 3: Fetch page content ---

async function fetchContent(pages) {
  const cached = loadCache('content.json')
  if (cached) {
    console.log(`Loaded content from cache (${Object.keys(cached).length} pages)`)
    return cached
  }

  console.log('Fetching page content...')
  const contentMap = {} // pageid -> wikitext

  // Check for partial cache
  const partialCached = loadCache('content-partial.json')
  if (partialCached) {
    Object.assign(contentMap, partialCached)
    console.log(`  Resuming from partial cache (${Object.keys(contentMap).length} pages already fetched)`)
  }

  const fetchedIds = new Set(Object.keys(contentMap))
  const remaining = pages.filter(p => !fetchedIds.has(String(p.pageid)))

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE)
    const pageIds = batch.map(p => p.pageid).join('|')

    const params = new URLSearchParams({
      action: 'query',
      pageids: pageIds,
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      format: 'json',
    })

    const data = await fetchWithRetry(`${API_BASE}?${params}`)

    for (const [pid, pageData] of Object.entries(data.query.pages)) {
      const revision = pageData.revisions?.[0]
      const content = revision?.slots?.main?.['*'] || revision?.['*'] || ''
      contentMap[pid] = content
    }

    const totalDone = Object.keys(contentMap).length
    if (i % 200 === 0 || i + BATCH_SIZE >= remaining.length) {
      console.log(`  ...fetched content for ${totalDone}/${pages.length} pages`)
      // Save partial progress every 200 pages
      saveCache('content-partial.json', contentMap)
    }

    await sleep(RATE_LIMIT_MS)
  }

  saveCache('content.json', contentMap)
  console.log(`Fetched content for ${Object.keys(contentMap).length} pages`)
  return contentMap
}

// --- Step 4: Clean wikitext ---

function cleanWikitext(wikitext) {
  if (!wikitext) return ''

  let text = wikitext

  // Remove #REDIRECT pages
  if (/^#REDIRECT/i.test(text.trim())) {
    return ''
  }

  // Remove templates {{...}} (including nested)
  let prev = ''
  while (prev !== text) {
    prev = text
    text = text.replace(/\{\{[^{}]*\}\}/g, '')
  }

  // Remove tables {|...|}
  text = text.replace(/\{\|[\s\S]*?\|\}/g, '')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Remove HTML tags
  text = text.replace(/<\/?[^>]+>/g, '')

  // Remove categories BEFORE link conversion (otherwise [[Category:X]] becomes plain text "Category:X")
  text = text.replace(/\[\[Category:[^\]]*\]\]/gi, '')

  // Remove file/image references
  text = text.replace(/\[\[File:[^\]]*\]\]/gi, '')
  text = text.replace(/\[\[Image:[^\]]*\]\]/gi, '')

  // Convert [[link|display]] to display, [[link]] to link
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1')

  // Remove external links [url text] -> text
  text = text.replace(/\[https?:\/\/[^\s\]]+ ([^\]]+)\]/g, '$1')
  text = text.replace(/\[https?:\/\/[^\]]+\]/g, '')

  // Remove bold/italic markers
  text = text.replace(/'{2,5}/g, '')

  // Remove section headers (== Header ==)
  text = text.replace(/^=+\s*(.*?)\s*=+$/gm, '$1.')

  // Remove bullet/numbered list markers
  text = text.replace(/^\*+\s*/gm, '')
  text = text.replace(/^#+\s*/gm, '')
  text = text.replace(/^;+\s*/gm, '')
  text = text.replace(/^:+\s*/gm, '')

  // Remove any remaining "Category:" lines (plain text remnants)
  text = text.replace(/^Category:.*$/gm, '')

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.trim()

  return text
}

function extractRelatedTerms(wikitext) {
  if (!wikitext) return []
  const links = new Set()
  const regex = /\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]/g
  let match
  while ((match = regex.exec(wikitext)) !== null) {
    const link = match[1].trim()
    // Skip non-article links
    if (!/^(File|Image|Category|Template|User|MediaWiki):/i.test(link)) {
      links.add(link)
    }
  }
  return [...links].slice(0, 20) // Cap at 20 related terms
}

// --- Step 5: Assign categories ---

function assignCategory(pageCategories) {
  if (!pageCategories || pageCategories.length === 0) return 'Uncategorized'

  for (const { pattern, name } of CATEGORY_PRIORITY) {
    for (const cat of pageCategories) {
      if (pattern.test(cat)) return name
    }
  }

  return 'Uncategorized'
}

function slugifyCategory(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// --- Main ---

async function main() {
  console.log('KDM Fandom Wiki Crawler')
  console.log('=======================\n')

  // Ensure output dirs exist
  mkdirSync(CACHE_DIR, { recursive: true })
  mkdirSync(OUTPUT_DIR, { recursive: true })

  // Step 1: Get all pages
  const pages = await fetchAllPages()

  // Step 2: Get categories
  const categoryMap = await fetchCategories(pages)

  // Step 3: Get content
  const contentMap = await fetchContent(pages)

  // Step 4: Process pages into terms
  console.log('\nProcessing pages into terms...')

  const termsByCategory = new Map() // category -> GlossaryTerm[]
  const indexEntries = []
  let skippedRedirects = 0
  let skippedEmpty = 0

  for (const page of pages) {
    const pid = String(page.pageid)
    const wikitext = contentMap[pid] || ''
    const categories = categoryMap[pid] || []

    // Clean the content
    const definition = cleanWikitext(wikitext)

    if (!definition) {
      if (/^#REDIRECT/i.test(wikitext.trim())) {
        skippedRedirects++
      } else {
        skippedEmpty++
      }
      continue
    }

    // Skip very short definitions (likely stubs)
    if (definition.length < 10) {
      skippedEmpty++
      continue
    }

    const category = assignCategory(categories)
    const relatedTerms = extractRelatedTerms(wikitext)
    const url = `https://kingdomdeath.fandom.com/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`

    const term = {
      term: page.title,
      definition,
      category,
      url,
    }

    if (relatedTerms.length > 0) {
      term.relatedTerms = relatedTerms
    }

    // Group by category
    if (!termsByCategory.has(category)) {
      termsByCategory.set(category, [])
    }
    termsByCategory.get(category).push(term)

    // Index entry (lightweight)
    indexEntries.push({
      term: page.title,
      category,
      url,
    })
  }

  console.log(`Processed ${indexEntries.length} terms across ${termsByCategory.size} categories`)
  console.log(`Skipped: ${skippedRedirects} redirects, ${skippedEmpty} empty/stub pages`)

  // Step 5: Write output files
  console.log('\nWriting output files...')

  // Write per-category files
  const categoryIndex = []
  for (const [category, terms] of termsByCategory.entries()) {
    const slug = slugifyCategory(category)
    const filename = `${slug}.json`
    const filepath = join(OUTPUT_DIR, filename)

    // Sort terms alphabetically
    terms.sort((a, b) => a.term.localeCompare(b.term))

    writeFileSync(filepath, JSON.stringify({
      category,
      terms,
      lastUpdated: new Date().toISOString(),
    }, null, 2))

    categoryIndex.push({
      category,
      slug,
      count: terms.length,
    })

    console.log(`  ${filename}: ${terms.length} terms`)
  }

  // Sort category index by term count (descending)
  categoryIndex.sort((a, b) => b.count - a.count)

  const totalTerms = categoryIndex.reduce((sum, c) => sum + c.count, 0)

  // Build compact term-name-to-slug lookup: { slug: ["term1", "term2", ...] }
  const termsBySlug = {}
  for (const [category, terms] of termsByCategory.entries()) {
    const slug = slugifyCategory(category)
    termsBySlug[slug] = terms.map(t => t.term)
  }

  // Write index file (categories + term names for search, no definitions)
  writeFileSync(INDEX_PATH, JSON.stringify({
    categories: categoryIndex,
    termsBySlug,
    totalTerms,
    lastUpdated: new Date().toISOString(),
  }))

  console.log(`\nwiki-index.json: ${totalTerms} terms, ${categoryIndex.length} categories`)
  console.log('\nDone!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
