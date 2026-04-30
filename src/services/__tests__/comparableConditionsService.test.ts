/**
 * comparableConditionsService.test.ts — pure-function contract for the
 * weather-similarity scorer that powers Phase A.13's "what happened
 * the last time it looked like this outside?" workflow.
 */

import {
  DEFAULT_WEIGHTS,
  entriesWithWeatherCount,
  findComparableEntries,
  parseDirectionDeg,
  scoreConditionsText,
  scoreEntry,
  scoreTemperature,
  scoreWindDirection,
  scoreWindSpeed,
} from '../comparableConditionsService';
import type { JournalEntry } from '../../types/journalEntry';

function je(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const base: JournalEntry = {
    id: 'j1',
    createdAt: '2026-04-22T22:00:00.000Z',
    updatedAt: '2026-04-22T22:00:00.000Z',
    entryDate: '2026-04-22',
    mode: 'hunt',
    title: 'Evening sit',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
  };
  return { ...base, ...overrides };
}

// ─── scoreTemperature ───

describe('scoreTemperature', () => {
  it('returns score=1 (applied) on identical temperatures', () => {
    const r = scoreTemperature(45, 45);
    expect(r.applied).toBe(true);
    expect(r.score).toBeCloseTo(1);
    expect(r.delta).toBe('Δ +0°F');
  });

  it('half-life decays at 10°F delta', () => {
    expect(scoreTemperature(40, 50).score).toBeCloseTo(0.5);
    expect(scoreTemperature(40, 60).score).toBeCloseTo(0.25);
    expect(scoreTemperature(40, 70).score).toBeCloseTo(0.125);
  });

  it('symmetric in |delta|', () => {
    expect(scoreTemperature(40, 50).score).toBeCloseTo(
      scoreTemperature(50, 40).score,
    );
  });

  it('formats delta with sign for both directions', () => {
    expect(scoreTemperature(40, 45).delta).toBe('Δ +5°F');
    expect(scoreTemperature(45, 40).delta).toBe('Δ -5°F');
  });

  it('returns applied=false when either side is undefined', () => {
    expect(scoreTemperature(undefined, 45).applied).toBe(false);
    expect(scoreTemperature(45, undefined).applied).toBe(false);
    expect(scoreTemperature(undefined, undefined).applied).toBe(false);
  });
});

// ─── scoreWindSpeed ───

describe('scoreWindSpeed', () => {
  it('returns 1 for identical speeds', () => {
    const r = scoreWindSpeed(10, 10);
    expect(r.applied).toBe(true);
    expect(r.score).toBeCloseTo(1);
  });

  it('linearly decays to 0 at delta=20', () => {
    expect(scoreWindSpeed(0, 10).score).toBeCloseTo(0.5);
    expect(scoreWindSpeed(0, 20).score).toBeCloseTo(0);
    expect(scoreWindSpeed(0, 30).score).toBeCloseTo(0);
  });

  it('returns applied=false for missing sides', () => {
    expect(scoreWindSpeed(undefined, 10).applied).toBe(false);
    expect(scoreWindSpeed(10, undefined).applied).toBe(false);
  });
});

// ─── scoreWindDirection ───

describe('parseDirectionDeg', () => {
  it('parses 8-point cardinals', () => {
    expect(parseDirectionDeg('N')).toBe(0);
    expect(parseDirectionDeg('E')).toBe(90);
    expect(parseDirectionDeg('S')).toBe(180);
    expect(parseDirectionDeg('W')).toBe(270);
    expect(parseDirectionDeg('NE')).toBe(45);
  });

  it('parses 16-point intermediates', () => {
    expect(parseDirectionDeg('NNE')).toBeCloseTo(22.5);
    expect(parseDirectionDeg('WSW')).toBeCloseTo(247.5);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(parseDirectionDeg(' nW ')).toBe(315);
    expect(parseDirectionDeg('sw')).toBe(225);
  });

  it('returns undefined for unknown / empty input', () => {
    expect(parseDirectionDeg('')).toBeUndefined();
    expect(parseDirectionDeg(undefined)).toBeUndefined();
    expect(parseDirectionDeg('northwesterly')).toBeUndefined();
  });
});

