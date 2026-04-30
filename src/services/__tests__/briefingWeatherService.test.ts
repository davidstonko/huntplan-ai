/**
 * @file briefingWeatherService.test.ts
 * @description Locks the Phase A.32 pure helpers that project a
 * weather.gov forecast array into the one-row card view-model.
 *
 * The card itself is rendered via React Native and tested at the
 * contract level only (BriefingWeatherCard.test.tsx). The riskier
 * surface is the parsing + picking math here — windSpeed is
 * free-form text from NWS, and forecast arrays can be missing pieces.
 */

import {
  parseWindMph,
  pickTodayPeriods,
  summarizeForecast,
  formatHighLow,
  formatWind,
} from '../briefingWeatherService';
import type { WeatherForecast } from '../weatherService';

function period(over: Partial<WeatherForecast>): WeatherForecast {
  return {
    name: 'Today',
    temperature: 60,
    temperatureUnit: 'F',
    windSpeed: '5 mph',
    windDirection: 'NW',
    shortForecast: 'Partly Cloudy',
    detailedForecast: '',
    isDaytime: true,
    icon: '',
    ...over,
  };
}

describe('parseWindMph — extract integer mph from weather.gov string', () => {
  it('returns the single number for "10 mph"', () => {
    expect(parseWindMph('10 mph')).toBe(10);
  });

  it('returns the higher number for "5 to 10 mph" (gust-aware)', () => {
    expect(parseWindMph('5 to 10 mph')).toBe(10);
  });

  it('returns the higher number for "10 to 20 mph" with hyphen variants', () => {
    expect(parseWindMph('10-20 mph')).toBe(20);
  });

  it('returns null for non-numeric strings', () => {
    expect(parseWindMph('Light and variable')).toBeNull();
    expect(parseWindMph('')).toBeNull();
  });

  it('returns null for null/undefined inputs (defensive)', () => {
    expect(parseWindMph(null)).toBeNull();
    expect(parseWindMph(undefined)).toBeNull();
  });

  it('handles a single zero correctly (calm wind)', () => {
    expect(parseWindMph('0 mph')).toBe(0);
  });
});

describe('pickTodayPeriods — first day + first night', () => {
  it('picks the first daytime + first nighttime period', () => {
    const today = period({ name: 'Today', isDaytime: true });
    const tonight = period({
      name: 'Tonight',
      isDaytime: false,
      temperature: 40,
    });
    const tomorrow = period({ name: 'Tomorrow', isDaytime: true });
    const r = pickTodayPeriods([today, tonight, tomorrow]);
    expect(r.day).toBe(today);
    expect(r.night).toBe(tonight);
  });

  it('returns nulls when array is empty', () => {
    const r = pickTodayPeriods([]);
    expect(r.day).toBeNull();
    expect(r.night).toBeNull();
  });

  it('returns null for the missing half', () => {
    const tonight = period({ isDaytime: false });
    const r = pickTodayPeriods([tonight]);
    expect(r.day).toBeNull();
    expect(r.night).toBe(tonight);
  });

  it('does not pick a second daytime period', () => {
    const today = period({ name: 'Today', isDaytime: true });
    const tomorrow = period({ name: 'Tomorrow', isDaytime: true });
    const r = pickTodayPeriods([today, tomorrow]);
    expect(r.day).toBe(today);
    expect(r.night).toBeNull();
  });
});

describe('summarizeForecast — projects forecast into view-model', () => {
  it('returns all-null summary for empty input', () => {
    const s = summarizeForecast([]);
    expect(s.todayPeriod).toBeNull();
    expect(s.tonightPeriod).toBeNull();
    expect(s.highF).toBeNull();
    expect(s.lowF).toBeNull();
    expect(s.windMph).toBeNull();
    expect(s.windDir).toBeNull();
    expect(s.conditions).toBeNull();
  });

  it('extracts high/low from day + night temps', () => {
    const s = summarizeForecast([
      period({ isDaytime: true, temperature: 62 }),
      period({ isDaytime: false, temperature: 41 }),
    ]);
    expect(s.highF).toBe(62);
    expect(s.lowF).toBe(41);
  });

  it('parses wind speed string into integer mph', () => {
    const s = summarizeForecast([
      period({ isDaytime: true, windSpeed: '5 to 15 mph' }),
    ]);
    expect(s.windMph).toBe(15);
  });

  it('preserves wind direction and conditions strings', () => {
    const s = summarizeForecast([
      period({
        isDaytime: true,
        windDirection: 'SW',
        shortForecast: 'Sunny',
      }),
    ]);
    expect(s.windDir).toBe('SW');
    expect(s.conditions).toBe('Sunny');
  });

  it('returns null wind direction when day period missing', () => {
    const s = summarizeForecast([
      period({ isDaytime: false, temperature: 40 }),
    ]);
    expect(s.windMph).toBeNull();
    expect(s.windDir).toBeNull();
    expect(s.conditions).toBeNull();
    expect(s.lowF).toBe(40);
  });
});

describe('formatHighLow — primary line formatting', () => {
  it('renders "62° / 41°" when both present', () => {
    expect(formatHighLow(62, 41)).toBe('62° / 41°');
  });

  it('rounds non-integer temperatures', () => {
    expect(formatHighLow(61.6, 40.4)).toBe('62° / 40°');
  });

  it('drops the missing half rather than padding', () => {
    expect(formatHighLow(62, null)).toBe('62°');
    expect(formatHighLow(null, 41)).toBe('41°');
  });

  it('returns null when both halves are missing', () => {
    expect(formatHighLow(null, null)).toBeNull();
  });
});

describe('formatWind — secondary line formatting', () => {
  it('renders "10 mph NW" with both pieces', () => {
    expect(formatWind(10, 'NW')).toBe('10 mph NW');
  });

  it('renders just the speed when direction missing', () => {
    expect(formatWind(10, null)).toBe('10 mph');
  });

  it('renders just the direction when speed missing', () => {
    expect(formatWind(null, 'N')).toBe('N');
  });

  it('returns null when both pieces missing', () => {
    expect(formatWind(null, null)).toBeNull();
  });

  it('preserves a literal 0 mph (calm) instead of dropping it', () => {
    expect(formatWind(0, 'N')).toBe('0 mph N');
  });
});
