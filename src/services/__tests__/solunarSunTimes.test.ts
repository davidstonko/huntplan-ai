/**
 * @file solunarSunTimes.test.ts
 * @description Guards the sunrise/sunset approximation in getLocalSolunarData.
 * A prior bug put solar noon ~10 hours off (wrong ET-offset sign), so sunrise
 * read as evening and sunset as morning. These lock the sane ordering + ranges
 * and the DST handling that feed the "legal shooting hours" feature.
 */

import { getLocalSolunarData, isUsEasternDst } from '../solunarService';

const hourOf = (hhmm: string) => Number(hhmm.split(':')[0]);

// Central Maryland.
const LAT = 39.0;
const LNG = -76.6;

describe('isUsEasternDst', () => {
  it('is true in summer (June) and false in winter (January)', () => {
    expect(isUsEasternDst(new Date('2026-06-28T12:00:00'))).toBe(true);
    expect(isUsEasternDst(new Date('2026-01-15T12:00:00'))).toBe(false);
  });
});

describe('getLocalSolunarData sun times', () => {
  it('puts sunrise in the morning and sunset in the evening (late June MD)', () => {
    const { sun } = getLocalSolunarData(LAT, LNG, '2026-06-28');
    const sr = hourOf(sun.sunrise);
    const ss = hourOf(sun.sunset);
    expect(sr).toBeGreaterThanOrEqual(4); // ~5–6 AM
    expect(sr).toBeLessThanOrEqual(8);
    expect(ss).toBeGreaterThanOrEqual(19); // ~8 PM
    expect(ss).toBeLessThanOrEqual(22);
    expect(sr).toBeLessThan(ss);
  });

  it('legal_start is before sunrise and legal_end after sunset, in order', () => {
    const { sun } = getLocalSolunarData(LAT, LNG, '2026-06-28');
    expect(hourOf(sun.legal_start)).toBeLessThanOrEqual(hourOf(sun.sunrise));
    expect(hourOf(sun.legal_end)).toBeGreaterThanOrEqual(hourOf(sun.sunset));
    expect(hourOf(sun.legal_start)).toBeLessThan(hourOf(sun.legal_end));
  });

  it('winter days are shorter than summer days', () => {
    const summer = getLocalSolunarData(LAT, LNG, '2026-06-21').sun;
    const winter = getLocalSolunarData(LAT, LNG, '2026-12-21').sun;
    const daylen = (s: { sunrise: string; sunset: string }) =>
      hourOf(s.sunset) - hourOf(s.sunrise);
    expect(daylen(summer)).toBeGreaterThan(daylen(winter));
  });
});
