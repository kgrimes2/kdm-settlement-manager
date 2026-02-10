import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DataService } from '../utils/dataService'
import { CognitoAuthService } from '../utils/authService'

// Mock the fetch API
global.fetch = vi.fn()

describe('DataService - Backup and Restore Functionality', () => {
  let dataService: DataService
  let mockAuthService: CognitoAuthService
  const mockApiBaseUrl = 'https://api.example.com'
  const mockAccessToken = 'mock-access-token'

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks()
    ;(global.fetch as any).mockReset()

    // Create mock auth service
    mockAuthService = {
      getAccessToken: vi.fn().mockResolvedValue(mockAccessToken),
    } as any

    // Create data service with mocked auth
    dataService = new DataService(mockAuthService, mockApiBaseUrl)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Scenario 1: New User - Save Empty Settlement', () => {
    it('should successfully save an empty settlement to the database', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const emptySettlement = {
        survivors: [],
        settlements: [
          {
            id: 'settlement-1',
            name: 'New Settlement',
            survivors: [],
            inventory: { gear: {}, materials: {} },
          },
        ],
        inventory: { 'settlement-1': { gear: {}, materials: {} } },
      }

      await dataService.saveUserData('settlement-1', emptySettlement)

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/user-data/settlement-1`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(emptySettlement),
        })
      )
    })

    it('should throw an error if saving empty settlement fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Internal Server Error',
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const emptySettlement = {
        survivors: [],
        settlements: [],
        inventory: {},
      }

      await expect(
        dataService.saveUserData('settlement-1', emptySettlement)
      ).rejects.toThrow('Failed to save user data: Internal Server Error')
    })
  })

  describe('Scenario 2: New User - No Cloud Data', () => {
    it('should return empty array when fetching data for new user with no cloud data', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toEqual([])
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/user-data`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      )
    })
  })

  describe('Scenario 3: Existing User - Restore Data from Cloud', () => {
    it('should successfully restore single settlement from cloud', async () => {
      const mockCloudData = {
        survivors: [
          { id: 'survivor-1', name: 'John', gender: 'M', stats: {} },
          { id: 'survivor-2', name: 'Jane', gender: 'F', stats: {} },
        ],
        settlements: [
          {
            id: 'settlement-1',
            name: 'Main Camp',
            survivors: ['survivor-1', 'survivor-2'],
          },
        ],
        inventory: {
          'settlement-1': {
            gear: { 'bone-dagger': 3, lantern: 1 },
            materials: { bone: 15, leather: 8 },
          },
        },
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            data: JSON.stringify(mockCloudData),
          },
        ]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toEqual([mockCloudData])
      expect(result[0].survivors).toHaveLength(2)
      expect(result[0].settlements[0].name).toBe('Main Camp')
      expect(result[0].inventory['settlement-1'].gear['bone-dagger']).toBe(3)
    })

    it('should successfully restore multiple settlements from cloud', async () => {
      const mockCloudData1 = {
        survivors: [{ id: 'survivor-1', name: 'John' }],
        settlements: [{ id: 'settlement-1', name: 'Main Camp' }],
        inventory: { 'settlement-1': { gear: {}, materials: {} } },
      }

      const mockCloudData2 = {
        survivors: [{ id: 'survivor-2', name: 'Jane' }],
        settlements: [{ id: 'settlement-2', name: 'Outpost' }],
        inventory: { 'settlement-2': { gear: {}, materials: {} } },
      }

      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue([
            { data: JSON.stringify(mockCloudData1) },
            { data: JSON.stringify(mockCloudData2) },
          ]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toHaveLength(2)
      expect(result[0].settlements[0].name).toBe('Main Camp')
      expect(result[1].settlements[0].name).toBe('Outpost')
    })

    it('should handle malformed cloud data gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue([
            { data: '{}' }, // Empty data
            { data: JSON.stringify({ survivors: [], settlements: [] }) },
          ]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({})
      expect(result[1].survivors).toEqual([])
    })
  })

  describe('Scenario 4: Data Sync - Local to Cloud', () => {
    it('should sync local data to cloud without throwing', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const localData = {
        survivors: [{ id: 'survivor-1', name: 'Survivor A' }],
        settlements: [{ id: 'settlement-1', name: 'Settlement A' }],
        inventory: { 'settlement-1': { gear: {}, materials: {} } },
      }

      // syncToCloud should not throw even on failure
      await dataService.syncToCloud('settlement-1', localData)

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should continue working even if sync fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Network Error',
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const localData = {
        survivors: [],
        settlements: [],
        inventory: {},
      }

      // syncToCloud should not throw
      await expect(
        dataService.syncToCloud('settlement-1', localData)
      ).resolves.not.toThrow()
    })
  })

  describe('Scenario 5: Data Conflict - Merge Dialog Scenarios', () => {
    it('should handle case where cloud has data but local is empty', async () => {
      const mockCloudData = {
        survivors: [{ id: 'survivor-1', name: 'John' }],
        settlements: [{ id: 'settlement-1', name: 'Main Camp' }],
        inventory: { 'settlement-1': { gear: { 'bone-dagger': 5 }, materials: {} } },
      }

      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue([
            { data: JSON.stringify(mockCloudData) },
          ]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toHaveLength(1)
      expect(result[0].survivors).toHaveLength(1)
      // User should choose "Use Cloud" in this scenario
    })

    it('should handle case where local has data but cloud is empty', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toEqual([])
      // User should choose "Keep Local" in this scenario
    })

    it('should handle case where both local and cloud have different data', async () => {
      const cloudSettlement1 = {
        survivors: [{ id: 'cloud-survivor-1', name: 'Cloud Survivor' }],
        settlements: [{ id: 'cloud-settlement-1', name: 'Cloud Camp' }],
        inventory: { 'cloud-settlement-1': { gear: { sword: 2 }, materials: {} } },
      }

      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue([
            { data: JSON.stringify(cloudSettlement1) },
          ]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      const localSettlement = {
        survivors: [{ id: 'local-survivor-1', name: 'Local Survivor' }],
        settlements: [{ id: 'local-settlement-1', name: 'Local Camp' }],
        inventory: { 'local-settlement-1': { gear: { axe: 1 }, materials: {} } },
      }

      expect(result[0]).not.toEqual(localSettlement)
      // User must choose which to keep
    })
  })

  describe('Scenario 6: Restore - Get Specific Settlement', () => {
    it('should successfully restore specific settlement by ID', async () => {
      const mockSettlementData = {
        survivors: [{ id: 'survivor-1', name: 'John' }],
        settlements: [{ id: 'settlement-1', name: 'Main Camp' }],
        inventory: { 'settlement-1': { gear: { lantern: 1 }, materials: { bone: 10 } } },
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: JSON.stringify(mockSettlementData),
        }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getUserData('settlement-1')

      expect(result).toEqual(mockSettlementData)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/user-data/settlement-1`,
        expect.any(Object)
      )
    })

    it('should throw error when settlement not found', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found',
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await expect(dataService.getUserData('nonexistent-id')).rejects.toThrow(
        'Failed to get user data: Not Found'
      )
    })
  })

  describe('Scenario 7: Delete - Remove Settlement from Cloud', () => {
    it('should successfully delete settlement from cloud', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await dataService.deleteUserData('settlement-1')

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/user-data/settlement-1`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      )
    })

    it('should throw error when delete fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Forbidden',
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await expect(dataService.deleteUserData('settlement-1')).rejects.toThrow(
        'Failed to delete user data: Forbidden'
      )
    })
  })

  describe('Scenario 8: Large Data - Multiple Survivors and Settlements', () => {
    it('should handle large dataset with many survivors', async () => {
      const survivors = Array.from({ length: 50 }, (_, i) => ({
        id: `survivor-${i}`,
        name: `Survivor ${i}`,
        stats: {
          movement: 5,
          accuracy: 2,
          strength: 1,
          evasion: 3,
          luck: 2,
          speed: 4,
        },
      }))

      const largeData = {
        survivors,
        settlements: [{ id: 'settlement-1', name: 'Large Camp', survivors: survivors.map(s => s.id) }],
        inventory: { 'settlement-1': { gear: { 'bone-dagger': 100 }, materials: { bone: 500 } } },
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await dataService.saveUserData('settlement-1', largeData)

      expect(global.fetch).toHaveBeenCalled()
      const callArgs = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callArgs.body)
      expect(body.survivors).toHaveLength(50)
    })

    it('should handle large dataset with many settlements', async () => {
      const settlements = Array.from({ length: 20 }, (_, i) => ({
        id: `settlement-${i}`,
        name: `Settlement ${i}`,
        survivors: [],
      }))

      const largeData = {
        survivors: [],
        settlements,
        inventory: Object.fromEntries(
          settlements.map(s => [s.id, { gear: {}, materials: {} }])
        ),
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          ...settlements.map(s => ({
            data: JSON.stringify({
              survivors: [],
              settlements: [s],
              inventory: { [s.id]: { gear: {}, materials: {} } },
            }),
          })),
        ]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toHaveLength(20)
    })
  })

  describe('Scenario 9: Authentication Failures', () => {
    it('should fail if access token cannot be obtained', async () => {
      ;(mockAuthService.getAccessToken as any).mockRejectedValue(
        new Error('Authentication failed')
      )

      const data = {
        survivors: [],
        settlements: [],
        inventory: {},
      }

      await expect(
        dataService.saveUserData('settlement-1', data)
      ).rejects.toThrow('Authentication failed')
    })

    it('should reject requests with invalid token', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Unauthorized',
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const data = {
        survivors: [],
        settlements: [],
        inventory: {},
      }

      await expect(
        dataService.saveUserData('settlement-1', data)
      ).rejects.toThrow('Failed to save user data: Unauthorized')
    })
  })

  describe('Scenario 10: Network Failures and Retries', () => {
    it('should handle network timeout gracefully', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network timeout'))

      const data = {
        survivors: [],
        settlements: [],
        inventory: {},
      }

      await expect(
        dataService.saveUserData('settlement-1', data)
      ).rejects.toThrow('Network timeout')
    })

    it('should handle partial response data', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          { data: JSON.stringify({ survivors: [{ id: '1', name: 'Test' }] }) },
          { data: null }, // Malformed entry
          { data: JSON.stringify({ survivors: [] }) },
        ]),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await dataService.getAllUserData()

      expect(result).toHaveLength(3)
      // Should handle mixed valid/invalid data
    })
  })

  describe('Scenario 11: Data Integrity - Verify Saved Data', () => {
    it('should preserve all fields when saving and retrieving', async () => {
      const originalData = {
        survivors: [
          {
            id: 'survivor-1',
            name: 'John',
            gender: 'M',
            stats: {
              movement: 5,
              accuracy: 2,
              strength: 3,
              evasion: 1,
              luck: 2,
              speed: 4,
            },
            hunting_xp: [true, false, true],
            survival: 3,
            insanity: 5,
            disorders: ['Vertigo'],
            fighting_arts: ['Dodge'],
          },
        ],
        settlements: [
          {
            id: 'settlement-1',
            name: 'Main Camp',
            survivors: ['survivor-1'],
            generation: 2,
            timeline: 'year 15',
          },
        ],
        inventory: {
          'settlement-1': {
            gear: {
              'bone-dagger': 5,
              'lantern': 1,
              'rawhide-armor': 2,
            },
            materials: {
              bone: 45,
              leather: 12,
              hide: 8,
            },
          },
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: JSON.stringify(originalData),
        }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // Save the data
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      })
      await dataService.saveUserData('settlement-1', originalData)

      // Retrieve and verify
      ;(global.fetch as any).mockResolvedValue(mockResponse)
      const retrievedData = await dataService.getUserData('settlement-1')

      expect(retrievedData).toEqual(originalData)
      expect(retrievedData.survivors[0].fighting_arts).toContain('Dodge')
      expect(retrievedData.inventory['settlement-1'].gear['bone-dagger']).toBe(5)
    })
  })

  describe('Scenario 12: Edge Cases', () => {
    it('should handle settlement with no survivors', async () => {
      const data = {
        survivors: [],
        settlements: [
          {
            id: 'settlement-1',
            name: 'Empty Camp',
            survivors: [],
          },
        ],
        inventory: { 'settlement-1': { gear: {}, materials: {} } },
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await dataService.saveUserData('settlement-1', data)

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle settlement with special characters in name', async () => {
      const data = {
        survivors: [],
        settlements: [
          {
            id: 'settlement-1',
            name: "Player's Camp: The Final 🌙 Battle",
            survivors: [],
          },
        ],
        inventory: { 'settlement-1': { gear: {}, materials: {} } },
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await dataService.saveUserData('settlement-1', data)

      const callArgs = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callArgs.body)
      expect(body.settlements[0].name).toBe("Player's Camp: The Final 🌙 Battle")
    })

    it('should handle very long settlement name', async () => {
      const longName = 'A'.repeat(500)
      const data = {
        survivors: [],
        settlements: [
          {
            id: 'settlement-1',
            name: longName,
            survivors: [],
          },
        ],
        inventory: { 'settlement-1': { gear: {}, materials: {} } },
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await dataService.saveUserData('settlement-1', data)

      const callArgs = (global.fetch as any).mock.calls[0][1]
      const body = JSON.parse(callArgs.body)
      expect(body.settlements[0].name.length).toBe(500)
    })
  })
})
