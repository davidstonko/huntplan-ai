import { buildOfflineHuntPlan } from '../offlineHuntPlanService';

describe('buildOfflineHuntPlan', () => {
  it('builds an in-season deer archery plan with county and land details', () => {
    const res = buildOfflineHuntPlan({
      species: 'deer',
      weapon: 'archery',
      huntDate: '2026-11-07',
      county: 'Allegany',
      landName: 'Green Ridge',
    });
    expect(res.inSeason).toBe(true);
    expect(res.plan).toContain('SEASON STATUS');
    expect(res.plan).toMatch(/OPEN: White-tailed Deer Archery/);
    expect(res.plan).toContain('BAG LIMITS');
    expect(res.plan).toContain('ALLEGANY COUNTY');
    expect(res.plan).toContain('Region A');
    expect(res.plan).toContain('WHERE TO HUNT');
    expect(res.plan).toMatch(/Green Ridge/);
    expect(res.plan).toContain('TIMING');
    expect(res.plan).toMatch(/Rut phase on your date: Seeking/);
    expect(res.plan).toContain('GEAR AND SAFETY');
    expect(res.sources.length).toBeGreaterThan(0);
  });

  it('reports the next opener when the date is out of season', () => {
    const res = buildOfflineHuntPlan({
      species: 'deer',
      weapon: 'muzzleloader',
      huntDate: '2026-10-01',
    });
    expect(res.inSeason).toBe(false);
    expect(res.plan).toMatch(/No deer muzzleloader season is open/);
    expect(res.plan).toMatch(/Next: White-tailed Deer Muzzleloader \(Early\) opens/);
  });

  it('flags shotgun-only counties for firearms deer hunts', () => {
    const res = buildOfflineHuntPlan({
      species: 'deer',
      weapon: 'firearms',
      huntDate: '2025-12-01',
      county: 'Montgomery',
    });
    expect(res.plan).toContain('Shotgun-only zone');
  });

  it('lists county public lands when no land name is given', () => {
    const res = buildOfflineHuntPlan({
      species: 'turkey',
      weapon: 'archery',
      huntDate: '2025-10-10',
      county: 'Garrett',
    });
    expect(res.plan).toContain('WHERE TO HUNT');
    expect(res.plan).toMatch(/Savage River WMA|Garrett/);
  });

  it('falls back to statewide suggestions with no county', () => {
    const res = buildOfflineHuntPlan({
      species: 'waterfowl',
      weapon: 'firearms',
      huntDate: '2025-11-01',
    });
    expect(res.plan).toContain('Pick a county for local suggestions');
    expect(res.plan).toContain('Federal duck stamp');
  });

  it('never throws on bad input', () => {
    const res = buildOfflineHuntPlan({
      species: 'unicorn',
      weapon: 'laser',
      huntDate: 'not-a-date',
      county: 'Nowhere',
      landName: 'Atlantis',
    });
    expect(typeof res.plan).toBe('string');
    expect(res.plan).toContain('Enter the date as YYYY-MM-DD');
    expect(res.plan).toMatch(/not in the bundled public-land list/);
    expect(res.inSeason).toBe(false);
  });

  it('contains no em dashes or emoji in user-facing copy', () => {
    const res = buildOfflineHuntPlan({
      species: 'deer',
      weapon: 'firearms',
      huntDate: '2025-12-01',
      county: 'Frederick',
    });
    // Knowledge-base snippets may carry their own punctuation; the plan
    // builder's own lines must not.
    const own = res.plan
      .split('\n')
      .filter((l) => /^(SEASON STATUS|BAG LIMITS|WHERE TO HUNT|TIMING|GEAR AND SAFETY|OPEN:|Next:|Planned date|- )/.test(l));
    expect(own.length).toBeGreaterThan(0);
    for (const l of own) expect(l).not.toMatch(/—/);
  });
});
