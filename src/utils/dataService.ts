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

      const data = await response.json()
      return JSON.parse(data.data || '{}')
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
      const response = await fetch(`${this.apiBaseUrl}/user-data`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get user data: ${response.statusText}`)
      }

      const items = await response.json()
      return items.map((item: any) => JSON.parse(item.data || '{}'))
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
      const response = await fetch(
        `${this.apiBaseUrl}/user-data/${settlementId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to save user data: ${response.statusText}`)
      }

      console.log('User data saved successfully')
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

      console.log('User data deleted successfully')
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
