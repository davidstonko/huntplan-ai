/**
 * windService — contract tests.
 *
 * Drives the NOAA two-step fetch via an injected fetcher, so no real
 * network calls leave the jest runner. Locks:
 *   - String parsing for wind speed ("10 mph", "5 to 10 mph", "")
 *   - Compass-point parsing for wind direction ("NNE" → 22.5)
 *   - Points + hourly caching (no duplicate network fetches)
 *   - Picking the right forecast period for a given time
 *   - Error propagation from non-200 NWS responses
 */

import {
  parseWindSpeedString,
  parseWindDirectionString,
  parseNwsHourlyResponse,
  pickReadingForTime,
  getGridpointForCoord,
  getHourlyForecast,
  getWindAt,
  setWindServiceFetcher,
  __clearWindCaches,
} from '../windService';

function fakeResponse(body: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('parseWindSpeedString', () => {
  it('handles plain mph', () => {
    expect(parseWindSpeedString('10 mph')).toBe(10);
  });
  it('takes the upper bound of a range', () => {
    expect(parseWindSpeedString('5 to 10 mph')).toBe(10);
    expect(parseWindSpeedString('5-12 mph')).toBe(12);
  });
  it('handles missing/empty input', () => {
    expect(parseWindSpeedString(undefined)).toBe(0);
    expect(parseWindSpeedString('')).toBe(0);
    expect(parseWindSpeedString('   mph')).toBe(0);
  });
  it('passes through numeric input', () => {
    expect(parseWindSpeedString(15)).toBe(15);
  });
});

describe('parseWindDirectionString', () => {
  it('maps 16 compass points', () => {
    expect(parseWindDirectionString('N')).toBe(0);
    expect(parseWindDirectionString('NNE')).toBe(22.5);
    expect(parseWindDirectionString('E')).toBe(90);
    expect(parseWindDirectionString('W')).toBe(270);
    expect(parseWindDirectionString('SE')).toBe(135);
  });
  it('defaults unknown values to 0', () => {
    expect(parseWindDirectionString('xxx')).toBe(0);
    expect(parseWindDirectionString(undefined)).toBe(0);
  });
  it('wraps numeric degrees into 0-360', () => {
    expect(parseWindDirectionString(90)).toBe(90);
    expect(parseWindDirectionString(450)).toBe(90);
    expect(parseWindDirectionString(-90)).toBe(270);
  });
});

describe('parseNwsHourlyResponse', () => {
  it('pulls speed+direction from each period', () => {
    const payload = {
      properties: {
        periods: [
          {
            startTime: '2026-04-20T12:00:00-04:00',
            windSpeed: '8 mph',
            windDirection: 'NW',
            windGust: '15 mph',
          },
          {
            startTime: '2026-04-20T13:00:00-04:00',
            windSpeed: '5 to 10 mph',
            windDirection: 'N',
          },
        ],
      },
    };
    const out = parseNwsHourlyResponse(payload);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      timeIso: '2026-04-20T12:00:00-04:00',
      speedMph: 8,
      directionDeg: 315,
      gustMph: 15,
    });
    expect(out[1]).toMatchObject({
      speedMph: 10,
      directionDeg: 0,
    });
    expect(out[1].gustMph).toBeUndefined();
  });

  it('returns [] on missing periods', () => {
    expect(parseNwsHourlyResponse({})).toEqual([]);
    expect(parseNwsHourlyResponse({ properties: {} })).toEqual([]);
  });
});

describe('pickReadingForTime', () => {
  const readings = [
    { timeIso: '2026-04-20T10:00:00Z', speedMph: 5, directionDeg: 0 },
    { timeIso: '2026-04-20T11:00:00Z', speedMph: 7, directionDeg: 90 },
    { timeIso: '2026-04-20T12:00:00Z', speedMph: 10, directionDeg: 180 },
  ];

  it('returns the closest forecast period', () => {
    const out = pickReadingForTime(readings, '2026-04-20T11:10:00Z');
    expect(out?.timeIso).toBe('2026-04-20T11:00:00Z');
  });

  it('returns null for empty input', () => {
    expect(pickReadingForTime([], '2026-04-20T12:00:00Z')).toBeNull();
  });

  it('returns null for invalid whenIso', () => {
    expect(pickReadingForTime(readings, 'not a date')).toBeNull();
  });
});