describe('scoreWindDirection', () => {
  it('returns ~1 for identical directions', () => {
    expect(scoreWindDirection('N', 'N').score).toBeCloseTo(1);
    expect(scoreWindDirection('SW', 'SW').score).toBeCloseTo(1);
  });

  it('returns ~0 for opposite directions', () => {
    expect(scoreWindDirection('N', 'S').score).toBeCloseTo(0);
    expect(scoreWindDirection('E', 'W').score).toBeCloseTo(0);
  });

  it('returns ~0.5 for perpendicular directions', () => {
    expect(scoreWindDirection('N', 'E').score).toBeCloseTo(0.5);
  });

  it('NNW vs N is a near-perfect match', () => {
    const r = scoreWindDirection('N', 'NNW');
    expect(r.score).toBeGreaterThan(0.95);
  });

  it('returns applied=false for unparseable strings', () => {
    expect(scoreWindDirection('blah', 'N').applied).toBe(false);
    expect(scoreWindDirection('N', '').applied).toBe(false);
  });
});

// ─── scoreConditionsText ───

describe('scoreConditionsText', () => {
  it('returns 1 on identical token sets', () => {
    const r = scoreConditionsText('light rain', 'light rain');
    expect(r.applied).toBe(true);
    expect(r.score).toBeCloseTo(1);
  });

  it('partial overlap scores as Jaccard intersection / union', () => {
    // tokens: {light, rain} vs {rain, showers} → 1/3
    const r = scoreConditionsText('light rain', 'rain showers');
    expect(r.score).toBeCloseTo(1 / 3);
  });

  it('returns 0 (but applied) for disjoint token sets', () => {
    const r = scoreConditionsText('clear', 'sunny');
    expect(r.applied).toBe(true);
    expect(r.score).toBeCloseTo(0);
  });

  it('drops short tokens (< 3 chars)', () => {
    // "a foggy" → tokens {foggy}; "an foggy" → {foggy}
    const r = scoreConditionsText('a foggy', 'an foggy');
    expect(r.score).toBeCloseTo(1);
  });

  it('returns applied=false when either side is empty post-tokenization', () => {
    expect(scoreConditionsText('', 'rain').applied).toBe(false);
    expect(scoreConditionsText('rain', undefined).applied).toBe(false);
    expect(scoreConditionsText('!@', 'rain').applied).toBe(false);
  });
});

// ─── scoreEntry composite ───

describe('scoreEntry', () => {
  it('combines axes by weighted average over applied axes only', () => {
    // Both T (1.0) and wind (1.0) match perfectly → composite = 1.0
    const e = je({
      weather: { temperatureF: 45, windMph: 8 },
    });
    const r = scoreEntry({ temperatureF: 45, windMph: 8 }, e);
    expect(r.score).toBeCloseTo(1);
    expect(r.axesApplied).toBe(2);
  });

  it('skips axes where the entry side is missing', () => {
    const e = je({ weather: { temperatureF: 45 } });
    const r = scoreEntry(
      { temperatureF: 45, windMph: 8, conditions: 'clear' },
      e,
    );
    expect(r.axesApplied).toBe(1);
    expect(r.breakdown.windMph.applied).toBe(false);
    expect(r.breakdown.conditions.applied).toBe(false);
    expect(r.score).toBeCloseTo(1);
  });

  it('axesApplied=0 when entry has no weather at all', () => {
    const e = je({ weather: undefined });
    const r = scoreEntry({ temperatureF: 45 }, e);
    expect(r.axesApplied).toBe(0);
    expect(r.score).toBe(0);
  });

  it('weighted blend matches expected math', () => {
    const e = je({
      weather: { temperatureF: 45, windMph: 8 },
    });
    // T perfect (score 1), wind off by 20mph (score 0).
    // Weights: T=0.4, wind=0.3 → composite = (1*0.4 + 0*0.3) / (0.4+0.3)
    // = 0.4 / 0.7 ≈ 0.571
    const r = scoreEntry({ temperatureF: 45, windMph: 28 }, e);
    expect(r.score).toBeCloseTo(0.4 / 0.7);
  });

  it('honors custom weights', () => {
    const e = je({ weather: { temperatureF: 45, windMph: 8 } });
    const r = scoreEntry(
      { temperatureF: 45, windMph: 28 },
      e,
      { temperatureF: 0.1, windMph: 0.9, windDirection: 0, conditions: 0 },
    );
    // Now T=1, wind=0; (1*0.1 + 0*0.9) / 1.0 = 0.1
    expect(r.score).toBeCloseTo(0.1);
  });
});

// ─── findComparableEntries ranking ───

