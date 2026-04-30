/**
 * Tests for analyticsClient.ts
 *
 * Covers trackEvent(), flushAnalyticsQueue(), startAnalyticsFlush(), stopAnalyticsFlush().
 * Uses mocked AsyncStorage and fetch.
 * AsyncStorage is mocked globally via jest.setup.js
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, flushAnalyticsQueue, startAnalyticsFlush, stopAnalyticsFlush } from '../analyticsClient';

// Mock fetch
global.fetch = jest.fn();

const ANALYTICS_QUEUE_KEY = '@mdhuntfish:analytics_queue_v1';

describe('analyticsClient', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    stopAnalyticsFlush();
  });

  afterEach(() => {
    // Clean up AsyncStorage between tests
    return AsyncStorage.clear();
  });

  describe('trackEvent()', () => {
    it('should queue event to AsyncStorage when analytics enabled', async () => {
      // Make fetch reject so event stays queued
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await trackEvent('test_event', { foo: 'bar' }, 'user-123', true);

      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).not.toBeNull();

      const queue = JSON.parse(stored!);
      expect(queue).toBeInstanceOf(Array);
      expect(queue.length).toBe(1);
      expect(queue[0].event_name).toBe('test_event');
      expect(queue[0].properties).toEqual({ foo: 'bar' });
      expect(queue[0].user_id).toBe('user-123');
    });

    it('should include timestamp in event', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const beforeTrack = new Date();
      await trackEvent('event', {}, undefined, true);
      const afterTrack = new Date();

      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      const queue = JSON.parse(stored!);
      const timestamp = new Date(queue[0].timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTrack.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTrack.getTime());
    });

    it('should no-op when analytics disabled', async () => {
      await trackEvent('test_event', { foo: 'bar' }, undefined, false);

      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).toBeNull();
    });

    it('should queue event even if fetch fails (offline-first)', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await trackEvent('offline_event', { offline: true }, undefined, true);

      // Event should still be queued (fetch failed, so queue not cleared)
      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).not.toBeNull();
      const queue = JSON.parse(stored!);
      expect(queue[0].event_name).toBe('offline_event');
    });

    it('should append to existing queue', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const existingQueue = [
        {
          event_name: 'existing',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(existingQueue));

      await trackEvent('new_event', { new: true }, undefined, true);

      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      const queue = JSON.parse(stored!);

      expect(queue.length).toBe(2);
      expect(queue[0].event_name).toBe('existing');
      expect(queue[1].event_name).toBe('new_event');
    });

    it('should flush immediately on trackEvent if online', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await trackEvent('online_event', { online: true }, undefined, true);

      // Queue should be cleared after successful flush
      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).toBeNull();

      // Fetch should have been called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/events'),
        expect.any(Object),
      );
    });
  });

  describe('flushAnalyticsQueue()', () => {
    it('should POST queued events to backend when online', async () => {
      const queuedEvents = [
        {
          event_name: 'event1',
          properties: { a: 1 },
          user_id: 'user1',
          timestamp: new Date().toISOString(),
        },
        {
          event_name: 'event2',
          properties: { b: 2 },
          user_id: 'user1',
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await flushAnalyticsQueue(true);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/events'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: queuedEvents }),
        },
      );
    });

    it('should clear queue after successful flush', async () => {
      const queuedEvents = [
        {
          event_name: 'event1',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await flushAnalyticsQueue(true);

      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).toBeNull();
    });

    it('should not clear queue if fetch fails (offline resilience)', async () => {
      const queuedEvents = [
        {
          event_name: 'event1',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await flushAnalyticsQueue(true);

      // Queue should still be intact
      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).not.toBeNull();
    });

    it('should not clear queue if server returns error status', async () => {
      const queuedEvents = [
        {
          event_name: 'event1',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await flushAnalyticsQueue(true);

      const stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).not.toBeNull();
    });

    it('should no-op if analytics disabled', async () => {
      const queuedEvents = [
        {
          event_name: 'event1',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));

      await flushAnalyticsQueue(false);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should no-op if queue is empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await flushAnalyticsQueue(true);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should flush multiple events in one batch', async () => {
      const queuedEvents = Array.from({ length: 5 }, (_, i) => ({
        event_name: `event${i}`,
        properties: { index: i },
        user_id: undefined,
        timestamp: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await flushAnalyticsQueue(true);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.events.length).toBe(5);
    });

    it('should continue retrying on network failures', async () => {
      const queuedEvents = [
        {
          event_name: 'event1',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // First flush fails
      await flushAnalyticsQueue(true);

      let stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).not.toBeNull();

      // Second flush attempt should still find the event
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      });
      await flushAnalyticsQueue(true);

      stored = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      expect(stored).toBeNull();
    });
  });

  describe('startAnalyticsFlush() & stopAnalyticsFlush()', () => {
    it('should start periodic flush interval', async () => {
      jest.useFakeTimers();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const queuedEvents = [
        {
          event_name: 'event1',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));

      startAnalyticsFlush(true);

      // Just verify the timer was created by checking fetch wasn't called yet
      expect(global.fetch).not.toHaveBeenCalled();

      // Advance time and allow promises to resolve
      jest.advanceTimersByTime(30001);

      // Give promise callbacks time to execute
      await jest.runOnlyPendingTimersAsync();

      // After flush, verify it attempted to POST
      expect(global.fetch).toHaveBeenCalled();

      stopAnalyticsFlush();
      jest.useRealTimers();
    });

    it('should not start timer if analytics disabled', () => {
      jest.useFakeTimers();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      startAnalyticsFlush(false);

      jest.advanceTimersByTime(30000);

      // fetch should not be called
      expect(global.fetch).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should clear timer on stopAnalyticsFlush()', async () => {
      jest.useFakeTimers();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const queuedEvents = [
        {
          event_name: 'event1',
          properties: {},
          user_id: undefined,
          timestamp: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queuedEvents));

      startAnalyticsFlush(true);
      stopAnalyticsFlush();

      jest.advanceTimersByTime(30000);

      // fetch should not be called after stop
      expect(global.fetch).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
