/**
 * @file tideStationService.test.ts
 * @description Jest tests for the tideStationService.
 */

import {
  getTidesForStation,
  clearTideCache,
  getTideCacheSize,
  TideStationData,
} from '../tideStationService';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('tideStationService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearTideCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch tide predictions on happy path', async () => {
    const mockResponse: TideStationData = {
      status: 'ok',
      station_id: '8575512',
      high: [{ time: '2026-04-20 06:30', height_ft: 2.45 }],
      low: [{ time: '2026-04-20 12:45', height_ft: -1.23 }],
      now: { state: 'falling', as_of: '2026-04-20T15:30:00Z' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as any);

    const result = await getTidesForStation('8575512');
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArg = mockFetch.mock.calls[0][0] as string;
    expect(callArg).toContain('/integrations/fish/tide-station/8575512');
  });

  it('should return unavailable on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await getTidesForStation('8575512');
    expect(result.status).toBe('unavailable');
    expect(result.now.state).toBe('unknown');
  });

  it('should return unavailable on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as any);
    const result = await getTidesForStation('8575512');
    expect(result.status).toBe('unavailable');
  });

  it('should cache successful responses', async () => {
    const mockResponse: TideStationData = {
      status: 'ok',
      station_id: '8570280',
      high: [],
      low: [],
      now: { state: 'unknown' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as any);

    await getTidesForStation('8570280');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(2 * 60 * 1000);
    await getTidesForStation('8570280');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should expire cache after 5 minutes', async () => {
    const mockResponse: TideStationData = {
      status: 'ok',
      station_id: '8570280',
      high: [],
      low: [],
      now: { state: 'unknown' },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as any);

    await getTidesForStation('8570280');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    await getTidesForStation('8570280');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should track cache size', async () => {
    expect(getTideCacheSize()).toBe(0);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        station_id: '8570280',
        high: [],
        low: [],
        now: { state: 'unknown' },
      }),
    } as any);
    await getTidesForStation('8570280');
    expect(getTideCacheSize()).toBe(1);
    clearTideCache();
    expect(getTideCacheSize()).toBe(0);
  });
});
