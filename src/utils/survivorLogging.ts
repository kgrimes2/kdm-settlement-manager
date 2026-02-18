import type { SurvivorLogEntry } from '../SurvivorSheet'

/**
 * Detects changes between old and new survivor data
 * Returns a list of attribute changes
 */
export function detectChanges(oldValue: any, newValue: any, basePath = ''): Array<{ attribute: string; oldValue: string; newValue: string }> {
  const changes: Array<{ attribute: string; oldValue: string; newValue: string }> = []

  // Handle primitives
  if (typeof oldValue !== 'object' || typeof newValue !== 'object' || oldValue === null || newValue === null) {
    if (oldValue !== newValue) {
      changes.push({
        attribute: basePath,
        oldValue: String(oldValue ?? ''),
        newValue: String(newValue ?? '')
      })
    }
    return changes
  }

  // Handle arrays
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        attribute: basePath,
        oldValue: JSON.stringify(oldValue),
        newValue: JSON.stringify(newValue)
      })
    }
    return changes
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key
    const oldVal = (oldValue as Record<string, any>)[key]
    const newVal = (newValue as Record<string, any>)[key]

    if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
      changes.push(...detectChanges(oldVal, newVal, path))
    } else if (oldVal !== newVal) {
      changes.push({
        attribute: path,
        oldValue: String(oldVal ?? ''),
        newValue: String(newVal ?? '')
      })
    }
  }

  return changes
}

/**
 * Adds a new log entry and consolidates consecutive same-attribute changes
 * Keeps only the latest 50 entries
 */
export function addLogEntry(
  existingLog: SurvivorLogEntry[],
  attribute: string,
  oldValue: string,
  newValue: string
): SurvivorLogEntry[] {
  const now = new Date().toISOString()

  // Check if the last entry is for the same attribute
  const lastEntry = existingLog[existingLog.length - 1]
  if (lastEntry && lastEntry.attribute === attribute) {
    // Consolidate: increment count and update newValue, keep oldValue from first change
    const updatedEntry: SurvivorLogEntry = {
      ...lastEntry,
      newValue: newValue,
      count: lastEntry.count + 1,
      timestamp: now
    }
    const newLog = [...existingLog.slice(0, -1), updatedEntry]
    // Keep only latest 50 entries
    return newLog.slice(-50)
  }

  // Add new entry
  const newEntry: SurvivorLogEntry = {
    timestamp: now,
    attribute,
    oldValue,
    newValue,
    count: 1
  }
  const newLog = [...existingLog, newEntry]
  // Keep only latest 50 entries
  return newLog.slice(-50)
}

/**
 * Creates a human-readable description of a log entry
 */
export function formatLogEntry(entry: SurvivorLogEntry): string {
  const date = new Date(entry.timestamp)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString()

  const countStr = entry.count > 1 ? ` (${entry.count}×)` : ''
  const change = `${entry.attribute}: ${entry.oldValue} → ${entry.newValue}${countStr}`

  return `${dateStr} ${timeStr}: ${change}`
}

/**
 * Prune log entries to keep only the latest 50
 */
export function pruneLog(log: SurvivorLogEntry[]): SurvivorLogEntry[] {
  return log.slice(-50)
}
