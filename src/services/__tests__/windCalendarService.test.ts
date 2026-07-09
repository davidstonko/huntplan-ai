import {
  normalizeToCardinal8,
  parseWindMph,
  windFavorability,
  favorabilityLabel,
  toWindPeriods,
  buildStandWindPlan,
  rankStandsForPeriod,
  type WindPeriod,
} from '../windCalendarService';

describe('normalizeToCardinal8', () => {
  it('passes through 8-point cardinals', () => {
    expect(normalizeToCardinal8('N')).toBe('N');
    expect(normalizeToCardinal8('NW')).toBe('NW');
    expect(normalizeToCardinal8('SE')).toBe('SE');
  });
  it('snaps 16-point cardinals to the nearest 8-point', () => {
    expect(normalizeToCardinal8('WNW')).toBe('NW'); // 292.5 -> 315
    expect(normalizeToCardinal8('SSW')).toBe('SW'); // 202.5 -> 225
    expect(normalizeToCardinal8('ENE')).toBe('E'); // 67.5 -> 90
  });
  it('is case/space tolerant and rejects junk', () => {
    expect(normalizeToCardinal8('nw')).toBe('NW');
    expect(normalizeToCardinal8('  S ')).toBe('S');
    expect(normalizeToCardinal8('')).toBeNull();
    expect(normalizeToCardinal8('Variable')).toBeNull();
    expect(normalizeToCardinal8(null)).toBeNull();
  });
});

describe('parseWindMph', () => {
  it('takes the peak of a range', () => {
    expect(parseWindMph('10 to 15 mph')).toBe(15);
    expect(parseWindMph('5 mph')).toBe(5);
  });
  it('returns 0 for calm / missing', () => {
    expect(parseWindMph('Calm')).toBe(0);
    expect(parseWindMph('')).toBe(0);
    expect(parseWindMph(null)).toBe(0);
  });
});

describe('windFavorability', () => {
  it('rates an exact match as ideal (incl. 16-point snapping)', () => {
    expect(windFavorability(['NW'], 'NW')).toBe('ideal');
    expect(windFavorability(['NW'], 'WNW')).toBe('ideal'); // WNW -> NW
  });
  it('rates one 45deg step off as marginal', () => {
    expect(windFavorability(['NW'], 'W')).toBe('marginal');
    expect(windFavorability(['NW'], 'N')).toBe('marginal'); // NW<->N wrap
  });
  it('rates two-or-more steps off as poor', () => {
    expect(windFavorability(['NW'], 'NE')).toBe('poor'); // 2 steps
    expect(windFavorability(['NW'], 'SE')).toBe('poor'); // opposite
  });
  it('takes the best of several ideal directions', () => {
    expect(windFavorability(['N', 'NW'], 'W')).toBe('marginal'); // W is 1 off NW
  });
  it('returns unknown when data is missing', () => {
    expect(windFavorability([], 'NW')).toBe('unknown');
    expect(windFavorability(['NW'], 'Calm')).toBe('unknown');
    expect(windFavorability(undefined, 'NW')).toBe('unknown');
  });
});

describe('favorabilityLabel', () => {
  it('gives a human label per bucket', () => {
    expect(favorabilityLabel('ideal')).toMatch(/ideal/i);
    expect(favorabilityLabel('poor')).toMatch(/wrong/i);
    expect(favorabilityLabel('unknown')).toMatch(/no wind/i);
  });
});

const FC = (over: Partial<any>): any => ({
  name: 'Saturday',
  temperature: 45,
  temperatureUnit: 'F',
  windSpeed: '10 to 15 mph',
  windDirection: 'NW',
  shortForecast: 'Sunny',
  detailedForecast: '',
  isDaytime: true,
  icon: '',
  ...over,
});

describe('toWindPeriods', () => {
  it('reduces forecasts to normalized periods', () => {
    const periods = toWindPeriods([FC({ windDirection: 'WNW', windSpeed: '5 to 10 mph' })]);
    expect(periods[0]).toMatchObject({
      name: 'Saturday',
      cardinal: 'NW',
      rawDirection: 'WNW',
      windMph: 10,
      isDaytime: true,
    });
  });
});

describe('buildStandWindPlan + rankStandsForPeriod', () => {
  const periods: WindPeriod[] = toWindPeriods([
    FC({ name: 'Sat', windDirection: 'NW' }),
    FC({ name: 'Sun', windDirection: 'S' }),
  ]);
  const stands = [
    { id: 'a', label: 'Oak Ridge', idealWindDirections: ['NW' as const] },
    { id: 'b', label: 'Creek Bottom', idealWindDirections: ['S' as const, 'SW' as const] },
  ];

  it('crosses stands with periods', () => {
    const plan = buildStandWindPlan(stands, periods);
    expect(plan[0].cells).toEqual(['ideal', 'poor']); // Oak Ridge: NW ideal, S poor
    expect(plan[1].cells).toEqual(['poor', 'ideal']); // Creek(S,SW): NW is 2 off SW -> poor, S ideal
  });

  it('ranks the right stand for each period, best first', () => {
    const plan = buildStandWindPlan(stands, periods);
    const sat = rankStandsForPeriod(plan, 0); // NW wind
    expect(sat.map((r) => r.stand.label)).toEqual(['Oak Ridge']); // only Oak Ridge favorable
    const sun = rankStandsForPeriod(plan, 1); // S wind
    expect(sun.map((r) => r.stand.label)).toEqual(['Creek Bottom']); // only Creek favorable
  });
});
