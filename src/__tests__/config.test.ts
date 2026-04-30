/**
 * @file config.test.ts
 * @description Tests for src/config.ts
 * Verifies configuration exports, feature flags, and metadata.
 */

import Config from '../config';

describe('Config', () => {
  describe('API Configuration', () => {
    it('should export API_BASE_URL as string', () => {
      expect(Config.API_BASE_URL).toBeDefined();
      expect(typeof Config.API_BASE_URL).toBe('string');
    });

    it('should export WS_BASE_URL as string', () => {
      expect(Config.WS_BASE_URL).toBeDefined();
      expect(typeof Config.WS_BASE_URL).toBe('string');
    });

    it('should default API_BASE_URL to a hosted https URL when no env override', () => {
      // 2026-04-26 (fork merge): localhost-by-default-in-dev was removed
      // because new dev machines without a FastAPI process running got
      // "Network request failed" on every AI/auth call. Override with
      // EXPO_PUBLIC_API_BASE_URL=http://localhost:8000 to run against a
      // local backend.
      expect(Config.API_BASE_URL).toMatch(/^https?:\/\//);
    });

    it('should default WS_BASE_URL to a hosted wss URL when no env override', () => {
      expect(Config.WS_BASE_URL).toMatch(/^wss?:\/\//);
    });
  });

  describe('Mapbox Configuration', () => {
    it('should export MAPBOX_ACCESS_TOKEN', () => {
      expect(Config.MAPBOX_ACCESS_TOKEN).toBeDefined();
      expect(typeof Config.MAPBOX_ACCESS_TOKEN).toBe('string');
    });

    it('should export a non-empty MAPBOX_ACCESS_TOKEN', () => {
      // 2026-04-26 (fork merge): config.ts ships a hardcoded fallback so
      // dev builds (where .env vars don't reach process.env without the
      // dotenv babel plugin) still get a valid token at runtime. Production
      // builds may override via EXPO_PUBLIC_MAPBOX_TOKEN at bundle time.
      expect(Config.MAPBOX_ACCESS_TOKEN).toBeTruthy();
      expect(Config.MAPBOX_ACCESS_TOKEN.startsWith('pk.')).toBe(true);
    });
  });

  describe('RevenueCat Configuration', () => {
    it('should export REVENUECAT_API_KEY', () => {
      expect(Config.REVENUECAT_API_KEY).toBeDefined();
      expect(typeof Config.REVENUECAT_API_KEY).toBe('string');
    });

    it('should export empty REVENUECAT_API_KEY (optional)', () => {
      // API key is optional and can be empty in dev
      expect(Config.REVENUECAT_API_KEY).toBe('');
    });
  });

  describe('Sentry Configuration', () => {
    it('should export SENTRY_DSN', () => {
      expect(Config.SENTRY_DSN).toBeDefined();
      expect(typeof Config.SENTRY_DSN).toBe('string');
    });

    it('should export empty SENTRY_DSN (optional)', () => {
      // DSN is optional and can be empty in dev
      expect(Config.SENTRY_DSN).toBe('');
    });
  });

  describe('Amazon Affiliate Configuration', () => {
    it('should export AMAZON_AFFILIATE_TAG', () => {
      expect(Config.AMAZON_AFFILIATE_TAG).toBeDefined();
      expect(typeof Config.AMAZON_AFFILIATE_TAG).toBe('string');
    });

    it('should have correct affiliate tag', () => {
      expect(Config.AMAZON_AFFILIATE_TAG).toBe('mdoutdoors1-20');
    });
  });

  describe('Feature Flags', () => {
    it('should export FEATURES object', () => {
      expect(Config.FEATURES).toBeDefined();
      expect(typeof Config.FEATURES).toBe('object');
    });

    it('should have REALTIME_SYNC flag', () => {
      expect(Config.FEATURES).toHaveProperty('REALTIME_SYNC');
      expect(typeof Config.FEATURES.REALTIME_SYNC).toBe('boolean');
    });

    it('should have SOCIAL_FEATURES flag', () => {
      expect(Config.FEATURES).toHaveProperty('SOCIAL_FEATURES');
      expect(typeof Config.FEATURES.SOCIAL_FEATURES).toBe('boolean');
    });

    it('should have PURCHASES_ENABLED flag', () => {
      expect(Config.FEATURES).toHaveProperty('PURCHASES_ENABLED');
      expect(typeof Config.FEATURES.PURCHASES_ENABLED).toBe('boolean');
    });

    it('should have SENTRY_ENABLED flag', () => {
      expect(Config.FEATURES).toHaveProperty('SENTRY_ENABLED');
      expect(typeof Config.FEATURES.SENTRY_ENABLED).toBe('boolean');
    });

    it('should have ANALYTICS_FLUSH flag', () => {
      expect(Config.FEATURES).toHaveProperty('ANALYTICS_FLUSH');
      expect(typeof Config.FEATURES.ANALYTICS_FLUSH).toBe('boolean');
    });

    it('should have STATE_PACKS flag', () => {
      expect(Config.FEATURES).toHaveProperty('STATE_PACKS');
      expect(typeof Config.FEATURES.STATE_PACKS).toBe('boolean');
    });

    it('should have all expected feature flags', () => {
      const expectedFlags = [
        'REALTIME_SYNC',
        'SOCIAL_FEATURES',
        'PURCHASES_ENABLED',
        'SENTRY_ENABLED',
        'ANALYTICS_FLUSH',
        'STATE_PACKS',
      ];
      expectedFlags.forEach((flag) => {
        expect(Config.FEATURES).toHaveProperty(flag);
      });
    });
  });

  describe('App Metadata', () => {
    it('should export APP_VERSION', () => {
      expect(Config.APP_VERSION).toBeDefined();
      expect(typeof Config.APP_VERSION).toBe('string');
    });

    it('should export correct APP_VERSION', () => {
      // 2026-04-26 (fork merge): version updated to V2.3.0+4 (was 2.1.0).
      // Pattern matches "<marketing>+<build>" — keep loose so a build bump
      // doesn't force a test update.
      expect(Config.APP_VERSION).toMatch(/^\d+\.\d+\.\d+\+\d+$/);
    });

    it('should export APP_BUNDLE_ID', () => {
      expect(Config.APP_BUNDLE_ID).toBeDefined();
      expect(typeof Config.APP_BUNDLE_ID).toBe('string');
    });

    it('should export correct APP_BUNDLE_ID (LOCKED)', () => {
      expect(Config.APP_BUNDLE_ID).toBe('com.davidstonko.huntmaryland');
    });

    it('should export APP_STORE_ID', () => {
      expect(Config.APP_STORE_ID).toBeDefined();
      expect(typeof Config.APP_STORE_ID).toBe('string');
    });

    it('should export correct APP_STORE_ID', () => {
      expect(Config.APP_STORE_ID).toBe('6761347484');
    });

    it('should export WEBSITE_URL', () => {
      expect(Config.WEBSITE_URL).toBeDefined();
      expect(typeof Config.WEBSITE_URL).toBe('string');
    });

    it('should export valid WEBSITE_URL', () => {
      expect(Config.WEBSITE_URL).toBe('https://davidstonko.github.io/huntmaryland-site');
      expect(Config.WEBSITE_URL.startsWith('https://')).toBe(true);
    });
  });

  describe('Config object integrity', () => {
    it('should be a const exported object', () => {
      // Config is declared as const with "as const" type assertion
      expect(Config).toBeDefined();
      expect(typeof Config).toBe('object');
    });

    it('should export all required keys', () => {
      const requiredKeys = [
        'API_BASE_URL',
        'WS_BASE_URL',
        'MAPBOX_ACCESS_TOKEN',
        'REVENUECAT_API_KEY',
        'SENTRY_DSN',
        'AMAZON_AFFILIATE_TAG',
        'FEATURES',
        'APP_VERSION',
        'APP_BUNDLE_ID',
        'APP_STORE_ID',
        'WEBSITE_URL',
      ];
      requiredKeys.forEach((key) => {
        expect(Config).toHaveProperty(key);
      });
    });
  });
});
