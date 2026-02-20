/**
 * Debug Data Sanitization Utility
 *
 * Sanitizes localStorage and debug data before submission to remove sensitive information
 * like authentication tokens, user credentials, and other PII.
 */

import type { ErrorEntry } from './errorTracking';

export interface SanitizedDebugData {
  localStorage: Record<string, any>;
  errors: ErrorEntry[];
  userContext?: string;
  metadata: {
    timestamp: string;
    appVersion: string;
    userAgent: string;
    url: string;
    viewport: {
      width: number;
      height: number;
    };
  };
}

/**
 * List of localStorage keys to completely remove (contain sensitive data)
 */
const SENSITIVE_KEYS = [
  'cognito_tokens',
  'auth_token',
  'access_token',
  'id_token',
  'refresh_token',
];

/**
 * Regex patterns to detect and redact sensitive data
 */
const SENSITIVE_PATTERNS = [
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT tokens
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g, // Email addresses (partial redaction)
];

/**
 * Redact sensitive string patterns
 */
function redactSensitiveStrings(value: string): string {
  let redacted = value;

  // Redact JWT tokens
  redacted = redacted.replace(SENSITIVE_PATTERNS[0], '[REDACTED_TOKEN]');

  // Partially redact email addresses (keep domain for context)
  redacted = redacted.replace(SENSITIVE_PATTERNS[1], (email) => {
    const [localPart, domain] = email.split('@');
    return `${localPart.substring(0, 2)}***@${domain}`;
  });

  return redacted;
}

/**
 * Recursively sanitize an object, removing sensitive data
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactSensitiveStrings(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys entirely
      if (SENSITIVE_KEYS.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Collect and sanitize localStorage data
 */
function sanitizeLocalStorage(): Record<string, any> {
  const sanitized: Record<string, any> = {};

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Skip sensitive keys entirely
      if (SENSITIVE_KEYS.some(sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      try {
        const value = localStorage.getItem(key);
        if (value === null) continue;

        // Try to parse JSON values
        try {
          const parsed = JSON.parse(value);
          sanitized[key] = sanitizeObject(parsed);
        } catch {
          // Not JSON, treat as string
          sanitized[key] = redactSensitiveStrings(value);
        }
      } catch (error) {
        sanitized[key] = '[ERROR_READING_VALUE]';
      }
    }
  } catch (error) {
    console.error('Error sanitizing localStorage:', error);
  }

  return sanitized;
}

/**
 * Get app version from package.json or default
 */
function getAppVersion(): string {
  // Try to get from meta tag or environment variable
  const metaVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content');
  if (metaVersion) return metaVersion;

  // Fallback to a default
  return import.meta.env.VITE_APP_VERSION || '1.0.0';
}

/**
 * Sanitize debug data for submission
 */
export function sanitizeDebugData(
  errors: ErrorEntry[],
  userContext?: string
): SanitizedDebugData {
  // Sanitize errors (in case they contain sensitive data in messages)
  const sanitizedErrors = errors.map(error => ({
    ...error,
    message: redactSensitiveStrings(error.message),
    stack: error.stack ? redactSensitiveStrings(error.stack) : undefined,
    additionalInfo: error.additionalInfo ? sanitizeObject(error.additionalInfo) : undefined,
  }));

  // Sanitize user context
  const sanitizedUserContext = userContext ? redactSensitiveStrings(userContext) : undefined;

  return {
    localStorage: sanitizeLocalStorage(),
    errors: sanitizedErrors,
    userContext: sanitizedUserContext,
    metadata: {
      timestamp: new Date().toISOString(),
      appVersion: getAppVersion(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
  };
}
