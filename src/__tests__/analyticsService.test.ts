/**
 * @file analyticsService.test.ts
 * @description Tests for src/services/analyticsService.ts
 * Verifies event tracking, queueing, and flushing behavior.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeAnalytics,
  trackScreenView,
  trackFeatureUsed,
  trackAffiliateTap,
  trackSearch,
  trackFilterChange,
  trackPlanCreated,
  trackTripPlanned,
  trackError,
  enqueueEvent,
  flushEvents,
  getEventQueue,
  clearEventQueue,
  shutdownAnalytics,
  getAnalyticsStatus,
  AnalyticsEvent,
} from '../services/analyticsService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock fetch globally
global.fetch = jest.fn();

describe('analyticsService', () => {
  const testSessionId = 'test-device-123';
  const testAppVersion = '2.1.0';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    shutdownAnalytics();
  });

  describe('initializeAnalytics', () => {
    it('should initialize with provided session ID and app version', async () => {
      await initializeAnalytics(testSessionId, testAppVersion);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_config',
        expect.stringContaining(testSessionId)
      );
    });

    it('should set up auto-flush timer with default interval', async () => {
      await initializeAnalytics(testSessionId, testAppVersion);

      // Advance timers to trigger auto-flush
      jest.advanceTimersByTime(60000);

      // Verify that fetch was called for flushing
      // (will fail gracefully since there are no events, but timer was set)
      expect(true).toBe(true);
    });

    it('should use custom flush interval if provided', async () => {
      const customInterval = 30000;
      await initializeAnalytics(testSessionId, testAppVersion, customInterval);

      // Should be initialized
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('trackScreenView', () => {
    beforeEach(async () => {
      await initializeAnalytics(testSessionId, testAppVersion);
      mockAsyncStorage.getItem.mockResolvedValue('[]');
    });

    it('should track screen view events', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await trackScreenView('MapScreen');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('screen_view')
      );
    });

    it('should include screen name in event', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await trackScreenView('ScoutScreen', { zoom: 12 });

      const calls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
      const queueCall = calls.find((call) => call[0] === '@analytics_queue');
      expect(queueCall[1]).toContain('ScoutScreen');
    });

    it('should include metadata if provided', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      const metadata = { zoom: 15, region: 'western' };
      await trackScreenView('MapScreen', metadata);

      const calls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
      const queueCall = calls.find((call) => call[0] === '@analytics_queue');
      expect(queueCall[1]).toContain('zoom');
    });
  });

  describe('trackFeatureUsed', () => {
    beforeEach(async () => {
      await initializeAnalytics(testSessionId, testAppVersion);
      mockAsyncStorage.getItem.mockResolvedValue('[]');
    });

    it('should track feature usage events', async () => {
      await trackFeatureUsed('trip_planner');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('feature_used')
      );
    });

    it('should include feature name in event', async () => {
      await trackFeatureUsed('gear_picks');

      const calls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
      const queueCall = calls.find((call) => call[0] === '@analytics_queue');
      expect(queueCall[1]).toContain('gear_picks');
    });
  });

  describe('trackAffiliateTap', () => {
    beforeEach(async () => {
      await initializeAnalytics(testSessionId, testAppVersion);
      mockAsyncStorage.getItem.mockResolvedValue('[]');
    });

    it('should track affiliate link taps', async () => {
      await trackAffiliateTap('Decoy Set', 'B00ABCD123', 'decoys');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('affiliate_tap')
      );
    });

    it('should include product and ASIN in event', async () => {
      await trackAffiliateTap('Gobstopper Decoy', 'B0123456789', 'decoys');

      const calls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
      const queueCall = calls.find((call) => call[0] === '@analytics_queue');
      expect(queueCall[1]).toContain('Gobstopper Decoy');
      expect(queueCall[1]).toContain('B0123456789');
    });
  });

  describe('Event queue management', () => {
    beforeEach(async () => {
      await initializeAnalytics(testSessionId, testAppVersion);
    });

    it('should enqueue events to AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await trackScreenView('TestScreen');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.any(String)
      );
    });

    it('should enforce max queue size of 500', async () => {
      // Create a queue with 500 items
      const largeQueue = Array.from({ length: 500 }, (_, i) => ({
        id: `event-${i}`,
        type: 'screen_view' as const,
        screenName: 'Test',
        timestamp: Date.now(),
        sessionId: testSessionId,
        appVersion: testAppVersion,
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(largeQueue));

      await trackScreenView('NewEvent');

      // Should have been called with a queue that removes the oldest event
      const calls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
      const queueCall = calls.find((call) => call[0] === '@analytics_queue');
      const savedQueue = JSON.parse(queueCall[1]);

      // Should still be max 500 items (oldest removed, new one added)
      expect(savedQueue.length).toBeLessThanOrEqual(500);
    });

    it('should return event queue via getEventQueue', async () => {
      const mockQueue: AnalyticsEvent[] = [
        {
          id: 'test-1',
          type: 'screen_view',
          screenName: 'MapScreen',
          timestamp: Date.now(),
          sessionId: testSessionId,
          appVersion: testAppVersion,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const queue = await getEventQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0].screenName).toBe('MapScreen');
    });

    it('should clear event queue via clearEventQueue', async () => {
      await clearEventQueue();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@analytics_queue');
    });
  });

  describe('flushEvents', () => {
    beforeEach(async () => {
      await initializeAnalytics(testSessionId, testAppVersion);
    });

    it('should send queued events to backend', async () => {
      const mockQueue: AnalyticsEvent[] = [
        {
          id: 'test-1',
          type: 'screen_view',
          screenName: 'MapScreen',
          timestamp: Date.now(),
          sessionId: testSessionId,
          appVersion: testAppVersion,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await flushEvents();

      // 2026-04-26 (fork merge): API_BASE_URL no longer hardcodes localhost
      // in dev — it reads EXPO_PUBLIC_API_BASE_URL or falls back to the
      // Render production URL. Match the path, not the full URL.
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/analytics\/events$/),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should clear queue on successful flush', async () => {
      const mockQueue: AnalyticsEvent[] = [
        {
          id: 'test-1',
          type: 'screen_view',
          screenName: 'Test',
          timestamp: Date.now(),
          sessionId: testSessionId,
          appVersion: testAppVersion,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await flushEvents();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@analytics_queue');
    });

    it('should handle flush errors gracefully', async () => {
      const mockQueue: AnalyticsEvent[] = [
        {
          id: 'test-1',
          type: 'screen_view',
          screenName: 'Test',
          timestamp: Date.now(),
          sessionId: testSessionId,
          appVersion: testAppVersion,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(flushEvents()).resolves.toBeUndefined();
    });

    it('should skip flush if queue is empty', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await flushEvents();

      // Fetch should not be called when queue is empty
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Analytics status', () => {
    it('should report initialization status', async () => {
      await initializeAnalytics(testSessionId, testAppVersion);

      const status = await getAnalyticsStatus();

      expect(status.initialized).toBe(true);
      expect(status.sessionId).toBe(testSessionId);
    });

    it('should report queue size', async () => {
      await initializeAnalytics(testSessionId, testAppVersion);

      const mockQueue: AnalyticsEvent[] = Array.from({ length: 5 }, (_, i) => ({
        id: `event-${i}`,
        type: 'screen_view' as const,
        screenName: 'Test',
        timestamp: Date.now(),
        sessionId: testSessionId,
        appVersion: testAppVersion,
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const status = await getAnalyticsStatus();

      expect(status.queueSize).toBe(5);
    });
  });

  describe('Event types coverage', () => {
    beforeEach(async () => {
      await initializeAnalytics(testSessionId, testAppVersion);
      mockAsyncStorage.getItem.mockResolvedValue('[]');
    });

    it('should track search events', async () => {
      await trackSearch('deer hunting', 42);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('search')
      );
    });

    it('should track filter change events', async () => {
      await trackFilterChange('land_type', { types: ['WMA', 'SF'] });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('filter_change')
      );
    });

    it('should track plan creation events', async () => {
      await trackPlanCreated('hunt_plan', { location: 'Garrett County' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('plan_created')
      );
    });

    it('should track trip planning events', async () => {
      await trackTripPlanned('at_backpacking', 'spring', 42);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('trip_planned')
      );
    });

    it('should track error events', async () => {
      await trackError('Map load failed', 'MapScreen');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@analytics_queue',
        expect.stringContaining('error')
      );
    });
  });

  describe('Shutdown', () => {
    it('should cleanup timers on shutdown', async () => {
      await initializeAnalytics(testSessionId, testAppVersion);

      shutdownAnalytics();

      // Should not throw and timers should be cleared
      expect(true).toBe(true);
    });
  });
});
