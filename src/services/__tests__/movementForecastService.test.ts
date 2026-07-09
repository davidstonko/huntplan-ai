import {
  daytimeDayWeather,
  weatherMovementModifier,
  blendMovementScore,
  movementLabel,
  matchDayWeather,
  type DayWeather,
} from '../movementForecastService';
import type { WindPeriod } from '../windCalendarService';

const period = (over: Partial<WindPeriod>): WindPeriod => ({
  name: 'Saturday',
  isDaytime: true,
  cardinal: 'NW',
  rawDirection: 'NW',
  windMph: 8,
  temperature: 55,
  temperatureUnit: 'F',
  shortForecast: 'Sunny',
  ...over,
});

const dw = (over: Partial<DayWeather>): DayWeather => ({
  periodName: 'Saturday',
  highTemp: 55,
  windMph: 8,
  shortForecast: 'Sunny',
  ...over,
});

describe('daytimeDayWeather', () => {
  it('keeps only daytime periods and maps fields', () => {
    const out = daytimeDayWeather([
      period({ name: 'Saturday', isDaytime: true, temperature: 60, windMph: 10 }),
      period({ name: 'Saturday Night', isDaytime: false }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      periodName: 'Saturday',
      highTemp: 60,
      windMph: 10,
      shortForecast: 'Sunny',
    });
  });
});

describe('weatherMovementModifier', () => {
  it('boosts on a cold front (big temp drop)', () => {
    const m = weatherMovementModifier(dw({ highTemp: 40 }), dw({ highTemp: 58 }));
    expect(m.delta).toBeGreaterThan(0);
    expect(m.note).toMatch(/cold front/i);
  });
  it('mildly boosts on moderate cooling', () => {
    const m = weatherMovementModifier(dw({ highTemp: 50 }), dw({ highTemp: 58 }));
    expect(m.delta).toBe(8);
  });
  it('penalizes a warming trend', () => {
    const m = weatherMovementModifier(dw({ highTemp: 65 }), dw({ highTemp: 52 }));
    expect(m.delta).toBe(-8);
  });
  it('suppresses on high wind', () => {
    const m = weatherMovementModifier(dw({ windMph: 22 }));
    expect(m.delta).toBe(-15);
    expect(m.note).toMatch(/high wind/i);
  });
  it('penalizes storms and rain differently', () => {
    expect(weatherMovementModifier(dw({ shortForecast: 'Thunderstorms' })).delta).toBe(-10);
    expect(weatherMovementModifier(dw({ shortForecast: 'Rain Showers' })).delta).toBe(-5);
  });
  it('rewards snow (feeding)', () => {
    const m = weatherMovementModifier(dw({ shortForecast: 'Snow' }));
    expect(m.delta).toBe(5);
  });
  it('sums factors, clamps, and surfaces the strongest note', () => {
    // cold front (+16) but high wind (-15) -> net +1, but note is the cold front
    const m = weatherMovementModifier(
      dw({ highTemp: 40, windMph: 22 }),
      dw({ highTemp: 58 }),
    );
    expect(m.delta).toBe(1);
    expect(m.note).toMatch(/cold front/i);
  });
  it('is neutral with nothing notable', () => {
    const m = weatherMovementModifier(dw({ highTemp: 55, windMph: 5, shortForecast: 'Sunny' }));
    expect(m.delta).toBe(0);
    expect(m.note).toMatch(/steady/i);
  });
  it('never exceeds the clamp bounds', () => {
    const bad = weatherMovementModifier(
      dw({ highTemp: 80, windMph: 30, shortForecast: 'Thunderstorms' }),
      dw({ highTemp: 60 }),
    );
    expect(bad.delta).toBeGreaterThanOrEqual(-25);
  });
});

describe('blendMovementScore + movementLabel', () => {
  it('adds the modifier and clamps to 0..100', () => {
    expect(blendMovementScore(60, { delta: 16, note: '' })).toBe(76);
    expect(blendMovementScore(95, { delta: 20, note: '' })).toBe(100);
    expect(blendMovementScore(10, { delta: -25, note: '' })).toBe(0);
  });
  it('labels by threshold', () => {
    expect(movementLabel(80)).toBe('Excellent');
    expect(movementLabel(60)).toBe('Good');
    expect(movementLabel(40)).toBe('Fair');
    expect(movementLabel(20)).toBe('Poor');
  });
});

describe('matchDayWeather', () => {
  const daytime = [
    dw({ periodName: 'This Afternoon' }),
    dw({ periodName: 'Sunday' }),
    dw({ periodName: 'Monday' }),
  ];
  it('matches a future day by weekday name', () => {
    expect(matchDayWeather('Monday', 2, daytime)?.periodName).toBe('Monday');
  });
  it('matches day 0 to Today/This Afternoon', () => {
    expect(matchDayWeather('Saturday', 0, daytime)?.periodName).toBe('This Afternoon');
  });
  it('returns null when no period matches', () => {
    expect(matchDayWeather('Friday', 3, daytime)).toBeNull();
  });
});
