/**
 * @file crashReportingService.ts
 * @description Sentry crash reporting integration for MDHuntFishOutdoors.
 * Captures crashes, errors, and performance metrics.
 * Gracefully degrades if Sentry SDK is not installed.
 */

import { Platform } from 'react-native';

// Type definitions for Sentry SDK (graceful if not installed)
interface SentryBreadcrumb {
  category: string;
  message: string;
  data?: Record<string, unknown>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

interface SentryTransactionOptions {
  op: string;
  name: string;
}

interface SentryTransaction {
  finish: () => void;
  startChild: (options: { op: string; description?: string }) => { finish: () => void };
}

interface SentryConfig {
  dsn: string;
  environment?: 'development' | 'staging' | 'production';
  tracesSampleRate?: number;
  maxBreadcrumbs?: number;
  ignoreErrors?: string[];
  beforeSend?: (event: unknown) => unknown;
}

let sentryInitialized = false;
let sentryAvailable = false;
let Sentry: any = null;

/**
 * Initialize Sentry crash reporting
 * @param dsn - Sentry DSN (Data Source Name)
 * @param config - Optional Sentry configuration
 */
export const initializeCrashReporting = (dsn: string, config?: Partial<SentryConfig>): void => {
  if (!dsn) {
    console.warn('[CrashReporting] No DSN provided, crash reporting disabled');
    return;
  }

  try {
    // Attempt to load Sentry SDK
    // eslint-disable-next-line global-require
    Sentry = require('@sentry/react-native');
    sentryAvailable = true;

    const environment = config?.environment || detectEnvironment();
    const sentryConfig: SentryConfig = {
      dsn,
      environment,
      tracesSampleRate: config?.tracesSampleRate ?? 0.1,
      maxBreadcrumbs: config?.maxBreadcrumbs ?? 50,
      ignoreErrors: [
        'Network request failed',
        'timeout of',
        'The network connection was lost',
        ...(config?.ignoreErrors ?? []),
      ],
      beforeSend(event: unknown): unknown {
        // Privacy: strip any potential PII
        return stripPII(event);
      },
    };

    Sentry.init(sentryConfig);
    sentryInitialized = true;

    if (__DEV__) console.log(`[CrashReporting] Initialized (${environment})`);
  } catch (error) {
    if (__DEV__) console.warn('[CrashReporting] Sentry SDK not available, using no-op fallback');
    sentryAvailable = false;
    sentryInitialized = true;
  }
};

/**
 * Detect environment from config or __DEV__ flag
 */
const detectEnvironment = (): 'development' | 'staging' | 'production' => {
  // In a real app, you'd read from env config or build variables
  if (__DEV__) {
    return 'development';
  }
  return 'production';
};

/**
 * Strip potential PII from events before sending
 */
const stripPII = (event: unknown): unknown => {
  if (!event || typeof event !== 'object') {
    return event;
  }

  const eventObj = event as Record<string, unknown>;

  // Remove or anonymize user context if present
  if (eventObj.user) {
    const user = eventObj.user as Record<string, unknown>;
    // Only keep safe fields
    eventObj.user = {
      id: user.id, // Anonymous device ID only
    };
  }

  // Remove breadcrumb data that might contain PII
  if (Array.isArray(eventObj.breadcrumbs)) {
    eventObj.breadcrumbs = eventObj.breadcrumbs.map((crumb: any) => {
      if (crumb.data) {
        // Remove potentially sensitive fields
        const { password, token, apiKey, email, phone, ...safeData } = crumb.data;
        return {
          ...crumb,
          data: safeData,
        };
      }
      return crumb;
    });
  }

  return event;
};

/**
 * Capture an exception with optional context
 * @param error - The error object
 * @param context - Optional context data
 */
export const captureException = (
  error: Error | string,
  context?: Record<string, unknown>
): void => {
  if (!sentryInitialized) {
    console.warn('[CrashReporting] Not initialized');
    return;
  }

  const errorObj = typeof error === 'string' ? new Error(error) : error;

  if (sentryAvailable && Sentry) {
    try {
      if (context) {
        Sentry.withScope((scope: any) => {
          Object.entries(context).forEach(([key, value]) => {
            scope.setContext(key, value as Record<string, unknown>);
          });
          Sentry.captureException(errorObj);
        });
      } else {
        Sentry.captureException(errorObj);
      }
    } catch (sendError) {
      console.warn('[CrashReporting] Failed to send exception', sendError);
    }
  } else {
    console.error('[CrashReporting] Exception captured:', errorObj.message, context);
  }
};

/**
 * Capture a message
 * @param message - Message text
 * @param level - Severity level
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
): void => {
  if (!sentryInitialized) {
    console.warn('[CrashReporting] Not initialized');
    return;
  }

  if (sentryAvailable && Sentry) {
    try {
      Sentry.captureMessage(message, level);
    } catch (error) {
      console.warn('[CrashReporting] Failed to send message', error);
    }
  } else {
    const levelSymbol = { fatal: '💀', error: '❌', warning: '⚠️', info: 'ℹ️', debug: '🐛' }[
      level
    ];
    console.log(`[CrashReporting] ${levelSymbol} ${message}`);
  }
};

/**
 * Set user context for crash reports
 * @param userId - Anonymous device ID
 * @param username - Optional username (sanitized)
 */
export const setUserContext = (userId: string, username?: string): void => {
  if (!sentryInitialized) {
    console.warn('[CrashReporting] Not initialized');
    return;
  }

  if (sentryAvailable && Sentry) {
    try {
      Sentry.setUser({
        id: userId,
        // Only set username if explicitly provided and not email-like
        username: username && !username.includes('@') ? username : undefined,
      });
    } catch (error) {
      console.warn('[CrashReporting] Failed to set user context', error);
    }
  }
};

/**
 * Add a breadcrumb for debugging
 * @param category - Breadcrumb category (navigation, action, etc.)
 * @param message - Breadcrumb message
 * @param data - Optional breadcrumb data
 */
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, unknown>
): void => {
  if (!sentryInitialized) {
    return;
  }

  if (sentryAvailable && Sentry) {
    try {
      const breadcrumb: SentryBreadcrumb = {
        category,
        message,
        data,
        level: 'info',
      };
      Sentry.addBreadcrumb(breadcrumb);
    } catch (error) {
      console.warn('[CrashReporting] Failed to add breadcrumb', error);
    }
  }
};

