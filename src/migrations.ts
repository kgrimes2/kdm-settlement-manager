import { type SurvivorData, initialSurvivorData } from './SurvivorSheet'

export const CURRENT_DATA_VERSION = 7

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

  // Merge with defaults to ensure all fields exist
  let migratedSurvivor = { ...JSON.parse(JSON.stringify(initialSurvivorData)), ...survivor }

  // Add createdAt if missing or undefined
  if (!migratedSurvivor.createdAt) {
    migratedSurvivor.createdAt = new Date().toISOString()
  }

  // Ensure stats has all required fields
  if (migratedSurvivor.stats) {
    migratedSurvivor.stats = {
      ...initialSurvivorData.stats,
      ...migratedSurvivor.stats
    }
  }

  // Migration: trim huntXP from 16 to 15 items if needed
  if (migratedSurvivor.huntXP && migratedSurvivor.huntXP.length > 15) {
    migratedSurvivor.huntXP = migratedSurvivor.huntXP.slice(0, 15)
  }

  // Migration: add gearBonuses if missing
  if (!migratedSurvivor.gearBonuses) {
    migratedSurvivor.gearBonuses = {
      movement: 0,
      accuracy: 0,
      strength: 0,
      evasion: 0,
      luck: 0,
      speed: 0,
    }
  }

  // Migration: ensure abilitiesImpairments has at least 2 rows
  if (migratedSurvivor.abilitiesImpairments && migratedSurvivor.abilitiesImpairments.length < 2) {
    while (migratedSurvivor.abilitiesImpairments.length < 2) {
      migratedSurvivor.abilitiesImpairments.push('')
    }
  }

  // Migration: add auxiliaryNotes if missing (version 4)
  if (!('auxiliaryNotes' in migratedSurvivor)) {
    migratedSurvivor.auxiliaryNotes = ''
  }

  // Migration: add permanentInjuries if missing (version 5)
  if (!('permanentInjuries' in migratedSurvivor)) {
    migratedSurvivor.permanentInjuries = {
      head: [
        { name: 'Intracranial Hemorrhage', checkboxes: [false] },
      ],
      arms: [],
      body: [],
      waist: [],
      legs: [],
    }
  } else {
    // Ensure all locations exist
    if (!migratedSurvivor.permanentInjuries.head) migratedSurvivor.permanentInjuries.head = []
    if (!migratedSurvivor.permanentInjuries.arms) migratedSurvivor.permanentInjuries.arms = []
    if (!migratedSurvivor.permanentInjuries.body) migratedSurvivor.permanentInjuries.body = []
    if (!migratedSurvivor.permanentInjuries.waist) migratedSurvivor.permanentInjuries.waist = []
    if (!migratedSurvivor.permanentInjuries.legs) migratedSurvivor.permanentInjuries.legs = []

    // Add head injuries if not present
    if (!migratedSurvivor.permanentInjuries.head.find(inj => inj.name === 'Intracranial Hemorrhage')) {
      migratedSurvivor.permanentInjuries.head.push({ name: 'Intracranial Hemorrhage', checkboxes: [false] })
    }
    if (!migratedSurvivor.permanentInjuries.head.find(inj => inj.name === 'Deaf')) {
      migratedSurvivor.permanentInjuries.head.push({ name: 'Deaf', checkboxes: [false] })
    }
    if (!migratedSurvivor.permanentInjuries.head.find(inj => inj.name === 'Blind')) {
      migratedSurvivor.permanentInjuries.head.push({ name: 'Blind', checkboxes: [false, false] })
    }
    if (!migratedSurvivor.permanentInjuries.head.find(inj => inj.name === 'Shattered Jaw')) {
      migratedSurvivor.permanentInjuries.head.push({ name: 'Shattered Jaw', checkboxes: [false] })
    }

    // Remove injuries from body that should be in arms
    migratedSurvivor.permanentInjuries.body = migratedSurvivor.permanentInjuries.body.filter(
      inj => !['Dismembered Arm', 'Ruptured Muscle', 'Contracture'].includes(inj.name)
    )

    // Add arms injuries if not present
    if (!migratedSurvivor.permanentInjuries.arms.find(inj => inj.name === 'Broken Arm')) {
      migratedSurvivor.permanentInjuries.arms.push({ name: 'Broken Arm', checkboxes: [false, false] })
    }
    if (!migratedSurvivor.permanentInjuries.arms.find(inj => inj.name === 'Dismembered Arm')) {
      migratedSurvivor.permanentInjuries.arms.push({ name: 'Dismembered Arm', checkboxes: [false, false] })
    }
    if (!migratedSurvivor.permanentInjuries.arms.find(inj => inj.name === 'Ruptured Muscle')) {
      migratedSurvivor.permanentInjuries.arms.push({ name: 'Ruptured Muscle', checkboxes: [false] })
    }
    if (!migratedSurvivor.permanentInjuries.arms.find(inj => inj.name === 'Contracture')) {
      migratedSurvivor.permanentInjuries.arms.push({ name: 'Contracture', checkboxes: [false, false, false, false, false] })
    }

    // Add body injuries if not present
    if (!migratedSurvivor.permanentInjuries.body.find(inj => inj.name === 'Gaping Chest Wound')) {
      migratedSurvivor.permanentInjuries.body.push({ name: 'Gaping Chest Wound', checkboxes: [false, false, false, false, false] })
    }
    if (!migratedSurvivor.permanentInjuries.body.find(inj => inj.name === 'Destroyed Back')) {
      migratedSurvivor.permanentInjuries.body.push({ name: 'Destroyed Back', checkboxes: [false] })
    }
    if (!migratedSurvivor.permanentInjuries.body.find(inj => inj.name === 'Broken Rib')) {
      migratedSurvivor.permanentInjuries.body.push({ name: 'Broken Rib', checkboxes: [false, false, false, false, false] })
    }

    // Add waist injuries if not present
    if (!migratedSurvivor.permanentInjuries.waist.find(inj => inj.name === 'Intestinal Prolapse')) {
      migratedSurvivor.permanentInjuries.waist.push({ name: 'Intestinal Prolapse', checkboxes: [false] })
    }
    if (!migratedSurvivor.permanentInjuries.waist.find(inj => inj.name === 'Warped Pelvis')) {
      migratedSurvivor.permanentInjuries.waist.push({ name: 'Warped Pelvis', checkboxes: [false, false, false, false, false] })
    }
    if (!migratedSurvivor.permanentInjuries.waist.find(inj => inj.name === 'Destroyed Genitals')) {
      migratedSurvivor.permanentInjuries.waist.push({ name: 'Destroyed Genitals', checkboxes: [false] })
    }
    if (!migratedSurvivor.permanentInjuries.waist.find(inj => inj.name === 'Broken Hip')) {
      migratedSurvivor.permanentInjuries.waist.push({ name: 'Broken Hip', checkboxes: [false] })
    }

    // Add legs injuries if not present
    if (!migratedSurvivor.permanentInjuries.legs.find(inj => inj.name === 'Dismembered Leg')) {
      migratedSurvivor.permanentInjuries.legs.push({ name: 'Dismembered Leg', checkboxes: [false, false] })
    }
    if (!migratedSurvivor.permanentInjuries.legs.find(inj => inj.name === 'Hamstrung')) {
      migratedSurvivor.permanentInjuries.legs.push({ name: 'Hamstrung', checkboxes: [false] })
    }
    if (!migratedSurvivor.permanentInjuries.legs.find(inj => inj.name === 'Broken Leg')) {
      migratedSurvivor.permanentInjuries.legs.push({ name: 'Broken Leg', checkboxes: [false, false] })
    }
  }

  // Migration: convert weaponProficiency.type to types array (version 7)
  if (migratedSurvivor.weaponProficiency && 'type' in migratedSurvivor.weaponProficiency) {
    const oldType = (migratedSurvivor.weaponProficiency as any).type
    migratedSurvivor.weaponProficiency = {
      ...migratedSurvivor.weaponProficiency,
      types: oldType ? [oldType] : [],
    }
    delete (migratedSurvivor.weaponProficiency as any).type
  }

  return migratedSurvivor
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
