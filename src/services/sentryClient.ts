/**
 * Sentry Error Tracking Client
 *
 * Initializes @sentry/react-native for crash + exception reporting in
 * production builds. In development builds we capture errors but disable
 * uploading to keep local noise out of the dashboard.
 *
 * DSN is sourced from config.ts so it can be swapped per environment without
 * code changes. If the DSN is the empty string, Sentry stays disabled — this
 * keeps the App Store build safe when we don't want to ship a DSN yet.
 *
 * Exported functions:
 *   - initSentry(): one-time init, safe to call multiple times
 *   - captureException(err, context?): send a caught error w/ optional context
 */

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, APP_VERSION } from '../config';

let initialized = false;

/**
 * Initialize Sentry. No-ops if the DSN is empty (unconfigured env).
 * Safe to call more than once — second calls return immediately.
 */
export async function initSentry(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!SENTRY_DSN) {
    // eslint-disable-next-line no-console
    if (__DEV__) console.log('[Sentry] DSN not configured, skipping init');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      release: APP_VERSION,
      // Dev builds: capture but don't upload to avoid noise
      enabled: !__DEV__,
      // Keep sample rate modest so we don't burn event quota
      tracesSampleRate: __DEV__ ? 0 : 0.1,
      // Strip PII from URLs by default — users can opt in via privacy
      sendDefaultPii: false,
      attachStacktrace: true,
    });
    // eslint-disable-next-line no-console
    if (__DEV__) console.log('[Sentry] Initialized', { release: APP_VERSION });
  } catch (err) {
    // Never let Sentry init crash the app
    // eslint-disable-next-line no-console
    console.warn('[Sentry] Init failed:', err);
  }
}

/**
 * Capture and report an exception to Sentry with optional structured context.
 */
export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): void {
  try {
    if (context && Object.keys(context).length > 0) {
      Sentry.withScope((scope) => {
        scope.setContext('extra', context as Record<string, any>);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch {
    // Silent — a broken reporter must never cascade
  }
}

/**
 * Attach a user identifier to subsequent events. Call after sign-in.
 * Pass null to clear (e.g., on sign-out).
 */
export function setUser(userId: string | null): void {
  try {
    Sentry.setUser(userId ? { id: userId } : null);
  } catch {
    // silent
  }
}
