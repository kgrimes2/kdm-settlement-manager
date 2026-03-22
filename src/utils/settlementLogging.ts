import type { SettlementInventory, SettlementLogEntry } from '../migrations'

/**
 * Diffs two inventory snapshots and returns a log entry for each changed item.
 */
export function detectInventoryChanges(
  oldInventory: SettlementInventory,
  newInventory: SettlementInventory
): SettlementLogEntry[] {
  const entries: SettlementLogEntry[] = []
  const now = new Date().toISOString()

  for (const category of ['gear', 'materials'] as const) {
    const oldSection = oldInventory[category]
    const newSection = newInventory[category]
    const allItems = new Set([...Object.keys(oldSection), ...Object.keys(newSection)])

    for (const item of allItems) {
      const oldQty = oldSection[item] ?? 0
      const newQty = newSection[item] ?? 0
      if (oldQty !== newQty) {
        entries.push({ timestamp: now, category, item, oldQty, newQty })
      }
    }
  }

  return entries
}

/**
 * Appends new entries to the log, consolidating rapid consecutive changes to
 * the same item (e.g. clicking + multiple times) into a single entry.
 * Keeps the latest 200 entries.
 */
export function addSettlementLogEntries(
  existingLog: SettlementLogEntry[],
  newEntries: SettlementLogEntry[]
): SettlementLogEntry[] {
  let log = [...existingLog]

  for (const entry of newEntries) {
    const last = log[log.length - 1]
    if (
      last &&
      last.item === entry.item &&
      last.category === entry.category
    ) {
      // Consolidate: extend the range, update timestamp
      log[log.length - 1] = {
        ...last,
        newQty: entry.newQty,
        timestamp: entry.timestamp,
      }
    } else {
      log.push(entry)
    }
  }

  return log.slice(-200)
}

export function formatSettlementLogEntry(entry: SettlementLogEntry): string {
  const date = new Date(entry.timestamp)
  const dateStr = date.toLocaleDateString()
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const delta = entry.newQty - entry.oldQty
  const sign = delta > 0 ? `+${delta}` : `${delta}`
  return `${dateStr} ${timeStr}  [${entry.category}]  ${entry.item}: ${entry.oldQty} → ${entry.newQty}  (${sign})`
}
