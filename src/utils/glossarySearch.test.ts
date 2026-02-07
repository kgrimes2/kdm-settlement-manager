import { describe, it, expect } from 'vitest'
import { searchGlossary, searchCategories } from './glossarySearch'
import type { GlossaryTerm, WikiCategoryInfo } from '../types/glossary'

const mockTerms: GlossaryTerm[] = [
  { term: 'Berserker (Fighting Art)', definition: 'Once per showdown, spend survival to use.', category: 'Fighting Arts' },
  { term: 'Berserker', definition: 'A fighting style.', category: 'Glossary' },
  { term: 'Monster Claw Style', definition: 'A fighting art from the core game.', category: 'Fighting Arts' },
  { term: 'Rawhide Armor', definition: 'Basic armor set.', category: 'Armor' },
  { term: 'Cat Eye Circlet', definition: 'A gear item that grants accuracy.', category: 'Gear' },
  { term: 'Sword (Weapon)', definition: 'A melee weapon keyword.', category: 'Weapons' },
]

const mockCategories: WikiCategoryInfo[] = [
  { category: 'Fighting Arts', slug: 'fighting-arts', count: 147 },
  { category: 'Disorders', slug: 'disorders', count: 131 },
  { category: 'Monsters', slug: 'monsters', count: 213 },
  { category: 'Gear', slug: 'gear', count: 262 },
]

describe('searchGlossary', () => {
  it('returns empty array for empty query', () => {
    expect(searchGlossary(mockTerms, '')).toEqual([])
    expect(searchGlossary(mockTerms, '   ')).toEqual([])
  })

  it('exact match on base term scores highest', () => {
    const results = searchGlossary(mockTerms, 'berserker')
    expect(results.length).toBeGreaterThanOrEqual(2)
    // Both "Berserker" and "Berserker (Fighting Art)" should match with score 100
    expect(results[0].score).toBe(100)
    expect(results[1].score).toBe(100)
  })

  it('strips parenthetical qualifier for matching', () => {
    const results = searchGlossary(mockTerms, 'sword')
    const swordResult = results.find(r => r.term.term === 'Sword (Weapon)')
    expect(swordResult).toBeDefined()
    expect(swordResult!.score).toBe(100) // exact match on base term "sword"
  })

  it('base term starts-with gives high score', () => {
    const results = searchGlossary(mockTerms, 'bers')
    expect(results.length).toBeGreaterThanOrEqual(1)
    const berserkerResult = results.find(r => r.term.term === 'Berserker (Fighting Art)')
    expect(berserkerResult).toBeDefined()
    expect(berserkerResult!.score).toBe(90)
  })

  it('contains match in definition', () => {
    const results = searchGlossary(mockTerms, 'accuracy')
    const catEye = results.find(r => r.term.term === 'Cat Eye Circlet')
    expect(catEye).toBeDefined()
    expect(catEye!.score).toBe(10)
  })

  it('returns no results for non-matching query', () => {
    const results = searchGlossary(mockTerms, 'zzzznotaword')
    expect(results).toEqual([])
  })

  it('respects maxResults limit', () => {
    const results = searchGlossary(mockTerms, 'a', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })
})

describe('searchCategories', () => {
  it('returns empty array for empty query', () => {
    expect(searchCategories(mockCategories, '')).toEqual([])
  })

  it('exact match on category name', () => {
    const results = searchCategories(mockCategories, 'disorders')
    expect(results.length).toBe(1)
    expect(results[0].category.slug).toBe('disorders')
    expect(results[0].score).toBe(100)
  })

  it('prefix match on category name', () => {
    const results = searchCategories(mockCategories, 'fight')
    expect(results.length).toBe(1)
    expect(results[0].category.slug).toBe('fighting-arts')
    expect(results[0].score).toBe(80)
  })

  it('contains match on category name', () => {
    const results = searchCategories(mockCategories, 'art')
    expect(results.length).toBe(1)
    expect(results[0].category.slug).toBe('fighting-arts')
    expect(results[0].score).toBe(60)
  })

  it('returns no results for non-matching query', () => {
    const results = searchCategories(mockCategories, 'zzzzz')
    expect(results).toEqual([])
  })
})
