/**
 * weatherToConditionsQuery — unit tests
 *
 * Verifies the pure adapter that turns a weather.gov WeatherForecast
 * into a WeatherQuery for the comparable-conditions scorer.
 */
import {
  parseWindMphFromText,
  pickTodaysForecast,
  weatherForecastToQuery,
} from '../weatherToConditionsQuery';
import type { WeatherForecast } from '../weatherService';

function fc(overrides: Partial<WeatherForecast> = {}): WeatherForecast {
  const base: WeatherForecast = {
    name: 'Today',
    temperature: 50,
    temperatureUnit: 'F',
    windSpeed: '10 mph',
    windDirection: 'NW',
    shortForecast: 'Partly Cloudy',
    detailedForecast: '',
    isDaytime: true,
    icon: '',
  };
  return { ...base, ...overrides };
}

describe('parseWindMphFromText', () => {
  it('returns undefined for empty / nullish input', () => {
    expect(parseWindMphFromText(undefined)).toBeUndefined();
    expect(parseWindMphFromText('')).toBeUndefined();
    expect(parseWindMphFromText('   ')).toBeUndefined();
  });

  it('returns 0 for "Calm"', () => {
    expect(parseWindMphFromText('Calm')).toBe(0);
    expect(parseWindMphFromText('calm')).toBe(0);
    expect(parseWindMphFromText('CALM')).toBe(0);
  });

  it('parses single-value mph string', () => {
    expect(parseWindMphFromText('5 mph')).toBe(5);
    expect(parseWindMphFromText('15 mph')).toBe(15);
  });

  it('returns midpoint of a range', () => {
    expect(parseWindMphFromText('5 to 10 mph')).toBe(7.5);
    expect(parseWindMphFromText('10 to 20 mph')).toBe(15);
    expect(parseWindMphFromText('0 to 5 mph')).toBe(2.5);
  });

  it('ignores gusts clause when computing the base wind', () => {
    expect(parseWindMphFromText('10 to 20 mph (gusts to 35 mph)')).toBe(15);
    expect(parseWindMphFromText('5 mph (gusts 25 mph)')).toBe(5);
  });

  it('returns undefined for non-numeric junk', () => {
    expect(parseWindMphFromText('breezy')).toBeUndefined();
    expect(parseWindMphFromText('north')).toBeUndefined();
  });
});

describe('pickTodaysForecast', () => {
  it('returns undefined for empty / nullish list', () => {
    expect(pickTodaysForecast(undefined)).toBeUndefined();
    expect(pickTodaysForecast(null)).toBeUndefined();
    expect(pickTodaysForecast([])).toBeUndefined();
  });

  it('returns the first daytime period when one exists', () => {
    const periods = [
      fc({ name: 'Tonight', isDaytime: false, temperature: 35 }),
      fc({ name: 'Saturday', isDaytime: true, temperature: 60 }),
      fc({ name: 'Saturday Night', isDaytime: false, temperature: 40 }),
    ];
    const picked = pickTodaysForecast(periods);
    expect(picked?.name).toBe('Saturday');
    expect(picked?.temperature).toBe(60);
  });

  it('falls back to first period when no daytime period exists', () => {
    const periods = [
      fc({ name: 'Tonight', isDaytime: false, temperature: 35 }),
      fc({ name: 'Friday Night', isDaytime: false, temperature: 30 }),
    ];
    const picked = pickTodaysForecast(periods);
    expect(picked?.name).toBe('Tonight');
  });
});

describe('weatherForecastToQuery', () => {
  it('returns empty query for undefined / null period', () => {
    expect(weatherForecastToQuery(undefined)).toEqual({});
    expect(weatherForecastToQuery(null)).toEqual({});
  });

  it('maps a fully-populated F-unit period', () => {
    const q = weatherForecastToQuery(
      fc({
        temperature: 47,
        temperatureUnit: 'F',
        windSpeed: '5 to 10 mph',
        windDirection: 'NW',
        shortForecast: 'Light Rain',
      }),
    );
    expect(q).toEqual({
      temperatureF: 47,
      windMph: 7.5,
      windDirection: 'NW',
      conditions: 'Light Rain',
    });
  });

  it('skips temperature when unit is not Fahrenheit', () => {
    const q = weatherForecastToQuery(
      fc({ temperature: 10, temperatureUnit: 'C' }),
    );
    expect(q.temperatureF).toBeUndefined();
    // other axes still applied
    expect(q.windDirection).toBe('NW');
  });

  it('skips wind when speed is unparseable', () => {
    const q = weatherForecastToQuery(fc({ windSpeed: 'breezy' }));
    expect(q.windMph).toBeUndefined();
  });

  it('omits direction when blank/whitespace', () => {
    const q = weatherForecastToQuery(fc({ windDirection: '   ' }));
    expect(q.windDirection).toBeUndefined();
  });

  it('omits conditions when shortForecast is blank', () => {
    const q = weatherForecastToQuery(fc({ shortForecast: '' }));
    expect(q.conditions).toBeUndefined();
  });

  it('handles "Calm" → 0 mph', () => {
    const q = weatherForecastToQuery(fc({ windSpeed: 'Calm' }));
    expect(q.windMph).toBe(0);
  });

  it('does not throw on bizarre inputs', () => {
    const q = weatherForecastToQuery({
      // intentionally junky shape
      name: '',
      temperature: NaN,
      temperatureUnit: '',
      windSpeed: '',
      windDirection: '',
      shortForecast: '',
      detailedForecast: '',
      isDaytime: true,
      icon: '',
    } as WeatherForecast);
    expect(q).toEqual({});
  });
});
