import { type SurvivorData, initialSurvivorData } from './SurvivorSheet'

export const CURRENT_DATA_VERSION = 2

export interface SettlementData {
  id: string
  name: string
  survivors: {
    1: SurvivorData | null
    2: SurvivorData | null
    3: SurvivorData | null
    4: SurvivorData | null
  }
  removedSurvivors: SurvivorData[]
  retiredSurvivors: SurvivorData[]
  deceasedSurvivors: SurvivorData[]
}

export interface AppState {
  version: number
  settlements: SettlementData[]
  currentSettlementId: string
}

/**
 * Create a default settlement with sample survivors
 */
function createDefaultSettlement(): SettlementData {
  const now = Date.now()
  return {
    id: 'settlement-1',
    name: 'Settlement 1',
    survivors: {
      1: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Allister', gender: 'M', survival: 1, createdAt: new Date(now - 3000).toISOString() },
      2: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Erza', gender: 'F', survival: 1, createdAt: new Date(now - 2000).toISOString() },
      3: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Lucy', gender: 'F', survival: 1, createdAt: new Date(now - 1000).toISOString() },
      4: { ...JSON.parse(JSON.stringify(initialSurvivorData)), name: 'Zachary', gender: 'M', survival: 1, createdAt: new Date(now).toISOString() },
    },
    removedSurvivors: [],
    retiredSurvivors: [],
    deceasedSurvivors: []
  }
}

/**
 * Create a default app state
 */
export function createDefaultAppState(): AppState {
  return {
    version: CURRENT_DATA_VERSION,
    settlements: [createDefaultSettlement()],
    currentSettlementId: 'settlement-1'
  }
}

/**
 * Migrate a survivor to fix any data issues
 */
function migrateSurvivor(survivor: SurvivorData | null): SurvivorData | null {
  if (!survivor) return null

  // Migration: trim huntXP from 16 to 15 items if needed
  if (survivor.huntXP && survivor.huntXP.length > 15) {
    return { ...survivor, huntXP: survivor.huntXP.slice(0, 15) }
  }

  return survivor
}

/**
 * Migrate a settlement to the current format
 */
function migrateSettlement(settlement: any): SettlementData {
  return {
    id: settlement.id || `settlement-${Date.now()}`,
    name: settlement.name || 'Settlement',
    survivors: {
      1: migrateSurvivor(settlement.survivors?.[1] || null),
      2: migrateSurvivor(settlement.survivors?.[2] || null),
      3: migrateSurvivor(settlement.survivors?.[3] || null),
      4: migrateSurvivor(settlement.survivors?.[4] || null),
    },
    removedSurvivors: (settlement.removedSurvivors || settlement.archivedSurvivors || []).map(migrateSurvivor).filter(Boolean) as SurvivorData[],
    retiredSurvivors: (settlement.retiredSurvivors || []).map(migrateSurvivor).filter(Boolean) as SurvivorData[],
    deceasedSurvivors: (settlement.deceasedSurvivors || []).map(migrateSurvivor).filter(Boolean) as SurvivorData[],
  }
}

/**
 * Migrate data from any previous version to the current version
 */
export function migrateData(data: any): AppState {
  // If data already has the current version and is valid, return as-is
  if (data.version === CURRENT_DATA_VERSION && data.settlements && data.currentSettlementId) {
    return {
      version: CURRENT_DATA_VERSION,
      settlements: data.settlements.map(migrateSettlement),
      currentSettlementId: data.currentSettlementId
    }
  }

  // Handle old format (without settlements array)
  if (data.survivors && !data.settlements) {
    const migratedSettlement = migrateSettlement({
      id: 'settlement-1',
      name: 'Settlement 1',
      survivors: data.survivors,
      removedSurvivors: data.removedSurvivors || data.archivedSurvivors || [],
      retiredSurvivors: data.retiredSurvivors || [],
      deceasedSurvivors: data.deceasedSurvivors || [],
    })

    return {
      version: CURRENT_DATA_VERSION,
      settlements: [migratedSettlement],
      currentSettlementId: 'settlement-1'
    }
  }

  // Handle version 1 or unversioned data with settlements
  if (data.settlements) {
    return {
      version: CURRENT_DATA_VERSION,
      settlements: data.settlements.map(migrateSettlement),
      currentSettlementId: data.currentSettlementId || data.settlements[0]?.id || 'settlement-1'
    }
  }

  // If we can't migrate the data, return default state
  console.warn('Could not migrate data, returning default state')
  return createDefaultAppState()
}

/**
 * Validate that an AppState has the correct structure
 */
export function validateAppState(state: any): state is AppState {
  if (!state || typeof state !== 'object') {
    console.error('State is not an object')
    return false
  }

  if (typeof state.version !== 'number') {
    console.error('State missing version number')
    return false
  }

  if (!Array.isArray(state.settlements)) {
    console.error('State missing settlements array')
    return false
  }

  if (typeof state.currentSettlementId !== 'string') {
    console.error('State missing currentSettlementId')
    return false
  }

  // Validate each settlement
  for (const settlement of state.settlements) {
    if (!settlement.id || !settlement.name) {
      console.error('Invalid settlement structure')
      return false
    }

    if (!settlement.survivors || typeof settlement.survivors !== 'object') {
      console.error('Settlement missing survivors')
      return false
    }

    // Check that survivors has quadrants 1-4
    for (const quadrant of [1, 2, 3, 4]) {
      if (!(quadrant in settlement.survivors)) {
        console.error(`Settlement missing quadrant ${quadrant}`)
        return false
      }
    }

    if (!Array.isArray(settlement.removedSurvivors)) {
      console.error('Settlement missing removedSurvivors array')
      return false
    }

    if (!Array.isArray(settlement.retiredSurvivors)) {
      console.error('Settlement missing retiredSurvivors array')
      return false
    }

    if (!Array.isArray(settlement.deceasedSurvivors)) {
      console.error('Settlement missing deceasedSurvivors array')
      return false
    }
  }

  return true
}
