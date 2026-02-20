/**
 * Error Tracking Service
 *
 * Captures console errors, warnings, and unhandled errors for debug reporting.
 * Maintains a circular buffer of recent errors with timestamps and stack traces.
 */

export interface ErrorEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'unhandled' | 'rejection';
  message: string;
  stack?: string;
  additionalInfo?: any;
}

class ErrorTracker {
  private errors: ErrorEntry[] = [];
  private maxErrors = 100;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private initialized = false;

  constructor() {
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
  }

  /**
   * Initialize error tracking by intercepting console methods and adding global handlers
   */
  init() {
    if (this.initialized) {
      return;
    }

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.captureError('error', args);
      this.originalConsoleError(...args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.captureError('warn', args);
      this.originalConsoleWarn(...args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.addError({
        timestamp: new Date().toISOString(),
        level: 'unhandled',
        message: event.message,
        stack: event.error?.stack,
        additionalInfo: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.addError({
        timestamp: new Date().toISOString(),
        level: 'rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        additionalInfo: {
          type: 'unhandledRejection',
        },
      });
    });

    this.initialized = true;
  }

  /**
   * Capture error from console methods
   */
  private captureError(level: 'error' | 'warn', args: any[]) {
    const message = args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    const stack = args.find(arg => arg instanceof Error)?.stack;

    this.addError({
      timestamp: new Date().toISOString(),
      level,
      message,
      stack,
      additionalInfo: args.length > 1 ? args.slice(1) : undefined,
    });
  }

  /**
   * Add error to circular buffer
   */
  private addError(error: ErrorEntry) {
    this.errors.push(error);

    // Maintain circular buffer by removing oldest entries
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  /**
   * Get recent errors for submission (last 50)
   */
  getRecentErrors(): ErrorEntry[] {
    return this.errors.slice(-50);
  }

  /**
   * Clear all tracked errors
   */
  clear() {
    this.errors = [];
  }

  /**
   * Get total error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// TypeScript declaration for window property
declare global {
  interface Window {
    __errorTracker?: ErrorTracker;
  }
}
