/**
 * Tests for journalTemplates — V2.3 Phase A.24.
 *
 * Pure-data + pure-function module. The tests lock the template-coverage
 * matrix (every mode-allowed outcome has a non-generic template) and the
 * apply* helpers' merge semantics so a future regression that wipes the
 * user's existing notes/tags would fail loudly.
 */
import {
  templateFor,
  applyTemplateBody,
  applyTemplateTags,
} from '../journalTemplates';
import { OUTCOMES_BY_MODE } from '../../types/journalEntry';

describe('templateFor', () => {
  test('returns a template for every (mode, outcome) listed in OUTCOMES_BY_MODE', () => {
    for (const mode of Object.keys(OUTCOMES_BY_MODE) as Array<
      keyof typeof OUTCOMES_BY_MODE
    >) {
      for (const outcome of OUTCOMES_BY_MODE[mode]) {
        const t = templateFor(mode, outcome);
        expect(t).toBeDefined();
        expect(t.label.length).toBeGreaterThan(0);
        expect(t.body.length).toBeGreaterThan(0);
      }
    }
  });

  test('hunt+harvest template prompts for shot details', () => {
    const t = templateFor('hunt', 'harvest');
    expect(t.label).toBe('Hunt — Harvest');
    expect(t.body).toMatch(/Shot placement:/);
    expect(t.body).toMatch(/Recovery time:/);
    expect(t.suggestedTags).toContain('harvest');
  });

  test('fish+catch template prompts for tide and bait', () => {
    const t = templateFor('fish', 'catch');
    expect(t.label).toBe('Fish — Catch');
    expect(t.body).toMatch(/Bait \/ lure:/);
    expect(t.body).toMatch(/Tide stage/);
  });

  test('camp+completed template covers gear retrospective', () => {
    const t = templateFor('camp', 'completed');
    expect(t.body).toMatch(/Gear that performed:/);
    expect(t.body).toMatch(/Gear that disappointed:/);
  });

  test('hike+completed template covers footwear and conditions', () => {
    const t = templateFor('hike', 'completed');
    expect(t.body).toMatch(/Footwear & layers worked:/);
    expect(t.body).toMatch(/Distance & elevation:/);
  });

  test('falls back to the generic Note template for unmatched outcomes', () => {
    // 'turned-back' isn't in fish's OUTCOMES_BY_MODE, but the resolver
    // should still return a usable template.
    const t = templateFor('fish', 'turned-back');
    expect(t.label).toBe('Note');
  });
});

describe('applyTemplateBody', () => {
  test('replaces empty body with template body', () => {
    const t = templateFor('hunt', 'sighting');
    const out = applyTemplateBody('', t);
    expect(out).toBe(t.body);
  });

  test('replaces whitespace-only body with template body', () => {
    const t = templateFor('hunt', 'sighting');
    const out = applyTemplateBody('   \n  \n', t);
    expect(out).toBe(t.body);
  });

  test('preserves existing user content under a separator', () => {
    const t = templateFor('hunt', 'harvest');
    const userBody = 'Saw a buck at 7:15am. Shot was clean.';
    const out = applyTemplateBody(userBody, t);
    expect(out.startsWith(t.body)).toBe(true);
    expect(out).toContain('--- previous notes ---');
    expect(out).toContain(userBody);
  });
});

describe('applyTemplateTags', () => {
  test('seeds template tags into an empty input', () => {
    const t = templateFor('fish', 'catch');
    const out = applyTemplateTags('', t);
    expect(out).toBe(t.suggestedTags.join(', '));
  });

  test('preserves existing user tags and appends template tags', () => {
    const t = templateFor('hunt', 'harvest');
    const out = applyTemplateTags('cold front, NW wind', t);
    expect(out.startsWith('cold front, NW wind')).toBe(true);
    expect(out).toContain('harvest');
  });

  test('dedupes case-insensitively, preserves user casing', () => {
    const t = templateFor('hunt', 'harvest');
    const out = applyTemplateTags('Harvest', t);
    expect(out).toBe('Harvest');
  });

  test('drops empties and trims whitespace', () => {
    const t = templateFor('hunt', 'sighting');
    const out = applyTemplateTags('  ,  ,  cold ,  ', t);
    expect(out.split(',').map((s) => s.trim())).toEqual(['cold', 'sighting']);
  });
});
