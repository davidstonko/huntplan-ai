/**
 * Regression guards for the 2026-06-27 hunting-regulation accuracy fixes.
 * Each assertion locks in a specific legal-accuracy bug that previously shipped
 * (see AUDIT_2026_06_27.md). If one of these flips, a hunter could be put out
 * of compliance — so these are intentionally strict.
 */
import {
  MD_COUNTIES,
  MD_BAG_LIMITS,
  MD_SEASONS,
  REGULATIONS_META,
  isInSeason,
} from '../marylandHuntingData';
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {},
  AuthorizationStatus: {},
  TriggerType: {},
  AndroidImportance: {},
}));
// eslint-disable-next-line import/first
import { MD_SEASON_OPENINGS } from '../../services/pushNotifications';
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
    // 2026 bear season is Oct 26-31 (MD DNR 2026-27 calendar)
    const duringBear = new Date('2026-10-28T12:00:00');
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

describe('chat intent routing precision (no over-greedy misrouting)', () => {
  const ask = (q: string) => ((getSmartResponse(q) as any)?.text || '');
  it('"how many tags do I need" is NOT hijacked by the field-tagging handler', () => {
    expect(ask('how many tags do I need')).not.toContain('Field Tagging');
  });
  it('a deer-at-sunset query is NOT hijacked by the shooting-hours handler', () => {
    expect(ask('are deer active at sunset')).not.toContain('Legal Hunting Hours');
  });
  it('still routes a genuine "wear orange" query to the orange handler', () => {
    expect(ask('do I need to wear orange')).toContain('Fluorescent Orange');
  });
  it('still routes a genuine "field tag my deer" query to tagging', () => {
    expect(ask('how do I field tag my deer')).toContain('Field Tagging');
  });
});

describe('2026-2027 season data (MD DNR Hunting Seasons Calendar 2026-2027)', () => {
  it('labels the data set as 2026-2027 and expects the next set by 2027-07-01', () => {
    expect(REGULATIONS_META.seasonLabel).toBe('2026-2027');
    expect(REGULATIONS_META.nextSeasonExpectedBy).toBe('2027-07-01');
  });

  it('reports deer archery IN season on 2026-09-18 (opener was Sept 11)', () => {
    const d = new Date('2026-09-18T12:00:00');
    expect(isInSeason('White-tailed Deer', d, 'Bow')).toBe(true);
    expect(isInSeason('White-tailed Deer', d, 'Bow', 'Howard')).toBe(true);
  });

  it('reports deer archery NOT in season on 2026-09-10 (day before opener)', () => {
    expect(isInSeason('White-tailed Deer', new Date('2026-09-10T12:00:00'), 'Bow')).toBe(false);
  });

  it('closes archery during the early muzzleloader segment (Oct 22-24, 2026)', () => {
    expect(isInSeason('White-tailed Deer', new Date('2026-10-23T12:00:00'), 'Bow')).toBe(false);
    expect(isInSeason('White-tailed Deer', new Date('2026-10-23T12:00:00'), 'Muzzleloader')).toBe(true);
  });

  it('opens firearms Nov 28 - Dec 12, 2026 and Jan 8-10, 2027 only in Region B', () => {
    expect(isInSeason('White-tailed Deer', new Date('2026-11-28T12:00:00'), 'Rifle')).toBe(true);
    expect(isInSeason('White-tailed Deer', new Date('2027-01-09T12:00:00'), 'Rifle', 'Howard')).toBe(true);
    expect(isInSeason('White-tailed Deer', new Date('2027-01-09T12:00:00'), 'Rifle', 'Garrett')).toBe(false);
    expect(isInSeason('White-tailed Deer', new Date('2027-01-09T12:00:00'), 'Bow', 'Garrett')).toBe(true);
  });

  it('every MD_SEASONS entry has startDate <= endDate inside the 2026-27 license year', () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    expect(MD_SEASONS.length).toBeGreaterThan(0);
    for (const s of MD_SEASONS) {
      expect(s.startDate).toMatch(iso);
      expect(s.endDate).toMatch(iso);
      expect(s.startDate <= s.endDate).toBe(true);
      expect(s.startDate >= '2026-08-01').toBe(true);
      expect(s.endDate <= '2027-07-31').toBe(true);
    }
  });

  it('has unique season ids', () => {
    const ids = MD_SEASONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries the verified 2026-27 openers (DNR calendar)', () => {
    const byId = (id: string) => MD_SEASONS.find((s) => s.id === id)!;
    expect(byId('deer_archery_2026_1').startDate).toBe('2026-09-11');
    expect(byId('deer_firearms_2026').startDate).toBe('2026-11-28');
    expect(byId('deer_muzzleloader_early_2026').startDate).toBe('2026-10-22');
    expect(byId('bear_season_2026').startDate).toBe('2026-10-26');
    expect(byId('bear_season_2026').endDate).toBe('2026-10-31');
    expect(byId('turkey_spring_2027').startDate).toBe('2027-04-19');
    expect(byId('turkey_spring_2027').endDate).toBe('2027-05-24');
    expect(byId('waterfowl_early_teal_2026').startDate).toBe('2026-09-17');
    expect(byId('dove_2026_1').startDate).toBe('2026-09-01');
  });

  it('push season openings are derived from MD_SEASONS', () => {
    const find = (prefix: string) => MD_SEASON_OPENINGS.find((o) => o.id.startsWith(prefix))!;
    expect(find('archery-').date).toBe('2026-09-11T07:00:00');
    expect(find('muzzle-').date).toBe('2026-10-22T07:00:00');
    expect(find('firearm-').date).toBe('2026-11-28T07:00:00');
    expect(find('turkey-').date).toBe('2027-04-19T05:30:00');
    expect(find('dove-').date).toBe('2026-09-01T07:00:00');
    for (const o of MD_SEASON_OPENINGS) expect(o.id).toContain(REGULATIONS_META.seasonLabel);
  });
});