/**
 * Start a performance transaction
 * @param name - Transaction name
 * @param op - Operation type (e.g., 'navigation', 'http.client')
 * @returns Transaction object with finish() method, or null if not available
 */
export const startTransaction = (
  name: string,
  op: string
): SentryTransaction | null => {
  if (!sentryInitialized || !sentryAvailable || !Sentry) {
    return null;
  }

  try {
    const transaction = Sentry.startTransaction({
      name,
      op,
    });
    return transaction;
  } catch (error) {
    console.warn('[CrashReporting] Failed to start transaction', error);
    return null;
  }
};

/**
 * Execute a callback within a Sentry scope for scoped error reporting
 * @param callback - Function to execute within the scope
 * @param context - Optional context to set for the scope
 */
export const withScope = (
  callback: () => void,
  context?: Record<string, unknown>
): void => {
  if (!sentryInitialized) {
    callback();
    return;
  }

  if (sentryAvailable && Sentry) {
    try {
      Sentry.withScope((scope: any) => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setContext(key, value as Record<string, unknown>);
          });
        }
        callback();
      });
    } catch (error) {
      console.warn('[CrashReporting] withScope error', error);
      callback();
    }
  } else {
    callback();
  }
};

/**
 * Get crash reporting status (for debugging/health checks)
 */
export const getCrashReportingStatus = (): {
  initialized: boolean;
  available: boolean;
  platform: string;
} => ({
  initialized: sentryInitialized,
  available: sentryAvailable,
  platform: Platform.OS,
});
