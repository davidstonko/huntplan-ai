/**
 * Regression guards for the 2026-06-27 hunting-regulation accuracy fixes.
 * Each assertion locks in a specific legal-accuracy bug that previously shipped
 * (see AUDIT_2026_06_27.md). If one of these flips, a hunter could be put out
 * of compliance — so these are intentionally strict.
 */
import {
  MD_COUNTIES,
  MD_BAG_LIMITS,
  isInSeason,
} from '../marylandHuntingData';
import { getSmartResponse } from '../chatKnowledge';

describe('deer region model (Region A vs Region B)', () => {
  it('uses the real two-region system, not fabricated region names', () => {
    const regions = new Set(MD_COUNTIES.map((c) => c.deerManagementRegion));
    // No legacy fabricated names
    expect([...regions]).not.toContain('Western');
    expect([...regions]).not.toContain('Central');
    expect([...regions]).not.toContain('Eastern Shore');
    // Every county is Region A, Region B, or the split Washington case
    for (const c of MD_COUNTIES) {
      expect(c.deerManagementRegion).toMatch(/Region A|Region B/);
    }
  });

  it('puts Allegany and Garrett in Region A', () => {
    for (const name of ['Allegany', 'Garrett']) {
      const c = MD_COUNTIES.find((x) => x.name === name)!;
      expect(c.deerManagementRegion).toContain('Region A');
    }
  });

  it('applies the statewide antler-point restriction everywhere (no "No restrictions")', () => {
    for (const c of MD_COUNTIES) {
      expect(c.antlerRestrictions).not.toBe('No restrictions');
    }
    const allegany = MD_COUNTIES.find((c) => c.name === 'Allegany')!;
    expect(allegany.antlerRestrictions.toLowerCase()).toContain('3 points');
  });
});

describe('antlerless bag limits are region-aware (not a flat 5)', () => {
  const antlerless = MD_BAG_LIMITS.filter(
    (b) =>
      b.species === 'White-tailed Deer' &&
      b.notes.toLowerCase().includes('antlerless')
  );

  it('has a restrictive Region A rule of 2 total, scoped to the western counties', () => {
    const regionA = antlerless.find((b) =>
      (b.countyRestrictions ?? []).includes('Garrett')
    )!;
    expect(regionA).toBeDefined();
    expect(regionA.quantity).toBe(2);
    expect(regionA.countyRestrictions).toEqual(
      expect.arrayContaining(['Allegany', 'Garrett'])
    );
  });

  it('no longer ships the old flat "5 per year" antlerless rule', () => {
    const flatFive = antlerless.find(
      (b) => b.quantity === 5 && (b.countyRestrictions ?? []).length === 0
    );
    expect(flatFive).toBeUndefined();
  });
});

describe('isInSeason respects county restrictions', () => {
  it('does not report bear in season in a Region B county', () => {
    const duringBear = new Date('2025-10-22T12:00:00');
    expect(isInSeason('Black Bear', duringBear, 'Rifle', 'Garrett')).toBe(true);
    expect(isInSeason('Black Bear', duringBear, 'Rifle', 'Dorchester')).toBe(
      false
    );
  });
});

describe('chat surfaces the previously-missing regulatory topics', () => {
  const expectContains = (q: string, needle: string) => {
    const r: any = getSmartResponse(q);
    expect((r?.text || '').toLowerCase()).toContain(needle.toLowerCase());
  };

  it('answers legal hunting hours', () =>
    expectContains('what are the legal hunting hours', 'sunrise'));
  it('gives concrete shooting times for today (not just the rule)', () => {
    const r: any = getSmartResponse('what are the legal hunting hours');
    const text = r?.text || '';
    expect(text).toContain('Today');
    expect(/\d{1,2}:\d{2}\s?(AM|PM)/.test(text)).toBe(true);
  });
  it('answers blaze orange', () =>
    expectContains('do I need to wear orange', 'fluorescent'));
  it('answers field tagging', () =>
    expectContains('how do I field tag my deer', 'field tag'));
  it('does not claim Sunday hunting is allowed every Sunday', () => {
    const r: any = getSmartResponse('can I hunt sunday in maryland');
    expect((r?.text || '').toLowerCase()).not.toContain(
      'allowed statewide on sundays'
    );
  });
});
