import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  detectInventoryChanges,
  addSettlementLogEntries,
  formatSettlementLogEntry,
} from './settlementLogging'
import type { SettlementInventory, SettlementLogEntry } from '../migrations'

describe('detectInventoryChanges', () => {
  it('returns empty array when inventories are identical', () => {
    const inv: SettlementInventory = { gear: { Sword: 2 }, materials: { Bone: 3 } }
    expect(detectInventoryChanges(inv, inv)).toEqual([])
  })

  it('detects an item being incremented in gear', () => {
    const old: SettlementInventory = { gear: { Sword: 1 }, materials: {} }
    const next: SettlementInventory = { gear: { Sword: 2 }, materials: {} }
    const changes = detectInventoryChanges(old, next)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ category: 'gear', item: 'Sword', oldQty: 1, newQty: 2 })
  })

  it('detects an item being decremented in materials', () => {
    const old: SettlementInventory = { gear: {}, materials: { Bone: 5 } }
    const next: SettlementInventory = { gear: {}, materials: { Bone: 4 } }
    const changes = detectInventoryChanges(old, next)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ category: 'materials', item: 'Bone', oldQty: 5, newQty: 4 })
  })

  it('detects a new item added (oldQty 0)', () => {
    const old: SettlementInventory = { gear: {}, materials: {} }
    const next: SettlementInventory = { gear: { Shield: 1 }, materials: {} }
    const changes = detectInventoryChanges(old, next)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ category: 'gear', item: 'Shield', oldQty: 0, newQty: 1 })
  })

  it('detects an item removed entirely (newQty 0)', () => {
    const old: SettlementInventory = { gear: { Shield: 1 }, materials: {} }
    const next: SettlementInventory = { gear: {}, materials: {} }
    const changes = detectInventoryChanges(old, next)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ category: 'gear', item: 'Shield', oldQty: 1, newQty: 0 })
  })

  it('detects changes in both gear and materials simultaneously', () => {
    const old: SettlementInventory = { gear: { Sword: 1 }, materials: { Bone: 3 } }
    const next: SettlementInventory = { gear: { Sword: 2 }, materials: { Bone: 2 } }
    const changes = detectInventoryChanges(old, next)
    expect(changes).toHaveLength(2)
    const categories = changes.map(c => c.category).sort()
    expect(categories).toEqual(['gear', 'materials'])
  })

  it('includes a timestamp on each entry', () => {
    const old: SettlementInventory = { gear: { Sword: 1 }, materials: {} }
    const next: SettlementInventory = { gear: { Sword: 2 }, materials: {} }
    const changes = detectInventoryChanges(old, next)
    expect(changes[0].timestamp).toBeTruthy()
    expect(() => new Date(changes[0].timestamp)).not.toThrow()
  })
})

describe('addSettlementLogEntries', () => {
  const makeEntry = (item: string, oldQty: number, newQty: number, category: 'gear' | 'materials' = 'gear'): SettlementLogEntry => ({
    timestamp: new Date().toISOString(),
    category,
    item,
    oldQty,
    newQty,
  })

  it('appends a new entry to an empty log', () => {
    const entry = makeEntry('Sword', 0, 1)
    const log = addSettlementLogEntries([], [entry])
    expect(log).toHaveLength(1)
    expect(log[0].item).toBe('Sword')
  })

  it('consolidates consecutive changes to the same item', () => {
    const first = makeEntry('Sword', 0, 1)
    const second = makeEntry('Sword', 1, 2)
    let log = addSettlementLogEntries([], [first])
    log = addSettlementLogEntries(log, [second])
    expect(log).toHaveLength(1)
    expect(log[0].oldQty).toBe(0)
    expect(log[0].newQty).toBe(2)
  })

  it('does not consolidate changes to different items', () => {
    const first = makeEntry('Sword', 0, 1)
    const second = makeEntry('Shield', 0, 1)
    let log = addSettlementLogEntries([], [first])
    log = addSettlementLogEntries(log, [second])
    expect(log).toHaveLength(2)
  })

  it('does not consolidate same item in different categories', () => {
    const first = makeEntry('Bone', 0, 1, 'gear')
    const second = makeEntry('Bone', 0, 1, 'materials')
    let log = addSettlementLogEntries([], [first])
    log = addSettlementLogEntries(log, [second])
    expect(log).toHaveLength(2)
  })

  it('trims log to 200 entries', () => {
    const existing: SettlementLogEntry[] = Array.from({ length: 199 }, (_, i) =>
      makeEntry(`Item${i}`, 0, 1)
    )
    const newEntry = makeEntry('NewItem', 0, 1)
    const log = addSettlementLogEntries(existing, [newEntry])
    expect(log).toHaveLength(200)
  })

  it('drops the oldest entry when over 200', () => {
    const existing: SettlementLogEntry[] = Array.from({ length: 200 }, (_, i) =>
      makeEntry(`Item${i}`, 0, 1)
    )
    const newEntry = makeEntry('Overflow', 0, 1)
    const log = addSettlementLogEntries(existing, [newEntry])
    expect(log).toHaveLength(200)
    expect(log[log.length - 1].item).toBe('Overflow')
    expect(log[0].item).toBe('Item1')
  })

  it('handles multiple new entries in one call', () => {
    const entries = [makeEntry('Sword', 0, 1), makeEntry('Shield', 0, 1)]
    const log = addSettlementLogEntries([], entries)
    expect(log).toHaveLength(2)
  })
})

describe('formatSettlementLogEntry', () => {
  it('includes item name, old and new qty, and delta', () => {
    const entry: SettlementLogEntry = {
      timestamp: '2026-03-22T12:00:00.000Z',
      category: 'gear',
      item: 'Sword',
      oldQty: 1,
      newQty: 3,
    }
    const formatted = formatSettlementLogEntry(entry)
    expect(formatted).toContain('Sword')
    expect(formatted).toContain('1')
    expect(formatted).toContain('3')
    expect(formatted).toContain('+2')
  })

  it('shows negative delta for decrements', () => {
    const entry: SettlementLogEntry = {
      timestamp: '2026-03-22T12:00:00.000Z',
      category: 'materials',
      item: 'Bone',
      oldQty: 5,
      newQty: 2,
    }
    const formatted = formatSettlementLogEntry(entry)
    expect(formatted).toContain('-3')
  })
})
