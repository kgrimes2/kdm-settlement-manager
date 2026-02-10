import { CognitoAuthService } from './authService'
import type { SettlementInventory } from '../migrations'

export interface UserDataPayload {
  survivors: any[]
  settlements: any[]
  inventory: Record<string, SettlementInventory>
  settings?: Record<string, any>
}

export class DataService {
  private authService: CognitoAuthService
  private apiBaseUrl: string

  constructor(authService: CognitoAuthService, apiBaseUrl: string) {
    this.authService = authService
    this.apiBaseUrl = apiBaseUrl
  }

  /**
   * Get user data for a specific settlement
   */
  async getUserData(settlementId: string): Promise<UserDataPayload> {
    try {
      const accessToken = await this.authService.getAccessToken()
      const response = await fetch(
        `${this.apiBaseUrl}/user-data/${settlementId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get user data: ${response.statusText}`)
      }

      const item = await response.json()
      // The Lambda returns the DynamoDB item which has: { user_id, settlement_id, data, updated_at }
      // We want to return just the 'data' field which is the UserDataPayload
      return item.data || { settlements: [], survivors: [], inventory: {} }
    } catch (error) {
      console.error('Error fetching user data:', error)
      throw error
    }
  }

  /**
   * Get all user data (all settlements)
   */
  async getAllUserData(): Promise<UserDataPayload[]> {
    try {
      const accessToken = await this.authService.getAccessToken()
      console.log('getAllUserData: Fetching from', `${this.apiBaseUrl}/user-data`)
      const response = await fetch(`${this.apiBaseUrl}/user-data`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('getAllUserData: Response status:', response.status)
      console.log('getAllUserData: Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('getAllUserData: Error response:', errorText)
        throw new Error(`Failed to get user data: ${response.statusText} - ${errorText}`)
      }

      const items = await response.json()
      console.log(`getAllUserData: Received ${items.length} items from API`)
      
      // Each item has: { user_id, settlement_id, data, updated_at }
      // The 'data' field is a JSON string that needs to be parsed
      const parsed = items.map((item: any) => {
        try {
          const payload = typeof item.data === 'string' ? JSON.parse(item.data) : item.data
          return payload
        } catch (e) {
          console.error('Failed to parse item:', item, e)
          return { settlements: [], survivors: [], inventory: {} }
        }
      })
      
      console.log(`getAllUserData: Parsed ${parsed.length} payloads`, parsed)
      return parsed
    } catch (error) {
      console.error('Error fetching all user data:', error)
      throw error
    }
  }

  /**
   * Save user data for a settlement
   */
  async saveUserData(settlementId: string, data: UserDataPayload): Promise<void> {
    try {
      const accessToken = await this.authService.getAccessToken()
      
      // Check payload size before sending
      const payload = JSON.stringify(data)
      const payloadSizeBytes = new Blob([payload]).size
      const payloadSizeMB = payloadSizeBytes / (1024 * 1024)
      const maxSizeMB = 10
      
      if (payloadSizeMB > maxSizeMB) {
        throw new Error(
          `Data size (${payloadSizeMB.toFixed(2)} MB) exceeds the ${maxSizeMB} MB limit. ` +
          `Please reduce your data size by removing old settlements or survivors.`
        )
      }
      
      const response = await fetch(
        `${this.apiBaseUrl}/user-data/${settlementId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: payload,
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to save user data: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error saving user data:', error)
      throw error
    }
  }

  /**
   * Delete user data for a settlement
   */
  async deleteUserData(settlementId: string): Promise<void> {
    try {
      const accessToken = await this.authService.getAccessToken()
      const response = await fetch(
        `${this.apiBaseUrl}/user-data/${settlementId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete user data: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting user data:', error)
      throw error
    }
  }

  /**
   * Sync local data to cloud
   */
  async syncToCloud(settlementId: string, localData: UserDataPayload): Promise<void> {
    try {
      await this.saveUserData(settlementId, localData)
    } catch (error) {
      console.error('Error syncing to cloud:', error)
      // Don't throw - allow app to continue working offline
    }
  }

  /**
   * Restore data from cloud
   */
  async restoreFromCloud(settlementId: string): Promise<UserDataPayload | null> {
    try {
      return await this.getUserData(settlementId)
    } catch (error) {
      console.error('Error restoring from cloud:', error)
      return null
    }
  }
}
