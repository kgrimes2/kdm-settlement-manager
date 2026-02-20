/**
 * Debug Submission Service
 *
 * Service for submitting debug reports to the backend API.
 * Handles authentication and API communication.
 */

import { CognitoAuthService } from './authService';
import type { ErrorEntry } from './errorTracking';
import { sanitizeDebugData } from './debugSanitizer';

export interface SubmitDebugResponse {
  message: string;
  submission_id: string;
}

export class DebugService {
  private authService: CognitoAuthService;
  private apiBaseUrl: string;

  constructor(authService: CognitoAuthService, apiBaseUrl: string) {
    this.authService = authService;
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Submit a debug report with errors and optional user context
   */
  async submitDebugReport(
    errors: ErrorEntry[],
    userContext?: string
  ): Promise<SubmitDebugResponse> {
    try {
      // Sanitize data before submission
      const sanitizedData = sanitizeDebugData(errors, userContext);

      // Get access token for authentication
      const accessToken = await this.authService.getAccessToken();

      // Submit to API
      const response = await fetch(`${this.apiBaseUrl}/debug-submission`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to submit debug report: ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error submitting debug report:', error);
      throw error;
    }
  }

}