describe('getGridpointForCoord caching + fetch', () => {
  beforeEach(() => __clearWindCaches());
  afterAll(() => setWindServiceFetcher());

  it('extracts gridId/gridX/gridY + hourly URL from NWS', async () => {
    const calls: string[] = [];
    setWindServiceFetcher(async (url) => {
      calls.push(url);
      return fakeResponse({
        properties: {
          gridId: 'LWX',
          gridX: 97,
          gridY: 70,
          forecastHourly:
            'https://api.weather.gov/gridpoints/LWX/97,70/forecast/hourly',
        },
      });
    });
    const info = await getGridpointForCoord(39.3, -76.9);
    expect(info.gridId).toBe('LWX');
    expect(info.gridX).toBe(97);
    expect(info.gridY).toBe(70);
    expect(info.forecastHourlyUrl).toContain('/gridpoints/LWX/97,70');
    expect(calls).toHaveLength(1);
  });

  it('caches the gridpoint so nearby coords do not refetch', async () => {
    let calls = 0;
    setWindServiceFetcher(async () => {
      calls += 1;
      return fakeResponse({
        properties: {
          gridId: 'LWX',
          gridX: 97,
          gridY: 70,
          forecastHourly: 'https://x/x',
        },
      });
    });
    await getGridpointForCoord(39.3001, -76.9001);
    await getGridpointForCoord(39.3004, -76.8998); // same 3-dec bucket
    expect(calls).toBe(1);
  });

  it('throws on non-200 NWS response', async () => {
    setWindServiceFetcher(async () => fakeResponse({ error: 'boom' }, 500));
    await expect(getGridpointForCoord(39, -77)).rejects.toThrow(/NWS 500/);
  });
});

describe('getHourlyForecast caching', () => {
  beforeEach(() => __clearWindCaches());
  afterAll(() => setWindServiceFetcher());

  it('fetches forecast once and reuses within the hour', async () => {
    let calls = 0;
    setWindServiceFetcher(async () => {
      calls += 1;
      return fakeResponse({
        properties: {
          periods: [
            {
              startTime: '2026-04-20T12:00:00Z',
              windSpeed: '10 mph',
              windDirection: 'E',
            },
          ],
        },
      });
    });
    const info = {
      gridId: 'LWX',
      gridX: 97,
      gridY: 70,
      forecastHourlyUrl: 'https://x/hourly',
      fetchedAt: Date.now(),
    };
    await getHourlyForecast(info);
    await getHourlyForecast(info);
    expect(calls).toBe(1);
  });
});

describe('getWindAt — end-to-end two-step', () => {
  beforeEach(() => __clearWindCaches());
  afterAll(() => setWindServiceFetcher());

  it('resolves points then hourly then picks the right period', async () => {
    const order: string[] = [];
    setWindServiceFetcher(async (url) => {
      order.push(url);
      if (url.includes('/points/')) {
        return fakeResponse({
          properties: {
            gridId: 'LWX',
            gridX: 97,
            gridY: 70,
            forecastHourly: 'https://x/hourly',
          },
        });
      }
      return fakeResponse({
        properties: {
          periods: [
            {
              startTime: '2026-04-20T11:00:00Z',
              windSpeed: '8 mph',
              windDirection: 'N',
            },
            {
              startTime: '2026-04-20T12:00:00Z',
              windSpeed: '10 mph',
              windDirection: 'E',
            },
          ],
        },
      });
    });
    const out = await getWindAt(39.3, -76.9, '2026-04-20T12:05:00Z');
    expect(out).toMatchObject({
      timeIso: '2026-04-20T12:00:00Z',
      speedMph: 10,
      directionDeg: 90,
    });
    expect(order[0]).toContain('/points/');
    expect(order[1]).toContain('/hourly');
  });
});