describe('findComparableEntries', () => {
  const today = { temperatureF: 45, windMph: 10, windDirection: 'NW' as string, conditions: 'clear' };

  it('returns [] for empty entry list', () => {
    expect(findComparableEntries(today, [])).toEqual([]);
  });

  it('excludes entries with no comparable axes', () => {
    const e = je({ id: 'noweather', weather: undefined });
    expect(findComparableEntries(today, [e])).toEqual([]);
  });

  it('ranks identical match above distant match', () => {
    const ePerfect = je({
      id: 'perfect',
      weather: { temperatureF: 45, windMph: 10, windDirection: 'NW', conditions: 'clear' },
    });
    const eDistant = je({
      id: 'distant',
      weather: { temperatureF: 80, windMph: 30, windDirection: 'SE', conditions: 'rain' },
    });
    const out = findComparableEntries(today, [eDistant, ePerfect]);
    expect(out[0].entry.id).toBe('perfect');
    expect(out[1].entry.id).toBe('distant');
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });

  it('ties broken by axesApplied DESC, then entryDate DESC, then id ASC', () => {
    // Two entries with the same composite score (both perfect on the
    // axes they have), but one applies more axes than the other.
    const eMore = je({
      id: 'more',
      entryDate: '2026-04-01',
      weather: { temperatureF: 45, windMph: 10 },
    });
    const eFewer = je({
      id: 'fewer',
      entryDate: '2026-04-02',
      weather: { temperatureF: 45 },
    });
    const out = findComparableEntries(
      { temperatureF: 45, windMph: 10 },
      [eFewer, eMore],
    );
    // eMore wins despite older date because it applies more axes
    expect(out[0].entry.id).toBe('more');
    expect(out[1].entry.id).toBe('fewer');
  });

  it('mode filter restricts the candidate pool', () => {
    const eHunt = je({ id: 'h', mode: 'hunt', weather: { temperatureF: 45 } });
    const eFish = je({ id: 'f', mode: 'fish', weather: { temperatureF: 45 } });
    const out = findComparableEntries(today, [eHunt, eFish], { mode: 'fish' });
    expect(out).toHaveLength(1);
    expect(out[0].entry.id).toBe('f');
  });

  it('limit caps the output', () => {
    const entries = Array.from({ length: 50 }, (_, i) =>
      je({ id: `e${i}`, weather: { temperatureF: 45 } }),
    );
    const out = findComparableEntries(today, entries, { limit: 5 });
    expect(out).toHaveLength(5);
  });

  it('minScore filters low-quality matches', () => {
    const eClose = je({ id: 'close', weather: { temperatureF: 45 } });
    const eFar = je({ id: 'far', weather: { temperatureF: 100 } });
    const out = findComparableEntries(
      { temperatureF: 45 },
      [eClose, eFar],
      { minScore: 0.5 },
    );
    expect(out.map((m) => m.entry.id)).toEqual(['close']);
  });

  it('minAxes filters partial-match noise', () => {
    const e1Axis = je({ id: 'one', weather: { temperatureF: 45 } });
    const e3Axis = je({
      id: 'three',
      weather: { temperatureF: 45, windMph: 10, windDirection: 'NW' },
    });
    const out = findComparableEntries(today, [e1Axis, e3Axis], { minAxes: 2 });
    expect(out).toHaveLength(1);
    expect(out[0].entry.id).toBe('three');
  });

  it('uses default weights when none supplied', () => {
    expect(DEFAULT_WEIGHTS.temperatureF).toBeGreaterThan(
      DEFAULT_WEIGHTS.windMph,
    );
    expect(DEFAULT_WEIGHTS.windMph).toBeGreaterThan(
      DEFAULT_WEIGHTS.conditions,
    );
    expect(DEFAULT_WEIGHTS.conditions).toBeGreaterThan(
      DEFAULT_WEIGHTS.windDirection,
    );
  });
});

// ─── entriesWithWeatherCount ───

describe('entriesWithWeatherCount', () => {
  it('counts entries with ANY weather field present', () => {
    const entries = [
      je({ weather: { temperatureF: 45 } }),
      je({ weather: { windMph: 8 } }),
      je({ weather: { windDirection: 'N' } }),
      je({ weather: { conditions: 'rain' } }),
      je({ weather: undefined }),
      je({ weather: {} }),
      je({ weather: { conditions: '   ' } }),
    ];
    expect(entriesWithWeatherCount(entries)).toBe(4);
  });

  it('returns 0 for all-empty list', () => {
    expect(entriesWithWeatherCount([])).toBe(0);
  });
});
