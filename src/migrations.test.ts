import { describe, it, expect } from 'vitest'
import {
  migrateData,
  validateAppState,
  createDefaultAppState,
  CURRENT_DATA_VERSION
} from './migrations'
import { initialSurvivorData } from './SurvivorSheet'

describe('Data Migrations', () => {
  describe('migrateData', () => {
    it('should migrate legacy single-settlement format', () => {
      const legacyData = {
        survivors: {
          1: { ...initialSurvivorData, name: 'Test1', createdAt: '2024-01-01T00:00:00.000Z' },
          2: null,
          3: null,
          4: { ...initialSurvivorData, name: 'Test2', createdAt: '2024-01-01T00:00:00.000Z' }
        },
        removedSurvivors: [],
        retiredSurvivors: [],
        deceasedSurvivors: []
      }

      const migrated = migrateData(legacyData)

      expect(migrated.version).toBe(CURRENT_DATA_VERSION)
      expect(migrated.settlements).toHaveLength(1)
      expect(migrated.settlements[0].name).toBe('Settlement 1')
      expect(migrated.settlements[0].survivors[1]?.name).toBe('Test1')
      expect(migrated.settlements[0].survivors[2]).toBe(null)
      expect(migrated.settlements[0].survivors[4]?.name).toBe('Test2')
    })

    it('should migrate legacy data with archivedSurvivors field', () => {
      const legacyData = {
        survivors: {
          1: null,
          2: null,
          3: null,
          4: null
        },
        archivedSurvivors: [
          { ...initialSurvivorData, name: 'Archived1', createdAt: '2024-01-01T00:00:00.000Z' }
        ]
      }

      const migrated = migrateData(legacyData)

      expect(migrated.settlements[0].removedSurvivors).toHaveLength(1)
      expect(migrated.settlements[0].removedSurvivors[0].name).toBe('Archived1')
    })

    it('should migrate data without version field but with settlements', () => {
      const dataWithoutVersion = {
        settlements: [
          {
            id: 'test-1',
            name: 'Test Settlement',
            survivors: {
              1: { ...initialSurvivorData, name: 'Survivor1', createdAt: '2024-01-01T00:00:00.000Z' },
              2: null,
              3: null,
              4: null
            },
            removedSurvivors: [],
            retiredSurvivors: [],
            deceasedSurvivors: []
          }
        ],
        currentSettlementId: 'test-1'
      }

      const migrated = migrateData(dataWithoutVersion)

      expect(migrated.version).toBe(CURRENT_DATA_VERSION)
      expect(migrated.settlements[0].name).toBe('Test Settlement')
      expect(migrated.settlements[0].survivors[1]?.name).toBe('Survivor1')
    })

    it('should handle huntXP migration (extend 15 to 16 items)', () => {
      const dataWithShortHuntXP = {
        survivors: {
          1: {
            ...initialSurvivorData,
            name: 'Test',
            huntXP: Array(15).fill(true), // Old format with 15 items
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(dataWithShortHuntXP)

      expect(migrated.settlements[0].survivors[1]?.huntXP).toHaveLength(16)
    })

    it('should add createdAt if missing', () => {
      const dataWithoutCreatedAt = {
        survivors: {
          1: {
            ...initialSurvivorData,
            name: 'Test',
            createdAt: undefined as unknown as string
          },
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(dataWithoutCreatedAt)

      expect(migrated.settlements[0].survivors[1]?.createdAt).toBeDefined()
      expect(typeof migrated.settlements[0].survivors[1]?.createdAt).toBe('string')
    })

    it('should preserve all survivor fields during migration', () => {
      const completeData = {
        survivors: {
          1: {
            ...initialSurvivorData,
            name: 'Complete Survivor',
            gender: 'M' as const,
            survival: 5,
            survivalLimit: 3,
            cannotSpendSurvival: true,
            insanity: 2,
            brainArmor: 1,
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(completeData)
      const survivor = migrated.settlements[0].survivors[1]

      expect(survivor?.name).toBe('Complete Survivor')
      expect(survivor?.gender).toBe('M')
      expect(survivor?.survival).toBe(5)
      expect(survivor?.survivalLimit).toBe(3)
      expect(survivor?.cannotSpendSurvival).toBe(true)
      expect(survivor?.insanity).toBe(2)
      expect(survivor?.brainArmor).toBe(1)
    })

    it('should handle current version data without modification', () => {
      const currentData = {
        version: CURRENT_DATA_VERSION,
        settlements: [
          {
            id: 'test-1',
            name: 'Current',
            survivors: {
              1: { ...initialSurvivorData, name: 'Test', createdAt: '2024-01-01T00:00:00.000Z' },
              2: null,
              3: null,
              4: null
            },
            removedSurvivors: [],
            retiredSurvivors: [],
            deceasedSurvivors: []
          }
        ],
        currentSettlementId: 'test-1'
      }

      const migrated = migrateData(currentData)

      expect(migrated.version).toBe(CURRENT_DATA_VERSION)
      expect(migrated.settlements[0].name).toBe('Current')
    })

    it('returns default state for invalid data', () => {
      const invalidData = {
        random: 'data',
        nothing: 'useful'
      }

      const migrated = migrateData(invalidData)

      // Should return default state instead of throwing
      expect(migrated.version).toBe(CURRENT_DATA_VERSION)
      expect(migrated.settlements).toHaveLength(1)
      expect(migrated.settlements[0].id).toBe('settlement-1')
    })
  })

  describe('validateAppState', () => {
    it('should validate correct app state', () => {
      const state = createDefaultAppState()
      expect(validateAppState(state)).toBe(true)
    })

    it('should accept state with version 0', () => {
      const validState = {
        version: 0,
        settlements: [],
        currentSettlementId: 'test'
      }
      expect(validateAppState(validState)).toBe(true)
    })

    it('should accept state with empty settlements array', () => {
      const validState = {
        version: CURRENT_DATA_VERSION,
        settlements: [],
        currentSettlementId: 'test'
      }
      expect(validateAppState(validState)).toBe(true)
    })

    it('should accept state even with non-existent currentSettlementId', () => {
      const validState = {
        version: CURRENT_DATA_VERSION,
        settlements: [
          {
            id: 'test-1',
            name: 'Test',
            survivors: { 1: null, 2: null, 3: null, 4: null },
            removedSurvivors: [],
            retiredSurvivors: [],
            deceasedSurvivors: []
          }
        ],
        currentSettlementId: 'non-existent'
      }
      expect(validateAppState(validState)).toBe(true)
    })
  })

  describe('createDefaultAppState', () => {
    it('should create valid default state', () => {
      const state = createDefaultAppState()

      expect(state.version).toBe(CURRENT_DATA_VERSION)
      expect(state.settlements).toHaveLength(1)
      expect(state.settlements[0].id).toBe('settlement-1')
      expect(state.settlements[0].name).toBe('Settlement 1')
      expect(state.currentSettlementId).toBe('settlement-1')
    })

    it('should create state with 4 default survivors', () => {
      const state = createDefaultAppState()
      const settlement = state.settlements[0]

      expect(settlement.survivors[1]).toBeTruthy()
      expect(settlement.survivors[2]).toBeTruthy()
      expect(settlement.survivors[3]).toBeTruthy()
      expect(settlement.survivors[4]).toBeTruthy()

      expect(settlement.survivors[1]?.name).toBe('Allister')
      expect(settlement.survivors[2]?.name).toBe('Erza')
      expect(settlement.survivors[3]?.name).toBe('Lucy')
      expect(settlement.survivors[4]?.name).toBe('Zachary')
    })

    it('should create survivors with all required fields', () => {
      const state = createDefaultAppState()
      const survivor = state.settlements[0].survivors[1]

      expect(survivor).toBeTruthy()
      expect(survivor?.name).toBeDefined()
      expect(survivor?.createdAt).toBeDefined()
      expect(survivor?.huntXP).toHaveLength(16)
      expect(survivor?.stats).toBeDefined()
      expect(survivor?.bodyLocations).toBeDefined()
      expect(survivor?.survivalAbilities).toBeDefined()
    })
  })

  describe('Weapon Proficiency Migration', () => {
    it('should migrate weaponProficiency.type to types array (version 7)', () => {
      const dataWithOldWeaponType = {
        survivors: {
          1: {
            ...initialSurvivorData,
            name: 'Test',
            weaponProficiency: {
              level: Array(8).fill(false),
              type: 'Sword' // Old format with single string type
            },
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(dataWithOldWeaponType)
      const survivor = migrated.settlements[0].survivors[1]

      expect(survivor?.weaponProficiency.types).toEqual(['Sword'])
      expect((survivor?.weaponProficiency as any).type).toBeUndefined()
    })

    it('should handle empty weaponProficiency.type during migration', () => {
      const dataWithEmptyType = {
        survivors: {
          1: {
            ...initialSurvivorData,
            name: 'Test',
            weaponProficiency: {
              level: Array(8).fill(false),
              type: ''
            },
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(dataWithEmptyType)
      const survivor = migrated.settlements[0].survivors[1]

      expect(survivor?.weaponProficiency.types).toEqual([])
    })

    it('should preserve weaponProficiency.types if already migrated', () => {
      const dataWithNewFormat = {
        version: CURRENT_DATA_VERSION,
        survivors: {
          1: {
            ...initialSurvivorData,
            name: 'Test',
            weaponProficiency: {
              level: Array(8).fill(false),
              types: ['Axe']
            },
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(dataWithNewFormat)
      const survivor = migrated.settlements[0].survivors[1]

      expect(survivor?.weaponProficiency.types).toEqual(['Axe'])
    })
  })

  describe('Backwards Compatibility', () => {
    it('should handle missing nested objects in survivor data', () => {
      const dataWithMissingFields = {
        survivors: {
          1: {
            name: 'Incomplete',
            createdAt: '2024-01-01T00:00:00.000Z',
            gender: '' as const
            // Missing: stats, bodyLocations, survivalAbilities, etc.
          } as unknown,
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(dataWithMissingFields)
      const survivor = migrated.settlements[0].survivors[1]

      expect(survivor?.stats).toBeDefined()
      expect(survivor?.bodyLocations).toBeDefined()
      expect(survivor?.survivalAbilities).toBeDefined()
      expect(survivor?.huntXP).toHaveLength(16)
    })

    it('should preserve custom values while filling in defaults', () => {
      const dataWithPartialFields = {
        survivors: {
          1: {
            ...initialSurvivorData,
            name: 'Partial',
            survival: 10,
            stats: {
              movement: 7,
              accuracy: 2
              // Missing other stats
            },
            createdAt: '2024-01-01T00:00:00.000Z'
          } as unknown,
          2: null,
          3: null,
          4: null
        }
      }

      const migrated = migrateData(dataWithPartialFields)
      const survivor = migrated.settlements[0].survivors[1]

      expect(survivor?.name).toBe('Partial')
      expect(survivor?.survival).toBe(10)
      expect(survivor?.stats.movement).toBe(7)
      expect(survivor?.stats.accuracy).toBe(2)
      expect(survivor?.stats.strength).toBeDefined()
      expect(survivor?.stats.evasion).toBeDefined()
    })
  })
})
